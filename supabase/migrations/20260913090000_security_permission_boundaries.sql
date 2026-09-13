-- Corrective migration: do not rewrite previously applied migrations.
begin;

create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated, service_role;

-- SECURITY INVOKER is essential: an API caller cannot become a trusted writer
-- by setting a JWT metadata field or a custom transaction setting.
create function app_private.is_backend_writer()
returns boolean language sql stable security invoker set search_path = '' as $$
  select current_user in ('postgres', 'supabase_admin', 'service_role');
$$;
revoke all on function app_private.is_backend_writer() from public;
grant execute on function app_private.is_backend_writer() to authenticated, service_role;

create or replace function public.protect_profile_verification_fields()
returns trigger language plpgsql security invoker set search_path = public as $$
declare latest_status text; latest_note text;
begin
  if app_private.is_backend_writer() or public.is_barangay_admin() then return new; end if;
  if tg_op = 'INSERT' then
    if new.verified_at is not null or new.barangay_verified_at is not null
      or new.role = 'barangay_admin' or new.active_role = 'barangay_admin' then
      raise exception 'Only barangay admins can set verification or admin fields.';
    end if;
    return new;
  end if;
  if new.id is distinct from old.id
    or new.verified_at is distinct from old.verified_at
    or new.barangay_verified_at is distinct from old.barangay_verified_at
    or (new.role is distinct from old.role and new.role = 'barangay_admin')
    or (new.active_role is distinct from old.active_role and new.active_role = 'barangay_admin') then
    raise exception 'Only barangay admins can set verification or admin fields.';
  end if;
  if (new.first_name, new.last_name, new.full_name) is distinct from
     (old.first_name, old.last_name, old.full_name) then
    select status, reviewer_note into latest_status, latest_note
      from public.verifications where user_id = old.id order by created_at desc limit 1;
    if coalesce(old.barangay_verified_at, old.verified_at) is not null
      or latest_status in ('pending', 'approved', 'rejected', 'needs_more_info') then
      if latest_status = 'needs_more_info' and public.is_name_correction_reviewer_note(latest_note) then
        return new;
      end if;
      raise exception 'Verified/legal name is locked. Request a barangay name correction.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_verification_fields on public.profiles;
create trigger protect_profile_verification_fields before insert or update on public.profiles
for each row execute function public.protect_profile_verification_fields();

create function app_private.guard_verification_write()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if app_private.is_backend_writer() then return new; end if;
  if tg_op = 'UPDATE' and public.is_barangay_admin() then return new; end if;
  if tg_op = 'INSERT' then
    if new.user_id is distinct from auth.uid() or new.status <> 'pending'
      or new.reviewer_id is not null or new.reviewer_note is not null or new.reviewed_at is not null then
      raise exception 'New verification requests must be pending without review fields.';
    end if;
    new.created_at := now();
  else
    if (new.id, new.user_id, new.contact_otp_challenge_id, new.reviewer_id, new.reviewer_note, new.reviewed_at, new.created_at)
      is distinct from (old.id, old.user_id, old.contact_otp_challenge_id, old.reviewer_id, old.reviewer_note, old.reviewed_at, old.created_at)
      or old.status not in ('pending', 'skipped') or new.status not in ('pending', 'cancelled') then
      raise exception 'Only barangay admins can review verification requests.';
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_verification_write before insert or update on public.verifications
for each row execute function app_private.guard_verification_write();

create function app_private.guard_credential_write()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if app_private.is_backend_writer() or public.is_barangay_admin() then return new; end if;
  if tg_op = 'INSERT' then
    if new.provider_id is distinct from auth.uid() or new.status <> 'pending'
      or new.reviewer_id is not null or new.reviewer_note is not null or new.reviewed_at is not null then
      raise exception 'Credentials must be submitted pending barangay review.';
    end if;
  else
    if (new.id, new.provider_id, new.reviewer_id, new.reviewer_note, new.reviewed_at)
      is distinct from (old.id, old.provider_id, old.reviewer_id, old.reviewer_note, old.reviewed_at)
      or old.status = 'approved' or new.status not in ('pending', 'rejected')
      or (new.status = 'rejected' and old.status <> 'rejected') then
      raise exception 'Only barangay admins can approve or reject credentials.';
    end if;
  end if;
  if new.file_path is not null and split_part(new.file_path, '/', 1) <> auth.uid()::text then
    raise exception 'Credential files must belong to their owner.';
  end if;
  return new;
