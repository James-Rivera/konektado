// Pure release guards. Importing this module does not connect to any service.
const fs = require('node:fs');
const { Buffer } = require('node:buffer');
const { parseEnv } = require('node:util');

const DEMO_PROJECT_REF = 'dudlohdeydcbsvgccexd';
const ACTIONS = ['plan-database', 'apply-database', 'deploy-web', 'build-android'];

function requireValue(env, name) {
  if (!env[name]?.trim()) throw new Error(`Configure ${name} in the staging GitHub environment.`);
  return env[name].trim();
}

function assertReleaseIntent(env) {
  const action = requireValue(env, 'RELEASE_ACTION');
  if (!ACTIONS.includes(action)) throw new Error('Unsupported release action.');
  if (env.GITHUB_REPOSITORY !== 'James-Rivera/konektado' || env.GITHUB_EVENT_NAME !== 'workflow_dispatch') {
    throw new Error('Releases require a manual dispatch in James-Rivera/konektado.');
  }
  const sha = requireValue(env, 'GITHUB_SHA');
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('A full release commit SHA is required.');
  if (env.RELEASE_ENVIRONMENT !== 'staging') throw new Error('Only staging is supported by this workflow.');
  const ref = requireValue(env, 'SUPABASE_PROJECT_REF');
  if (!/^[a-z]{20}$/.test(ref) || ref === DEMO_PROJECT_REF) {
    throw new Error('Configure a separate staging Supabase project; the current demo is forbidden.');
  }
  if (action !== 'plan-database' && env.RELEASE_CONFIRMATION !== `${action}:${sha}`) {
    throw new Error(`Confirmation must be ${action}: followed by this workflow's full commit SHA.`);
  }
  if (action !== 'build-android') {
    requireValue(env, 'SUPABASE_ACCESS_TOKEN');
    requireValue(env, 'SUPABASE_DB_PASSWORD');
  }
  if (action === 'apply-database') requireValue(env, 'RELEASE_BACKUP_REFERENCE');
  if (action === 'deploy-web' || action === 'build-android') {
    if (requireValue(env, 'EXPO_PUBLIC_SUPABASE_URL') !== `https://${ref}.supabase.co`) {
      throw new Error('The client Supabase URL must match the staging project.');
    }
    const key = requireValue(env, 'EXPO_PUBLIC_SUPABASE_KEY');
    let anonJwt = false;
    try { anonJwt = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'anon'; } catch { /* Modern keys are not JWTs. */ }
    if (!key.startsWith('sb_publishable_') && !anonJwt) throw new Error('Only a publishable/anon Supabase client key is allowed.');
  }
  if (action === 'deploy-web') {
    for (const name of ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID']) requireValue(env, name);
  }
  if (action === 'build-android') {
    requireValue(env, 'EXPO_TOKEN');
    if (env.EAS_PREVIEW_SUPABASE_PROJECT_REF !== ref) {
      throw new Error('Verify the EAS preview environment targets this staging database before building.');
    }
  }
  return { action, sha, ref };
}

function pendingMigrations(output) {
  const versions = [...output.matchAll(/\b(\d{14})_[A-Za-z0-9_-]+\.sql\b/g)].map(match => match[1]);
  if (versions.length) return [...new Set(versions)].sort();
  if (/remote database is up to date/i.test(output)) return [];
  throw new Error('Unrecognized Supabase dry-run output; review the plan instead of applying automatically.');
}

function assertMigrationPlan(output, expected, localFiles) {
  const localVersions = localFiles.map(file => file.match(/^(\d{14})_.*\.sql$/)?.[1]).filter(Boolean).sort();
  const requested = expected === 'all-local' ? localVersions : expected === 'none' ? [] : expected.split(',').map(value => value.trim());
  if (requested.some(value => !/^\d{14}$/.test(value) || !localVersions.includes(value)) || new Set(requested).size !== requested.length) {
    throw new Error('Expected migrations must be local versions, all-local, or none.');
  }
  const pending = pendingMigrations(output);
  if (JSON.stringify(pending) !== JSON.stringify([...requested].sort())) {
    throw new Error(`Migration plan differs from approval. Pending: ${pending.join(',') || 'none'}.`);
  }
  return pending;
}

function assertVercelClient(env, contents) {
  const parsed = parseEnv(contents);
  for (const name of ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_KEY']) {
    if (parsed[name] !== env[name]) throw new Error(`Vercel preview ${name} does not match the approved staging configuration.`);
  }
}

module.exports = { assertReleaseIntent, pendingMigrations, assertMigrationPlan, assertVercelClient };

if (require.main === module) {
  try {
    const [command, file, expected] = process.argv.slice(2);
    if (command === 'intent') {
      const { action, sha, ref } = assertReleaseIntent(process.env);
      console.log(`Validated ${action} for staging ${ref} at ${sha}.`);
    } else if (command === 'pending') {
      const pending = assertMigrationPlan(fs.readFileSync(file, 'utf8'), expected, fs.readdirSync('supabase/migrations'));
      console.log(`Validated migration plan: ${pending.join(',') || 'none'}.`);
    } else if (command === 'vercel-client') {
      assertVercelClient(process.env, fs.readFileSync(file, 'utf8'));
      console.log('Vercel preview client configuration matches staging.');
    } else throw new Error('Usage: release-preflight.cjs intent | pending <plan-file> <expected> | vercel-client <env-file>');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
