-- Profile builder readiness, required numeric rate ranges, and optional credentials.

alter table public.provider_profiles
  add column if not exists rate_negotiable boolean not null default false;

alter table public.services
  add column if not exists rate_negotiable boolean not null default false;

alter table public.jobs
  add column if not exists budget_negotiable boolean not null default false;

alter table public.job_drafts
  add column if not exists budget_negotiable boolean not null default false;

update public.provider_profiles
set
  rate_negotiable = true,
  rate_type = 'per_project'
where rate_type = 'negotiable';

update public.services
set
  rate_negotiable = true,
  rate_type = 'per_project'
where rate_type = 'negotiable';

update public.jobs
set
  budget_negotiable = true,
  rate_type = 'per_project'
where rate_type = 'negotiable';

update public.job_drafts
set
  budget_negotiable = true,
  rate_type = 'per_project'
where rate_type = 'negotiable';

alter table public.provider_profiles
  alter column rate_type set default 'per_project';

alter table public.services
  alter column rate_type set default 'per_service';

alter table public.jobs
  alter column rate_type set default 'per_project';

alter table public.job_drafts
  alter column rate_type set default 'per_project';

alter table public.provider_profiles
  drop constraint if exists provider_profiles_rate_type_supported;

alter table public.services
  drop constraint if exists services_rate_type_supported;

alter table public.jobs
  drop constraint if exists jobs_rate_type_supported;

alter table public.job_drafts
  drop constraint if exists job_drafts_rate_type_supported;

alter table public.provider_profiles
  add constraint provider_profiles_rate_type_supported
  check (rate_type in ('per_service', 'hourly', 'daily', 'weekly', 'per_project'));

alter table public.services
  add constraint services_rate_type_supported
  check (rate_type in ('per_service', 'hourly', 'daily', 'weekly', 'per_project'));

alter table public.jobs
  add constraint jobs_rate_type_supported
  check (rate_type in ('per_service', 'hourly', 'daily', 'weekly', 'per_project'));

alter table public.job_drafts
  add constraint job_drafts_rate_type_supported
  check (rate_type in ('per_service', 'hourly', 'daily', 'weekly', 'per_project'));

alter table public.provider_profiles
  drop constraint if exists provider_profiles_completed_rate_range_required;

alter table public.provider_profiles
  add constraint provider_profiles_completed_rate_range_required
  check (
    profile_completed_at is null
    or (
      rate_min is not null
      and rate_max is not null
      and rate_min > 0
      and rate_max >= rate_min
    )
  ) not valid;

alter table public.services
  drop constraint if exists services_active_rate_range_required;

alter table public.services
  add constraint services_active_rate_range_required
  check (
    is_active is not true
    or (
      rate_min is not null
      and rate_max is not null
      and rate_min > 0
      and rate_max >= rate_min
    )
  ) not valid;

alter table public.jobs
  drop constraint if exists jobs_publish_budget_range_required;

alter table public.jobs
  add constraint jobs_publish_budget_range_required
  check (
    status not in ('open', 'reviewing', 'in_progress')
    or (
      budget_min is not null
      and budget_max is not null
      and budget_min > 0
      and budget_max >= budget_min
    )
  ) not valid;

do $$
begin
  alter table public.verifications
    drop constraint if exists verifications_status_check;

  alter table public.verifications
    add constraint verifications_status_check
    check (status in ('pending', 'approved', 'rejected', 'needs_more_info', 'cancelled', 'skipped'));
end $$;

create table if not exists public.credentials (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  credential_type text not null check (
    credential_type in ('tesda', 'training_certificate', 'barangay_certificate', 'work_proof', 'portfolio', 'other')
  ),
  title text not null,
  issuer text,
  issued_at date,
  file_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewer_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists credentials_provider_id_idx on public.credentials(provider_id);
create index if not exists credentials_service_id_idx on public.credentials(service_id);
create index if not exists credentials_status_idx on public.credentials(status);

drop trigger if exists set_credentials_updated_at on public.credentials;
create trigger set_credentials_updated_at
before update on public.credentials
for each row execute function public.set_updated_at();

alter table public.credentials enable row level security;

drop policy if exists "credentials_select_own_or_admin" on public.credentials;
create policy "credentials_select_own_or_admin"
on public.credentials for select
using (
  auth.uid() = provider_id
  or public.is_barangay_admin()
);

drop policy if exists "credentials_insert_own" on public.credentials;
create policy "credentials_insert_own"
on public.credentials for insert
with check (auth.uid() = provider_id);

drop policy if exists "credentials_update_own_pending" on public.credentials;
create policy "credentials_update_own_pending"
on public.credentials for update
using (auth.uid() = provider_id and status in ('pending', 'rejected'))
with check (auth.uid() = provider_id);

drop policy if exists "credentials_review_admin" on public.credentials;
create policy "credentials_review_admin"
on public.credentials for update
using (public.is_barangay_admin())
with check (public.is_barangay_admin());

drop policy if exists "credentials_delete_own_pending" on public.credentials;
create policy "credentials_delete_own_pending"
on public.credentials for delete
using (auth.uid() = provider_id and status in ('pending', 'rejected'));

alter table public.verification_files
  add column if not exists credential_id uuid references public.credentials(id) on delete set null;

insert into storage.buckets (id, name, public)
values ('credential-files', 'credential-files', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "credential_files_select_owner_admin" on storage.objects;
create policy "credential_files_select_owner_admin"
on storage.objects for select
using (
  bucket_id = 'credential-files'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_barangay_admin()
  )
);

drop policy if exists "credential_files_insert_owner" on storage.objects;
create policy "credential_files_insert_owner"
on storage.objects for insert
with check (
  bucket_id = 'credential-files'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "credential_files_update_owner" on storage.objects;
create policy "credential_files_update_owner"
on storage.objects for update
using (
  bucket_id = 'credential-files'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'credential-files'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "credential_files_delete_owner" on storage.objects;
create policy "credential_files_delete_owner"
on storage.objects for delete
using (
  bucket_id = 'credential-files'
  and auth.uid()::text = (storage.foldername(name))[1]
);
