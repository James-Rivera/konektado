-- Structured service selection for job posts and private drafts.

alter table public.jobs
  add column if not exists service_needed text;

alter table public.job_drafts
  add column if not exists service_needed text;
