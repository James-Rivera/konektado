-- Phase 0A: keep verification documents private and review requests atomically.

insert into storage.buckets (id, name, public)
values ('verification-files', 'verification-files', false)
on conflict (id) do update
set public = false;

alter table public.verification_files
  add column if not exists file_path text;

alter table public.verification_files
  alter column url drop not null;

update public.verification_files
set file_path = case
  when url is null then file_path
  when url like '%/storage/v1/object/public/verification-files/%' then
    regexp_replace(
      split_part(url, '/storage/v1/object/public/verification-files/', 2),
      '\?.*$',
      ''
    )
  when url !~* '^https?://' then url
  else file_path
end
where file_path is null;

comment on column public.verification_files.url is
  'Legacy public URL field. New verification uploads store private storage object paths in file_path.';

comment on column public.verification_files.file_path is
  'Private storage object path in the verification-files bucket. Serve through signed URLs only.';

drop policy if exists "verification_files_storage_select_own" on storage.objects;
drop policy if exists "verification_files_storage_select_owner_admin" on storage.objects;
create policy "verification_files_storage_select_owner_admin"
on storage.objects for select
to authenticated
using (
  bucket_id = 'verification-files'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_barangay_admin()
  )
);

drop policy if exists "verification_files_storage_insert_own" on storage.objects;
create policy "verification_files_storage_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'verification-files'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create or replace function public.review_verification_request_atomic(
  p_request_id uuid,
  p_decision text,
  p_reviewer_note text default null
)
returns table (
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
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_reviewer_id uuid := auth.uid();
  v_note text := nullif(trim(coalesce(p_reviewer_note, '')), '');
  v_request public.verifications%rowtype;
begin
  if not public.is_barangay_admin() then
    raise exception 'Barangay admin access is required.';
  end if;

  if v_reviewer_id is null then
    raise exception 'Please sign in again to continue.';
  end if;

  if p_decision not in ('approved', 'rejected', 'needs_more_info') then
    raise exception 'Unsupported verification decision.';
  end if;

  if p_decision <> 'approved' and v_note is null then
    raise exception 'Enter a reviewer note before saving this review.';
  end if;

  update public.verifications
  set
    status = p_decision,
    reviewer_id = v_reviewer_id,
    reviewer_note = v_note,
    reviewed_at = v_now
  where public.verifications.id = p_request_id
    and public.verifications.status = 'pending'
  returning * into v_request;

  if not found then
    raise exception 'This request is no longer pending.';
  end if;

  if p_decision = 'approved' then
    update public.profiles
    set
      barangay_verified_at = v_now,
      verified_at = v_now,
      updated_at = v_now
    where public.profiles.id = v_request.user_id;

    if not found then
      raise exception 'Profile not found for this verification request.';
    end if;
  end if;

  return query
  select
    v_request.id,
    v_request.user_id,
    v_request.status,
    v_request.notes,
    v_request.reviewer_id,
    v_request.reviewer_note,
    v_request.reviewed_at,
    v_request.created_at,
    v_request.updated_at;
end;
$$;

revoke all on function public.review_verification_request_atomic(uuid, text, text) from public;
grant execute on function public.review_verification_request_atomic(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
