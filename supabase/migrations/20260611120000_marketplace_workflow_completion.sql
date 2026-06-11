-- Complete secure contact verification, private image messaging, atomic job
-- transitions, and reciprocal completed-job reviews without rewriting data.

create extension if not exists pgcrypto;

create or replace function public.normalize_ph_mobile(value text)
returns text
language sql
immutable
as $$
  select case
    when regexp_replace(coalesce(value, ''), '\D', '', 'g') ~ '^09[0-9]{9}$'
      then '63' || substring(regexp_replace(value, '\D', '', 'g') from 2)
    when regexp_replace(coalesce(value, ''), '\D', '', 'g') ~ '^639[0-9]{9}$'
      then regexp_replace(value, '\D', '', 'g')
    else null
  end;
$$;

create table if not exists public.contact_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  phone_e164 text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 10),
  resend_count integer not null default 0 check (resend_count >= 0),
  sent_at timestamptz not null default now(),
  verified_at timestamptz,
  consumed_at timestamptz,
  provider_message_id text,
  created_at timestamptz not null default now(),
  check (phone_e164 ~ '^639[0-9]{9}$')
);

create index if not exists contact_otp_user_created_idx
on public.contact_otp_challenges(user_id, created_at desc);

create index if not exists contact_otp_phone_created_idx
on public.contact_otp_challenges(phone_e164, created_at desc);

alter table public.contact_otp_challenges enable row level security;

alter table public.verifications
  add column if not exists contact_otp_challenge_id uuid
  references public.contact_otp_challenges(id) on delete restrict;

create or replace function public.require_consumed_contact_otp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  challenge public.contact_otp_challenges%rowtype;
  profile_phone text;
begin
  if public.is_barangay_admin() then
    return new;
  end if;

  if new.user_id is distinct from auth.uid() then
    raise exception 'Verification requests must belong to the signed-in user.';
  end if;

  if new.contact_otp_challenge_id is null then
    raise exception 'Confirm your contact number before submitting verification.';
  end if;

  select *
  into challenge
  from public.contact_otp_challenges
  where id = new.contact_otp_challenge_id
  for update;

  select public.normalize_ph_mobile(phone)
  into profile_phone
  from public.profiles
  where id = new.user_id;

  if challenge.id is null
    or challenge.user_id <> new.user_id
    or challenge.verified_at is null
    or challenge.consumed_at is not null
    or challenge.expires_at < now()
    or challenge.phone_e164 is distinct from profile_phone then
    raise exception 'Confirm your current contact number before submitting verification.';
  end if;

  update public.contact_otp_challenges
  set consumed_at = now()
  where id = challenge.id;

  return new;
end;
$$;

drop trigger if exists require_consumed_contact_otp on public.verifications;
create trigger require_consumed_contact_otp
before insert on public.verifications
for each row execute function public.require_consumed_contact_otp();

alter table public.messages
  add column if not exists attachment_path text,
  add column if not exists attachment_mime_type text,
  add column if not exists attachment_width integer,
  add column if not exists attachment_height integer;

alter table public.messages
  alter column body set default '';

alter table public.messages
  drop constraint if exists messages_body_or_attachment_required;

alter table public.messages
  add constraint messages_body_or_attachment_required
  check (length(trim(body)) > 0 or attachment_path is not null);

alter table public.messages
  drop constraint if exists messages_attachment_image_only;

alter table public.messages
  add constraint messages_attachment_image_only
  check (
    attachment_path is null
    or (
      attachment_mime_type like 'image/%'
      and (attachment_width is null or attachment_width > 0)
      and (attachment_height is null or attachment_height > 0)
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments',
  'message-attachments',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "message_attachments_select_participant" on storage.objects;
create policy "message_attachments_select_participant"
on storage.objects for select
to authenticated
using (
  bucket_id = 'message-attachments'
  and exists (
    select 1
    from public.conversations c
    where c.id::text = split_part(name, '/', 2)
      and (c.client_id = auth.uid() or c.provider_id = auth.uid() or public.is_barangay_admin())
  )
);

drop policy if exists "message_attachments_insert_participant" on storage.objects;
create policy "message_attachments_insert_participant"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'message-attachments'
  and split_part(name, '/', 1) = auth.uid()::text
  and exists (
    select 1
    from public.conversations c
    where c.id::text = split_part(name, '/', 2)
      and (c.client_id = auth.uid() or c.provider_id = auth.uid())
  )
);

drop policy if exists "message_attachments_delete_own" on storage.objects;
create policy "message_attachments_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'message-attachments'
  and split_part(name, '/', 1) = auth.uid()::text
);

