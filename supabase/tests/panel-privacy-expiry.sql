-- Run only on the disposable PostgreSQL database. Fixtures roll back.
\set ON_ERROR_STOP on
begin;
create function pg_temp.fixture(kind int, value int) returns uuid language sql as $$
  select ('95' || lpad(kind::text, 6, '0') || '-0000-4000-8000-' || lpad(value::text, 12, '0'))::uuid;
$$;
create function pg_temp.expect(label text, actual boolean) returns void language plpgsql as $$
begin
  if actual is distinct from true then raise exception 'FAIL: %', label; end if;
end;
$$;
create function pg_temp.denied(label text, statement text) returns void language plpgsql as $$
begin
  begin execute statement; exception when insufficient_privilege or raise_exception then return; end;
  raise exception 'FAIL: % unexpectedly succeeded', label;
end;
$$;
create function pg_temp.manila_midnight() returns timestamptz language sql stable as $$
  select ((statement_timestamp() at time zone 'Asia/Manila')::date::timestamp at time zone 'Asia/Manila');
$$;
grant execute on function pg_temp.fixture(int, int), pg_temp.expect(text, boolean), pg_temp.denied(text, text),
  pg_temp.manila_midnight() to authenticated, anon;

insert into auth.users(id, email)
select pg_temp.fixture(1, n), 'privacy-expiry-' || n || '@example.test' from generate_series(1, 4) n;
insert into public.profiles(id, full_name, first_name, last_name, street, preferred_contact_method, verified_at, barangay_verified_at)
select pg_temp.fixture(1, n), 'Panel Fixture', 'Panel', 'Fixture', 'Test area', 'app_message', now(), now() from generate_series(1, 4) n;
insert into public.user_roles(user_id, role) values (pg_temp.fixture(1, 4), 'barangay_admin');
insert into public.client_profiles(user_id, headline, bio, needed_services, coordination_style, preferred_schedule)
values (pg_temp.fixture(1, 1), 'Local help', 'Cleaning jobs', array['Cleaning'], 'In app', 'Weekends');
insert into public.provider_profiles(user_id, service_type, headline, bio, service_area, availability)
values (pg_temp.fixture(1, 2), 'Cleaning', 'Local help', 'Cleaning work', 'San Pedro', 'Weekends');
insert into public.jobs(id, owner_id, client_id, title, description, category, service_needed, barangay, location_text,
  budget_min, budget_max, rate_type, workers_needed, scheduled_date, time_preference, schedule_flexibility, schedule_timezone)
select pg_temp.fixture(2,n), pg_temp.fixture(1,1), pg_temp.fixture(1,1), 'Privacy fixture ' || n,
  'Synthetic cleaning request', 'Home & Local Help', 'Cleaning', 'San Pedro', 'San Pedro', 100, 200, 'per_job',
  1, (statement_timestamp() at time zone 'Asia/Manila')::date, 'morning', 'flexible', 'Asia/Manila'
from generate_series(1, 10) n;
insert into public.conversations(id, job_id, client_id, provider_id, started_by)
select pg_temp.fixture(3,n), pg_temp.fixture(2,n), pg_temp.fixture(1,1), pg_temp.fixture(1,2), pg_temp.fixture(1,2)
from generate_series(1, 8) n;
insert into public.messages(conversation_id, sender_id, body) values
  (pg_temp.fixture(3,3), pg_temp.fixture(1,1), 'Client outreach only'),
  (pg_temp.fixture(3,4), pg_temp.fixture(1,2), 'Actual worker interest');

set local role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.fixture(1,1)::text, true);
select public.mark_job_worker_hired(pg_temp.fixture(3,1));
select public.mark_job_worker_hired(pg_temp.fixture(3,6));
select public.complete_hired_job(pg_temp.fixture(3,1));
select set_config('panel.worker_review', (public.create_completed_job_review(pg_temp.fixture(2,1), 2, 'Honest critical feedback')).id::text, true);
select set_config('request.jwt.claim.sub', pg_temp.fixture(1,2)::text, true);
select public.create_completed_job_review(pg_temp.fixture(2,1), 4, 'Worker feedback');
select pg_temp.expect('recipient cannot read the author-linked review record', not exists(
  select 1 from public.reviews where id = current_setting('panel.worker_review')::uuid));
select pg_temp.expect('public review payload has only the approved keys', (
  select array_agg(k order by k) = array['author_role', 'comment', 'id', 'rating']
  from jsonb_object_keys(public.get_public_profile_trust_summary(pg_temp.fixture(1,2), 'worker', 6)->'recentReviews'->0) k));
select pg_temp.expect('public profile shows role and preserves the rating',
  public.get_public_profile_trust_summary(pg_temp.fixture(1,2), 'worker', 6)#>>'{recentReviews,0,author_role}' = 'client'
  and public.get_public_profile_trust_summary(pg_temp.fixture(1,2), 'worker', 6)->>'averageRating' = '2.00');
select pg_temp.denied('direct review report submission cannot confirm a target', $$insert into public.reports(reporter_id, review_id, reason)
  values(auth.uid(), current_setting('panel.worker_review')::uuid, 'Review concern')$$);
select set_config('panel.safe_report', public.submit_review_report(current_setting('panel.worker_review')::uuid, 'Review concern')::text, true);
select set_config('panel.private_report', current_setting('panel.safe_report')::jsonb->>'id', true);
select pg_temp.expect('report response hides underlying target identity', current_setting('panel.safe_report')::jsonb->>'reported_user_id' is null
  and current_setting('panel.safe_report')::jsonb->>'job_id' is null);
select pg_temp.expect('direct history hides the original review complaint row', not exists(
  select 1 from public.reports where id = current_setting('panel.private_report')::uuid));
