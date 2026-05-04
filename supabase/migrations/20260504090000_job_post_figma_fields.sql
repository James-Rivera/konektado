-- Verified Post flow fields from the Figma job-post builder.

alter table public.jobs
  add column if not exists tags text[] not null default '{}',
  add column if not exists workers_needed integer,
  add column if not exists allow_messages boolean not null default true,
  add column if not exists auto_reply_enabled boolean not null default false,
  add column if not exists auto_close_enabled boolean not null default false;

alter table public.jobs
  drop constraint if exists jobs_workers_needed_positive,
  add constraint jobs_workers_needed_positive
    check (workers_needed is null or workers_needed > 0);
