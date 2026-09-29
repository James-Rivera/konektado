/**
 * Public profile lookup error handling.
 *
 * `get_public_profile_summaries` returns no row for a profile the caller may
 * not view. That is intended (DEC-072, docs/07). The bug was that the profile
 * loader DISCARDED the RPC error, so any failure — network, permissions, a
 * missing migration — produced the same empty result, and the worker and
 * client screens rendered "Worker not found" / "Client not found" instead of
 * the real cause.
 *
 * These are source-contract tests, following DEC-123: the services import
 * Supabase and React Native modules that do not load under plain Node, and a
 * stubbing harness is not justified for this fix. The assertions pin exactly
 * the two properties that regressed: the error is kept, and it is checked
 * before the "no row" early return.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const REPO_ROOT = process.cwd();

function readSource(relativePath: string) {
  const fullPath = path.join(REPO_ROOT, relativePath);
  assert.ok(fs.existsSync(fullPath), `expected ${relativePath} to exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

/** Strips comments so prose cannot satisfy or break an assertion. */
function stripComments(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** Returns the source of one exported function, up to its closing brace. */
function extractFunction(source: string, name: string) {
  const start = source.indexOf(`export async function ${name}`);
  assert.ok(start >= 0, `${name} should be exported`);
  const next = source.indexOf('\nexport ', start + 1);
  return source.slice(start, next < 0 ? undefined : next);
}

const helpers = stripComments(readSource('services/marketplace.helpers.ts'));
const workerService = stripComments(readSource('services/worker-profile.service.ts'));
const clientService = stripComments(readSource('services/client-profile.service.ts'));

describe('profile loader keeps the RPC error', () => {
  const loader = extractFunction(helpers, 'loadPublicProfilesWithError');

  it('destructures the error from the RPC result', () => {
    assert.match(
      loader,
      /const \{ data, error \} = await supabase\s*\.rpc\('get_public_profile_summaries'/,
      'the RPC error must be captured, not discarded',
    );
  });

  it('returns the error instead of an empty result that looks like "not found"', () => {
    assert.match(loader, /if \(error\) \{[\s\S]*?return \{[^}]*error: error\.message/);
  });

  it('the Map-only loader still exists for list surfaces', () => {
    assert.match(
      helpers,
      /export async function loadPublicProfiles\(userIds: string\[\]\)/,
      'feed, Search, and conversations rely on the Map-returning signature',
    );
  });
});

/**
 * Asserts that `errorCheck` appears before `nullReturn` in `body`. This is the
 * ordering that regressed in the client service: the "no row" check ran first,
 * so every later error was masked as "not found".
 */
function assertCheckedBefore(body: string, errorCheck: RegExp, nullReturn: RegExp, label: string) {
  const errorIndex = body.search(errorCheck);
  const nullIndex = body.search(nullReturn);

  assert.ok(errorIndex >= 0, `${label}: the profile lookup error must be checked`);
  assert.ok(nullIndex >= 0, `${label}: the "no row" early return should still exist`);
  assert.ok(
    errorIndex < nullIndex,
    `${label}: errors must be checked BEFORE returning "not found"; otherwise failures are masked`,
  );
}

describe('worker profile surfaces lookup failures', () => {
  const body = extractFunction(workerService, 'getPublicWorkerProfile');

  it('uses the error-aware loader', () => {
    assert.match(body, /loadPublicProfilesWithError\(\[id\]\)/);
    assert.doesNotMatch(body, /\bloadPublicProfiles\(\[id\]\)/, 'the Map-only loader hides errors');
  });

  it('checks the lookup error before returning "not found"', () => {
    assertCheckedBefore(
      body,
      /if \(profilesResult\.error\) return \{ data: null, error: profilesResult\.error \}/,
      /if \(!profile\) return \{ data: null, error: null \}/,
      'getPublicWorkerProfile',
    );
  });

  it('checks every other request error before returning "not found"', () => {
    ['providerResult', 'servicesResult', 'selectedServiceResult', 'credentialResult', 'trustResult'].forEach(
      (name) => {
        assertCheckedBefore(
          body,
          new RegExp(`if \\(${name}\\.error\\)`),
          /if \(!profile\) return \{ data: null, error: null \}/,
          `getPublicWorkerProfile/${name}`,
        );
      },
    );
  });
});

describe('client profile surfaces lookup failures', () => {
  const body = extractFunction(clientService, 'getPublicClientProfile');

  it('uses the error-aware loader', () => {
    assert.match(body, /loadPublicProfilesWithError\(\[id\]\)/);
    assert.doesNotMatch(body, /\bloadPublicProfiles\(\[id\]\)/, 'the Map-only loader hides errors');
  });

  it('checks the lookup error before returning "not found"', () => {
    assertCheckedBefore(
      body,
      /if \(publicProfilesResult\.error\) return \{ data: null, error: publicProfilesResult\.error \}/,
      /if \(!profile\) return \{ data: null, error: null \}/,
      'getPublicClientProfile',
    );
  });

  it('checks every other request error before returning "not found"', () => {
    // This ordering is what was actually broken in the client service.
    ['clientProfileResult', 'jobsResult', 'selectedJobResult', 'trustResult'].forEach((name) => {
      assertCheckedBefore(
        body,
        new RegExp(`if \\(${name}\\.error\\)`),
        /if \(!profile\) return \{ data: null, error: null \}/,
        `getPublicClientProfile/${name}`,
      );
    });
  });
});

describe('screen copy for a profile the caller may not view', () => {
  const screens = ['app/worker/[workerId].tsx', 'app/client/[clientId].tsx'];

  it('no longer claims the person does not exist', () => {
    [...screens, 'app/services/[serviceId].tsx'].forEach((screen) => {
      const source = readSource(screen);
      assert.doesNotMatch(source, /title="(Worker|Client) not found"/, `${screen} still says "not found"`);
      assert.doesNotMatch(source, /is no longer available\."/, `${screen} still says "no longer available"`);
    });
    screens.forEach((screen) => {
      assert.match(readSource(screen), /title="Profile not available"/, `${screen} should use the honest title`);
    });
  });

  it('never blocks a loaded service on its worker summary', () => {
    // The worker summary only enriches Service Details. When it fails, the
    // screen used to show "Profile not available" on top of the service for a
    // verified worker. The detail view falls back to the service's provider.
    const source = readSource('app/services/[serviceId].tsx');
    assert.doesNotMatch(source, /Profile not available/, 'service detail must not show the profile empty state');
    assert.match(source, /workerProfile=\{profile\}/, 'service detail still passes the optional worker summary');
  });

  it('keeps a separate error state so real failures are shown with their message', () => {
    ['app/worker/[workerId].tsx', 'app/client/[clientId].tsx'].forEach((screen) => {
      assert.match(
        readSource(screen),
        /\{!loading && error \? \(\s*<EmptyState description=\{error\}/,
        `${screen} must render the real error, not the "not viewable" state`,
      );
    });
  });
});
