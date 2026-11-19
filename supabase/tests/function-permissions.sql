-- Disposable local database only, after all migrations. Fixtures roll back.
\set ON_ERROR_STOP on
begin;
create function pg_temp.assert_permission(label text, actual boolean) returns void
language plpgsql security invoker as $$
begin
  if actual is distinct from true then raise exception 'FAIL: %', label; end if;
  raise notice 'PASS: %', label;
end;
$$;
create function pg_temp.assert_rejected(label text, statement text, expected_state text) returns void
language plpgsql security invoker as $$
declare actual_state text;
begin
  begin
    execute statement;
  exception when others then
    get stacked diagnostics actual_state = returned_sqlstate;
    if actual_state <> expected_state then
      raise exception 'FAIL: %, expected SQLSTATE %, got %', label, expected_state, actual_state;
    end if;
    raise notice 'PASS denied: %', label;
    return;
  end;
  raise exception 'FAIL: % unexpectedly succeeded', label;
end;
$$;
grant execute on function pg_temp.assert_permission(text, boolean),
  pg_temp.assert_rejected(text, text, text) to anon, authenticated, service_role;

do $$
declare signature text; function_id oid;
begin
  foreach signature in array array[
    'public.archive_conversation(uuid)',
    'public.mark_conversation_read(uuid)',
    'public.create_completed_job_review(uuid,integer,text)',
    'public.get_my_conversation_inbox(boolean)',
    'public.get_public_profile_trust_summary(uuid,text,integer)',
    'public.review_verification_request_atomic(uuid,text,text)',
    'public.internal_demo_create_job(uuid,jsonb)',
    'public.internal_demo_create_job_draft(uuid,jsonb)',
    'public.internal_demo_create_service(uuid,jsonb)'
  ] loop
    function_id := signature::regprocedure;
    perform pg_temp.assert_permission(signature || ' denies anon', not has_function_privilege('anon', function_id, 'EXECUTE'));
    perform pg_temp.assert_permission(signature || ' permits authenticated', has_function_privilege('authenticated', function_id, 'EXECUTE'));
    perform pg_temp.assert_permission(signature || ' permits service backend', has_function_privilege('service_role', function_id, 'EXECUTE'));
    perform pg_temp.assert_permission(signature || ' has no PUBLIC execute', not exists(
      select 1 from pg_proc p, lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
      where p.oid = function_id and a.grantee = 0 and a.privilege_type = 'EXECUTE'));
  end loop;
  foreach signature in array array[
    'public.get_public_profile_summaries(uuid[])',
    'public.get_public_client_profile_summaries(uuid[])',
    'public.get_public_provider_profile_summaries(uuid[])',
    'public.is_barangay_admin()', 'public.is_verified_profile(uuid)'
  ] loop
    perform pg_temp.assert_permission(signature || ' retains anonymous dependencies', has_function_privilege('anon', signature, 'EXECUTE'));
    perform pg_temp.assert_permission(signature || ' retains authenticated dependencies', has_function_privilege('authenticated', signature, 'EXECUTE'));
  end loop;
  foreach signature in array array[
    'public.notify_job_completed()', 'public.notify_message_recipient()',
    'public.notify_report_status_change()', 'public.notify_verification_status_change()',
    'public.protect_notification_immutable_fields()', 'public.protect_report_immutable_fields()',
    'public.require_consumed_contact_otp()', 'public.restore_conversation_on_new_message()'
  ] loop
    perform pg_temp.assert_permission(signature || ' denies client direct execution',
      not has_function_privilege('anon', signature, 'EXECUTE') and not has_function_privilege('authenticated', signature, 'EXECUTE'));
    perform pg_temp.assert_permission(signature || ' retains installed trigger', exists(
      select 1 from pg_trigger where tgfoid = signature::regprocedure and not tgisinternal and tgenabled <> 'D'));
  end loop;
  foreach signature in array array['public.normalize_ph_mobile(text)', 'public.set_updated_at()'] loop
    perform pg_temp.assert_permission(signature || ' remains invoker with pinned path', exists(
      select 1 from pg_proc where oid = signature::regprocedure and not prosecdef and proconfig @> array['search_path=""']));
  end loop;
end;
$$;

-- Creation under the canonical migration role proves defaults, including
-- PUBLIC inheritance. Explicit service-role defaults must remain available.
create function public.function_permissions_default_probe() returns integer
language sql as $$ select 1 $$;
select pg_temp.assert_permission('new functions default deny anon/authenticated',
  not has_function_privilege('anon', 'public.function_permissions_default_probe()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.function_permissions_default_probe()', 'EXECUTE'));
select pg_temp.assert_permission('new functions retain backend default',
  has_function_privilege('service_role', 'public.function_permissions_default_probe()', 'EXECUTE'));

