begin;

alter table public.jobs add column closure_reason text
  check (closure_reason is null or (status = 'closed' and closure_reason in ('not_needed', 'found_elsewhere', 'no_worker_found', 'mutual_cancellation')));
grant select (closure_reason) on public.jobs to authenticated;

create function app_private.guard_job_closure_reason()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if not app_private.is_backend_writer() and (
    (tg_op = 'INSERT' and new.closure_reason is not null)
    or (tg_op = 'UPDATE' and new.closure_reason is distinct from old.closure_reason)
  ) then raise exception 'Use the job cancellation action.'; end if;
  return new;
end;
$$;
revoke all on function app_private.guard_job_closure_reason() from public, anon, authenticated;
create trigger guard_job_closure_reason before insert or update of closure_reason on public.jobs
for each row execute function app_private.guard_job_closure_reason();

create table app_private.hired_job_cancellations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  requested_by uuid not null,
  reason text not null check (char_length(reason) between 1 and 500),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  requested_at timestamptz not null default clock_timestamp(),
  decided_at timestamptz,
  check ((status = 'pending') = (decided_at is null))
);
alter table app_private.hired_job_cancellations enable row level security;
revoke all on app_private.hired_job_cancellations from public, anon, authenticated;
create unique index hired_job_one_pending_cancellation on app_private.hired_job_cancellations(job_id) where status = 'pending';
create index hired_job_cancellation_history on app_private.hired_job_cancellations(conversation_id, requested_at desc, id desc);

