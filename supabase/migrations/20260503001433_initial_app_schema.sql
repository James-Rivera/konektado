-- Konektado initial app schema.
-- Supports the current onboarding flow:
-- email OTP -> password -> role -> profile/provider/client details.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'app_role'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.app_role as enum ('client', 'provider', 'barangay_admin');
  end if;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role public.app_role,
  active_role public.app_role,
  first_name text,
  last_name text,
  full_name text,
  birthdate date,
  barangay text default 'Barangay San Pedro',
  street_address text,
  city text default 'Sto. Tomas',
  phone text,
  about text,
  availability text,
  avatar_url text,
  verified_at timestamptz,
  barangay_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create index if not exists profiles_active_role_idx on public.profiles(active_role);
create index if not exists user_roles_user_id_idx on public.user_roles(user_id);
create index if not exists user_roles_role_idx on public.user_roles(role);

create table if not exists public.provider_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  service_type text,
  has_certifications boolean,
  certification_details text,
  certification_status text check (
    certification_status is null
    or certification_status in ('pending', 'approved', 'rejected')
  ),
  availability text,
  rate_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists provider_profiles_service_type_idx
on public.provider_profiles(service_type);

drop trigger if exists set_provider_profiles_updated_at on public.provider_profiles;
create trigger set_provider_profiles_updated_at
before update on public.provider_profiles
for each row execute function public.set_updated_at();

create table if not exists public.client_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_client_profiles_updated_at on public.client_profiles;
create trigger set_client_profiles_updated_at
before update on public.client_profiles
for each row execute function public.set_updated_at();

create table if not exists public.verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'cancelled', 'skipped')
  ),
  notes text,
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewer_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists verifications_user_id_idx on public.verifications(user_id);
create index if not exists verifications_status_idx on public.verifications(status);

drop trigger if exists set_verifications_updated_at on public.verifications;
create trigger set_verifications_updated_at
before update on public.verifications
for each row execute function public.set_updated_at();

create table if not exists public.verification_files (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.verifications(id) on delete cascade,
  file_type text not null check (
    file_type in ('certification', 'experience', 'id_front', 'id_back', 'other')
  ),
  url text not null,
  created_at timestamptz not null default now()
);

create index if not exists verification_files_verification_id_idx
on public.verification_files(verification_id);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  location text,
  budget numeric,
  status text not null default 'open' check (
    status in ('open', 'reviewing', 'in_progress', 'completed', 'closed', 'cancelled')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_owner_id_idx on public.jobs(owner_id);
create index if not exists jobs_status_idx on public.jobs(status);
create index if not exists jobs_created_at_idx on public.jobs(created_at desc);

drop trigger if exists set_jobs_updated_at on public.jobs;
create trigger set_jobs_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.provider_profiles enable row level security;
alter table public.client_profiles enable row level security;
alter table public.verifications enable row level security;
alter table public.verification_files enable row level security;
alter table public.jobs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "user_roles_select_own" on public.user_roles;
create policy "user_roles_select_own"
on public.user_roles for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_roles_insert_own_non_admin" on public.user_roles;
create policy "user_roles_insert_own_non_admin"
on public.user_roles for insert
to authenticated
with check (user_id = auth.uid() and role in ('client', 'provider'));

drop policy if exists "user_roles_update_own_non_admin" on public.user_roles;
create policy "user_roles_update_own_non_admin"
on public.user_roles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and role in ('client', 'provider'));

drop policy if exists "provider_profiles_select_own" on public.provider_profiles;
create policy "provider_profiles_select_own"
on public.provider_profiles for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "provider_profiles_insert_own" on public.provider_profiles;
create policy "provider_profiles_insert_own"
on public.provider_profiles for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "provider_profiles_update_own" on public.provider_profiles;
create policy "provider_profiles_update_own"
on public.provider_profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "client_profiles_select_own" on public.client_profiles;
create policy "client_profiles_select_own"
on public.client_profiles for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "client_profiles_insert_own" on public.client_profiles;
create policy "client_profiles_insert_own"
on public.client_profiles for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "client_profiles_update_own" on public.client_profiles;
create policy "client_profiles_update_own"
on public.client_profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "verifications_select_own" on public.verifications;
create policy "verifications_select_own"
on public.verifications for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "verifications_insert_own" on public.verifications;
create policy "verifications_insert_own"
on public.verifications for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "verifications_update_own_pending" on public.verifications;
create policy "verifications_update_own_pending"
on public.verifications for update
to authenticated
using (user_id = auth.uid() and status in ('pending', 'skipped'))
with check (user_id = auth.uid() and status in ('pending', 'skipped', 'cancelled'));

drop policy if exists "verification_files_select_own" on public.verification_files;
create policy "verification_files_select_own"
on public.verification_files for select
to authenticated
using (
  exists (
    select 1 from public.verifications v
    where v.id = verification_id
      and v.user_id = auth.uid()
  )
);

drop policy if exists "verification_files_insert_own" on public.verification_files;
create policy "verification_files_insert_own"
on public.verification_files for insert
to authenticated
with check (
  exists (
    select 1 from public.verifications v
    where v.id = verification_id
      and v.user_id = auth.uid()
  )
);

drop policy if exists "jobs_select_open_or_own" on public.jobs;
create policy "jobs_select_open_or_own"
on public.jobs for select
to authenticated
using (status = 'open' or owner_id = auth.uid());

drop policy if exists "jobs_insert_own" on public.jobs;
create policy "jobs_insert_own"
on public.jobs for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "jobs_update_own" on public.jobs;
create policy "jobs_update_own"
on public.jobs for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('verification-files', 'verification-files', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "verification_files_storage_select_own" on storage.objects;
create policy "verification_files_storage_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'verification-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "verification_files_storage_insert_own" on storage.objects;
create policy "verification_files_storage_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'verification-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

notify pgrst, 'reload schema';
