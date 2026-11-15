-- Only run against the local scratch database created by test-posting-database.cjs.
\set ON_ERROR_STOP on
create function pg_temp.assert_true(label text, actual boolean) returns void language plpgsql as $$
begin if actual is distinct from true then raise exception 'FAIL: %',label; end if; end; $$;
create function pg_temp.assert_denied(label text, statement text) returns void language plpgsql security invoker as $$
begin
  begin execute statement; exception when others then return; end;
  raise exception 'FAIL: % unexpectedly succeeded',label;
end; $$;
insert into auth.users(id,email) values
 ('71000000-0000-4000-8000-000000000001','posting-one@example.invalid'),
 ('71000000-0000-4000-8000-000000000002','posting-two@example.invalid'),
 ('71000000-0000-4000-8000-000000000003','posting-unverified@example.invalid');
insert into public.profiles(id,full_name,first_name,last_name,street,barangay,city,preferred_contact_method,barangay_verified_at,verified_at)
 select id,'Audit Resident','Audit','Resident','Test area','San Pedro','Santo Tomas','app_message',
 case when right(id::text,1)<>'3' then now() end,case when right(id::text,1)<>'3' then now() end
 from auth.users where id::text like '71000000-%';
insert into public.provider_profiles(user_id,service_type,bio,service_area,availability,services_confirmed)
 select id,'Cleaning','I provide careful cleaning','San Pedro','Weekends',true from profiles where id::text like '71000000-%';
insert into public.client_profiles(user_id,bio,needed_services,coordination_style,preferred_schedule,services_confirmed)
 select id,'I need home help',array['Cleaning'],'App messages','Weekends',true from profiles where id::text like '71000000-%';
insert into public.user_preferences(user_id,intent,offered_services,needed_services)
 values('71000000-0000-4000-8000-000000000001','both',array['Laundry help'],array['Encoding']);
select pg_temp.assert_true('single introduction provider ready',is_marketplace_ready('71000000-0000-4000-8000-000000000001','provider'));
select pg_temp.assert_true('single introduction client ready',is_marketplace_ready('71000000-0000-4000-8000-000000000001','client'));
select pg_temp.assert_true('unverified remains denied',not is_marketplace_ready('71000000-0000-4000-8000-000000000003','client'));
update provider_profiles set service_type='',custom_offered_services='{}' where user_id='71000000-0000-4000-8000-000000000001';
select pg_temp.assert_true('removed provider selections do not return from preferences',not is_marketplace_ready('71000000-0000-4000-8000-000000000001','provider'));
update provider_profiles set service_type='Cleaning' where user_id='71000000-0000-4000-8000-000000000001';
update client_profiles set needed_services='{}',custom_needed_services='{}' where user_id='71000000-0000-4000-8000-000000000001';
select pg_temp.assert_true('removed client selections do not return from preferences',not is_marketplace_ready('71000000-0000-4000-8000-000000000001','client'));
update client_profiles set needed_services=array['Cleaning'] where user_id='71000000-0000-4000-8000-000000000001';
select pg_temp.assert_true('anonymous publication denied',not has_function_privilege('anon','public.publish_job_draft(uuid)','execute'));
select pg_temp.assert_true('anonymous service publication denied',not has_function_privilege('anon','public.publish_service_draft(uuid)','execute'));

