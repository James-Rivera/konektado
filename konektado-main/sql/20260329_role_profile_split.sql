-- Role profile split: shared identity in profiles, role-specific details in dedicated tables.
-- Run in Supabase SQL editor.

create table if not exists provider_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  service_type text,
  has_certifications boolean,
  certification_details text,
  certification_status text check (certification_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists client_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_provider_profiles_user_id on provider_profiles(user_id);
create index if not exists idx_client_profiles_user_id on client_profiles(user_id);

-- Backfill provider snapshots from existing profile data.
insert into provider_profiles (user_id, service_type, has_certifications, certification_details, certification_status)
select
  p.id,
  p.service_type,
  p.has_certifications,
  p.certification_details,
  null
from profiles p
where p.service_type is not null
   or p.has_certifications is not null
   or p.certification_details is not null
on conflict (user_id) do update
set
  service_type = excluded.service_type,
  has_certifications = excluded.has_certifications,
  certification_details = excluded.certification_details,
  certification_status = excluded.certification_status,
  updated_at = now();

-- Seed minimal client rows for users with client role.
insert into client_profiles (user_id)
select p.id
from profiles p
where p.active_role = 'client' or p.role = 'client'
on conflict (user_id) do nothing;