end;
$$;
create trigger guard_credential_write before insert or update on public.credentials
for each row execute function app_private.guard_credential_write();

-- A reviewed credential must not silently acquire different file contents.
create policy credential_files_preserve_approved_update on storage.objects as restrictive
for update to authenticated
using (bucket_id <> 'credential-files' or public.is_barangay_admin() or not exists (
  select 1 from public.credentials c where c.file_path = name and c.status = 'approved'))
with check (bucket_id <> 'credential-files' or public.is_barangay_admin() or not exists (
  select 1 from public.credentials c where c.file_path = name and c.status = 'approved'));
create policy credential_files_preserve_approved_delete on storage.objects as restrictive
for delete to authenticated
using (bucket_id <> 'credential-files' or public.is_barangay_admin() or not exists (
  select 1 from public.credentials c where c.file_path = name and c.status = 'approved'));

drop policy if exists verification_files_insert_own on public.verification_files;
create policy verification_files_insert_own on public.verification_files for insert to authenticated
with check (url is null and split_part(file_path, '/', 1) = auth.uid()::text
  and split_part(file_path, '/', 2) = verification_id::text
  and exists (select 1 from public.verifications v where v.id = verification_id
    and v.user_id = auth.uid() and v.status = 'pending'));

-- Public credential readers receive an explicit safe projection, never file
-- paths, reviewer identity, or reviewer notes. Own/admin reads stay intact.
drop policy if exists credentials_select_approved_public on public.credentials;
create function public.get_public_approved_credentials(p_provider_id uuid)
returns table (id uuid, provider_id uuid, service_id uuid, credential_type text,
  title text, issuer text, issued_at date, status text, created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, c.provider_id, c.service_id, c.credential_type, c.title, c.issuer,
    c.issued_at, c.status, c.created_at, c.updated_at
  from public.credentials c where c.provider_id = p_provider_id and c.status = 'approved'
    and public.is_verified_profile(p_provider_id) order by c.created_at desc;
$$;
revoke all on function public.get_public_approved_credentials(uuid) from public;
grant execute on function public.get_public_approved_credentials(uuid) to authenticated;

-- Readiness uses real fields, not client-controlled profile_completed_at.
-- Fallbacks mirror buildCompletionStatus; credentials/photos/listings optional.
create function public.is_marketplace_ready(p_user_id uuid, p_role text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select
    public.is_verified_profile(p.id)
    and nullif(trim(coalesce(nullif(trim(p.full_name), ''), concat_ws(' ', p.first_name, p.last_name))), '') is not null
    and nullif(trim(p.street), '') is not null
    and nullif(trim(p.preferred_contact_method), '') is not null
    and case p_role
      when 'provider' then
        nullif(trim(coalesce(nullif(trim(w.headline), ''), w.service_type)), '') is not null
        and nullif(trim(coalesce(nullif(trim(w.bio), ''), p.about)), '') is not null
        and nullif(trim(w.availability), '') is not null
        and nullif(trim(coalesce(nullif(trim(w.service_area), ''), concat_ws(', ', p.barangay, p.city))), '') is not null
        and exists (select 1 from unnest(
          coalesce(string_to_array(w.service_type, ','), '{}') || coalesce(w.custom_offered_services, '{}') ||
          coalesce(pref.offered_services, '{}') || coalesce(pref.custom_offered_services, '{}')) s
          where nullif(trim(s), '') is not null and trim(s) <> 'Others / Specify')
      when 'client' then
        nullif(trim(coalesce(nullif(trim(h.headline), ''), nullif(trim(h.bio), ''), p.about)), '') is not null
        and nullif(trim(h.coordination_style), '') is not null
        and nullif(trim(h.preferred_schedule), '') is not null
        and exists (select 1 from unnest(coalesce(h.needed_services, '{}') || coalesce(h.custom_needed_services, '{}') ||
          coalesce(pref.needed_services, '{}') || coalesce(pref.custom_needed_services, '{}')) s
          where nullif(trim(s), '') is not null and trim(s) <> 'Others / Specify')
      else false end
    from public.profiles p
    left join public.provider_profiles w on w.user_id = p.id
    left join public.client_profiles h on h.user_id = p.id
    left join public.user_preferences pref on pref.user_id = p.id
    where p.id = p_user_id), false);
