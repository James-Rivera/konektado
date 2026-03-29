-- Supabase schema additions for dual roles and verification
-- Run this in Supabase SQL editor. Assumes pgcrypto/uuid-ossp gen_random_uuid() available.

-- Add columns to profiles if missing
alter table if exists profiles
  add column if not exists active_role text check (active_role in ('provider','client')),
  add column if not exists verified_at timestamptz;

-- User roles table
create table if not exists user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('provider','client')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
create index if not exists idx_user_roles_user_id on user_roles(user_id);

-- Verification requests
create table if not exists verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','skipped')),
  notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_verifications_user_id on verifications(user_id);
create index if not exists idx_verifications_status on verifications(status);

-- Verification files (certifications, ID, experience proof)
create table if not exists verification_files (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references verifications(id) on delete cascade,
  file_type text not null check (file_type in ('certification','id_front','id_back','experience')),
  url text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_verification_files_verification_id on verification_files(verification_id);

-- Optional: structured certifications (if you want more than raw files)
create table if not exists certifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  file_url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_certifications_user_id on certifications(user_id);

-- Optional: jobs and applications (baseline marketplace tables)
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  location text,
  budget numeric,
  status text not null default 'open' check (status in ('open','in_progress','closed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_jobs_owner_id on jobs(owner_id);
create index if not exists idx_jobs_status on jobs(status);

create table if not exists job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  applicant_id uuid not null references profiles(id) on delete cascade,
  cover_letter text,
  status text not null default 'applied' check (status in ('applied','shortlisted','accepted','rejected','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_id, applicant_id)
);
create index if not exists idx_job_applications_job_id on job_applications(job_id);
create index if not exists idx_job_applications_applicant_id on job_applications(applicant_id);
