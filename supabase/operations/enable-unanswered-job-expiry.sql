-- Run as the database owner after applying the expiry migration in an approved environment.
-- The deployment checklist requires a read-only preview of eligible existing jobs first.
begin;
create extension if not exists pg_cron;
select cron.schedule(
  'konektado-expire-unanswered-jobs',
  '*/5 * * * *',
  'select app_private.expire_unanswered_jobs();'
);
commit;
