-- Demo-ready pricing units for the range-based marketplace model.
-- Existing values remain valid; these additional text values let cards render
-- local units such as / load, / visit, / job, / order, / meal, and / session.

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
  check (
    rate_type in (
      'per_service',
      'hourly',
      'daily',
      'weekly',
      'per_project',
      'per_job',
      'per_visit',
      'per_load',
      'per_order',
      'per_meal',
      'per_session'
    )
  );

alter table public.services
  add constraint services_rate_type_supported
  check (
    rate_type in (
      'per_service',
      'hourly',
      'daily',
      'weekly',
      'per_project',
      'per_job',
      'per_visit',
      'per_load',
      'per_order',
      'per_meal',
      'per_session'
    )
  );

alter table public.jobs
  add constraint jobs_rate_type_supported
  check (
    rate_type in (
      'per_service',
      'hourly',
      'daily',
      'weekly',
      'per_project',
      'per_job',
      'per_visit',
      'per_load',
      'per_order',
      'per_meal',
      'per_session'
    )
  );

alter table public.job_drafts
  add constraint job_drafts_rate_type_supported
  check (
    rate_type in (
      'per_service',
      'hourly',
      'daily',
      'weekly',
      'per_project',
      'per_job',
      'per_visit',
      'per_load',
      'per_order',
      'per_meal',
      'per_session'
    )
  );
