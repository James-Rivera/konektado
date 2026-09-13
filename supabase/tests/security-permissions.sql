-- Run after the migrations against a disposable database. All fixtures roll back.
\set ON_ERROR_STOP on
begin;
create function pg_temp.expect_denied(label text, statement text) returns void
language plpgsql security invoker as $$
begin
  begin
    execute statement;
  exception when insufficient_privilege or raise_exception then
    raise notice 'PASS denied: %', label;
    return;
  end;
  raise exception 'FAIL: % unexpectedly succeeded', label;
end;
$$;
create function pg_temp.expect_true(label text, actual boolean) returns void
language plpgsql security invoker as $$
begin
  if actual is distinct from true then raise exception 'FAIL: %', label; end if;
  raise notice 'PASS: %', label;
end;
$$;

insert into auth.users(id, email)
select ('10000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, 'security-' || i || '@example.test'
from generate_series(1,7) i;
insert into public.profiles(id, full_name, first_name, last_name, street, preferred_contact_method, phone,
 verified_at, barangay_verified_at)
select id, 'Security Fixture', 'Security', 'Fixture', 'Test area', 'app_message', '09123456789',
 case when right(id::text, 1) in ('5','7') then null else now() end,
 case when right(id::text, 1) in ('5','7') then null else now() end
from auth.users where id::text like '10000000-%' and right(id::text,1) <> '7';
insert into public.user_roles(user_id, role)
values ('10000000-0000-4000-8000-000000000001', 'barangay_admin');
insert into public.provider_profiles(user_id, service_type, headline, bio, service_area, availability)
select id, 'Cleaning', 'Local help', 'Cleaning work', 'San Pedro', 'Weekends'
from public.profiles where id::text like '10000000-%' and right(id::text,1) <> '6';
insert into public.client_profiles(user_id, headline, bio, needed_services, coordination_style, preferred_schedule)
select id, 'Hiring local help', 'Local work', array['Cleaning'], 'In app', 'Weekends'
from public.profiles where id::text like '10000000-%' and right(id::text,1) <> '6';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000007', true);
select pg_temp.expect_denied('self verify on insert', $q$insert into profiles(id, verified_at)
 values(auth.uid(), now())$q$);
select pg_temp.expect_denied('self assign admin on insert', $q$insert into profiles(id, role)
 values(auth.uid(), 'barangay_admin')$q$);
insert into profiles(id, first_name) values(auth.uid(), 'Fresh signup');
select pg_temp.expect_true('normal signup profile creation', exists(select 1 from profiles where id = auth.uid()));
select pg_temp.expect_denied('self verify on update', $q$update profiles set barangay_verified_at=now() where id=auth.uid()$q$);
select pg_temp.expect_denied('self assign admin role', $q$insert into user_roles(user_id,role) values(auth.uid(),'barangay_admin')$q$);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select pg_temp.expect_denied('unverified job publish', $q$insert into jobs(owner_id,title) values(auth.uid(),'Denied')$q$);
select pg_temp.expect_denied('unverified service publish', $q$insert into services(provider_id,title,category) values(auth.uid(),'Denied','Cleaning')$q$);
select pg_temp.expect_denied('self approve verification', $q$insert into verifications(user_id,status) values(auth.uid(),'approved')$q$);
select pg_temp.expect_denied('supply verification reviewer', $q$insert into verifications(user_id,reviewer_id) values(auth.uid(),auth.uid())$q$);
select pg_temp.expect_denied('missing contact proof', $q$insert into verifications(user_id) values(auth.uid())$q$);
select pg_temp.expect_denied('self approve credential insert', $q$insert into credentials(provider_id,credential_type,title,status)
 values(auth.uid(),'other','Forged','approved')$q$);
insert into credentials(id,provider_id,credential_type,title) values('20000000-0000-4000-8000-000000000001',auth.uid(),'other','Pending proof');
update credentials set title='Edited pending proof' where id='20000000-0000-4000-8000-000000000001';
select pg_temp.expect_denied('self approve credential update', $q$update credentials set status='approved' where provider_id=auth.uid()$q$);
select pg_temp.expect_denied('forge credential reviewer', $q$update credentials set reviewer_note='Approved by me' where provider_id=auth.uid()$q$);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);
select pg_temp.expect_denied('incomplete job publish', $q$insert into jobs(owner_id,title) values(auth.uid(),'Denied')$q$);
select pg_temp.expect_denied('incomplete service publish', $q$insert into services(provider_id,title,category) values(auth.uid(),'Denied','Cleaning')$q$);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
insert into jobs(id,owner_id,client_id,title,status,private_location_notes,allow_messages,budget_min,budget_max,rate_type)
values ('30000000-0000-4000-8000-000000000001',auth.uid(),auth.uid(),'Security test job','open','Private gate code',true,100,200,'per_job');
select pg_temp.expect_true('owner private notes RPC', get_job_private_location_notes('30000000-0000-4000-8000-000000000001')='Private gate code');
select pg_temp.expect_denied('direct private column even owner', $q$select private_location_notes from jobs$q$);
select pg_temp.expect_denied('fabricate completed job insert', $q$insert into jobs(owner_id,title,status) values(auth.uid(),'Denied','completed')$q$);
select pg_temp.expect_denied('direct completion', $q$update jobs set status='completed' where id='30000000-0000-4000-8000-000000000001'$q$);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select pg_temp.expect_true('public job is still readable', exists(select id from jobs where id='30000000-0000-4000-8000-000000000001'));
select pg_temp.expect_denied('unrelated private notes RPC', $q$select get_job_private_location_notes('30000000-0000-4000-8000-000000000001')$q$);
select pg_temp.expect_denied('unrelated direct private notes', $q$select private_location_notes from jobs where id='30000000-0000-4000-8000-000000000001'$q$);
insert into services(id,provider_id,title,category,allow_messages,rate_min,rate_max,rate_type)
values ('40000000-0000-4000-8000-000000000001',auth.uid(),'Cleaning','Cleaning',true,100,200,'per_service');
insert into conversations(id,job_id,client_id,provider_id,started_by)
values('50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',
 '10000000-0000-4000-8000-000000000002',auth.uid(),auth.uid());