create table if not exists public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_reads enable row level security;

drop policy if exists "conversation_reads_select_own" on public.conversation_reads;
create policy "conversation_reads_select_own"
on public.conversation_reads for select
to authenticated
using (user_id = auth.uid() or public.is_barangay_admin());

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  read_time timestamptz := now();
begin
  if not exists (
    select 1
    from public.conversations c
    where c.id = p_conversation_id
      and (c.client_id = auth.uid() or c.provider_id = auth.uid())
  ) then
    raise exception 'Only conversation participants can mark messages read.';
  end if;

  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
  values (p_conversation_id, auth.uid(), read_time)
  on conflict (conversation_id, user_id)
  do update set last_read_at = excluded.last_read_at;

  return read_time;
end;
$$;

revoke all on function public.mark_conversation_read(uuid) from public;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

drop function if exists public.get_my_conversation_inbox(boolean);
create function public.get_my_conversation_inbox(
  p_include_archived boolean default false
)
returns table (
  conversation_id uuid,
  job_id uuid,
  service_id uuid,
  client_id uuid,
  provider_id uuid,
  started_by uuid,
  status text,
  hired_at timestamptz,
  conversation_created_at timestamptz,
  conversation_updated_at timestamptz,
  job_title text,
  service_title text,
  client_full_name text,
  client_first_name text,
  client_last_name text,
  client_barangay text,
  client_city text,
  client_about text,
  client_avatar_url text,
  client_availability text,
  client_verified_at timestamptz,
  client_barangay_verified_at timestamptz,
  provider_full_name text,
  provider_first_name text,
  provider_last_name text,
  provider_barangay text,
  provider_city text,
  provider_about text,
  provider_avatar_url text,
  provider_availability text,
  provider_verified_at timestamptz,
  provider_barangay_verified_at timestamptz,
  last_message_id uuid,
  last_message_sender_id uuid,
  last_message_body text,
  last_message_attachment_path text,
  last_message_created_at timestamptz,
  unread_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.job_id,
    c.service_id,
    c.client_id,
    c.provider_id,
    c.started_by,
    c.status,
    c.hired_at,
    c.created_at,
    c.updated_at,
    j.title,
    s.title,
    client.full_name,
    client.first_name,
    client.last_name,
    client.barangay,
    client.city,
    client.about,
    client.avatar_url,
    client.availability,
    client.verified_at,
    client.barangay_verified_at,
    provider.full_name,
    provider.first_name,
    provider.last_name,
    provider.barangay,
    provider.city,
    provider.about,
    provider.avatar_url,
    provider.availability,
    provider.verified_at,
    provider.barangay_verified_at,
    latest.id,
    latest.sender_id,
    latest.body,
    latest.attachment_path,
    latest.created_at,
    (
      select count(*)
      from public.messages unread
      where unread.conversation_id = c.id
        and unread.sender_id <> auth.uid()
        and unread.created_at > coalesce(reads.last_read_at, '-infinity'::timestamptz)
    )
  from public.conversations c
  left join public.jobs j on j.id = c.job_id
  left join public.services s on s.id = c.service_id
  left join public.profiles client on client.id = c.client_id
  left join public.profiles provider on provider.id = c.provider_id
  left join public.conversation_reads reads
    on reads.conversation_id = c.id and reads.user_id = auth.uid()
  left join lateral (
    select m.id, m.sender_id, m.body, m.attachment_path, m.created_at
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) latest on true
  where (
    c.client_id = auth.uid()
    or c.provider_id = auth.uid()
    or public.is_barangay_admin()
  )
    and (p_include_archived or c.status <> 'archived')
  order by coalesce(latest.created_at, c.updated_at) desc, c.updated_at desc;
$$;

revoke all on function public.get_my_conversation_inbox(boolean) from public;
grant execute on function public.get_my_conversation_inbox(boolean) to authenticated;

drop policy if exists "reviews_insert_verified_participant" on public.reviews;
drop policy if exists "reviews_update_own" on public.reviews;
drop policy if exists "reviews_select_public" on public.reviews;

create policy "reviews_select_valid_completed"
on public.reviews for select
to authenticated
using (
  exists (
    select 1
    from public.jobs j
    where j.id = job_id
      and j.status = 'completed'
      and j.accepted_provider_id is not null
      and j.accepted_provider_id <> coalesce(j.client_id, j.owner_id)
      and (
        (reviewer_id = coalesce(j.client_id, j.owner_id) and reviewee_id = j.accepted_provider_id)
        or
        (reviewer_id = j.accepted_provider_id and reviewee_id = coalesce(j.client_id, j.owner_id))
      )
      and exists (
        select 1
        from public.conversations c
        where c.job_id = j.id
          and c.client_id = coalesce(j.client_id, j.owner_id)
          and c.provider_id = j.accepted_provider_id
          and c.hired_at is not null
      )
  )
);

create or replace function public.get_my_job_review_state(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  job_record public.jobs%rowtype;
  review_record public.reviews%rowtype;
  client_id uuid;
  target_reviewee_id uuid;
  reviewee_role text;
  reason text;
begin
  select * into job_record from public.jobs where id = p_job_id;
  if job_record.id is null then
    return jsonb_build_object('eligible', false, 'reason', 'not_found');
  end if;

  client_id := coalesce(job_record.client_id, job_record.owner_id);

  if auth.uid() = client_id then
    target_reviewee_id := job_record.accepted_provider_id;
    reviewee_role := 'worker';
  elsif auth.uid() = job_record.accepted_provider_id then
    target_reviewee_id := client_id;
    reviewee_role := 'client';
  else
    return jsonb_build_object('eligible', false, 'reason', 'not_participant');
  end if;

  if target_reviewee_id is null or target_reviewee_id = auth.uid() then
    return jsonb_build_object('eligible', false, 'reason', 'invalid_counterparty');
  end if;

  select *
  into review_record
  from public.reviews
  where job_id = p_job_id
    and reviewer_id = auth.uid()
    and reviewee_id = target_reviewee_id;

  if review_record.id is not null then
    return jsonb_build_object(
      'eligible', false,
      'reason', 'already_reviewed',
      'revieweeId', target_reviewee_id,
      'revieweeRole', reviewee_role,
      'review', jsonb_build_object(
        'id', review_record.id,
        'rating', review_record.rating,
        'comment', review_record.comment,
        'createdAt', review_record.created_at
      )
    );
  end if;

  if job_record.status <> 'completed' then
    reason := 'not_completed';
  elsif not public.is_verified_profile(auth.uid()) then
    reason := 'not_verified';
  elsif not exists (
    select 1
    from public.conversations c
    where c.job_id = job_record.id
      and c.client_id = client_id
      and c.provider_id = job_record.accepted_provider_id
      and c.hired_at is not null
  ) then
    reason := 'not_hired_participant';
  else
    reason := 'eligible';
  end if;

  return jsonb_build_object(
    'eligible', reason = 'eligible',
    'reason', reason,
    'revieweeId', target_reviewee_id,
    'revieweeRole', reviewee_role
  );
end;
$$;

revoke all on function public.get_my_job_review_state(uuid) from public;
grant execute on function public.get_my_job_review_state(uuid) to authenticated;

create or replace function public.create_completed_job_review(
  p_job_id uuid,
  p_rating integer,
  p_comment text default null
)
returns public.reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  state jsonb;
  created_review public.reviews%rowtype;
begin
  if p_rating < 1 or p_rating > 5 then
    raise exception 'Choose a rating from 1 to 5.';
  end if;

  state := public.get_my_job_review_state(p_job_id);
  if coalesce((state->>'eligible')::boolean, false) is not true then
    if state->>'reason' = 'already_reviewed' then
      raise exception 'You already reviewed this completed job.';
    end if;
    raise exception 'Reviews are available only to verified participants after a completed job.';
  end if;

  insert into public.reviews (job_id, reviewer_id, reviewee_id, rating, comment)
  values (
    p_job_id,
    auth.uid(),
    (state->>'revieweeId')::uuid,
    p_rating::smallint,
    nullif(left(trim(coalesce(p_comment, '')), 1000), '')
  )
  returning * into created_review;

  return created_review;
exception
  when unique_violation then
    raise exception 'You already reviewed this completed job.';
end;
$$;

revoke all on function public.create_completed_job_review(uuid, integer, text) from public;
grant execute on function public.create_completed_job_review(uuid, integer, text) to authenticated;

create or replace function public.get_public_profile_trust_summary(
  p_user_id uuid,
  p_role text,
  p_limit integer default 6
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  safe_limit integer := least(greatest(coalesce(p_limit, 6), 1), 12);
begin
  if p_role not in ('worker', 'client') then
    raise exception 'Choose worker or client trust history.';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_user_id
      and (
        public.is_verified_profile(p.id)
        or p.id = auth.uid()
        or public.is_barangay_admin()
      )
  ) then
    return null;
  end if;

  with valid_reviews as (
    select
      r.id,
      r.job_id,
      r.reviewer_id,
      r.reviewee_id,
      r.rating,
      r.comment,
      r.created_at,
      j.title as job_title,
      coalesce(j.service_needed, j.category) as service_label,
      coalesce(j.closed_at, j.updated_at) as completed_at
    from public.reviews r
    join public.jobs j on j.id = r.job_id and j.status = 'completed'
    where r.reviewee_id = p_user_id
      and (
        (
          p_role = 'worker'
          and j.accepted_provider_id = p_user_id
          and r.reviewer_id = coalesce(j.client_id, j.owner_id)
        )
        or
        (
          p_role = 'client'
          and coalesce(j.client_id, j.owner_id) = p_user_id
          and r.reviewer_id = j.accepted_provider_id
        )
      )
      and exists (
        select 1 from public.conversations c
        where c.job_id = j.id
          and c.client_id = coalesce(j.client_id, j.owner_id)
          and c.provider_id = j.accepted_provider_id
          and c.hired_at is not null
      )
  ),
  role_jobs as (
    select
      j.id,
      j.title,
      coalesce(j.service_needed, j.category) as service_label,
      coalesce(j.closed_at, j.updated_at) as completed_at
    from public.jobs j
    where j.status = 'completed'
      and (
        (p_role = 'worker' and j.accepted_provider_id = p_user_id)
        or
        (p_role = 'client' and coalesce(j.client_id, j.owner_id) = p_user_id)
      )
      and exists (
        select 1 from public.conversations c
        where c.job_id = j.id
          and c.client_id = coalesce(j.client_id, j.owner_id)
          and c.provider_id = j.accepted_provider_id
          and c.hired_at is not null
      )
  )
  select jsonb_build_object(
    'averageRating', (select avg(rating)::numeric(3,2) from valid_reviews),
    'reviewCount', (select count(*) from valid_reviews),
    'completedJobsCount', (select count(*) from role_jobs),
    'jobsPostedCount', (
      select case when p_role = 'client' then count(*) else 0 end
      from public.jobs j
      where coalesce(j.client_id, j.owner_id) = p_user_id
    ),
    'recentReviews', coalesce((
      select jsonb_agg(to_jsonb(review_rows) order by review_rows.created_at desc)
      from (
        select *
        from valid_reviews
        order by created_at desc
        limit safe_limit
      ) review_rows
    ), '[]'::jsonb),
    'recentHistory', coalesce((
      select jsonb_agg(to_jsonb(history_rows) order by history_rows.completed_at desc)
      from (
        select *
        from role_jobs
        order by completed_at desc
        limit safe_limit
      ) history_rows
    ), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

revoke all on function public.get_public_profile_trust_summary(uuid, text, integer) from public;
grant execute on function public.get_public_profile_trust_summary(uuid, text, integer) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversation_reads'
  ) then
    alter publication supabase_realtime add table public.conversation_reads;
  end if;
end
$$;

notify pgrst, 'reload schema';
