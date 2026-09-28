#!/usr/bin/env node
/**
 * Proves taxonomy metadata omissions are a COMPILE-TIME failure.
 *
 * Requirement: "adding a canonical service without metadata causes a
 * TypeScript/test failure". A runtime test cannot prove that, so this takes a
 * throwaway copy of constants/service-taxonomy.ts, injects a canonical service
 * with no metadata, type-checks the copy, and asserts the compiler complains
 * about the exhaustive maps.
 *
 * Nothing in the repository is modified: the copy lives in the OS temp dir.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(PROJECT_ROOT, 'constants', 'service-taxonomy.ts');
const PROBE_SERVICE = 'Zzz probe service';

/**
 * `satisfies` failures are reported as TS1360 against the structural type, not
 * the variable name, so assert on the error code plus the probe service. Two
 * occurrences are required: the work-type map and the service-tags map.
 */
const SATISFIES_ERROR_CODE = 'TS1360';
const REQUIRED_SATISFIES_FAILURES = 2;

function fail(message) {
  console.error(`\n  FAIL  ${message}\n`);
  process.exit(1);
}

const originalSource = fs.readFileSync(SOURCE, 'utf8');

// Inject the probe service into the first canonical category only. Anchored on
// the category key so it cannot land in a tag list, and line-ending agnostic
// because the working tree checks out CRLF on Windows.
const anchor = "'Home & Local Help': [";
if (!originalSource.includes(anchor)) {
  fail('could not find the injection anchor in constants/service-taxonomy.ts');
}
const probeSource = originalSource.replace(anchor, `${anchor}\n    '${PROBE_SERVICE}',`);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'konektado-taxonomy-probe-'));
const probeFile = path.join(tempDir, 'service-taxonomy.probe.ts');

try {
  fs.writeFileSync(probeFile, probeSource, 'utf8');

  let output = '';
  let compiled = true;

  try {
    execFileSync(
      process.execPath,
      [
        path.join(PROJECT_ROOT, 'node_modules', 'typescript', 'bin', 'tsc'),
        '--noEmit',
        '--ignoreConfig',
        '--strict',
        '--skipLibCheck',
        '--moduleResolution',
        'bundler',
        '--module',
        'esnext',
        '--target',
        'es2020',
        probeFile,
      ],
      { cwd: PROJECT_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
  } catch (error) {
    compiled = false;
    output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }

  if (compiled) {
    fail(
      'a canonical service with NO metadata compiled cleanly.\n' +
        '        MvpServiceOption has widened back to `string`, so every\n' +
        '        Record<MvpServiceOption, ...> map is silently non-exhaustive.',
    );
  }

  if (!output.includes(PROBE_SERVICE)) {
    fail(
      'the compiler failed, but not because of the probe service.\n' +
        `        compiler output was:\n${output}`,
    );
  }

  const satisfiesFailures = output.split(SATISFIES_ERROR_CODE).length - 1;
  if (satisfiesFailures < REQUIRED_SATISFIES_FAILURES) {
    fail(
      `expected at least ${REQUIRED_SATISFIES_FAILURES} ${SATISFIES_ERROR_CODE} ` +
        `exhaustiveness errors, saw ${satisfiesFailures}.\n` +
        `        compiler output was:\n${output}`,
    );
  }

  console.log('  ok  taxonomy exhaustiveness is compiler-enforced');
  console.log(
    `      a canonical service with no metadata produced ${satisfiesFailures} ` +
      `${SATISFIES_ERROR_CODE} errors (work type + service tags)`,
  );
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
