-- Synthetic fixtures, for the local migration runner only.
\set ON_ERROR_STOP on
begin;
create function pg_temp.person(n int) returns uuid language sql as $$
  select ('94000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
$$;
create function pg_temp.job(n int) returns uuid language sql as $$
  select ('94100000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
$$;
create function pg_temp.chat(n int) returns uuid language sql as $$
  select ('94200000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
$$;
create function pg_temp.check_panel(label text, actual boolean) returns void language plpgsql as $$
begin
  if actual is distinct from true then raise exception 'FAIL: %', label; end if;
end;
$$;
create function pg_temp.deny_panel(label text, statement text) returns void language plpgsql as $$
begin
  begin execute statement; exception when insufficient_privilege or raise_exception then return; end;
  raise exception 'FAIL: % unexpectedly succeeded', label;
end;
$$;
grant execute on function pg_temp.person(int), pg_temp.job(int), pg_temp.chat(int),
  pg_temp.check_panel(text, boolean), pg_temp.deny_panel(text, text) to authenticated, anon;

insert into auth.users(id, email)
select pg_temp.person(i), 'panel-' || i || '@example.test' from generate_series(1, 4) i;
insert into public.profiles(id, full_name, first_name, last_name, street, preferred_contact_method, verified_at, barangay_verified_at)
select pg_temp.person(i), 'Panel Fixture', 'Panel', 'Fixture', 'Test area', 'app_message', now(), now() from generate_series(1, 4) i;
insert into public.client_profiles(user_id, headline, bio, needed_services, coordination_style, preferred_schedule)
values (pg_temp.person(1), 'Local help', 'Cleaning jobs', array['Cleaning'], 'In app', 'Weekends');
insert into public.provider_profiles(user_id, service_type, headline, bio, service_area, availability)
select pg_temp.person(i), 'Cleaning', 'Local help', 'Cleaning work', 'San Pedro', 'Weekends' from generate_series(2, 3) i;
insert into public.jobs(id, owner_id, client_id, title, description, category, service_needed, barangay, location_text,
  budget_min, budget_max, rate_type, workers_needed, scheduled_date, time_preference, schedule_flexibility, schedule_timezone)
select pg_temp.job(i), pg_temp.person(1), pg_temp.person(1), 'Panel job ' || i, 'Synthetic cleaning request', 'Home & Local Help', 'Cleaning',
  'San Pedro', 'San Pedro', 100, 200, 'per_job', 1, current_date + 1, 'morning', 'flexible', 'Asia/Manila'
from generate_series(1, 4) i;
insert into public.conversations(id, job_id, client_id, provider_id, started_by)
select pg_temp.chat(i), pg_temp.job(i), pg_temp.person(1), pg_temp.person(2), pg_temp.person(2) from generate_series(1, 4) i;
insert into public.conversations(id, job_id, client_id, provider_id, started_by)
values (pg_temp.chat(5), pg_temp.job(1), pg_temp.person(1), pg_temp.person(3), pg_temp.person(3));
insert into public.messages(conversation_id, sender_id, body) values
  (pg_temp.chat(1), pg_temp.person(1), 'Hello'),
  (pg_temp.chat(2), pg_temp.person(2), 'I can help');

set local role anon;
select pg_temp.deny_panel('signed out cannot read cancellation', 'select public.get_hired_job_cancellation(pg_temp.chat(3))');
set local role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.person(4)::text, true);
select pg_temp.check_panel('outsider receives no owner interest information', not exists(select 1 from public.get_my_unfilled_job_interest(array[pg_temp.job(1)])));
select pg_temp.deny_panel('unrelated resident cannot cancel a job', $$select public.cancel_unfilled_job(pg_temp.job(1), 'not_needed')$$);

select set_config('request.jwt.claim.sub', pg_temp.person(1)::text, true);
select pg_temp.check_panel('client-only message awaits worker reply', (select interest from public.get_my_unfilled_job_interest(array[pg_temp.job(1)])) = 'awaiting_reply');
select pg_temp.check_panel('worker message counts as interest', (select interest from public.get_my_unfilled_job_interest(array[pg_temp.job(2)])) = 'worker_messaged');
select pg_temp.check_panel('empty chat is no worker interest', (select interest from public.get_my_unfilled_job_interest(array[pg_temp.job(3)])) = 'no_worker_message');
select pg_temp.deny_panel('closure metadata can only be set through the action', $$update public.jobs set status='closed', closure_reason='not_needed' where id=pg_temp.job(1)$$);
select public.cancel_unfilled_job(pg_temp.job(1), 'no_worker_found');
select public.cancel_unfilled_job(pg_temp.job(2), 'found_elsewhere');
select public.cancel_unfilled_job(pg_temp.job(2), 'found_elsewhere');
select pg_temp.check_panel('pre-hire history remains closed', (select status='closed' and closure_reason='no_worker_found' from public.jobs where id=pg_temp.job(1)));
select pg_temp.deny_panel('closed jobs cannot be reactivated', $$update public.jobs set status='open' where id=pg_temp.job(1)$$);
select pg_temp.deny_panel('closed jobs cannot be hired', 'select public.mark_job_worker_hired(pg_temp.chat(1))');

select public.mark_job_worker_hired(pg_temp.chat(3));
select public.mark_job_worker_hired(pg_temp.chat(4));
select pg_temp.deny_panel('an already hired job needs consent', $$select public.cancel_unfilled_job(pg_temp.job(3), 'not_needed')$$);
select set_config('panel.request', public.change_hired_job_cancellation(pg_temp.chat(3), 'request', null, 'Schedule changed') #>> '{request,id}', true);
select pg_temp.check_panel('request retry returns the same active request', public.change_hired_job_cancellation(pg_temp.chat(3), 'request', null, 'Schedule changed') #>> '{request,id}' = current_setting('panel.request'));
select pg_temp.deny_panel('completion waits for cancellation', 'select public.complete_hired_job(pg_temp.chat(3))');
select pg_temp.deny_panel('requester cannot accept their own request', $$select public.change_hired_job_cancellation(pg_temp.chat(3), 'accept', current_setting('panel.request')::uuid)$$);

select set_config('request.jwt.claim.sub', pg_temp.person(2)::text, true);
select pg_temp.check_panel('worker gets a single generic notice after pre-hire retry', (select count(*)=1 from public.notifications where title='Job request closed'));
select pg_temp.check_panel('worker can read the request', public.get_hired_job_cancellation(pg_temp.chat(3)) #>> '{request,reason}' = 'Schedule changed');
select pg_temp.deny_panel('recipient cannot withdraw', $$select public.change_hired_job_cancellation(pg_temp.chat(3), 'withdraw', current_setting('panel.request')::uuid)$$);
select pg_temp.check_panel('declining leaves hired work in progress', public.change_hired_job_cancellation(pg_temp.chat(3), 'decline', current_setting('panel.request')::uuid) ->> 'job_status' = 'in_progress');
select set_config('panel.request', public.change_hired_job_cancellation(pg_temp.chat(3), 'request', current_setting('panel.request')::uuid, 'Worker unavailable') #>> '{request,id}', true);
select pg_temp.check_panel('worker can withdraw their own request', public.change_hired_job_cancellation(pg_temp.chat(3), 'withdraw', current_setting('panel.request')::uuid) #>> '{request,status}' = 'withdrawn');
select set_config('panel.request', public.change_hired_job_cancellation(pg_temp.chat(3), 'request', current_setting('panel.request')::uuid, 'Worker unavailable') #>> '{request,id}', true);

select set_config('request.jwt.claim.sub', pg_temp.person(3)::text, true);
select pg_temp.check_panel('empty chat is not notified about closure', not exists(select 1 from public.notifications where title='Job request closed'));
select pg_temp.deny_panel('outsider cannot read private cancellation reason', 'select public.get_hired_job_cancellation(pg_temp.chat(3))');

select set_config('request.jwt.claim.sub', pg_temp.person(1)::text, true);
select pg_temp.check_panel('acceptance closes the hired job', public.change_hired_job_cancellation(pg_temp.chat(3), 'accept', current_setting('panel.request')::uuid) ->> 'job_status' = 'closed');
select pg_temp.check_panel('repeated acceptance returns the same decision', public.change_hired_job_cancellation(pg_temp.chat(3), 'accept', current_setting('panel.request')::uuid) #>> '{request,status}' = 'accepted');
select pg_temp.check_panel('accepted worker and chat survive cancellation', (select status='closed' and accepted_provider_id=pg_temp.person(2) and closure_reason='mutual_cancellation' from public.jobs where id=pg_temp.job(3)) and (select status='hired' and hired_at is not null from public.conversations where id=pg_temp.chat(3)));
select pg_temp.deny_panel('cancelled job cannot be reviewed', $$select public.create_completed_job_review(pg_temp.job(3), 5, 'Cancelled')$$);
select pg_temp.deny_panel('cancelled job cannot be completed', 'select public.complete_hired_job(pg_temp.chat(3))');
select public.complete_hired_job(pg_temp.chat(4));
select public.create_completed_job_review(pg_temp.job(4), 4, 'Completed fixture');
select pg_temp.deny_panel('completed job cannot request cancellation', $$select public.change_hired_job_cancellation(pg_temp.chat(4), 'request', null, 'Completed')$$);

select set_config('request.jwt.claim.sub', pg_temp.person(3)::text, true);
select pg_temp.check_panel('unrelated resident sees safe reputation counts, excluding closed work',
  (select completed_jobs_count=1 and review_count=1 and average_rating=4 from public.get_provider_reputation_counts(array[pg_temp.person(2)])));
rollback;
