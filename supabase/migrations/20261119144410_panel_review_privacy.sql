begin;

-- Keep the validated trust logic and expose only the agreed review fields.
alter function public.get_public_profile_trust_summary(uuid, text, integer) set schema app_private;
alter function app_private.get_public_profile_trust_summary(uuid, text, integer) rename to build_profile_trust_summary;
revoke all on function app_private.build_profile_trust_summary(uuid, text, integer) from public, anon, authenticated, service_role;

create function public.get_public_profile_trust_summary(p_user_id uuid, p_role text, p_limit integer default 6)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare summary jsonb; safe_reviews jsonb;
begin
  if auth.uid() is null then return null; end if;
  summary := app_private.build_profile_trust_summary(p_user_id, p_role, p_limit);
  if summary is null then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.value->'id',
    'rating', r.value->'rating',
    'comment', r.value->'comment',
    'author_role', case when p_role = 'worker' then 'client' else 'worker' end
  ) order by r.position), '[]'::jsonb) into safe_reviews
  from jsonb_array_elements(summary->'recentReviews') with ordinality as r(value, position);
  return jsonb_set(summary, '{recentReviews}', safe_reviews);
end;
$$;
revoke all on function public.get_public_profile_trust_summary(uuid, text, integer) from public, anon;
grant execute on function public.get_public_profile_trust_summary(uuid, text, integer) to authenticated, service_role;

create policy reviews_protect_author_identity on public.reviews as restrictive for select to authenticated
using (reviewer_id = auth.uid() or public.is_barangay_admin());

-- A review complaint must not reveal the author and job in a direct response.
-- Existing reports are protected by this policy without rewriting evidence.
create policy reports_protect_review_targets on public.reports as restrictive for select to authenticated
using (review_id is null or public.is_barangay_admin());

create function app_private.require_review_report_action()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.review_id is not null and not app_private.is_backend_writer() then
    raise exception 'Use the review reporting action.';
  end if;
  return new;
end;
$$;
revoke all on function app_private.require_review_report_action() from public, anon, authenticated;
-- Runs before guard_report_insert so a caller cannot confirm a guessed target.
create trigger enforce_review_report_action before insert on public.reports
for each row execute function app_private.require_review_report_action();

create function app_private.resident_report_json(r public.reports)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', r.id, 'reporter_id', r.reporter_id,
    'reported_user_id', case when r.review_id is null then r.reported_user_id end,
    'job_id', case when r.review_id is null then r.job_id end,
    'service_id', case when r.review_id is null then r.service_id end,
    'conversation_id', case when r.review_id is null then r.conversation_id end,
    'review_id', r.review_id, 'reason', r.reason, 'details', r.details, 'status', r.status,
    'created_at', r.created_at, 'updated_at', r.updated_at, 'reviewed_at', r.reviewed_at,
    'resolution_message', r.resolution_message
  );
$$;
revoke all on function app_private.resident_report_json(public.reports) from public, anon, authenticated;

create function public.submit_review_report(p_review_id uuid, p_reason text, p_details text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.reports%rowtype;
begin
  if auth.uid() is null or p_review_id is null then raise exception 'Sign in and choose a review to report.'; end if;
  insert into public.reports(reporter_id, review_id, reason, details)
  values (auth.uid(), p_review_id, p_reason, p_details) returning * into r;
  return app_private.resident_report_json(r);
end;
$$;

create function public.get_my_report_page(p_limit integer default 50, p_statuses text[] default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(app_private.resident_report_json(q.r) order by q.created_at desc, q.id desc), '[]'::jsonb)
  from (
    select r, r.created_at, r.id from public.reports r where r.reporter_id = auth.uid()
      and (p_statuses is null or r.status = any(p_statuses))
    order by r.created_at desc, r.id desc limit least(greatest(coalesce(p_limit, 50), 1), 200)
  ) as q;
$$;
revoke all on function public.submit_review_report(uuid, text, text), public.get_my_report_page(integer, text[]) from public, anon;
grant execute on function public.submit_review_report(uuid, text, text), public.get_my_report_page(integer, text[]) to authenticated;

create function public.get_client_reputation_counts(p_client_ids uuid[])
returns table(client_id uuid, average_rating numeric, review_count bigint, jobs_posted_count bigint)
language sql stable security definer set search_path = '' as $$
  with visible_clients as (
    select p.id from public.profiles p where p.id = any(p_client_ids) and auth.uid() is not null
      and (public.is_verified_profile(p.id) or p.id = auth.uid() or public.is_barangay_admin())
  )
  select p.id, avg(r.rating)::numeric(3,2), count(r.id), count(distinct j.id)
  from visible_clients p
  left join public.jobs j on coalesce(j.client_id, j.owner_id) = p.id
  left join public.reviews r on j.status = 'completed' and r.job_id = j.id and r.reviewee_id = p.id
    and r.reviewer_id = j.accepted_provider_id and public.is_review_visible(r.id)
    and exists(select 1 from public.conversations c where c.job_id = j.id and c.client_id = p.id
      and c.provider_id = j.accepted_provider_id and c.hired_at is not null)
  group by p.id;
$$;
revoke all on function public.get_client_reputation_counts(uuid[]) from public, anon;
grant execute on function public.get_client_reputation_counts(uuid[]) to authenticated;

commit;
