-- Narrow ordinary signed-in RPCs without removing public summaries or RLS helpers.
begin;

revoke execute on function public.archive_conversation(uuid) from public, anon;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
revoke execute on function public.create_completed_job_review(uuid, integer, text) from public, anon;
revoke execute on function public.get_my_conversation_inbox(boolean) from public, anon;
revoke execute on function public.review_verification_request_atomic(uuid, text, text) from public, anon;
revoke execute on function public.internal_demo_create_job(uuid, jsonb) from public, anon;
revoke execute on function public.internal_demo_create_job_draft(uuid, jsonb) from public, anon;
revoke execute on function public.internal_demo_create_service(uuid, jsonb) from public, anon;

grant execute on function public.archive_conversation(uuid),
  public.mark_conversation_read(uuid),
  public.create_completed_job_review(uuid, integer, text),
  public.get_my_conversation_inbox(boolean),
  public.review_verification_request_atomic(uuid, text, text),
  public.internal_demo_create_job(uuid, jsonb),
  public.internal_demo_create_job_draft(uuid, jsonb),
  public.internal_demo_create_service(uuid, jsonb)
to authenticated, service_role;

-- Existing triggers invoke these under their established trigger context.
-- EXECUTE is checked when a trigger is created, not on each triggering write.
revoke execute on function public.notify_job_completed(),
  public.notify_message_recipient(),
  public.notify_report_status_change(),
  public.notify_verification_status_change(),
  public.protect_notification_immutable_fields(),
  public.protect_report_immutable_fields(),
  public.require_consumed_contact_otp(),
  public.restore_conversation_on_new_message()
from public, anon, authenticated;

-- Both helpers remain invoker functions; pin resolution without elevating them.
create or replace function public.normalize_ph_mobile(value text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when pg_catalog.regexp_replace(coalesce(value, ''), '\D', '', 'g') ~ '^09[0-9]{9}$'
      then '63' || pg_catalog.substring(pg_catalog.regexp_replace(value, '\D', '', 'g'), 2)
    when pg_catalog.regexp_replace(coalesce(value, ''), '\D', '', 'g') ~ '^639[0-9]{9}$'
      then pg_catalog.regexp_replace(value, '\D', '', 'g')
    else null
  end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

-- Application migrations create functions as postgres. PUBLIC's global default
-- must be revoked globally; schema-specific revocation cannot remove it.
-- Managed supabase_admin defaults are outside this application migration scope.
-- Changing defaults does not alter existing helper/public-read grants.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

notify pgrst, 'reload schema';
commit;
