/* Isolated local PostgreSQL + real PostgREST tests. Never uses project secrets. */
const { spawn, spawnSync } = require('node:child_process');
const { readFileSync, readdirSync } = require('node:fs');
const { createHmac } = require('node:crypto');
const { Buffer } = require('node:buffer');
const assert = require('node:assert/strict');
const path = require('node:path');
const psql = process.env.TEST_PSQL || 'psql';
const postgrest = process.env.TEST_POSTGREST || 'postgrest';
const port = process.env.TEST_PGPORT || '55439';
const httpPort = process.env.TEST_HTTP_PORT || '55440';
const db = `konektado_security_test_${Date.now()}`;
const secret = 'isolated-security-test-only-jwt-secret-123456789';
const uid = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const jid = '30000000-0000-4000-8000-000000000001';
const cid = n => `50000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function sql(statement, database = db, file) {
  const args = ['-h', '127.0.0.1', '-p', port, '-U', 'postgres', '-d', database, '-X', '-q', '-v', 'ON_ERROR_STOP=1'];
  if (file) args.push('-1', '-f', file);
  else args.push('-t', '-A', '-c', statement);
  const result = spawnSync(psql, args, { encoding: 'utf8', windowsHide: true, timeout: 60000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout.trim();
}
function token(n) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: uid(n), role: 'authenticated', exp: Math.floor(Date.now()/1000)+600 })}`;
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}
async function api(n, resource, method = 'GET', body) {
  const response = await fetch(`http://127.0.0.1:${httpPort}/${resource}`, {
    method, headers: { Authorization: `Bearer ${token(n)}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, ok: response.ok, body: text ? JSON.parse(text) : null };
}
let count = 0;
async function check(label, promise, allowed) {
  const result = await promise;
  assert.equal(result.ok, allowed, `${label}: ${JSON.stringify(result)}`);
  if (!allowed) assert.ok([400,401,403,409].includes(result.status), `${label}: unexpected server error`);
  console.log(`PASS HTTP: ${label}`); count++;
  return result;
}
async function main() {
  let server;
  sql(`create database ${db}`, 'postgres');
  try {
    sql('', db, 'supabase/tests/local-platform.sql');
    const migrations = readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort();
    for (const migration of migrations) sql('', db, path.join('supabase/migrations', migration));
    console.log(`PASS: clean replay of ${migrations.length} migrations`);
    sql('', db, 'supabase/tests/security-permissions.sql');
    console.log('PASS: SQL/RLS permission suite');
    const suite = readFileSync('supabase/tests/security-permissions.sql', 'utf8');
    const fixtures = suite.slice(suite.indexOf('insert into auth.users'), suite.indexOf('set local role authenticated;'));
    sql(fixtures);
    sql(`do $$ begin if not exists(select from pg_roles where rolname='security_test_authenticator') then
      create role security_test_authenticator login noinherit; end if; end $$;
      grant anon, authenticated to security_test_authenticator;`);
    server = spawn(postgrest, [], { windowsHide: true, stdio: 'ignore', env: {
      ...process.env, PGRST_DB_URI: `postgres://security_test_authenticator@127.0.0.1:${port}/${db}`,
      PGRST_DB_SCHEMAS: 'public', PGRST_DB_ANON_ROLE: 'anon', PGRST_JWT_SECRET: secret,
      PGRST_SERVER_HOST: '127.0.0.1', PGRST_SERVER_PORT: httpPort,
    } });
    let spawnError;
    server.on('error', error => { spawnError = error; });
    for (let i=0; i<40; i++) {
      if (spawnError) throw spawnError;
      try { const r = await api(2, 'profiles?select=id'); if (r.ok) break; } catch { /* startup */ }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    await check('self verify UPDATE', api(5, `profiles?id=eq.${uid(5)}`, 'PATCH', { verified_at: new Date().toISOString() }), false);
    await check('self verify INSERT', api(7, 'profiles', 'POST', { id: uid(7), barangay_verified_at: new Date().toISOString() }), false);
    await check('normal signup profile', api(7, 'profiles', 'POST', { id: uid(7), first_name: 'New' }), true);
    await check('self approve credential', api(5, 'credentials', 'POST', { provider_id: uid(5), title: 'Forged', credential_type: 'other', status: 'approved' }), false);
    const credential = await check('submit pending credential', api(5, 'credentials', 'POST', { provider_id: uid(5), title: 'Proof', credential_type: 'other' }), true);
    await check('approve own pending credential', api(5, `credentials?id=eq.${credential.body[0].id}`, 'PATCH', { status: 'approved' }), false);
    const job = { id: jid, owner_id: uid(2), client_id: uid(2), title: 'Test job', budget_min: 100, budget_max: 200, rate_type: 'per_job', private_location_notes: 'Secret gate', allow_messages: true };
    for (const n of [5,6]) {
      await check(`user ${n} bypass Hiring Profile gate`, api(n, 'jobs?select=id', 'POST', { ...job, owner_id: uid(n), client_id: uid(n) }), false);
      await check(`user ${n} bypass Work Profile gate`, api(n, 'services?select=id', 'POST', { provider_id: uid(n), title: 'Test', category: 'Cleaning', rate_min:100, rate_max:200, rate_type:'per_service' }), false);
    }
    await check('ready owner publishes', api(2, 'jobs?select=id', 'POST', job), true);
    await check('unrelated direct private column', api(4, `jobs?id=eq.${jid}&select=private_location_notes`), false);
    await check('unrelated private notes RPC', api(4, 'rpc/get_job_private_location_notes', 'POST', { p_job_id: jid }), false);
    const notes = await check('owner private notes RPC', api(2, 'rpc/get_job_private_location_notes', 'POST', { p_job_id: jid }), true);
    assert.equal(notes.body, 'Secret gate');
    const conversation = n => ({ id: cid(n), job_id: jid, client_id: uid(2), provider_id: uid(n), started_by: uid(n) });
    await check('incomplete direct messaging', api(6, 'conversations', 'POST', conversation(6)), false);
    for (const n of [3,4]) await check(`worker ${n} starts chat`, api(n, 'conversations', 'POST', conversation(n)), true);
    await check('alter participant', api(3, `conversations?id=eq.${cid(3)}`, 'PATCH', { client_id: uid(4) }), false);
    await check('direct hired state', api(3, `conversations?id=eq.${cid(3)}`, 'PATCH', { status:'hired', hired_at:new Date().toISOString() }), false);
    await check('direct invalid review', api(3, 'reviews', 'POST', { job_id:jid, reviewer_id:uid(3), reviewee_id:uid(3), rating:5 }), false);
    await check('review before completion', api(2, 'rpc/create_completed_job_review', 'POST', { p_job_id:jid, p_rating:5, p_comment:'Invalid' }), false);
    // Force the second write to fail and prove the first write rolls back.
    sql(`create function public.test_fail_hire() returns trigger language plpgsql as $$ begin
      if new.status='in_progress' then raise exception 'Injected write failure'; end if; return new; end $$;
      create trigger test_fail_hire before update on jobs for each row execute function test_fail_hire();`);
    await check('hiring write failure', api(2, 'rpc/mark_job_worker_hired', 'POST', { p_conversation_id:cid(3) }), false);
    assert.equal(sql(`select status || ':' || (hired_at is null)::text from conversations where id='${cid(3)}'`), 'active:true');
    assert.equal(sql(`select status from jobs where id='${jid}'`), 'open');
    sql('drop trigger test_fail_hire on jobs; drop function test_fail_hire();');
    console.log('PASS: failed hiring transaction rolled back both records');
    for (const status of ['closed','cancelled','completed']) {
      sql(`update jobs set status='${status}' where id='${jid}'`);
      await check(`cannot hire ${status} job`, api(2, 'rpc/mark_job_worker_hired', 'POST', { p_conversation_id:cid(3) }), false);
    }
    sql(`update jobs set status='open' where id='${jid}'`);
    const race = await Promise.all([3,4].map(n => api(2, 'rpc/mark_job_worker_hired', 'POST', { p_conversation_id:cid(n) })));
    assert.equal(race.filter(r => r.ok).length, 1, JSON.stringify(race));
    assert.equal(sql(`select count(*) from conversations c join jobs j on j.id=c.job_id
      where j.id='${jid}' and c.hired_at is not null and c.status='hired' and j.status='in_progress' and j.accepted_provider_id=c.provider_id`), '1');
    console.log('PASS: concurrent hiring has one consistent winner');
    const winner = race[0].ok ? 3 : 4;
    await check('client completes hired job', api(2, 'rpc/complete_hired_job', 'POST', { p_conversation_id:cid(winner) }), true);
    await check('valid completed review', api(2, 'rpc/create_completed_job_review', 'POST', { p_job_id:jid, p_rating:5, p_comment:'Good work' }), true);
    await check('duplicate completed review', api(2, 'rpc/create_completed_job_review', 'POST', { p_job_id:jid, p_rating:5, p_comment:'Again' }), false);
    console.log(`PASS: ${count} direct HTTP checks plus concurrency and rollback`);
  } finally {
    if (server && server.exitCode === null) {
      await new Promise(resolve => {
        const timeout = setTimeout(resolve, 2000);
        server.once('exit', () => { clearTimeout(timeout); resolve(); });
        server.kill();
      });
    }
    // Only the uniquely named database created above is removed.
    sql(`drop database ${db} with (force)`, 'postgres');
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
