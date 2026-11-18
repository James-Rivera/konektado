// Local-only scratch database. Never reads .env or connects to a linked project.
const { spawnSync, spawn } = require('node:child_process');
const { readdirSync, readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const psql = process.env.TEST_PSQL || 'C:/Program Files/PostgreSQL/18/bin/psql.exe';
const port = process.env.TEST_PGPORT || '55438';
const db = `konektado_posting_test_${Date.now()}`;
const args = database => ['-h','127.0.0.1','-p',port,'-U','postgres','-d',database,'-X','-q','-v','ON_ERROR_STOP=1'];
function sql(statement, database = db, file) {
  // Pipe UTF-8 SQL rather than passing Unicode through Windows' command-line code page.
  const result = spawnSync(psql, [...args(database), ...(file ? ['-1','-f',file] : ['-t','-A'])], {
    input: file ? undefined : statement, encoding:'utf8', windowsHide:true,
    env: { ...process.env, PGCLIENTENCODING:'UTF8' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(result.stderr || result.stdout);
  return result.stdout.trim();
}
function concurrent(statement) {
  return new Promise((resolve, reject) => {
    const child = spawn(psql,[...args(db),'-t','-A','-c',statement],{ windowsHide:true });
    let out='',err='';child.stdout.on('data',s=>out+=s);child.stderr.on('data',s=>err+=s);
    child.on('error',reject);child.on('exit',code=>code ? reject(Error(err)) : resolve(out.trim().split('\n').at(-1)));
  });
}
(async () => {
  sql(`create database ${db}`,'postgres');
  sql('',db,'supabase/tests/local-platform.sql');
  const migrations = readdirSync('supabase/migrations').filter(p=>p.endsWith('.sql')).sort();
  for (const migration of migrations) {
    if (migration.startsWith('20261115090000')) sql('',db,'supabase/tests/legacy-posting-before-migration.sql');
    sql('',db,`supabase/migrations/${migration}`);
  }
  console.log(`PASS: clean replay of ${migrations.length} migrations`);
  // Every current canonical service must be accepted by the committed SQL,
  // so future taxonomy changes cannot silently diverge from publish validation.
  const vocabulary = {};
  const code = ts.transpileModule(readFileSync('constants/service-taxonomy.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code,{ exports: vocabulary });
  const contractChecks = [];
  for (const [category, services] of Object.entries(vocabulary.MVP_SERVICES_BY_CATEGORY)) {
    for (const service of services) {
      const common = { title:'Taxonomy fixture', description:'Valid fixture', location_text:'San Pedro', rate_type:'per_job' };
      const job = { ...common, category, service_needed:service, budget_min:200, budget_max:300, workers_needed:1, scheduled_date:'2050-11-13', time_preference:'morning', schedule_flexibility:'flexible', schedule_timezone:'Asia/Manila', schedule_text:'Display text can change independently' };
      const offer = { ...common, category:service, rate_min:200, rate_max:300 };
      for (const [kind,payload] of [['job',job],['service',offer]]) contractChecks.push(`select app_private.validate_listing_payload('${kind}','${JSON.stringify(payload).replaceAll("'","''")}'::jsonb);`);
    }
  }
  sql(contractChecks.join('\n'));
  console.log(`PASS: all ${vocabulary.MVP_SERVICE_OPTIONS.length} canonical services match the SQL publish contract`);
  sql('',db,'supabase/tests/security-permissions.sql');
  console.log('PASS: existing security-permissions regression suite');
  sql('',db,'supabase/tests/posting-profile.sql');
  console.log('PASS: posting/profile SQL, RLS, validation, rollback and retry assertions');
  sql('',db,'supabase/tests/durable-edits.sql');
  console.log('PASS: durable edits, stale-write rejection, legacy repair, source conflicts and rollback');
  sql('',db,'supabase/tests/photo-visibility.sql');
  console.log('PASS: photo visibility write containment and moderation');
  sql('',db,'supabase/tests/conversation-privacy.sql');
  console.log('PASS: participant-scoped inbox and reported moderation access');
  sql('',db,'supabase/tests/function-permissions.sql');
  console.log('PASS: function ACLs, role guards, defaults, search paths and triggers');
  const call = `set role authenticated; select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000001',false); select public.publish_job_draft('72000000-0000-4000-8000-000000000099');`;
  const [a,b] = await Promise.all([concurrent(call),concurrent(call)]);
  assert.equal(a,b,'concurrent publication must return the same listing');
  assert.equal(sql("select count(*) from app_private.marketplace_publications where draft_id='72000000-0000-4000-8000-000000000099'"),'1');
  console.log('PASS: concurrent publication returns exactly one listing');
  const edit = JSON.parse(sql("select json_build_object('id',id,'revision',revision) from job_drafts where source_listing_id='74000000-0000-4000-8000-000000000001'"));
  const editCall = `set role authenticated; select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000001',false); select public.commit_job_draft('${edit.id}',${edit.revision});`;
  const [editA,editB]=await Promise.all([concurrent(editCall),concurrent(editCall)]);
  assert.equal(editA,editB);
  assert.equal(sql("select content_version from jobs where id='74000000-0000-4000-8000-000000000001'"),'2');
  console.log('PASS: concurrent edit commits update the public row exactly once');
  console.log(`Isolated test database retained for inspection: ${db} on 127.0.0.1:${port}`);
})().catch(error=>{
  console.error(error.message);
  console.error(`Failed isolated test database retained: ${db} on 127.0.0.1:${port}`);
  process.exitCode=1;
});
