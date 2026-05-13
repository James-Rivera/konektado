-- Adviser marketplace refinements.
-- Keeps public discovery privacy-safe while storing exact details for owner,
-- barangay/admin review, or private coordination.

alter table public.profiles
  add column if not exists preferred_contact_method text,
  add column if not exists purok_sitio text,
  add column if not exists street text,
  add column if not exists block_lot text,
  add column if not exists house_number text;

alter table public.provider_profiles
  add column if not exists rate_min numeric,
  add column if not exists rate_max numeric,
  add column if not exists rate_type text not null default 'negotiable',
  add column if not exists custom_offered_services text[] not null default '{}',
  add column if not exists custom_service_review_status text not null default 'none';

alter table public.client_profiles
  add column if not exists custom_needed_services text[] not null default '{}';

alter table public.jobs
  add column if not exists public_location_text text,
  add column if not exists private_location_notes text,
  add column if not exists budget_min numeric,
  add column if not exists budget_max numeric,
  add column if not exists rate_type text not null default 'negotiable',
  add column if not exists experience_level text not null default 'any',
  add column if not exists certification_required boolean not null default false,
  add column if not exists certification_note text;

alter table public.job_drafts
  add column if not exists public_location_text text,
  add column if not exists private_location_notes text,
  add column if not exists budget_min numeric,
  add column if not exists budget_max numeric,
  add column if not exists rate_type text not null default 'negotiable',
  add column if not exists experience_level text not null default 'any',
  add column if not exists certification_required boolean not null default false,
  add column if not exists certification_note text;

alter table public.services
  add column if not exists rate_min numeric,
  add column if not exists rate_max numeric,
  add column if not exists rate_type text not null default 'negotiable',
  add column if not exists experience_level text not null default 'any',
  add column if not exists certification_available boolean not null default false,
  add column if not exists certification_note text,
  add column if not exists custom_category text,
  add column if not exists custom_category_review_status text not null default 'none';

update public.jobs
set
  public_location_text = coalesce(public_location_text, location_text, location, barangay),
  budget_min = coalesce(budget_min, budget_amount, budget),
  budget_max = coalesce(budget_max, budget_amount, budget),
  rate_type = case
    when rate_type is null or rate_type = '' then
      case when coalesce(budget_amount, budget) is null then 'negotiable' else 'per_project' end
    else rate_type
  end;

update public.job_drafts
set
  public_location_text = coalesce(public_location_text, location_text, barangay),
  budget_min = coalesce(budget_min, budget_amount),
  budget_max = coalesce(budget_max, budget_amount),
  rate_type = case
    when rate_type is null or rate_type = '' then
      case when budget_amount is null then 'negotiable' else 'per_project' end
    else rate_type
  end;

update public.services
set rate_type = coalesce(nullif(rate_type, ''), 'negotiable');

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_contact_method_supported'
  ) then
    alter table public.profiles
      add constraint profiles_contact_method_supported
      check (
        preferred_contact_method is null
        or preferred_contact_method in ('app_message', 'phone', 'email')
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'provider_profiles_rate_range_valid'
  ) then
    alter table public.provider_profiles
      add constraint provider_profiles_rate_range_valid
      check (
        (rate_min is null or rate_min >= 0)
        and (rate_max is null or rate_max >= 0)
        and (rate_min is null or rate_max is null or rate_min <= rate_max)
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'provider_profiles_rate_type_supported'
  ) then
    alter table public.provider_profiles
      add constraint provider_profiles_rate_type_supported
      check (rate_type in ('hourly', 'daily', 'per_project', 'negotiable'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'provider_profiles_custom_service_review_status_supported'
  ) then
    alter table public.provider_profiles
      add constraint provider_profiles_custom_service_review_status_supported
      check (custom_service_review_status in ('none', 'pending', 'approved', 'rejected'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'jobs_budget_range_valid'
  ) then
    alter table public.jobs
      add constraint jobs_budget_range_valid
      check (
        (budget_min is null or budget_min >= 0)
        and (budget_max is null or budget_max >= 0)
        and (budget_min is null or budget_max is null or budget_min <= budget_max)
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'jobs_rate_type_supported'
  ) then
    alter table public.jobs
      add constraint jobs_rate_type_supported
      check (rate_type in ('hourly', 'daily', 'per_project', 'negotiable'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'jobs_experience_level_supported'
  ) then
    alter table public.jobs
      add constraint jobs_experience_level_supported
      check (experience_level in ('any', 'beginner', 'intermediate', 'experienced'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'job_drafts_budget_range_valid'
  ) then
    alter table public.job_drafts
      add constraint job_drafts_budget_range_valid
      check (
        (budget_min is null or budget_min >= 0)
        and (budget_max is null or budget_max >= 0)
        and (budget_min is null or budget_max is null or budget_min <= budget_max)
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'job_drafts_rate_type_supported'
  ) then
    alter table public.job_drafts
      add constraint job_drafts_rate_type_supported
      check (rate_type in ('hourly', 'daily', 'per_project', 'negotiable'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'job_drafts_experience_level_supported'
  ) then
    alter table public.job_drafts
      add constraint job_drafts_experience_level_supported
      check (experience_level in ('any', 'beginner', 'intermediate', 'experienced'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'services_rate_range_valid'
  ) then
    alter table public.services
      add constraint services_rate_range_valid
      check (
        (rate_min is null or rate_min >= 0)
        and (rate_max is null or rate_max >= 0)
        and (rate_min is null or rate_max is null or rate_min <= rate_max)
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'services_rate_type_supported'
  ) then
    alter table public.services
      add constraint services_rate_type_supported
      check (rate_type in ('hourly', 'daily', 'per_project', 'negotiable'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'services_experience_level_supported'
  ) then
    alter table public.services
      add constraint services_experience_level_supported
      check (experience_level in ('any', 'beginner', 'intermediate', 'experienced'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'services_custom_category_review_status_supported'
  ) then
    alter table public.services
      add constraint services_custom_category_review_status_supported
      check (custom_category_review_status in ('none', 'pending', 'approved', 'rejected'));
  end if;
end $$;

create index if not exists jobs_budget_range_idx on public.jobs(budget_min, budget_max);
create index if not exists jobs_experience_level_idx on public.jobs(experience_level);
create index if not exists jobs_certification_required_idx on public.jobs(certification_required);
create index if not exists services_rate_range_idx on public.services(rate_min, rate_max);
create index if not exists services_experience_level_idx on public.services(experience_level);
create index if not exists services_certification_available_idx on public.services(certification_available);

notify pgrst, 'reload schema';
