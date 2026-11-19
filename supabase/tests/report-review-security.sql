-- Disposable local database fixtures from test-qa-report-security.cjs. Roll back all cases.
begin;
create function pg_temp.assert_denied(label text, statement text) returns void language plpgsql as $$
begin
  begin execute statement;
  exception when insufficient_privilege or raise_exception or check_violation then
    raise notice 'PASS denied: %',label; return;
  end;
  raise exception 'FAIL unexpectedly allowed: %',label;
end;
$$;
create function pg_temp.assert_true(label text, result boolean) returns void language plpgsql as $$
begin if result is distinct from true then raise exception 'FAIL: %',label; end if;
raise notice 'PASS: %',label; end;
$$;
grant execute on function pg_temp.assert_denied(text,text),pg_temp.assert_true(text,boolean) to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
select pg_temp.assert_denied('resident cannot insert resolved report',$q$insert into reports(reporter_id,reported_user_id,reason,status)
  values(auth.uid(),'91000000-0000-4000-8000-000000000003','Synthetic','resolved')$q$);
select pg_temp.assert_denied('resident cannot insert reviewer',$q$insert into reports(reporter_id,reported_user_id,reason,reviewed_by)
  values(auth.uid(),'91000000-0000-4000-8000-000000000003','Synthetic',auth.uid())$q$);
select pg_temp.assert_denied('resident cannot select internal notes',$q$select admin_notes from reports$q$);
select pg_temp.assert_denied('resident cannot select private audit identity',$q$select reviewed_by from reports$q$);
select pg_temp.assert_denied('resident cannot access decision audit table',$q$select * from app_private.report_decisions$q$);
select pg_temp.assert_denied('resident cannot access moderation state',$q$select * from app_private.review_moderation$q$);
select pg_temp.assert_denied('resident cannot call admin decisions',$q$select review_report('96000000-0000-4000-8000-000000000001','reviewing')$q$);
select pg_temp.assert_denied('conflicting review context denied',$q$insert into reports(reporter_id,review_id,reported_user_id,reason)
 values(auth.uid(),'95000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000003','Synthetic')$q$);
select pg_temp.assert_denied('blank reason rejected',$q$insert into reports(reporter_id,reported_user_id,reason)
 values(auth.uid(),'91000000-0000-4000-8000-000000000003','   ')$q$);
select pg_temp.assert_denied('job cannot accuse unrelated resident',$q$insert into reports(reporter_id,job_id,reported_user_id,reason)
 values(auth.uid(),'93000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000004','Synthetic mismatch')$q$);
insert into reports(id,reporter_id,review_id,reason)
 values('96000000-0000-4000-8000-000000000002',auth.uid(),'95000000-0000-4000-8000-000000000001','Synthetic review concern');
select pg_temp.assert_true('review report derives immutable author/job',exists(select 1 from reports
 where id='96000000-0000-4000-8000-000000000002' and reported_user_id=auth.uid() and job_id='93000000-0000-4000-8000-000000000001'));
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_true('new open report is received',(get_admin_report_page(30,0,null,true)->>'total')::integer=1);
select pg_temp.assert_denied('admin direct status mutation denied',$q$update reports set status='dismissed' where id='96000000-0000-4000-8000-000000000002'$q$);
select pg_temp.assert_denied('closing requires reporter outcome',$q$select review_report('96000000-0000-4000-8000-000000000002','resolved','Internal')$q$);
select pg_temp.assert_denied('review hide requires internal reason',$q$select review_report('96000000-0000-4000-8000-000000000002','reviewing',null,null,'hide')$q$);
select review_report('96000000-0000-4000-8000-000000000002','resolved','Synthetic internal reason','Synthetic public outcome','hide');
select pg_temp.assert_true('hidden review absent from direct SELECT',not exists(select id from reviews where id='95000000-0000-4000-8000-000000000001'));
select pg_temp.assert_true('hidden review excluded from aggregate',(get_public_profile_trust_summary('91000000-0000-4000-8000-000000000003','worker')->>'reviewCount')::integer=0);
select pg_temp.assert_true('admin detail includes hidden evidence',get_admin_report_detail('96000000-0000-4000-8000-000000000002')#>>'{target_details,body}'='Synthetic disputed feedback');
select pg_temp.assert_true('decision actor derived from auth',(get_admin_report_detail('96000000-0000-4000-8000-000000000002')->>'reviewed_by')=auth.uid()::text);
select review_report('96000000-0000-4000-8000-000000000002','open','Synthetic reopened complaint');
select pg_temp.assert_true('reopened reviewed report is not newly received',
 (get_admin_report_page(30,0,null,true)->>'total')::integer=0);
select review_report('96000000-0000-4000-8000-000000000002','reviewing','Synthetic started investigation');
select pg_temp.assert_true('reviewing report is not newly received',
 (get_admin_report_page(30,0,null,true)->>'total')::integer=0);
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
select pg_temp.assert_true('reporter notification includes outcome only',exists(select 1 from notifications
 where type='report_status_updated' and body like '%Synthetic public outcome%' and body not like '%Synthetic internal reason%'));
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select review_report('96000000-0000-4000-8000-000000000002','resolved','Synthetic restore reason','Synthetic restored outcome','restore');
select pg_temp.assert_true('restored aggregate valid',(get_public_profile_trust_summary('91000000-0000-4000-8000-000000000003','worker')->>'reviewCount')::integer=1);
select pg_temp.assert_true('all decisions retained',jsonb_array_length(get_admin_report_detail('96000000-0000-4000-8000-000000000002')->'decisions')=4);
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000004',true);
select pg_temp.assert_true('outsider report invisible',not exists(select id from reports where id='96000000-0000-4000-8000-000000000002'));
select pg_temp.assert_denied('outsider cannot inspect report detail',$q$select get_admin_report_detail('96000000-0000-4000-8000-000000000002')$q$);
reset role;
select pg_temp.assert_true('immutable review survives',exists(select 1 from reviews where id='95000000-0000-4000-8000-000000000001' and comment='Synthetic disputed feedback' and rating=2));
select pg_temp.assert_true('audit records derived admin identity',(select bool_and(reviewed_by='91000000-0000-4000-8000-000000000001') from app_private.report_decisions));
select pg_temp.assert_true('anonymous decision RPC unavailable',not has_function_privilege('anon','public.review_report(uuid,text,text,text,text)','execute'));
select pg_temp.assert_true('authenticated private column grant unavailable',not has_column_privilege('authenticated','public.reports','admin_notes','select'));
rollback;
