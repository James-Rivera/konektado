const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { assertReleaseIntent, assertMigrationPlan, pendingMigrations, assertVercelClient } = require('../scripts/release-preflight.cjs');

const sha = 'a'.repeat(40);
const ref = 'b'.repeat(20);
const base = {
  GITHUB_REPOSITORY: 'James-Rivera/konektado', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_SHA: sha,
  RELEASE_ACTION: 'plan-database', RELEASE_ENVIRONMENT: 'staging', SUPABASE_PROJECT_REF: ref,
  SUPABASE_ACCESS_TOKEN: 'synthetic-test-token', SUPABASE_DB_PASSWORD: 'synthetic-test-password',
};

describe('release intent', () => {
  it('allows a read-only staging plan without write confirmation', () => assert.equal(assertReleaseIntent(base).action, 'plan-database'));
  for (const changes of [
    { GITHUB_EVENT_NAME: 'push' }, { GITHUB_REPOSITORY: 'someone/fork' }, { RELEASE_ENVIRONMENT: 'production' },
    { SUPABASE_PROJECT_REF: 'dudlohdeydcbsvgccexd' }, { GITHUB_SHA: 'main' }, { SUPABASE_DB_PASSWORD: '' },
  ]) it(`rejects unsafe context ${Object.keys(changes)[0]}`, () => assert.throws(() => assertReleaseIntent({ ...base, ...changes })));
  it('requires confirmation for this exact action and commit, plus a backup reference', () => {
    const apply = { ...base, RELEASE_ACTION: 'apply-database' };
    assert.throws(() => assertReleaseIntent(apply));
    assert.throws(() => assertReleaseIntent({ ...apply, RELEASE_CONFIRMATION: `apply-database:${sha}` }));
    assert.equal(assertReleaseIntent({ ...apply, RELEASE_CONFIRMATION: `apply-database:${sha}`, RELEASE_BACKUP_REFERENCE: 'synthetic verified backup' }).action, 'apply-database');
  });
  it('blocks a wrong client target and privileged client keys', () => {
    const web = { ...base, RELEASE_ACTION: 'deploy-web', RELEASE_CONFIRMATION: `deploy-web:${sha}`, VERCEL_TOKEN: 'test', VERCEL_ORG_ID: 'test', VERCEL_PROJECT_ID: 'test', EXPO_PUBLIC_SUPABASE_KEY: 'sb_publishable_synthetic', EXPO_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co` };
    assert.equal(assertReleaseIntent(web).action, 'deploy-web');
    assert.throws(() => assertReleaseIntent({ ...web, EXPO_PUBLIC_SUPABASE_URL: 'https://dudlohdeydcbsvgccexd.supabase.co' }));
    assert.throws(() => assertReleaseIntent({ ...web, EXPO_PUBLIC_SUPABASE_KEY: 'sb_secret_synthetic' }));
  });
  it('requires an explicit EAS target attestation without database credentials for a build', () => {
    const build = { ...base, RELEASE_ACTION: 'build-android', RELEASE_CONFIRMATION: `build-android:${sha}`, EXPO_TOKEN: 'test', EXPO_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`, EXPO_PUBLIC_SUPABASE_KEY: 'sb_publishable_synthetic', SUPABASE_ACCESS_TOKEN: '', SUPABASE_DB_PASSWORD: '' };
    assert.throws(() => assertReleaseIntent(build));
    assert.equal(assertReleaseIntent({ ...build, EAS_PREVIEW_SUPABASE_PROJECT_REF: ref }).action, 'build-android');
  });
});

describe('Vercel preview client', () => {
  const client = { EXPO_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`, EXPO_PUBLIC_SUPABASE_KEY: 'sb_publishable_synthetic' };
  const contents = `EXPO_PUBLIC_SUPABASE_URL="${client.EXPO_PUBLIC_SUPABASE_URL}"\nEXPO_PUBLIC_SUPABASE_KEY="${client.EXPO_PUBLIC_SUPABASE_KEY}"\n`;
  it('accepts only the approved Preview values', () => assert.doesNotThrow(() => assertVercelClient(client, contents)));
  it('rejects mismatched and missing values without exposing them', () => {
    assert.throws(() => assertVercelClient({ ...client, EXPO_PUBLIC_SUPABASE_KEY: 'different-key' }, contents), /does not match/);
    assert.throws(() => assertVercelClient(client, ''), /does not match/);
  });
});

describe('migration plan', () => {
  const files = ['20261113090000_repairs.sql', '20261115090000_edits.sql'];
  const output = 'Would push these migrations:\n - 20261113090000_repairs.sql\n - 20261115090000_edits.sql';
  it('accepts only the approved pending versions', () => assert.deepEqual(assertMigrationPlan(output, 'all-local', files), ['20261113090000', '20261115090000']));
  it('rejects unexpected, missing and unknown migration versions', () => {
    assert.throws(() => assertMigrationPlan(output, '20261115090000', files));
    assert.throws(() => assertMigrationPlan(output, '20261117090000', files));
    assert.throws(() => assertMigrationPlan(output, 'none', files));
    assert.throws(() => assertMigrationPlan(output, '20261113090000,20261113090000', files));
  });
  it('accepts an explicitly up-to-date database for web deployment', () => assert.deepEqual(assertMigrationPlan('Remote database is up to date.', 'none', files), []));
  it('fails closed on empty output and authentication errors', () => {
    assert.throws(() => pendingMigrations(''));
    assert.throws(() => pendingMigrations('Invalid access token'));
  });
});
