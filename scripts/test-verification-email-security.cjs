// Runs the actual Edge Function handler with fake Auth/DB/email boundaries.
// No network, real user data, or email delivery is used.
/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const compile = (file) => ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const authModule = { exports: {} };
vm.runInNewContext(compile(path.join(root, 'supabase/functions/verification-email/authorization.ts')), {
  exports: authModule.exports, module: authModule,
});

async function scenario({ token = 'resident', status = 'pending', owner = 'resident', admin = false,
  roleFailure = false, changedStatus, body = {}, method = 'POST' } = {}) {
  let handler;
  const sent = [];
  let verificationReads = 0;
  const env = {
    SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'test-only',
    RESEND_API_KEY: 'test-only', VERIFICATION_EMAIL_FROM_EMAIL: 'test@example.test',
  };
  const db = {
    auth: {
      getUser: async (jwt) => ({ data: { user: jwt === 'invalid' ? null : { id: jwt } }, error: jwt === 'invalid' ? {} : null }),
      admin: { getUserById: async () => ({ data: { user: { email: 'canonical@example.test' } }, error: null }) },
    },
    from: (table) => {
      const query = {
        select: () => query, eq: () => query,
        maybeSingle: async () => {
          if (table === 'user_roles') return { data: admin ? { id: 'admin-role' } : null, error: roleFailure ? {} : null };
          if (table === 'profiles') return { data: { email: 'tampered@example.test', first_name: 'Test', full_name: 'Test Resident' }, error: null };
          verificationReads++;
          return { data: { user_id: owner, status: verificationReads > 1 ? changedStatus || status : status, reviewed_at: null, created_at: '2026-09-13T00:00:00Z', reviewer_note: '' }, error: null };
        },
      };
      return query;
    },
  };
  const mod = { exports: {} };
  vm.runInNewContext(compile(path.join(root, 'supabase/functions/verification-email/index.ts')), {
    exports: mod.exports, module: mod, Response, Request, URL, TextEncoder,
    console: { error() {}, warn() {}, log() {} },
    Deno: { env: { get: (key) => env[key] }, serve: (fn) => { handler = fn; } },
    require: (name) => {
      if (name.includes('supabase-js')) return { createClient: () => db };
      if (name.includes('nodemailer')) return { createTransport: () => ({ sendMail: async () => { throw new Error('Unexpected SMTP'); } }) };
      if (name === './authorization.ts') return authModule.exports;
      throw new Error(`Unexpected import ${name}`);
    },
    fetch: async (_url, options) => {
      sent.push({ payload: JSON.parse(options.body), headers: options.headers });
      return Response.json({ id: 'fake-email' });
    },
  });
  const response = await handler(new Request('http://localhost/verification-email', {
    method, headers: token ? { authorization: `Bearer ${token}` } : {},
    ...(method === 'POST' ? { body: JSON.stringify({ requestId: '60000000-0000-4000-8000-000000000001', ...body }) } : {}),
  }));
  return { response, sent };
}

(async () => {
  for (const [label, args, expected] of [
    ['missing token', { token: null }, 401],
    ['invalid token', { token: 'invalid' }, 401],
    ['outsider', { token: 'outsider' }, 403],
    ['resident requests admin decision', { status: 'approved' }, 403],
    ['unsupported state', { status: 'cancelled', admin: true }, 403],
    ['role lookup fails closed', { roleFailure: true }, 503],
    ['state changes during send', { changedStatus: 'approved' }, 500],
  ]) {
    const result = await scenario(args);
    assert.equal(result.response.status, expected, label);
    assert.equal(result.sent.length, 0, label);
    console.log(`PASS ${label}`);
  }
  const result = await scenario({ body: { template: 'verification_approved', ctaUrl: 'https://attacker.invalid', idempotencyKey: 'arbitrary' } });
  assert.equal(result.response.status, 200);
  assert.deepEqual(await result.response.json(), { ok: true });
  assert.equal(result.sent.length, 1);
  assert.ok(JSON.stringify(result.sent[0].payload.to).includes('canonical@example.test'));
  assert.ok(!JSON.stringify(result.sent[0]).includes('tampered@example.test'));
  assert.ok(!JSON.stringify(result.sent[0]).includes('attacker.invalid'));
  assert.ok(!JSON.stringify(result.sent[0]).includes('arbitrary'));
  assert.match(result.sent[0].headers['Idempotency-Key'], /pending/);
  console.log('PASS server-owned template, Auth recipient, URL, deduplication and minimal response');
  const decision = await scenario({ token: 'admin', admin: true, status: 'rejected', body: { template: 'verification_approved' } });
  assert.equal(decision.response.status, 200);
  assert.match(decision.sent[0].headers['Idempotency-Key'], /rejected/);
  console.log('PASS authorized admin decision derives stored state');
})().catch((error) => { console.error(error); process.exitCode = 1; });