select pg_temp.expect_denied('change participant', $q$update conversations set client_id='10000000-0000-4000-8000-000000000004'
 where id='50000000-0000-4000-8000-000000000001'$q$);
select pg_temp.expect_denied('direct hired status', $q$update conversations set status='hired',hired_at=now()
 where id='50000000-0000-4000-8000-000000000001'$q$);
select pg_temp.expect_denied('worker cannot mark self hired', $q$select mark_job_worker_hired('50000000-0000-4000-8000-000000000001')$q$);
insert into messages(conversation_id,sender_id,body) values('50000000-0000-4000-8000-000000000001',auth.uid(),'Hello');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select pg_temp.expect_true('other credentials stay private', not exists(select id from credentials));
select pg_temp.expect_denied('wrong job counterparty', $q$insert into conversations(job_id,client_id,provider_id,started_by)
 values('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000005',auth.uid(),auth.uid())$q$);
insert into conversations(id,job_id,client_id,provider_id,started_by)
values('50000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001',
 '10000000-0000-4000-8000-000000000002',auth.uid(),auth.uid());
select pg_temp.expect_denied('outsider cannot send', $q$insert into messages(conversation_id,sender_id,body)
 values('50000000-0000-4000-8000-000000000001',auth.uid(),'Denied')$q$);
select pg_temp.expect_denied('wrong service provider', $q$insert into conversations(service_id,client_id,provider_id,started_by)
 values('40000000-0000-4000-8000-000000000001',auth.uid(),'10000000-0000-4000-8000-000000000005',auth.uid())$q$);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);
select pg_temp.expect_denied('incomplete starts chat', $q$insert into conversations(job_id,client_id,provider_id,started_by)
 values('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',auth.uid(),auth.uid())$q$);
select pg_temp.expect_denied('incomplete hiring RPC', $q$select mark_job_worker_hired('50000000-0000-4000-8000-000000000001')$q$);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select pg_temp.expect_denied('review before completion', $q$select create_completed_job_review('30000000-0000-4000-8000-000000000001',5,'Denied')$q$);
select mark_job_worker_hired('50000000-0000-4000-8000-000000000001');
select pg_temp.expect_true('job and chat hired together', exists(select j.id from jobs j join conversations c on c.job_id=j.id
 where j.id='30000000-0000-4000-8000-000000000001' and j.status='in_progress' and c.status='hired'
 and c.hired_at is not null and j.accepted_provider_id=c.provider_id));
select mark_job_worker_hired('50000000-0000-4000-8000-000000000001');
select pg_temp.expect_denied('second hired worker', $q$select mark_job_worker_hired('50000000-0000-4000-8000-000000000002')$q$);
select pg_temp.expect_denied('change hired provider directly', $q$update jobs set accepted_provider_id='10000000-0000-4000-8000-000000000004'
 where id='30000000-0000-4000-8000-000000000001'$q$);
select complete_hired_job('50000000-0000-4000-8000-000000000001');
select pg_temp.expect_denied('hire completed job', $q$select mark_job_worker_hired('50000000-0000-4000-8000-000000000002')$q$);
select pg_temp.expect_denied('reopen completed job', $q$update jobs set status='open' where id='30000000-0000-4000-8000-000000000001'$q$);
select create_completed_job_review('30000000-0000-4000-8000-000000000001',5,'Good work');
select pg_temp.expect_denied('duplicate review', $q$select create_completed_job_review('30000000-0000-4000-8000-000000000001',5,'Again')$q$);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
update provider_profiles set availability='' where user_id=auth.uid();
select pg_temp.expect_denied('incomplete participant sends', $q$insert into messages(conversation_id,sender_id,body)
 values('50000000-0000-4000-8000-000000000001',auth.uid(),'Denied')$q$);
