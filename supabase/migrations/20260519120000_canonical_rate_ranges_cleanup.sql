-- Keep marketplace pricing range-based while preserving legacy columns for old clients.
-- This migration is intentionally non-destructive: it backfills canonical min/max
-- columns where an older single amount exists, then documents legacy fields.

update public.jobs
set
  budget_min = coalesce(budget_min, budget_amount, budget),
  budget_max = coalesce(budget_max, budget_amount, budget)
where budget_min is null
  or budget_max is null;

update public.job_drafts
set
  budget_min = coalesce(budget_min, budget_amount),
  budget_max = coalesce(budget_max, budget_amount)
where budget_min is null
  or budget_max is null;

update public.provider_profiles
set
  rate_max = rate_min
where rate_min is not null
  and rate_max is null;

update public.provider_profiles
set
  rate_min = rate_max
where rate_max is not null
  and rate_min is null;

update public.services
set
  rate_max = rate_min
where rate_min is not null
  and rate_max is null;

update public.services
set
  rate_min = rate_max
where rate_max is not null
  and rate_min is null;

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

update public.provider_profiles
set
  rate_negotiable = true,
  rate_type = 'per_project'
where rate_type = 'negotiable';

update public.services
set
  rate_negotiable = true,
  rate_type = 'per_service'
where rate_type = 'negotiable';

comment on column public.jobs.budget is
  'Deprecated legacy fixed budget. New app code writes and reads budget_min/budget_max.';
comment on column public.jobs.budget_amount is
  'Deprecated legacy fixed budget amount. New app code writes and reads budget_min/budget_max.';
comment on column public.job_drafts.budget_amount is
  'Deprecated legacy fixed draft budget amount. New app code writes and reads budget_min/budget_max.';
comment on column public.provider_profiles.rate_text is
  'Optional public rate note only. Numeric pricing uses rate_min/rate_max plus rate_type.';
comment on column public.services.rate_text is
  'Optional public rate note only. Numeric pricing uses rate_min/rate_max plus rate_type.';
