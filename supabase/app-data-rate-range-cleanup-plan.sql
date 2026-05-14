-- Konektado app-data rate range cleanup plan.
-- This file is intentionally NOT in supabase/migrations, so it will not run
-- during supabase db push. Review and run manually only after approval.
--
-- Safety boundary:
-- - Do not delete from auth.users.
-- - Do not reset Supabase Auth.
-- - Keep profile rows unless there is a specific profile cleanup decision.
--
-- Main app-data tables touched by rate/backfill:
-- - public.jobs
-- - public.job_drafts
-- - public.services
-- - public.provider_profiles
--
-- App-content tables that reference jobs/services if a reseed is later approved:
-- - public.messages -> public.conversations
-- - public.conversations -> public.jobs, public.services
-- - public.reviews -> public.profiles/auth users
-- - public.saved_items, if present in the target database

-- Option A: non-destructive backfill. Safe to run after review.
begin;

update public.jobs
set
  budget_min = coalesce(budget_min, budget_amount, budget),
  budget_max = coalesce(budget_max, budget_amount, budget),
  rate_type = case
    when rate_type is null or rate_type = '' then
      case when coalesce(budget_amount, budget) is null then 'negotiable' else 'per_project' end
    else rate_type
  end
where
  budget_min is null
  or budget_max is null
  or rate_type is null
  or rate_type = '';

update public.job_drafts
set
  budget_min = coalesce(budget_min, budget_amount),
  budget_max = coalesce(budget_max, budget_amount),
  rate_type = case
    when rate_type is null or rate_type = '' then
      case when budget_amount is null then 'negotiable' else 'per_project' end
    else rate_type
  end
where
  budget_min is null
  or budget_max is null
  or rate_type is null
  or rate_type = '';

update public.services
set
  rate_type = coalesce(nullif(rate_type, ''), 'negotiable')
where rate_type is null or rate_type = '';

update public.provider_profiles
set
  rate_type = coalesce(nullif(rate_type, ''), 'negotiable')
where rate_type is null or rate_type = '';

-- Known hosted demo rows: convert old single text/amount demo content into
-- believable structured ranges. These IDs are from supabase/seed.sql.
update public.services
set rate_text = null, rate_min = 500, rate_max = 1500, rate_type = 'per_project',
    experience_level = 'experienced', certification_available = true
where id = '00000000-0000-4000-9000-000000002001';

update public.services
set rate_text = null, rate_min = 300, rate_max = 800, rate_type = 'per_project',
    experience_level = 'intermediate', certification_available = true
where id = '00000000-0000-4000-9000-000000002002';

update public.services
set rate_text = null, rate_min = 300, rate_max = 600, rate_type = 'per_project',
    experience_level = 'experienced', certification_available = true
where id = '00000000-0000-4000-9000-000000002003';

update public.services
set rate_text = null, rate_min = 250, rate_max = 500, rate_type = 'per_project',
    experience_level = 'intermediate', certification_available = false
where id = '00000000-0000-4000-9000-000000002004';

update public.services
set rate_text = null, rate_min = 400, rate_max = 1000, rate_type = 'per_project',
    experience_level = 'intermediate', certification_available = false
where id = '00000000-0000-4000-9000-000000002005';

update public.jobs
set budget = 500, budget_amount = 500, budget_min = 500, budget_max = 1500,
    rate_type = 'per_project', experience_level = 'intermediate',
    certification_required = false, certification_note = null
where id = '00000000-0000-4000-9000-000000001001';

update public.jobs
set budget = 300, budget_amount = 300, budget_min = 300, budget_max = 600,
    rate_type = 'per_project', experience_level = 'any',
    certification_required = false, certification_note = null
where id = '00000000-0000-4000-9000-000000001002';

update public.jobs
set budget = 500, budget_amount = 500, budget_min = 500, budget_max = 1000,
    rate_type = 'per_project', experience_level = 'intermediate',
    certification_required = true, certification_note = 'Experience with printer setup preferred.'
where id = '00000000-0000-4000-9000-000000001003';

update public.jobs
set budget = 500, budget_amount = 500, budget_min = 500, budget_max = 900,
    rate_type = 'per_project', experience_level = 'intermediate',
    certification_required = false, certification_note = null
where id = '00000000-0000-4000-9000-000000001004';

update public.jobs
set budget = 400, budget_amount = 400, budget_min = 400, budget_max = 900,
    rate_type = 'per_project', experience_level = 'beginner',
    certification_required = false, certification_note = null
where id = '00000000-0000-4000-9000-000000001005';

update public.jobs
set budget = 500, budget_amount = 500, budget_min = 500, budget_max = 1000,
    rate_type = 'per_project', experience_level = 'beginner',
    certification_required = false, certification_note = null
where id = '00000000-0000-4000-9000-000000001006';

commit;

-- Option B: app-content reseed only. Do not run unless explicitly approved.
-- Keep auth.users.
-- Delete child tables first, then app content:
--
-- begin;
-- delete from public.messages where conversation_id in (select id from public.conversations);
-- delete from public.conversations;
-- delete from public.reviews;
-- delete from public.jobs;
-- delete from public.job_drafts;
-- delete from public.services;
-- -- Optional if present in the target schema:
-- -- delete from public.saved_items;
-- commit;