insert into auth.users(id, email)
select ('92000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  'function-permissions-' || i || '@example.test' from generate_series(1,4) i;
insert into public.profiles(id, full_name, first_name, last_name, street, preferred_contact_method,
  verified_at, barangay_verified_at)
select id, 'Permission Fixture', 'Permission', 'Fixture', 'Test area', 'app_message',
  case when right(id::text, 1) = '4' then null else now() end,
  case when right(id::text, 1) = '4' then null else now() end
from auth.users where id::text like '92000000-%';
insert into public.user_roles(user_id, role)
values ('92000000-0000-4000-8000-000000000001', 'barangay_admin');
insert into public.provider_profiles(user_id, service_type, headline, bio, service_area, availability)
select id, 'Cleaning', 'Local help', 'Careful cleaning', 'San Pedro', 'Weekends'
from public.profiles where id::text like '92000000-%';
insert into public.client_profiles(user_id, headline, bio, needed_services, coordination_style, preferred_schedule)
select id, 'Local hiring', 'Local work', array['Cleaning'], 'In app', 'Weekends'
from public.profiles where id::text like '92000000-%';
insert into public.jobs(id, owner_id, client_id, title, description, category, service_needed,
  barangay, location_text, budget_min, budget_max, rate_type, allow_messages,
  workers_needed, scheduled_date, time_preference, schedule_flexibility, schedule_timezone)
values ('83000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000002',
  'Permission test', 'Local cleaning', 'Home & Local Help', 'Cleaning', 'San Pedro', 'San Pedro', 100, 200, 'per_job', true,
  1, current_date + 1, 'morning', 'flexible', 'Asia/Manila');
insert into public.conversations(id, job_id, client_id, provider_id, started_by)
values ('85000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000003',
  '92000000-0000-4000-8000-000000000003');

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select pg_temp.assert_rejected('anonymous RPC grant denial',
  $q$select public.get_my_conversation_inbox(false)$q$, '42501');
select pg_temp.assert_permission('anonymous safe summary still works', exists(
  select 1 from public.get_public_profile_summaries(array['92000000-0000-4000-8000-000000000002'::uuid])));
select pg_temp.assert_permission('anonymous is not admin', not public.is_barangay_admin());

set local role authenticated;
select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claims', '{"user_metadata":{"role":"barangay_admin"}}', true);
select pg_temp.assert_permission('metadata cannot assign admin', not public.is_barangay_admin());
select pg_temp.assert_rejected('nonadmin demo creator body guard',
  $q$select public.internal_demo_create_job_draft('92000000-0000-4000-8000-000000000004', '{}')$q$, 'P0001');
select pg_temp.assert_rejected('unrelated reader body guard',
  $q$select public.mark_conversation_read('85000000-0000-4000-8000-000000000001')$q$, 'P0001');
select pg_temp.assert_permission('unrelated inbox is empty', not exists(select 1 from public.get_my_conversation_inbox(false)));
select pg_temp.assert_rejected('unverified review stays gated',
  $q$select public.create_completed_job_review('83000000-0000-4000-8000-000000000001', 5, 'Denied')$q$, 'P0001');

select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000003', true);
select public.mark_conversation_read('85000000-0000-4000-8000-000000000001');
select public.archive_conversation('85000000-0000-4000-8000-000000000001');
select pg_temp.assert_permission('participant can archive', exists(
  select 1 from public.get_my_conversation_inbox(true) where archived_at is not null));
-- These writes must still fire SECURITY DEFINER triggers after client EXECUTE
-- revocation. They also exercise the timestamp invoker trigger.
insert into public.messages(conversation_id, sender_id, body)
values ('85000000-0000-4000-8000-000000000001', auth.uid(), 'Permission test message');
select pg_temp.assert_permission('message trigger restores archived conversation', exists(
  select 1 from public.get_my_conversation_inbox(false) where archived_at is null));
select pg_temp.assert_permission('phone normalization is unchanged',
  public.normalize_ph_mobile('+63 917 123 4567') = '639171234567'
  and public.normalize_ph_mobile('0917-123-4567') = '639171234567'
  and public.normalize_ph_mobile('123') is null);

select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000002', true);
select pg_temp.assert_permission('message notification trigger still runs', exists(
  select 1 from public.notifications where user_id = auth.uid() and type = 'message_received'));

select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000001', true);
select pg_temp.assert_permission('protected role still authorizes admin', public.is_barangay_admin());
select public.internal_demo_create_job_draft('92000000-0000-4000-8000-000000000004',
  '{"title":"Admin draft","description":"Private draft","category":"Home & Local Help","serviceNeeded":"Cleaning","budgetMin":100,"budgetMax":200,"rateType":"per_job"}');

reset role;
select pg_temp.assert_permission('OTP remains RLS default-deny', exists(
  select 1 from pg_class c where c.oid = 'public.contact_otp_challenges'::regclass and c.relrowsecurity
    and not exists(select 1 from pg_policy p where p.polrelid = c.oid)));
select pg_temp.assert_permission('atomic OTP remains backend-only',
  has_function_privilege('service_role', 'public.verify_contact_otp_atomic(uuid,uuid,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.verify_contact_otp_atomic(uuid,uuid,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.verify_contact_otp_atomic(uuid,uuid,text)', 'EXECUTE'));
rollback;