insert into job_drafts(id,user_id,title,description,category,service_needed,barangay,location_text,budget_min,budget_max,rate_type,workers_needed,scheduled_date,time_preference,schedule_flexibility,schedule_text)
 select ('72000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'71000000-0000-4000-8000-000000000001',
 'Audit job','Private SQL fixture','Home & Local Help','Cleaning','San Pedro','San Pedro',200.25,300.75,'per_job',1,current_date+1,'morning','flexible',to_char(current_date+1,'Mon FMDD, YYYY') || ' · Morning · Can coordinate'
 from unnest(array[1,2,3,99]) n;
insert into service_drafts(id,user_id,title,description,category,barangay,location_text,rate_min,rate_max,rate_type,rate_text)
 values('73000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','Audit cleaning','Private SQL fixture','Cleaning','San Pedro','San Pedro',200,200,'per_visit','Supplies included');
set role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000002',false);
select pg_temp.assert_denied('unrelated draft publication',$q$select publish_job_draft('72000000-0000-4000-8000-000000000001')$q$);
select pg_temp.assert_true('private draft invisible',not exists(select 1 from job_drafts where id='72000000-0000-4000-8000-000000000001'));
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000003',false);
select pg_temp.assert_denied('unverified publication',$q$select publish_job_draft('72000000-0000-4000-8000-000000000001')$q$);
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000001',false);
select publish_job_draft('72000000-0000-4000-8000-000000000001') as published_job \gset
select pg_temp.assert_true('retry returns existing job',publish_job_draft('72000000-0000-4000-8000-000000000001')=:'published_job'::uuid);
select pg_temp.assert_true('draft atomically consumed',not exists(select 1 from job_drafts where id='72000000-0000-4000-8000-000000000001'));
select publish_service_draft('73000000-0000-4000-8000-000000000001') as published_service \gset
select pg_temp.assert_true('retry returns existing service',publish_service_draft('73000000-0000-4000-8000-000000000001')=:'published_service'::uuid);
select pg_temp.assert_true('fixed price and note retained',exists(select 1 from services where id=:'published_service'::uuid and rate_min=200 and rate_max=200 and rate_text='Supplies included'));
select pg_temp.assert_denied('direct SQL invalid category',$q$update jobs set category='Wrong category' where id=(select id from jobs where title='Audit job' limit 1)$q$);
select pg_temp.assert_denied('direct SQL multiple workers',$q$update jobs set workers_needed=3 where id=(select id from jobs where title='Audit job' limit 1)$q$);
select pg_temp.assert_denied('direct SQL past schedule',$q$update jobs set scheduled_date='2020-11-12' where title='Audit job'$q$);
select pg_temp.assert_denied('direct SQL impossible schedule',$q$update jobs set scheduled_date='2050-02-30' where title='Audit job'$q$);
select pg_temp.assert_denied('direct SQL freeform schedule',$q$update jobs set time_preference='Whenever' where title='Audit job'$q$);
select pg_temp.assert_denied('direct SQL empty description',$q$update services set description='' where title='Audit cleaning'$q$);
select pg_temp.assert_denied('direct SQL excluded custom trade',$q$update services set category='Other service',custom_category='plumbing' where title='Audit cleaning'$q$);
select pg_temp.assert_denied('direct SQL excessive precision',$q$update services set rate_min=100.123 where title='Audit cleaning'$q$);
select pg_temp.assert_denied('private job column remains private',$q$select private_location_notes from jobs$q$);
reset role;

create function pg_temp.force_publish_failure() returns trigger language plpgsql as $$
begin if new.title='Failure fixture' then raise exception 'Injected second-write failure'; end if; return new; end; $$;
create trigger posting_failure after insert on jobs for each row execute function pg_temp.force_publish_failure();
update job_drafts set title='Failure fixture' where id='72000000-0000-4000-8000-000000000002';
set role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000001',false);
select pg_temp.assert_denied('transaction rollback on injected failure',$q$select publish_job_draft('72000000-0000-4000-8000-000000000002')$q$);
select pg_temp.assert_true('failed publication retains draft',exists(select 1 from job_drafts where id='72000000-0000-4000-8000-000000000002'));
reset role;
select pg_temp.assert_true('failed publication has no listing',not exists(select 1 from jobs where title='Failure fixture'));
select pg_temp.assert_true('failed publication has no tombstone',not exists(select 1 from app_private.marketplace_publications where draft_id='72000000-0000-4000-8000-000000000002'));
