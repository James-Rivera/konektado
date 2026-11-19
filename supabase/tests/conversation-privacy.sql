-- Run on a disposable database after all migrations; all fixtures roll back.
\set ON_ERROR_STOP on
begin;
create function pg_temp.assert_true(label text, actual boolean) returns void language plpgsql as $$
begin
  if actual is distinct from true then raise exception 'FAIL: %', label; end if;
  raise notice 'PASS: %', label;
end $$;
create function pg_temp.expect_denied(label text, statement text) returns void language plpgsql as $$
begin
  begin execute statement; exception when insufficient_privilege or raise_exception then
    raise notice 'PASS denied: %', label; return;
  end;
  raise exception 'FAIL: % unexpectedly succeeded', label;
end $$;
grant execute on function pg_temp.assert_true(text,boolean), pg_temp.expect_denied(text,text) to authenticated;
insert into auth.users(id,email) select ('70000000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid,
  'conversation-privacy-' || i || '@example.test' from generate_series(1,5) i;
insert into public.profiles(id,full_name,first_name,last_name)
select id,'Fixture Resident','Fixture','Resident' from auth.users where id::text like '70000000-%';
insert into public.user_roles(user_id,role) values
 ('70000000-0000-4000-8000-000000000001','barangay_admin'),
 ('70000000-0000-4000-8000-000000000005','barangay_admin');
insert into public.conversations(id,client_id,provider_id,started_by) values
 ('71000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000003','70000000-0000-4000-8000-000000000002'),
 ('71000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000004','70000000-0000-4000-8000-000000000002'),
 ('71000000-0000-4000-8000-000000000003','70000000-0000-4000-8000-000000000005','70000000-0000-4000-8000-000000000004','70000000-0000-4000-8000-000000000005');
insert into public.messages(conversation_id,sender_id,body) values
 ('71000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002','Reported message'),
 ('71000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000002','Private message');
insert into public.conversation_reads(conversation_id,user_id) values
 ('71000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002'),
 ('71000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000002');
insert into storage.objects(bucket_id,name) values
 ('message-attachments','70000000-0000-4000-8000-000000000002/71000000-0000-4000-8000-000000000001/a.jpg'),
 ('message-attachments','70000000-0000-4000-8000-000000000002/71000000-0000-4000-8000-000000000002/b.jpg');
set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000002',true);
insert into public.reports(reporter_id,conversation_id,reason) values
 ('70000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001','Fixture');
reset role;
-- Model a row that predates the insert guard. Restore the guard before testing access.
alter table public.reports disable trigger guard_report_insert;
insert into public.reports(reporter_id,conversation_id,reason) values
 ('70000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000002','Invalid legacy fixture');
alter table public.reports enable trigger guard_report_insert;
set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_true('admin reads reported conversation',exists(select 1 from conversations where id='71000000-0000-4000-8000-000000000001'));
select pg_temp.assert_true('admin cannot read unreported conversation',not exists(select 1 from conversations where id='71000000-0000-4000-8000-000000000002'));
select pg_temp.assert_true('admin reported messages only',(select count(*)=1 from messages));
select pg_temp.assert_true('admin reported read markers only',(select count(*)=1 from conversation_reads));
select pg_temp.assert_true('admin reported attachments only',(select count(*)=1 from storage.objects where bucket_id='message-attachments'));
select pg_temp.assert_true('ordinary inbox excludes moderation',(select count(*)=0 from get_my_conversation_inbox(false)));
update conversations set status='declined' where id='71000000-0000-4000-8000-000000000001';
select pg_temp.assert_true('moderator cannot update conversation',(select status='active' from conversations where id='71000000-0000-4000-8000-000000000001'));
select pg_temp.expect_denied('moderator cannot send', $q$insert into messages(conversation_id,sender_id,body) values('71000000-0000-4000-8000-000000000001',auth.uid(),'Denied')$q$);
select pg_temp.expect_denied('moderator cannot hire', $q$select mark_job_worker_hired('71000000-0000-4000-8000-000000000001')$q$);
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000003',true);
select pg_temp.assert_true('participant reads own conversation',exists(select 1 from conversations where id='71000000-0000-4000-8000-000000000001'));
select pg_temp.assert_true('participant cannot read unrelated',not exists(select 1 from conversations where id='71000000-0000-4000-8000-000000000002'));
select pg_temp.expect_denied('unrelated report target', $q$insert into reports(reporter_id,conversation_id,reason) values(auth.uid(),'71000000-0000-4000-8000-000000000002','Denied')$q$);
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000005',true);
select pg_temp.assert_true('admin participant inbox remains available',(select count(*)=1 from get_my_conversation_inbox(false)));
select pg_temp.assert_true('admin participant direct access',exists(select 1 from conversations where id='71000000-0000-4000-8000-000000000003'));
rollback;