select pg_temp.expect('resident report queue keeps review reference and hides identity', exists(
  select 1 from jsonb_array_elements(public.get_my_report_page()) report where report->>'id' = current_setting('panel.private_report')
    and report->>'review_id' = current_setting('panel.worker_review') and report->>'reported_user_id' is null and report->>'job_id' is null
    and not (report ? 'admin_notes') and not (report ? 'reviewed_by')));

select set_config('request.jwt.claim.sub', pg_temp.fixture(1,1)::text, true);
select pg_temp.expect('author can still read their submitted review', exists(select 1 from public.reviews where id = current_setting('panel.worker_review')::uuid));
select set_config('request.jwt.claim.sub', pg_temp.fixture(1,3)::text, true);
select pg_temp.expect('unrelated resident cannot read raw reviews', not exists(select 1 from public.reviews where id = current_setting('panel.worker_review')::uuid));
select pg_temp.expect('unrelated resident receives safe client reputation', (
  select review_count=1 and average_rating=4 from public.get_client_reputation_counts(array[pg_temp.fixture(1,1)])));
select set_config('request.jwt.claim.sub', pg_temp.fixture(1,4)::text, true);
select pg_temp.expect('staff can open original review report evidence',
  public.get_admin_report_detail(current_setting('panel.private_report')::uuid)->>'reported_user_id' = pg_temp.fixture(1,1)::text);
select public.review_report(current_setting('panel.private_report')::uuid, 'resolved', 'Synthetic moderation decision', 'Your complaint was reviewed.', 'hide');
select pg_temp.expect('hidden review leaves public summary',
  public.get_public_profile_trust_summary(pg_temp.fixture(1,2), 'worker', 6)->>'reviewCount' = '0');
select public.review_report(current_setting('panel.private_report')::uuid, 'resolved', 'Synthetic restored decision', 'The review was restored.', 'restore');
select pg_temp.expect('restored review returns to public summary without identity',
  public.get_public_profile_trust_summary(pg_temp.fixture(1,2), 'worker', 6)#>>'{recentReviews,0,author_role}' = 'client');

reset role;
-- Simulate listings that were valid when published and have since aged.
alter table public.jobs disable trigger validate_job_publish;
update public.jobs set scheduled_date = (pg_temp.manila_midnight() at time zone 'Asia/Manila')::date - 1
where id in (pg_temp.fixture(2,2), pg_temp.fixture(2,3), pg_temp.fixture(2,4), pg_temp.fixture(2,5),
  pg_temp.fixture(2,6), pg_temp.fixture(2,9), pg_temp.fixture(2,10));
update public.jobs set status='cancelled' where id=pg_temp.fixture(2,5);
update public.jobs set scheduled_date=null where id=pg_temp.fixture(2,7);
update public.jobs set status='reviewing' where id=pg_temp.fixture(2,10);
alter table public.jobs enable trigger validate_job_publish;
select pg_temp.expect('same scheduled day is still open just before Manila midnight',
  app_private.expire_unanswered_jobs(pg_temp.manila_midnight() - interval '1 second') = 0);
set local role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.fixture(1,1)::text, true);
select pg_temp.denied('hiring an overdue unanswered job is refused before the sweep', 'select public.mark_job_worker_hired(pg_temp.fixture(3,2))');
select pg_temp.denied('old paused request must update its date before reactivation', $$update public.jobs set status='open' where id=pg_temp.fixture(2,5)$$);
select set_config('request.jwt.claim.sub', pg_temp.fixture(1,2)::text, true);
select pg_temp.denied('late first worker message is refused before the sweep', $$insert into public.messages(conversation_id,sender_id,body)
  values(pg_temp.fixture(3,2),auth.uid(),'After the deadline')$$);
select pg_temp.denied('a resident cannot run the expiry batch', 'select app_private.expire_unanswered_jobs()');
reset role;

select pg_temp.expect('midnight sweep closes only eligible jobs', app_private.expire_unanswered_jobs(pg_temp.manila_midnight()) = 4);
select pg_temp.expect('closed reasons are explicit and preserve rows', (select count(*)=4 from public.jobs where closure_reason='expired_no_worker'
  and id in (pg_temp.fixture(2,2), pg_temp.fixture(2,3), pg_temp.fixture(2,9), pg_temp.fixture(2,10))));
select pg_temp.expect('worker interest, pause, hire, missing date and today are unchanged', (select count(*)=5 from public.jobs
  where closure_reason is null and id in (pg_temp.fixture(2,4), pg_temp.fixture(2,5), pg_temp.fixture(2,6), pg_temp.fixture(2,7), pg_temp.fixture(2,8))));
select pg_temp.expect('second sweep does not close or notify again', app_private.expire_unanswered_jobs(pg_temp.manila_midnight()) = 0);
select pg_temp.expect('client gets one notice per expired job', (select count(*)=4 and count(distinct route)=4 from public.notifications
  where user_id=pg_temp.fixture(1,1) and type='job_expired'));

set local role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.fixture(1,2)::text, true);
select pg_temp.expect('participant sees expired job chat state', public.get_job_chat_expired(pg_temp.fixture(3,3)));
select pg_temp.expect('expired job leaves discovery while chat stays readable', not exists(select 1 from public.jobs where id=pg_temp.fixture(2,3))
  and exists(select 1 from public.messages where conversation_id=pg_temp.fixture(3,3)));
select set_config('request.jwt.claim.sub', pg_temp.fixture(1,3)::text, true);
select pg_temp.expect('unrelated resident sees no expiry info about a private thread', not public.get_job_chat_expired(pg_temp.fixture(3,3)));
rollback;
