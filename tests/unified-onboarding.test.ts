/**
 * Unified onboarding + identity verification (DEC-124 to DEC-127).
 *
 * Source-contract tests in the DEC-123 style: the screens import React Native
 * and Supabase modules that do not load under plain Node. The assertions pin
 * the flow order, the honest post-submission copy, and the mobile helpers.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  formatPhilippineMobile,
  looksLikePhoneNumber,
  normalizePhilippineMobile,
  toE164PhilippineMobile,
} from '@/utils/phone';

function readSource(relativePath: string) {
  const fullPath = path.join(process.cwd(), relativePath);
  assert.ok(fs.existsSync(fullPath), `expected ${relativePath} to exist`);
  return fs
    .readFileSync(fullPath, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');
}

describe('flow order', () => {
  it('saves the profile, then continues to identity verification', () => {
    const review = readSource('app/(onboarding)/review.tsx');
    assert.match(review, /router\.replace\('\/\(onboarding\)\/verify'/);
    assert.doesNotMatch(review, /router\.replace\('\/\(onboarding\)\/complete'\)/);
  });

  it('runs the shared verification controller in onboarding mode', () => {
    assert.match(readSource('app/(onboarding)/verify.tsx'), /<VerificationScreen mode="onboarding" \/>/);
    assert.match(readSource('app/verification.tsx'), /<VerificationScreen mode="standalone" \/>/);
  });

  it('keeps verify and complete reachable after the profile is saved', () => {
    const layout = readSource('app/(onboarding)/_layout.tsx');
    assert.match(layout, /routeSegments\[1\] === 'verify'/);
    assert.match(layout, /routeSegments\[1\] === 'complete'/);
    assert.match(readSource('app/_layout.tsx'), /routeSegments\[1\] === "verify"/);
  });

  it('lets onboarding defer verification to a browse-only account', () => {
    const controller = readSource('components/verification/VerificationScreen.tsx');
    assert.match(controller, /verification: 'later'/);
    assert.match(readSource('app/(onboarding)/complete.tsx'), /verificationParam === 'later'/);
  });

  it('removes the unreachable onboarding certification and verification screens', () => {
    ['app/(onboarding)/certifications.tsx', 'app/(onboarding)/verification.tsx'].forEach((file) => {
      assert.equal(fs.existsSync(path.join(process.cwd(), file)), false, `${file} should be removed`);
    });
  });
});

describe('document choice', () => {
  it('defaults to Barangay Certificate and scans it without a chooser first', () => {
    const controller = readSource('components/verification/VerificationScreen.tsx');
    assert.match(controller, /idType: 'barangay_certificate'/);
    assert.match(
      controller,
      /if \(step === 'code'\) return idType === 'barangay_certificate' \? 'certificate' : 'idFront';/,
    );
  });

  it('offers "Use a different ID type" from the scan screens', () => {
    const flow = readSource('components/verification/FigmaVerificationFlow.tsx');
    assert.equal(flow.match(/label: 'Use a different ID type'/g)?.length, 2);
  });
});

describe('honest verification status', () => {
  it('never claims automated checks or instant approval after submission', () => {
    const flow = readSource('components/verification/FigmaVerificationFlow.tsx');
    assert.doesNotMatch(flow, /Checking for authenticity|Matching with selfie|Reading ID information/);
    assert.match(flow, /Submitted for review/);
    assert.match(flow, /Barangay review/);
  });

  it('does not pre-tick the terms consent', () => {
    assert.match(readSource('app/(onboarding)/review.tsx'), /useState\(false\);\s*const \[confirmedInfo/);
  });
});

describe('mobile signup is gated until Supabase phone auth is configured', () => {
  it('reads the flag from the environment and defaults it off', () => {
    assert.match(
      readSource('constants/auth-config.ts'),
      /PHONE_AUTH_ENABLED = process\.env\.EXPO_PUBLIC_PHONE_AUTH_ENABLED === 'true'/,
    );
    assert.match(readSource('app/(auth)/register.tsx'), /PHONE_AUTH_ENABLED \? 'phone' : 'email'/);
  });
});

describe('Philippine mobile helpers', () => {
  it('normalizes the forms residents type', () => {
    ['09171234567', '9171234567', '639171234567', '+63 917 123 4567', '0917-123-4567'].forEach((value) => {
      assert.equal(normalizePhilippineMobile(value), '639171234567', value);
    });
  });

  it('rejects numbers that are not PH mobiles', () => {
    ['', '12345', '0217123456', '+1 415 555 0100', '0817123456'].forEach((value) => {
      assert.equal(normalizePhilippineMobile(value), null, value);
    });
  });

  it('formats for Supabase Auth and for display', () => {
    assert.equal(toE164PhilippineMobile('0917 123 4567'), '+639171234567');
    assert.equal(formatPhilippineMobile('639171234567'), '0917 123 4567');
  });

  it('tells a phone number apart from an email', () => {
    assert.equal(looksLikePhoneNumber('0917 123 4567'), true);
    assert.equal(looksLikePhoneNumber('+63 917 123 4567'), true);
    assert.equal(looksLikePhoneNumber('juan@example.com'), false);
    assert.equal(looksLikePhoneNumber(''), false);
  });
});
