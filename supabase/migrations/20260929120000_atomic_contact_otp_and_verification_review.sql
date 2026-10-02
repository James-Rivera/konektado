-- Serialize contact-code attempts and prevent review before private files exist.
begin;

create function public.verify_contact_otp_atomic(
  p_challenge_id uuid,
  p_user_id uuid,
  p_candidate_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  challenge public.contact_otp_challenges%rowtype;
  remaining integer;
begin
  -- The row lock covers the checks, attempt increment, and successful verify.
  select * into challenge
  from public.contact_otp_challenges
  where id = p_challenge_id
  for update;

  if not found or challenge.user_id is distinct from p_user_id then
    return jsonb_build_object('status', 'challenge_not_found');
  end if;
  if challenge.expires_at <= clock_timestamp() then
    return jsonb_build_object('status', 'code_expired');
  end if;
  if challenge.consumed_at is not null then
    return jsonb_build_object('status', 'challenge_consumed');
  end if;
  if challenge.attempts >= challenge.max_attempts then
    return jsonb_build_object('status', 'attempt_limit_reached', 'attemptsRemaining', 0);
  end if;
  if challenge.verified_at is not null then
    return jsonb_build_object('status', 'verified');
  end if;

  if challenge.code_hash = p_candidate_hash then
    update public.contact_otp_challenges
    set verified_at = clock_timestamp()
    where id = challenge.id;
    return jsonb_build_object('status', 'verified');
  end if;

  update public.contact_otp_challenges
  set attempts = attempts + 1
  where id = challenge.id
  returning max_attempts - attempts into remaining;

  if remaining <= 0 then
    return jsonb_build_object('status', 'attempt_limit_reached', 'attemptsRemaining', 0);
  end if;
  return jsonb_build_object('status', 'invalid_code', 'attemptsRemaining', remaining);
end;
$$;
revoke all on function public.verify_contact_otp_atomic(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.verify_contact_otp_atomic(uuid, uuid, text) to service_role;

create function public.is_verification_request_ready(p_request_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  request_user_id uuid;
  request_notes text;
  document_type text;
  has_face boolean;
  has_certificate boolean;
  has_front boolean;
  has_back boolean;
begin
  select user_id, notes into request_user_id, request_notes
  from public.verifications where id = p_request_id;
  if not found then return false; end if;
  if request_user_id is distinct from auth.uid() and not public.is_barangay_admin() then
    return false;
  end if;

  -- Older requests may have plain-text notes. Infer their document set from
  -- files, while requiring the recorded choice on newer JSON submissions.
  begin
    document_type := request_notes::jsonb #>> '{document,idType}';
  exception when invalid_text_representation then
    document_type := null;
  end;

  select
    coalesce(bool_or(f.file_type = 'other'), false),
    coalesce(bool_or(f.file_type = 'certification'), false),
    coalesce(bool_or(f.file_type = 'id_front'), false),
    coalesce(bool_or(f.file_type = 'id_back'), false)
  into has_face, has_certificate, has_front, has_back
  from public.verification_files f
  join storage.objects o
    on o.bucket_id = 'verification-files' and o.name = f.file_path
  where f.verification_id = p_request_id;

  return coalesce(has_face, false) and case
    when document_type = 'barangay_certificate' then coalesce(has_certificate, false)
    when document_type in ('national_id', 'drivers_license', 'passport')
      then coalesce(has_front, false) and coalesce(has_back, false)
    when document_type is null
      then coalesce(has_certificate, false)
        or (coalesce(has_front, false) and coalesce(has_back, false))
    else false
  end;
end;
$$;
revoke all on function public.is_verification_request_ready(uuid) from public, anon;
grant execute on function public.is_verification_request_ready(uuid) to authenticated, service_role;

create function public.list_reviewable_verification_requests(
  p_limit integer default 50,
  p_statuses text[] default null
)
returns table(
  id uuid,
  user_id uuid,
  status text,
  notes text,
  reviewer_id uuid,
  reviewer_note text,
  reviewed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_barangay_admin() then
    raise exception 'Barangay admin access is required.';
  end if;
  return query
  select v.id, v.user_id, v.status, v.notes, v.reviewer_id,
    v.reviewer_note, v.reviewed_at, v.created_at, v.updated_at
  from public.verifications v
  where (p_statuses is null or v.status = any(p_statuses))
    and (v.status <> 'pending' or public.is_verification_request_ready(v.id))
  order by v.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;
revoke all on function public.list_reviewable_verification_requests(integer, text[]) from public, anon;
grant execute on function public.list_reviewable_verification_requests(integer, text[]) to authenticated;

create function public.cancel_incomplete_verification_request(p_request_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.verifications%rowtype;
begin
  select * into request_row from public.verifications
  where id = p_request_id for update;
  if not found or request_row.user_id is distinct from auth.uid() then
    return 'not_found';
  end if;
  if request_row.status <> 'pending' then
    return 'status_changed';
  end if;
  if public.is_verification_request_ready(p_request_id) then
    return 'already_ready';
  end if;
  update public.verifications set status = 'cancelled' where id = p_request_id;
  return 'cancelled';
end;
$$;
revoke all on function public.cancel_incomplete_verification_request(uuid) from public, anon;
grant execute on function public.cancel_incomplete_verification_request(uuid) to authenticated;

create function app_private.require_complete_verification_before_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'pending'
    and new.status in ('approved', 'rejected', 'needs_more_info')
    and not public.is_verification_request_ready(old.id) then
    raise exception 'Verification files are still uploading or missing. Try again after upload completes.';
  end if;
  return new;
end;
$$;
revoke all on function app_private.require_complete_verification_before_review() from public, anon, authenticated;
create trigger require_complete_verification_before_review
before update of status on public.verifications
for each row execute function app_private.require_complete_verification_before_review();

notify pgrst, 'reload schema';
commit;
