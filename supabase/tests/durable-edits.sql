-- Only the isolated scratch database created by test-posting-database.cjs.
\set ON_ERROR_STOP on
create function pg_temp.assert_true(label text, actual boolean) returns void language plpgsql as $$
begin if actual is distinct from true then raise exception 'FAIL: %',label; end if; end; $$;
create function pg_temp.assert_denied(label text, statement text) returns void language plpgsql as $$
begin begin execute statement; exception when others then return; end; raise exception 'FAIL: % unexpectedly succeeded',label; end; $$;
select pg_temp.assert_true('canonical historical date backfilled',exists(select 1 from jobs where id='82000000-0000-4000-8000-000000000001' and scheduled_date='2050-11-13' and time_preference='exact' and exact_time='09:30' and schedule_flexibility='fixed' and description='Keep this description'));
select pg_temp.assert_true('undated legacy content preserved',exists(select 1 from jobs where id='82000000-0000-4000-8000-000000000002' and scheduled_date is null and schedule_text='Whenever convenient' and title='Legacy undated'));
select pg_temp.assert_true('impossible legacy date never guessed',exists(select 1 from jobs where id='82000000-0000-4000-8000-000000000003' and scheduled_date is null and description='Keep this too'));
select pg_temp.assert_true('anonymous edit denied',not has_function_privilege('anon','public.begin_job_edit(uuid)','execute'));
select pg_temp.assert_true('anonymous commit denied',not has_function_privilege('anon','public.commit_service_draft(uuid,bigint)','execute'));
select id as job_id from jobs where title='Audit job' order by created_at limit 1 \gset
select id as service_id from services where title='Audit cleaning' limit 1 \gset
set role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000001',false);
select pg_temp.assert_denied('unrelated edit source',$q$select begin_job_edit('82000000-0000-4000-8000-000000000001')$q$);
select begin_job_edit(:'job_id') as edit_id \gset
select pg_temp.assert_true('begin resumes one draft',begin_job_edit(:'job_id')=:'edit_id'::uuid);
select pg_temp.assert_true('draft provenance retained',exists(select 1 from job_drafts where id=:'edit_id' and source_listing_id=:'job_id' and revision=1 and source_version=1));
select pg_temp.assert_denied('cannot forge edit provenance',$q$insert into job_drafts(user_id,source_listing_id,source_version) values(auth.uid(),'82000000-0000-4000-8000-000000000001',1)$q$);
update job_drafts set title='Committed edit',revision=999 where id=:'edit_id' and revision=1;
select pg_temp.assert_true('server increments revision',exists(select 1 from job_drafts where id=:'edit_id' and revision=2));
with changed as (update job_drafts set title='Lost stale write' where id=:'edit_id' and revision=1 returning id)
select pg_temp.assert_true('stale autosave writes zero rows',not exists(select 1 from changed));
select pg_temp.assert_true('autosave does not change public title',exists(select 1 from jobs where id=:'job_id' and title='Audit job'));
select pg_temp.assert_denied('stale review cannot save',format('select commit_job_draft(%L,1)',:'edit_id'));
select pg_temp.assert_true('commit updates same job',commit_job_draft(:'edit_id',2)=:'job_id'::uuid);
select pg_temp.assert_true('edit retry idempotent',commit_job_draft(:'edit_id',2)=:'job_id'::uuid);
select pg_temp.assert_denied('different review revision denied',format('select commit_job_draft(%L,3)',:'edit_id'));
select pg_temp.assert_true('edit consumes draft',not exists(select 1 from job_drafts where id=:'edit_id'));
select pg_temp.assert_true('same public row receives edit',exists(select 1 from jobs where id=:'job_id' and title='Committed edit'));
select begin_service_edit(:'service_id') as service_edit \gset
update service_drafts set rate_min=250.25,rate_max=500.75,rate_text='Supplies and travel included' where id=:'service_edit' and revision=1;
select pg_temp.assert_true('service commit retains public identity',commit_service_draft(:'service_edit',2)=:'service_id'::uuid);
select pg_temp.assert_true('service precise amounts and note retained',exists(select 1 from services where id=:'service_id' and rate_min=250.25 and rate_max=500.75 and rate_text='Supplies and travel included'));
select begin_job_edit(:'job_id') as conflicted_edit \gset
update job_drafts set description='My private pending edit' where id=:'conflicted_edit' and revision=1;
update jobs set description='A newer published edit from elsewhere' where id=:'job_id';
select pg_temp.assert_denied('changed source never overwritten',format('select commit_job_draft(%L,2)',:'conflicted_edit'));
select pg_temp.assert_true('conflict retains private draft',exists(select 1 from job_drafts where id=:'conflicted_edit' and description='My private pending edit'));
select pg_temp.assert_true('conflict preserves newer public edit',exists(select 1 from jobs where id=:'job_id' and description='A newer published edit from elsewhere'));
select pg_temp.assert_denied('old publish cannot duplicate an edit',format('select publish_job_draft(%L)',:'conflicted_edit'));
select pg_temp.assert_denied('direct source-version bypass',format('update job_drafts set source_version=999 where id=%L',:'conflicted_edit'));
select restart_job_edit(:'conflicted_edit',2);
select pg_temp.assert_true('explicit restart loads latest',exists(select 1 from job_drafts where id=:'conflicted_edit' and description='A newer published edit from elsewhere' and revision=3));
select pg_temp.assert_true('restarted draft can save',commit_job_draft(:'conflicted_edit',3)=:'job_id'::uuid);
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000001',false);
select pg_temp.assert_true('preflight identifies owned legacy rows',exists(select 1 from get_my_listing_repairs() where listing_id='82000000-0000-4000-8000-000000000002'));
select pg_temp.assert_true('preflight does not leak other owners',not exists(select 1 from get_my_listing_repairs() where listing_id=:'job_id'));
select pg_temp.assert_true('valid historical row needs no repair',not exists(select 1 from get_my_listing_repairs() where listing_id='82000000-0000-4000-8000-000000000001'));
select begin_job_edit('82000000-0000-4000-8000-000000000002') as legacy_edit \gset
select pg_temp.assert_true('repair editor retains original wording',exists(select 1 from job_drafts where id=:'legacy_edit' and schedule_text='Whenever convenient' and workers_needed=3));
update job_drafts set description='Updated description',category='Home & Local Help',service_needed='Cleaning',workers_needed=1,scheduled_date=current_date+1,time_preference='anytime',schedule_flexibility='flexible' where id=:'legacy_edit' and revision=1;
select pg_temp.assert_true('corrected legacy post saves same identity',commit_job_draft(:'legacy_edit',2)='82000000-0000-4000-8000-000000000002'::uuid);
select pg_temp.assert_true('corrected row clears preflight',not exists(select 1 from get_my_listing_repairs() where listing_id='82000000-0000-4000-8000-000000000002'));
reset role;
-- Inject a failure after the UPDATE to prove edit and draft cleanup roll back together.
create function pg_temp.fail_edit() returns trigger language plpgsql as $$
begin if new.title='Rollback edit fixture' then raise exception 'Injected edit failure'; end if; return new; end; $$;
create trigger fail_edit after update on jobs for each row execute function pg_temp.fail_edit();
set role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000001',false);
select begin_job_edit(:'job_id') as rollback_edit \gset
update job_drafts set title='Rollback edit fixture' where id=:'rollback_edit' and revision=1;
select pg_temp.assert_denied('failed edit rolls back',format('select commit_job_draft(%L,2)',:'rollback_edit'));
select pg_temp.assert_true('failed edit keeps draft',exists(select 1 from job_drafts where id=:'rollback_edit'));
select pg_temp.assert_true('failed edit keeps previous public title',exists(select 1 from jobs where id=:'job_id' and title='Committed edit'));
reset role;
select pg_temp.assert_true('failed edit records no publication',not exists(select 1 from app_private.marketplace_publications where draft_id=:'rollback_edit'));
drop trigger fail_edit on jobs;
-- Separate listing for two-connection concurrent edit commit in the runner.
insert into jobs(id,owner_id,client_id,title,description,category,service_needed,barangay,location_text,budget_min,budget_max,rate_type,workers_needed,scheduled_date,time_preference,schedule_flexibility,status)
values('74000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','Concurrent edit fixture','A valid description','Home & Local Help','Cleaning','San Pedro','San Pedro',200,500,'per_job',1,current_date+1,'morning','flexible','open');
set role authenticated;
select begin_job_edit('74000000-0000-4000-8000-000000000001');
reset role;
