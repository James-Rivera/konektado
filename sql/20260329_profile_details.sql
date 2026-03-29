-- Profile enrichment columns for Slice 2
-- Run this in Supabase SQL editor. Adjust data types as needed if columns already exist.

alter table profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists birthdate date,
  add column if not exists street_address text,
  add column if not exists city text,
  add column if not exists service_type text,
  add column if not exists phone text,
  add column if not exists about text,
  add column if not exists availability text,
  add column if not exists verified_at timestamptz,
  add column if not exists has_certifications boolean default false,
  add column if not exists certification_details text,
  add column if not exists certification_status text default 'not_required';

-- Ensure authenticated users can read their own rows (adjust policy name if it already exists)
-- create policy "Profiles readable by owner"
--   on profiles for select
--   using (auth.uid() = id);