$$;
revoke all on function public.is_marketplace_ready(uuid, text) from public;
grant execute on function public.is_marketplace_ready(uuid, text) to authenticated, service_role;

-- Revoke table-wide SELECT first: column grants cannot override a table grant.
revoke select on public.jobs from public, anon, authenticated;
revoke select (private_location_notes) on public.jobs from public, anon, authenticated;
do $$ declare cols text;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum) into cols
    from pg_attribute where attrelid = 'public.jobs'::regclass and attnum > 0
      and not attisdropped and attname <> 'private_location_notes';
  execute format('grant select (%s) on public.jobs to authenticated', cols);
end $$;
create function public.get_job_private_location_notes(p_job_id uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare result text;
begin
  if auth.uid() is null or not exists (select 1 from public.jobs j where j.id = p_job_id
    and (coalesce(j.client_id, j.owner_id) = auth.uid() or public.is_barangay_admin())) then
    raise exception 'Only the job owner or barangay admin can read private job notes.';
  end if;
  select private_location_notes into result from public.jobs where id = p_job_id;
  return result;
end;
$$;
revoke all on function public.get_job_private_location_notes(uuid) from public;
grant execute on function public.get_job_private_location_notes(uuid) to authenticated;

drop policy if exists jobs_insert_verified_own on public.jobs;
create policy jobs_insert_verified_own on public.jobs for insert to authenticated with check (
  owner_id = auth.uid() and coalesce(client_id, owner_id) = auth.uid()
  and public.is_marketplace_ready(auth.uid(), 'client'));
drop policy if exists jobs_update_verified_owner on public.jobs;
create policy jobs_update_verified_owner on public.jobs for update to authenticated
using (coalesce(client_id, owner_id) = auth.uid() or public.is_barangay_admin())
with check ((coalesce(client_id, owner_id) = auth.uid() and public.is_marketplace_ready(auth.uid(), 'client'))
  or public.is_barangay_admin());
drop policy if exists services_insert_verified_owner on public.services;
create policy services_insert_verified_owner on public.services for insert to authenticated
with check (provider_id = auth.uid() and public.is_marketplace_ready(auth.uid(), 'provider'));
drop policy if exists services_update_verified_owner on public.services;
create policy services_update_verified_owner on public.services for update to authenticated
using (provider_id = auth.uid() or public.is_barangay_admin())
with check ((provider_id = auth.uid() and public.is_marketplace_ready(auth.uid(), 'provider')) or public.is_barangay_admin());

create function app_private.guard_job_write()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if app_private.is_backend_writer() then return new; end if;
  if tg_op = 'INSERT' then
    if new.status not in ('open', 'reviewing', 'cancelled') or new.accepted_provider_id is not null then
      raise exception 'Jobs must be hired through the hiring action.';
    end if;
  else
    if (new.id, new.owner_id, new.client_id, new.accepted_provider_id)
      is distinct from (old.id, old.owner_id, old.client_id, old.accepted_provider_id) then
      raise exception 'Job identity and hired worker cannot be changed directly.';
    end if;
    if new.status is distinct from old.status and (
      old.status in ('in_progress', 'completed', 'closed') or new.status not in ('open', 'reviewing', 'cancelled', 'closed')) then
      raise exception 'Use the authorized job lifecycle action.';
    end if;
    -- Realtime timestamp maintenance is allowed; completed work cannot be edited.
    if old.status in ('in_progress', 'completed', 'closed') and
      (to_jsonb(new) - 'updated_at') is distinct from (to_jsonb(old) - 'updated_at') then
      raise exception 'Hired, completed, and closed jobs cannot be edited.';
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_job_write before insert or update on public.jobs
for each row execute function app_private.guard_job_write();

create function app_private.guard_service_owner()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if not app_private.is_backend_writer() and
    (new.id, new.provider_id) is distinct from (old.id, old.provider_id) then
    raise exception 'Service ownership cannot be changed.';
  end if;
  return new;
end;
$$;
create trigger guard_service_owner before update on public.services
for each row execute function app_private.guard_service_owner();

create function public.can_start_marketplace_conversation(p_job_id uuid, p_service_id uuid,
  p_client_id uuid, p_provider_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_client_id <> p_provider_id and case
    when p_job_id is not null and p_service_id is null then
      auth.uid() = p_provider_id and public.is_marketplace_ready(auth.uid(), 'provider')
      and exists (select 1 from public.jobs j where j.id = p_job_id
        and coalesce(j.client_id, j.owner_id) = p_client_id and j.status in ('open', 'reviewing')
        and coalesce(j.allow_messages, true) and public.is_verified_profile(p_client_id))
    when p_service_id is not null and p_job_id is null then
      auth.uid() = p_client_id and public.is_marketplace_ready(auth.uid(), 'client')
      and exists (select 1 from public.services s where s.id = p_service_id
        and s.provider_id = p_provider_id and s.is_active and coalesce(s.allow_messages, true)
        and public.is_verified_profile(p_provider_id))
    else false end;
$$;
revoke all on function public.can_start_marketplace_conversation(uuid, uuid, uuid, uuid) from public;
grant execute on function public.can_start_marketplace_conversation(uuid, uuid, uuid, uuid) to authenticated;
drop policy if exists conversations_insert_verified_participant on public.conversations;
create policy conversations_insert_verified_participant on public.conversations for insert to authenticated
with check (started_by = auth.uid() and status = 'active' and hired_at is null
  and public.can_start_marketplace_conversation(job_id, service_id, client_id, provider_id));

create function app_private.guard_conversation_write()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if app_private.is_backend_writer() then return new; end if;
  if (new.id, new.job_id, new.service_id, new.client_id, new.provider_id, new.started_by, new.hired_at)
    is distinct from (old.id, old.job_id, old.service_id, old.client_id, old.provider_id, old.started_by, old.hired_at)
    or (new.status is distinct from old.status and
      (old.hired_at is not null or new.status not in ('active', 'declined', 'reported'))) then
    raise exception 'Conversation identity and hiring state cannot be changed directly.';
  end if;
  return new;
end;
$$;
create trigger guard_conversation_write before update on public.conversations
for each row execute function app_private.guard_conversation_write();

create function public.can_send_marketplace_message(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversations c where c.id = p_conversation_id
    and ((c.client_id = auth.uid() and public.is_marketplace_ready(auth.uid(), 'client'))
      or (c.provider_id = auth.uid() and public.is_marketplace_ready(auth.uid(), 'provider'))));
$$;
revoke all on function public.can_send_marketplace_message(uuid) from public;
grant execute on function public.can_send_marketplace_message(uuid) to authenticated;
drop policy if exists messages_insert_verified_participant on public.messages;
create policy messages_insert_verified_participant on public.messages for insert to authenticated
with check (sender_id = auth.uid() and public.can_send_marketplace_message(conversation_id));

-- Serialize hiring on the job, then its conversation. Concurrent attempts for
-- different workers cannot both succeed, and a failed second write rolls back.
create function public.mark_job_worker_hired(p_conversation_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare c public.conversations%rowtype; j public.jobs%rowtype; target_job uuid;
begin
  if not public.is_marketplace_ready(auth.uid(), 'client') then
    raise exception 'Complete verification and your Hiring Profile before hiring.';
  end if;
  select job_id into target_job from public.conversations where id = p_conversation_id;
  select * into j from public.jobs where id = target_job for update;
  select * into c from public.conversations where id = p_conversation_id for update;
  if j.id is null or c.id is null or c.job_id <> j.id or c.service_id is not null
    or coalesce(j.client_id, j.owner_id) <> auth.uid() or c.client_id <> auth.uid() then
    raise exception 'Only the job client can hire from this conversation.';
  end if;
  if j.status = 'in_progress' and j.accepted_provider_id = c.provider_id and c.status = 'hired'
    and c.hired_at is not null then return c.id; end if;
  if j.status not in ('open', 'reviewing') or j.accepted_provider_id is not null or c.status <> 'active'
    or not public.is_marketplace_ready(c.provider_id, 'provider') then
    raise exception 'This job or worker is no longer available for hiring.';
  end if;
  update public.conversations set status = 'hired', hired_at = now() where id = c.id;
  update public.jobs set status = 'in_progress', accepted_provider_id = c.provider_id, closed_at = null where id = j.id;
  return c.id;
end;
$$;
revoke all on function public.mark_job_worker_hired(uuid) from public;
grant execute on function public.mark_job_worker_hired(uuid) to authenticated;

create function public.complete_hired_job(p_conversation_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare c public.conversations%rowtype; j public.jobs%rowtype; target_job uuid;
begin
  if not public.is_marketplace_ready(auth.uid(), 'client') then
    raise exception 'Complete verification and your Hiring Profile before completing work.';
  end if;
  select job_id into target_job from public.conversations where id = p_conversation_id;
  select * into j from public.jobs where id = target_job for update;
  select * into c from public.conversations where id = p_conversation_id for update;
  if j.id is null or c.id is null or coalesce(j.client_id, j.owner_id) <> auth.uid()
    or c.client_id <> auth.uid() or c.job_id <> j.id or c.status <> 'hired' or c.hired_at is null
    or j.accepted_provider_id is distinct from c.provider_id then
    raise exception 'Only the client can complete the accepted worker job.';
  end if;
  if j.status = 'completed' then return j.id; end if;
  if j.status <> 'in_progress' then raise exception 'Only work in progress can be completed.'; end if;
  update public.jobs set status = 'completed', closed_at = now() where id = j.id;
  return j.id;
end;
$$;
revoke all on function public.complete_hired_job(uuid) from public;
grant execute on function public.complete_hired_job(uuid) to authenticated;

-- Abort rather than silently rewrite legacy hiring history if inconsistent.
create unique index conversations_one_hired_worker_per_job on public.conversations(job_id)
where job_id is not null and hired_at is not null;

-- Keep the existing eligibility/read contract and add role readiness to both
-- eligibility reporting and the RPC-only insert path.
create or replace function public.get_my_job_review_state(p_job_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare j public.jobs%rowtype; r public.reviews%rowtype;
  v_client uuid; v_reviewee uuid; v_role text; v_required_role text; v_reason text;
begin
  select * into j from public.jobs where id = p_job_id;
  if j.id is null then return jsonb_build_object('eligible', false, 'reason', 'not_found'); end if;
  v_client := coalesce(j.client_id, j.owner_id);
  if auth.uid() = v_client then
    v_reviewee := j.accepted_provider_id; v_role := 'worker'; v_required_role := 'client';
  elsif auth.uid() = j.accepted_provider_id then
    v_reviewee := v_client; v_role := 'client'; v_required_role := 'provider';
  else return jsonb_build_object('eligible', false, 'reason', 'not_participant'); end if;
  if v_reviewee is null or v_reviewee = auth.uid() then
    return jsonb_build_object('eligible', false, 'reason', 'invalid_counterparty');
  end if;
  select * into r from public.reviews where job_id = p_job_id and reviewer_id = auth.uid() and reviewee_id = v_reviewee;
  if r.id is not null then
    return jsonb_build_object('eligible', false, 'reason', 'already_reviewed', 'revieweeId', v_reviewee,
      'revieweeRole', v_role, 'review', jsonb_build_object('id',r.id,'rating',r.rating,'comment',r.comment,'createdAt',r.created_at));
  end if;
  if j.status <> 'completed' then v_reason := 'not_completed';
  elsif not public.is_verified_profile(auth.uid()) then v_reason := 'not_verified';
  elsif not public.is_marketplace_ready(auth.uid(), v_required_role) then v_reason := 'profile_incomplete';
  elsif not exists(select 1 from public.conversations c where c.job_id = j.id
    and c.client_id = v_client and c.provider_id = j.accepted_provider_id and c.status = 'hired' and c.hired_at is not null) then
    v_reason := 'not_hired_participant';
  else v_reason := 'eligible';
  end if;
  return jsonb_build_object('eligible',v_reason='eligible','reason',v_reason,'revieweeId',v_reviewee,'revieweeRole',v_role);
end;
$$;
revoke all on function public.get_my_job_review_state(uuid) from public;
grant execute on function public.get_my_job_review_state(uuid) to authenticated;

-- Functions in the private schema are implementation details, not API RPCs.
revoke all on all functions in schema app_private from public;
notify pgrst, 'reload schema';
commit;
