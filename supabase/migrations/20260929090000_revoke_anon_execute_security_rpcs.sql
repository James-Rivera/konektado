-- Corrective migration for 20260913090000_security_permission_boundaries.sql.
--
-- That migration intended these functions to be callable by signed-in users
-- only: each one runs `revoke all ... from public` and then
-- `grant execute ... to authenticated`. Supabase's default privileges grant
-- EXECUTE on new public-schema functions directly to `anon` as well, and
-- revoking from PUBLIC does not remove a grant made to a specific role. After
-- the 2026-09-29 push, anonymous REST calls still executed them.
--
-- Revoking from `anon` leaves every real caller working:
--   - The app calls get_public_approved_credentials, get_job_private_location_notes,
--     mark_job_worker_hired, complete_hired_job, and get_my_job_review_state only
--     from signed-in screens, so those requests run as `authenticated`.
--   - is_marketplace_ready, can_start_marketplace_conversation, and
--     can_send_marketplace_message are used in two places only. The RLS
--     policies that call them (jobs, services, conversations, messages) are all
--     declared `to authenticated`, so `anon` never evaluates them. The rest are
--     calls inside SECURITY DEFINER functions, which check EXECUTE as the
--     function owner, not the caller.
-- The `authenticated` and `service_role` grants are untouched.

begin;

revoke execute on function public.get_public_approved_credentials(uuid) from anon;
revoke execute on function public.is_marketplace_ready(uuid, text) from anon;
revoke execute on function public.get_job_private_location_notes(uuid) from anon;
revoke execute on function public.can_start_marketplace_conversation(uuid, uuid, uuid, uuid) from anon;
revoke execute on function public.can_send_marketplace_message(uuid) from anon;
revoke execute on function public.mark_job_worker_hired(uuid) from anon;
revoke execute on function public.complete_hired_job(uuid) from anon;
revoke execute on function public.get_my_job_review_state(uuid) from anon;

notify pgrst, 'reload schema';

commit;