select pg_temp.expect_denied('incomplete participant reviews', $q$select create_completed_job_review('30000000-0000-4000-8000-000000000001',5,'Denied')$q$);
update provider_profiles set availability='Weekends' where user_id=auth.uid();
select create_completed_job_review('30000000-0000-4000-8000-000000000001',4,'Good client');
select pg_temp.expect_denied('direct review insert', $q$insert into reviews(job_id,reviewer_id,reviewee_id,rating)
 values('30000000-0000-4000-8000-000000000001',auth.uid(),auth.uid(),5)$q$);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select pg_temp.expect_denied('outsider review', $q$select create_completed_job_review('30000000-0000-4000-8000-000000000001',5,'Denied')$q$);
select pg_temp.expect_denied('outsider completion', $q$select complete_hired_job('50000000-0000-4000-8000-000000000001')$q$);

-- Admin can review; a resident cannot mutate the resulting decision or notes.
reset role;
insert into contact_otp_challenges(id,user_id,phone_e164,code_hash,expires_at,verified_at)
values('70000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000005','639123456789','test-only',now()+interval '30 minutes',now());
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
insert into verifications(id,user_id,contact_otp_challenge_id)
values('60000000-0000-4000-8000-000000000001',auth.uid(),'70000000-0000-4000-8000-000000000001');
select pg_temp.expect_true('resident submits pending', exists(select 1 from verifications where user_id=auth.uid() and status='pending'));
insert into storage.objects(bucket_id,name) values ('verification-files',auth.uid()::text || '/60000000-0000-4000-8000-000000000001/proof.jpg'),
 ('credential-files',auth.uid()::text || '/credential.jpg');
insert into verification_files(verification_id,file_type,file_path)
values('60000000-0000-4000-8000-000000000001','id_front',auth.uid()::text || '/60000000-0000-4000-8000-000000000001/proof.jpg');
update credentials set file_path=auth.uid()::text || '/credential.jpg' where provider_id=auth.uid();
select pg_temp.expect_denied('cannot attach somebody else file', $q$insert into verification_files(verification_id,file_type,file_path)
 values('60000000-0000-4000-8000-000000000001','id_back','someone-else/proof.jpg')$q$);
select pg_temp.expect_denied('owner cannot edit reviewer fields', $q$update verifications set reviewer_note='Forged' where user_id=auth.uid()$q$);
select pg_temp.expect_denied('owner cannot approve pending', $q$update verifications set status='approved' where user_id=auth.uid()$q$);
select pg_temp.expect_denied('consumed challenge cannot replay', $q$insert into verifications(user_id,contact_otp_challenge_id)
 values(auth.uid(),'70000000-0000-4000-8000-000000000001')$q$);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
update credentials set status='approved', reviewer_id=auth.uid(), reviewer_note='Private admin note',reviewed_at=now()
 where id='20000000-0000-4000-8000-000000000001';
select review_verification_request_atomic('60000000-0000-4000-8000-000000000001','approved',null);
select pg_temp.expect_true('admin issues verified state', is_verified_profile('10000000-0000-4000-8000-000000000005'));
select pg_temp.expect_true('admin reads verification files', exists(select id from verification_files));
select pg_temp.expect_true('admin reads private storage objects', (select count(*) from storage.objects)=2);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
with changed as (update storage.objects set metadata='{"forged":true}' where bucket_id='credential-files' returning id)
select pg_temp.expect_true('approved credential file cannot be replaced', not exists(select from changed));
with removed as (delete from storage.objects where bucket_id='credential-files' returning id)
select pg_temp.expect_true('approved credential file cannot be deleted', not exists(select from removed));
select pg_temp.expect_denied('cannot append evidence after approval', $q$insert into verification_files(verification_id,file_type,file_path)
 values('60000000-0000-4000-8000-000000000001','id_back',auth.uid()::text || '/60000000-0000-4000-8000-000000000001/new.jpg')$q$);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select pg_temp.expect_true('unrelated verification files private', not exists(select id from verification_files));
select pg_temp.expect_true('unrelated storage objects private', not exists(select id from storage.objects));
select pg_temp.expect_true('safe approved credential still public', exists(select id from get_public_approved_credentials('10000000-0000-4000-8000-000000000005')));
select pg_temp.expect_true('approved credential raw metadata private', not exists(select id from credentials));
select pg_temp.expect_true('verification notes private', not exists(select id from verifications));
select pg_temp.expect_denied('resident admin review RPC', $q$select review_verification_request_atomic('60000000-0000-4000-8000-000000000001','rejected','Forged')$q$);
rollback;