create function public.cancel_unfilled_job(p_job_id uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare j public.jobs%rowtype;
begin
  if auth.uid() is null or p_reason is null or p_reason not in ('not_needed', 'found_elsewhere', 'no_worker_found') then
    raise exception 'Sign in and choose a cancellation reason.';
  end if;
  select * into j from public.jobs where id = p_job_id for update;
  if j.id is null or auth.uid() is distinct from coalesce(j.client_id, j.owner_id) then
    raise exception 'Only the client who posted this job can cancel it.';
  end if;
  if j.status = 'closed' and j.closure_reason = p_reason then return j.id; end if;
  if j.status not in ('open', 'reviewing', 'cancelled') or j.accepted_provider_id is not null then
    raise exception 'This request is no longer available for cancellation before hiring.';
  end if;
  update public.jobs set status = 'closed', closure_reason = p_reason, closed_at = now() where id = j.id;
  insert into public.notifications (user_id, type, title, body, route)
  select distinct on (c.provider_id) c.provider_id, 'job_cancellation', 'Job request closed',
    'The client closed a job you messaged about.', '/conversation/' || c.id::text || '/details'
  from public.conversations c
  where c.job_id = j.id and c.client_id = auth.uid() and c.provider_id <> auth.uid()
    and exists (select 1 from public.messages m where m.conversation_id = c.id and m.sender_id = c.provider_id)
  order by c.provider_id, c.id;
  return j.id;
end;
$$;

create function app_private.is_hired_cancellation_participant(c public.conversations, j public.jobs)
returns boolean language sql stable set search_path = '' as $$
  select coalesce(c.job_id = j.id and c.service_id is null and c.status = 'hired' and c.hired_at is not null
    and c.client_id = coalesce(j.client_id, j.owner_id) and c.provider_id = j.accepted_provider_id
    and auth.uid() in (c.client_id, c.provider_id), false);
$$;
revoke all on function app_private.is_hired_cancellation_participant(public.conversations, public.jobs) from public, anon, authenticated;

create function public.get_hired_job_cancellation(p_conversation_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c public.conversations%rowtype; j public.jobs%rowtype; result jsonb;
begin
  select * into c from public.conversations where id = p_conversation_id;
  select * into j from public.jobs where id = c.job_id;
  if not app_private.is_hired_cancellation_participant(c, j) then
    raise exception 'Only the hired participants can view cancellation requests.';
  end if;
  select to_jsonb(r) into result from app_private.hired_job_cancellations r
  where r.conversation_id = c.id order by r.requested_at desc, r.id desc limit 1;
  return jsonb_build_object('request', result, 'job_status', j.status);
end;
$$;

create function public.change_hired_job_cancellation(p_conversation_id uuid, p_action text, p_expected_id uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c public.conversations%rowtype; j public.jobs%rowtype; r app_private.hired_job_cancellations%rowtype;
  target_job uuid; actor uuid := auth.uid(); recipient uuid; next_status text; message text;
begin
  if actor is null or p_action is null or p_action not in ('request', 'accept', 'decline', 'withdraw') then
    raise exception 'Choose a valid cancellation action.';
  end if;
  select job_id into target_job from public.conversations where id = p_conversation_id;
  select * into j from public.jobs where id = target_job for update;
  select * into c from public.conversations where id = p_conversation_id for update;
  if not app_private.is_hired_cancellation_participant(c, j) then
    raise exception 'Only the hired participants can change a cancellation request.';
  end if;
  recipient := case when actor = c.client_id then c.provider_id else c.client_id end;
  select * into r from app_private.hired_job_cancellations where conversation_id = c.id
    order by requested_at desc, id desc limit 1;

  if p_action = 'request' then
    p_reason := nullif(btrim(p_reason), '');
    if p_reason is null or char_length(p_reason) > 500 then raise exception 'Enter a reason of 1 to 500 characters.'; end if;
    if r.id is distinct from p_expected_id then
      if r.requested_by = actor and r.reason = p_reason then
        return public.get_hired_job_cancellation(c.id);
      end if;
      raise exception 'The cancellation request changed. Refresh and try again.';
    end if;
    if j.status <> 'in_progress' or r.status = 'pending' then
      raise exception 'A new cancellation request is unavailable for this job.';
    end if;
    insert into app_private.hired_job_cancellations(job_id, conversation_id, requested_by, reason)
    values (j.id, c.id, actor, p_reason);
    message := 'The other participant asked to cancel this hired job. Open Details to respond.';
  else
    if r.id is null or r.id is distinct from p_expected_id then
      raise exception 'The cancellation request changed. Refresh and try again.';
    end if;
    if (p_action = 'withdraw') <> (r.requested_by = actor) then
      raise exception 'The requester can withdraw. The other participant can accept or decline.';
    end if;
    next_status := case p_action when 'accept' then 'accepted' when 'decline' then 'declined' else 'withdrawn' end;
    if r.status = next_status then return public.get_hired_job_cancellation(c.id); end if;
    if r.status <> 'pending' or j.status <> 'in_progress' then raise exception 'This request is already closed.'; end if;
    update app_private.hired_job_cancellations set status = next_status, decided_at = now() where id = r.id;
    if next_status = 'accepted' then
      update public.jobs set status = 'closed', closure_reason = 'mutual_cancellation', closed_at = now() where id = j.id;
      message := 'The cancellation was accepted. This job is closed and the chat is kept.';
    elsif next_status = 'declined' then
      message := 'The other participant declined cancellation. The job remains in progress.';
    else
      message := 'The requester withdrew the cancellation. The job remains in progress.';
    end if;
  end if;
  insert into public.notifications (user_id, type, title, body, route)
  values (recipient, 'job_cancellation', 'Job cancellation update', message, '/conversation/' || c.id::text || '/details');
  return public.get_hired_job_cancellation(c.id);
end;
$$;

create function app_private.block_completion_with_pending_cancellation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'in_progress' and new.status = 'completed' and exists (
    select 1 from app_private.hired_job_cancellations where job_id = old.id and status = 'pending'
  ) then raise exception 'Resolve or withdraw the cancellation request before completing this job.'; end if;
  return new;
end;
$$;
revoke all on function app_private.block_completion_with_pending_cancellation() from public, anon, authenticated;
create trigger block_completion_with_pending_cancellation before update of status on public.jobs
for each row execute function app_private.block_completion_with_pending_cancellation();

revoke all on function public.cancel_unfilled_job(uuid, text), public.get_hired_job_cancellation(uuid),
  public.change_hired_job_cancellation(uuid, text, uuid, text) from public, anon;
grant execute on function public.cancel_unfilled_job(uuid, text), public.get_hired_job_cancellation(uuid),
  public.change_hired_job_cancellation(uuid, text, uuid, text) to authenticated;

create function public.get_my_unfilled_job_interest(p_job_ids uuid[])
returns table(job_id uuid, interest text) language sql stable security definer set search_path = '' as $$
  select j.id, case
    when coalesce(bool_or(m.sender_id = c.provider_id), false) then 'worker_messaged'
    when coalesce(bool_or(m.sender_id = c.client_id), false) then 'awaiting_reply'
    else 'no_worker_message' end
  from public.jobs j
  left join public.conversations c on c.job_id = j.id and c.client_id = auth.uid()
  left join public.messages m on m.conversation_id = c.id
  where j.id = any(p_job_ids) and coalesce(j.client_id, j.owner_id) = auth.uid()
    and j.status in ('open', 'reviewing') and j.accepted_provider_id is null
  group by j.id;
$$;

-- Keep service-card counts consistent with completed-job history without exposing job or review rows.
create function public.get_provider_reputation_counts(p_provider_ids uuid[])
returns table(provider_id uuid, average_rating numeric, review_count bigint, completed_jobs_count bigint)
language sql stable security definer set search_path = '' as $$
  with visible_providers as (
    select p.id from public.profiles p where p.id = any(p_provider_ids)
      and auth.uid() is not null
      and (public.is_verified_profile(p.id) or p.id = auth.uid() or public.is_barangay_admin())
  ), completed as (
    select j.id, j.accepted_provider_id, coalesce(j.client_id, j.owner_id) as client_id
    from public.jobs j join visible_providers p on p.id = j.accepted_provider_id
    where j.status = 'completed' and exists (
      select 1 from public.conversations c where c.job_id = j.id
        and c.client_id = coalesce(j.client_id, j.owner_id) and c.provider_id = j.accepted_provider_id
        and c.hired_at is not null
    )
  )
  select p.id, avg(r.rating)::numeric(3,2), count(r.id), count(distinct j.id)
  from visible_providers p
  left join completed j on j.accepted_provider_id = p.id
  left join public.reviews r on r.job_id = j.id and r.reviewer_id = j.client_id and r.reviewee_id = p.id
    and public.is_review_visible(r.id)
  group by p.id;
$$;

revoke all on function public.get_my_unfilled_job_interest(uuid[]), public.get_provider_reputation_counts(uuid[]) from public, anon;
grant execute on function public.get_my_unfilled_job_interest(uuid[]), public.get_provider_reputation_counts(uuid[]) to authenticated;

commit;
