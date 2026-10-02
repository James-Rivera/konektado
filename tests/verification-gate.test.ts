/**
 * Shared verification gate: status resolution, pending-state copy, and the
 * rule that no gated screen computes verification inline anymore.
 *
 * The bug this pins: every screen treated "not verified" as one state, so a
 * resident who had already submitted was told to "Verify to message" and sent
 * back into the flow. Pending residents must be told their request is under
 * review instead.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  getVerificationGateCopy,
  resolveVerificationGateStatus,
} from '@/utils/verification-gate';

describe('resolveVerificationGateStatus', () => {
  it('treats approval timestamps as authoritative', () => {
    assert.equal(
      resolveVerificationGateStatus({ barangayVerifiedAt: '2026-09-01', latestStatus: 'pending', verifiedAt: null }),
      'approved',
    );
    assert.equal(
      resolveVerificationGateStatus({ barangayVerifiedAt: null, latestStatus: null, verifiedAt: '2026-09-01' }),
      'approved',
    );
  });

  it('maps the latest request when the profile is not approved', () => {
    const base = { barangayVerifiedAt: null, verifiedAt: null };
    assert.equal(resolveVerificationGateStatus({ ...base, latestStatus: 'pending' }), 'pending');
    assert.equal(resolveVerificationGateStatus({ ...base, latestStatus: 'needs_more_info' }), 'needs_correction');
    assert.equal(resolveVerificationGateStatus({ ...base, latestStatus: 'rejected' }), 'rejected');
  });

  it('treats no request, cancelled, and skipped as not started', () => {
    const base = { barangayVerifiedAt: null, verifiedAt: null };
    assert.equal(resolveVerificationGateStatus({ ...base, latestStatus: null }), 'unverified');
    assert.equal(resolveVerificationGateStatus({ ...base, latestStatus: 'cancelled' }), 'unverified');
    assert.equal(resolveVerificationGateStatus({ ...base, latestStatus: 'skipped' }), 'unverified');
  });
});

describe('getVerificationGateCopy', () => {
  it('never asks a pending resident to verify again', () => {
    (['message', 'save', 'post', 'hire', 'review'] as const).forEach((action) => {
      const copy = getVerificationGateCopy('pending', action);
      assert.equal(copy.title, 'Your verification is under review');
      assert.doesNotMatch(copy.ctaLabel, /^Verify/);
      assert.doesNotMatch(copy.actionLabel, /Start/);
    });
  });

  it('keeps the start-verification wording for residents who have not submitted', () => {
    assert.equal(getVerificationGateCopy('unverified', 'message').ctaLabel, 'Verify to message');
    assert.equal(getVerificationGateCopy('unverified', 'save').actionLabel, 'Start verification');
  });

  it('routes corrections and rejections to a review action', () => {
    assert.equal(getVerificationGateCopy('needs_correction', 'post').actionLabel, 'Review verification');
    assert.equal(getVerificationGateCopy('rejected', 'message').ctaLabel, 'Update verification');
  });
});

describe('gated screens use the shared gate', () => {
  const screens = [
    'app/(tabs)/index.tsx',
    'app/(tabs)/messages.tsx',
    'app/(tabs)/post.tsx',
    'app/(tabs)/search.tsx',
    'app/client/[clientId].tsx',
    'app/create-job-preview.tsx',
    'app/create-service-preview.tsx',
    'app/job/[jobId].tsx',
    'app/services/[serviceId].tsx',
    'app/worker/[workerId].tsx',
  ];

  it('no screen derives verification from profile timestamps inline', () => {
    screens.forEach((screen) => {
      const source = fs.readFileSync(path.join(process.cwd(), screen), 'utf8');
      assert.doesNotMatch(
        source,
        /Boolean\(\s*\w*[pP]rofile\?\.barangay_verified_at\s*\|\|/,
        `${screen} computes verification inline instead of using useVerificationGate`,
      );
      assert.match(source, /useVerificationGate\(\)/, `${screen} must use useVerificationGate`);
    });
  });
});
