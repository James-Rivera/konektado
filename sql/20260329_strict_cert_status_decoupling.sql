-- Strict certification_status decoupling
-- Goal: provider_profiles is the only source of certification_status.

-- 1) Ensure provider_profiles has certification_status (safe if already present).
alter table if exists provider_profiles
  add column if not exists certification_status text
  check (certification_status in ('pending', 'approved', 'rejected'));

-- 2) Optional backfill from profiles when legacy column exists.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'certification_status'
  ) then
    update provider_profiles pp
    set certification_status = p.certification_status
    from profiles p
    where pp.user_id = p.id
      and p.certification_status in ('pending', 'approved', 'rejected')
      and pp.certification_status is null;
  end if;
end $$;

-- 3) Remove legacy column from shared profiles (strict mode).
alter table if exists profiles
  drop column if exists certification_status;
