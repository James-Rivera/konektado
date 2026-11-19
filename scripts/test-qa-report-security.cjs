/* Local PostgreSQL/PostgREST regression. No .env, linked project, mail or resident data. */
const { spawnSync, spawn } = require('node:child_process');
const { readdirSync } = require('node:fs');
const { createHmac } = require('node:crypto');
const { Buffer } = require('node:buffer');
const assert = require('node:assert/strict');
const psql = process.env.TEST_PSQL || 'C:/Program Files/PostgreSQL/18/bin/psql.exe';
const port = process.env.TEST_PGPORT || '55439';
const httpPort = process.env.TEST_HTTP_PORT || '55442';
const db = `konektado_report_test_${Date.now()}`;
const correction = '20261118235200_secure_report_review_moderation.sql';
const uid = n => `91000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const rid = '95000000-0000-4000-8000-000000000001';
const jid = '93000000-0000-4000-8000-000000000001';
const cid = '94000000-0000-4000-8000-000000000001';
const secret = 'isolated-report-security-test-secret-only-123456789';
function sql(statement, database=db, file) {
  const args=['-h','127.0.0.1','-p',port,'-U','postgres','-d',database,'-X','-q','-v','ON_ERROR_STOP=1',...(file?['-1','-f',file]:['-t','-A'])];
  const result=spawnSync(psql,args,{input:file?undefined:statement,encoding:'utf8',windowsHide:true,timeout:60000,env:{...process.env,PGCLIENTENCODING:'UTF8'}});
  if(result.error)throw result.error;
  if(result.status!==0)throw Error(result.stderr||result.stdout);
  return result.stdout.trim();
}
const asUser=(n,statement)=>`begin; set local role authenticated; select set_config('request.jwt.claim.sub','${uid(n)}',true); ${statement}; commit;`;
function token(n) {
  const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
  const body=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:uid(n),role:'authenticated',exp:Math.floor(Date.now()/1000)+600})}`;
  return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`;
}
async function api(n,resource,method='GET',body) {
  const response=await fetch(`http://127.0.0.1:${httpPort}/${resource}`,{method,headers:{Authorization:`Bearer ${token(n)}`,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text(); return {ok:response.ok,status:response.status,body:text?JSON.parse(text):null};
}
let checks=0;
async function check(label,promise,allowed) {
  const response=await promise;
  assert.equal(response.ok,allowed,`${label}: ${JSON.stringify(response)}`);
  if(!allowed)assert.ok([400,401,403,404,409].includes(response.status),`${label}: unexpected server failure`);
  console.log(`PASS HTTP: ${label}`); checks++; return response.body;
}
async function main() {
  let server;
  sql(`create database ${db}`,'postgres');
  try {
    sql('',db,'supabase/tests/local-platform.sql');
    const migrations=readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort();
    for(const migration of migrations.filter(f=>f<correction))sql('',db,`supabase/migrations/${migration}`);
    console.log('PASS: replayed 45 recovered historical migrations before corrective migration');
    sql(`insert into auth.users(id,email) select ('91000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'report-fixture-'||n||'@example.invalid' from generate_series(1,4)n;
      insert into profiles(id,full_name,first_name,last_name,street,preferred_contact_method,verified_at,barangay_verified_at)
      select id,'Synthetic Resident','Synthetic','Resident','Test area','app_message',now(),now() from auth.users;
      insert into user_roles(user_id,role) values('${uid(1)}','barangay_admin');
      insert into jobs(id,owner_id,client_id,title,status,accepted_provider_id) values('${jid}','${uid(2)}','${uid(2)}','Synthetic completed job','completed','${uid(3)}');
      insert into conversations(id,job_id,client_id,provider_id,started_by,status,hired_at) values('${cid}','${jid}','${uid(2)}','${uid(3)}','${uid(3)}','hired',now());
      insert into messages(conversation_id,sender_id,body) values('${cid}','${uid(2)}','Synthetic reported conversation evidence');
      insert into reviews(id,job_id,reviewer_id,reviewee_id,rating,comment) values('${rid}','${jid}','${uid(2)}','${uid(3)}',2,'Synthetic disputed feedback');`);
    const injected='96000000-0000-4000-8000-000000000001';
    sql(asUser(2,`insert into reports(id,reporter_id,reported_user_id,reason,status,reviewed_by,reviewed_at,admin_notes)
      values('${injected}',auth.uid(),'${uid(3)}','Synthetic baseline','resolved','${uid(1)}',now(),'Synthetic internal note')`));
    assert.equal(sql(`select status from reports where id='${injected}'`),'resolved');
    assert.match(sql(asUser(2,`select admin_notes from reports where id='${injected}'`)),/Synthetic internal note/);
    console.log('CONFIRMED BEFORE: resident inserted resolved/reviewer metadata and read internal admin_notes through actual PostgreSQL grants/RLS.');
    sql('',db,`supabase/migrations/${correction}`);
    for(const migration of migrations.filter(f=>f>correction))sql('',db,`supabase/migrations/${migration}`);
    sql('',db,'supabase/tests/report-review-security.sql');
    console.log('PASS: corrective SQL/RLS report/review suite');
    if(!process.env.TEST_POSTGREST){console.log('HTTP checks NOT RUN: set TEST_POSTGREST to the official PostgREST binary.');return;}
    sql(`do $$ begin if not exists(select from pg_roles where rolname='report_test_authenticator') then create role report_test_authenticator login noinherit; end if; end $$;
      grant anon,authenticated to report_test_authenticator;`);
    server=spawn(process.env.TEST_POSTGREST,[],{windowsHide:true,stdio:'ignore',env:{...process.env,
      PGRST_DB_URI:`postgres://report_test_authenticator@127.0.0.1:${port}/${db}`,PGRST_DB_SCHEMAS:'public',PGRST_DB_ANON_ROLE:'anon',PGRST_JWT_SECRET:secret,PGRST_SERVER_HOST:'127.0.0.1',PGRST_SERVER_PORT:httpPort}});
    let serverError; server.on('error',e=>{serverError=e;});
    for(let i=0;i<50;i++){if(serverError)throw serverError;try{const r=await api(2,'reports?select=id');if(r.ok)break;}catch{} await new Promise(r=>setTimeout(r,200));}
    const normal={reporter_id:uid(2),reported_user_id:uid(3),reason:'Synthetic HTTP complaint'};
    for(const fields of [{status:'resolved'},{reviewed_by:uid(1)},{reviewed_at:new Date().toISOString()},{admin_notes:'forged'},{resolution_message:'forged'}])
      await check(`reject resident administrative fields ${Object.keys(fields)}`,api(2,'reports?select=id','POST',{...normal,...fields}),false);
    const created=await check('normal safe report creation',api(2,'reports?select=id,status,resolution_message','POST',normal),true);
    assert.equal(created[0].status,'open');
    await check('resident internal column denied',api(2,`reports?id=eq.${created[0].id}&select=admin_notes`),false);
    await check('resident cannot call admin page',api(2,'rpc/get_admin_report_page','POST',{}),false);
    await check('resident cannot call admin detail',api(2,'rpc/get_admin_report_detail','POST',{p_report_id:created[0].id}),false);
    await check('resident cannot decide report',api(2,'rpc/review_report','POST',{p_report_id:created[0].id,p_status:'resolved',p_resolution_message:'No'}),false);
    await check('admin direct PATCH denied',api(1,`reports?id=eq.${created[0].id}&select=id`,'PATCH',{status:'resolved'}),false);
    const reviewed=await check('admin decision records safe outcome',api(1,'rpc/review_report','POST',{p_report_id:created[0].id,p_status:'resolved',p_admin_notes:'Synthetic private reasoning',p_resolution_message:'Synthetic public outcome'}),true);
    assert.equal(reviewed.reviewed_by,uid(1));assert.equal(reviewed.decisions.length,1);
    const safe=await check('reporter safe outcome available',api(2,`reports?id=eq.${created[0].id}&select=id,status,resolution_message`),true);
    assert.equal(safe[0].resolution_message,'Synthetic public outcome');
    const outsider=await check('outsider report hidden',api(4,`reports?id=eq.${created[0].id}&select=id`),true);assert.equal(outsider.length,0);
    const reviewReport=await check('review report target derived',api(3,'reports?select=id,review_id,reported_user_id,job_id','POST',{reporter_id:uid(3),review_id:rid,reason:'Synthetic feedback concern'}),true);
    assert.equal(reviewReport[0].reported_user_id,uid(2)); assert.equal(reviewReport[0].job_id,jid);
    const trustArgs={p_user_id:uid(3),p_role:'worker'};
    const before=await check('review included before moderation',api(4,'rpc/get_public_profile_trust_summary','POST',trustArgs),true);assert.equal(before.reviewCount,1);
    await check('hide needs rationale',api(1,'rpc/review_report','POST',{p_report_id:reviewReport[0].id,p_status:'reviewing',p_review_action:'hide'}),false);
    await check('admin hides reported review',api(1,'rpc/review_report','POST',{p_report_id:reviewReport[0].id,p_status:'resolved',p_admin_notes:'Synthetic policy rationale',p_resolution_message:'Feedback hidden after review',p_review_action:'hide'}),true);
    const hidden=await check('hidden excluded from public text and aggregate',api(4,'rpc/get_public_profile_trust_summary','POST',trustArgs),true);assert.equal(hidden.reviewCount,0);assert.equal(hidden.averageRating,null);assert.equal(hidden.recentReviews.length,0);
    const directHidden=await check('hidden direct review absent',api(2,`reviews?id=eq.${rid}&select=id,comment`),true);assert.equal(directHidden.length,0);
    const detail=await check('admin retains hidden evidence and audit',api(1,'rpc/get_admin_report_detail','POST',{p_report_id:reviewReport[0].id}),true);assert.equal(detail.target_details.body,'Synthetic disputed feedback');assert.equal(detail.review_hidden,true);
    await check('admin restores immutable review',api(1,'rpc/review_report','POST',{p_report_id:reviewReport[0].id,p_status:'resolved',p_admin_notes:'Synthetic appeal rationale',p_resolution_message:'Feedback restored after review',p_review_action:'restore'}),true);
    const restored=await check('restored review reenters public aggregate',api(4,'rpc/get_public_profile_trust_summary','POST',trustArgs),true);assert.equal(restored.reviewCount,1);assert.equal(restored.averageRating,2);
    const chatReport=await check('hired chat report inserts without status mutation',api(2,'reports?select=id','POST',{reporter_id:uid(2),conversation_id:cid,reason:'Synthetic chat concern'}),true);
    const chatDetail=await check('reported chat scoped evidence',api(1,'rpc/get_admin_report_detail','POST',{p_report_id:chatReport[0].id}),true);assert.equal(chatDetail.target_details.messages[0].body,'Synthetic reported conversation evidence');
    await check('outsider chat report rejected',api(4,'reports?select=id','POST',{reporter_id:uid(4),conversation_id:cid,reason:'Denied'}),false);
    await check('job report wrong accused resident rejected',api(3,'reports?select=id','POST',{reporter_id:uid(3),job_id:jid,reported_user_id:uid(4),reason:'Synthetic mismatched target'}),false);
    const jobReport=await check('job report actual owner derived',api(3,'reports?select=id,reported_user_id','POST',{reporter_id:uid(3),job_id:jid,reason:'Synthetic job concern'}),true);assert.equal(jobReport[0].reported_user_id,uid(2));
    sql(`insert into reports(reporter_id,reported_user_id,reason) select set_config('request.jwt.claim.sub','${uid(2)}',false)::uuid,'${uid(3)}','Synthetic backlog '||n from generate_series(1,125)n;`);
    const page=await check('admin page server-filtered with full counts',api(1,'rpc/get_admin_report_page','POST',{p_limit:10,p_offset:120,p_statuses:['open']}),true);assert.ok(page.total>=125);assert.ok(page.reports.length>0);assert.ok(page.reports.every(r=>r.status==='open'));assert.ok(page.counts.open>=125);
    assert.equal(sql(`select count(*) from reviews where id='${rid}' and comment='Synthetic disputed feedback'`),'1');
    console.log(`PASS: ${checks} HTTP checks; immutable review preserved, hide/restore/audit verified.`);
  } finally {
    if(server&&server.exitCode===null){await new Promise(resolve=>{const timer=setTimeout(resolve,2000);server.once('exit',()=>{clearTimeout(timer);resolve();});server.kill();});}
    sql(`drop database ${db} with(force)`,'postgres');
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
