/**
 * Send SMS hook (Supabase Auth -> PhilSMS): signature verification, payload
 * parsing, and the PH-only recipient rule. The Deno entrypoint only wires these
 * together, so a regression here is a regression in who can trigger an SMS.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  normalizePhilippineMobile,
  normalizePhilSmsToken,
} from '../supabase/functions/_shared/philsms';
import {
  buildAuthSmsMessage,
  decodeWebhookSecret,
  parseSendSmsHookPayload,
  signStandardWebhook,
  toPhilSmsRecipient,
  verifyStandardWebhook,
} from '../supabase/functions/send-sms-hook/webhook';

// Test vector published with the Standard Webhooks spec.
const specSecret = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw';
const specId = 'msg_p5jXN8AQM9LWM0D4loKWxJek';
const specTimestamp = '1614265330';
const specPayload = '{"test": 2432232314}';
const specSignature = 'v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=';

function headers(values: Record<string, string>) {
  return new Headers(values);
}

async function signedRequest(payload: string, secret = `v1,${specSecret}`, timestamp = specTimestamp) {
  const key = decodeWebhookSecret(secret);
  assert.ok(key);
  const signature = await signStandardWebhook(key, specId, timestamp, payload);
  return headers({
    'webhook-id': specId,
    'webhook-signature': `v1,${signature}`,
    'webhook-timestamp': timestamp,
  });
}

describe('verifyStandardWebhook', () => {
  it('matches the Standard Webhooks reference signature', async () => {
    const result = await verifyStandardWebhook({
      headers: headers({
        'webhook-id': specId,
        'webhook-signature': specSignature,
        'webhook-timestamp': specTimestamp,
      }),
      nowSeconds: Number(specTimestamp),
      payload: specPayload,
      secret: specSecret,
    });
    assert.deepEqual(result, { ok: true });
  });

  it('accepts the v1,whsec_ secret form Supabase shows in the dashboard', async () => {
    const result = await verifyStandardWebhook({
      headers: headers({
        'webhook-id': specId,
        'webhook-signature': specSignature,
        'webhook-timestamp': specTimestamp,
      }),
      nowSeconds: Number(specTimestamp),
      payload: specPayload,
      secret: `v1,${specSecret}`,
    });
    assert.deepEqual(result, { ok: true });
  });

  it('accepts any one valid signature among several', async () => {
    const result = await verifyStandardWebhook({
      headers: headers({
        'webhook-id': specId,
        'webhook-signature': `v1,bm90LXRoZS1yaWdodC1zaWduYXR1cmU= ${specSignature}`,
        'webhook-timestamp': specTimestamp,
      }),
      nowSeconds: Number(specTimestamp),
      payload: specPayload,
      secret: specSecret,
    });
    assert.deepEqual(result, { ok: true });
  });

  it('rejects a tampered body', async () => {
    const signed = await signedRequest('{"sms":{"otp":"123456"}}');
    const result = await verifyStandardWebhook({
      headers: signed,
      nowSeconds: Number(specTimestamp),
      payload: '{"sms":{"otp":"654321"}}',
      secret: specSecret,
    });
    assert.deepEqual(result, { ok: false, reason: 'invalid_signature' });
  });

  it('rejects a signature made with a different secret', async () => {
    const signed = await signedRequest(specPayload, 'whsec_c29tZS1vdGhlci1zZWNyZXQta2V5');
    const result = await verifyStandardWebhook({
      headers: signed,
      nowSeconds: Number(specTimestamp),
      payload: specPayload,
      secret: specSecret,
    });
    assert.deepEqual(result, { ok: false, reason: 'invalid_signature' });
  });

  it('rejects replays outside the five-minute window', async () => {
    const signed = await signedRequest(specPayload);
    const result = await verifyStandardWebhook({
      headers: signed,
      nowSeconds: Number(specTimestamp) + 301,
      payload: specPayload,
      secret: specSecret,
    });
    assert.deepEqual(result, { ok: false, reason: 'stale_timestamp' });
  });

  it('rejects requests without the webhook headers', async () => {
    const result = await verifyStandardWebhook({
      headers: headers({ 'webhook-id': specId }),
      nowSeconds: Number(specTimestamp),
      payload: specPayload,
      secret: specSecret,
    });
    assert.deepEqual(result, { ok: false, reason: 'missing_headers' });
  });

  it('fails closed on an empty or malformed secret', async () => {
    for (const secret of ['', 'v1,whsec_', 'whsec_%%%not-base64%%%']) {
      const result = await verifyStandardWebhook({
        headers: headers({
          'webhook-id': specId,
          'webhook-signature': specSignature,
          'webhook-timestamp': specTimestamp,
        }),
        nowSeconds: Number(specTimestamp),
        payload: specPayload,
        secret,
      });
      assert.deepEqual(result, { ok: false, reason: 'invalid_secret' }, secret);
    }
  });
});

describe('toPhilSmsRecipient', () => {
  it('accepts PH mobiles in the E.164 forms Auth stores', () => {
    assert.equal(toPhilSmsRecipient('639171234567'), '639171234567');
    assert.equal(toPhilSmsRecipient('+639171234567'), '639171234567');
  });

  it('rejects everything else instead of guessing', () => {
    for (const phone of ['09171234567', '9171234567', '63917123456', '6391712345678', '+14155550100', '632812345678', '', null]) {
      assert.equal(toPhilSmsRecipient(phone), null, String(phone));
    }
  });
});

describe('parseSendSmsHookPayload', () => {
  it('reads the user phone and OTP', () => {
    assert.deepEqual(
      parseSendSmsHookPayload(JSON.stringify({ sms: { otp: '561166' }, user: { id: 'user-1', phone: '639171234567' } })),
      { otp: '561166', phone: '639171234567', userId: 'user-1' },
    );
  });

  it('rejects malformed payloads', () => {
    for (const payload of [
      'not json',
      'null',
      JSON.stringify({ user: { phone: '639171234567' } }),
      JSON.stringify({ sms: { otp: '12ab56' }, user: { phone: '639171234567' } }),
      JSON.stringify({ sms: { otp: '561166' }, user: {} }),
    ]) {
      assert.equal(parseSendSmsHookPayload(payload), null, payload);
    }
  });

  it('puts the code in a branded message', () => {
    assert.match(buildAuthSmsMessage('561166'), /^Your Konektado code is 561166\./);
  });
});

describe('shared PhilSMS helpers', () => {
  it('normalizes numbers the same way contact-otp always has', () => {
    assert.equal(normalizePhilippineMobile('0917 123 4567'), '639171234567');
    assert.equal(normalizePhilippineMobile('+63 917 123 4567'), '639171234567');
    assert.equal(normalizePhilippineMobile('02 8123 4567'), null);
  });

  it('accepts the token with or without a Bearer prefix', () => {
    assert.equal(normalizePhilSmsToken('  Bearer abc123 '), 'abc123');
    assert.equal(normalizePhilSmsToken('abc123'), 'abc123');
  });
});

describe('secret hygiene', () => {
  const read = (relative: string) =>
    fs.readFileSync(path.join(process.cwd(), relative), 'utf8');

  it('never logs the OTP, hook secret, or provider token', () => {
    for (const file of [
      'supabase/functions/send-sms-hook/index.ts',
      'supabase/functions/_shared/philsms.ts',
    ]) {
      const consoleCalls = read(file).match(/console\.\w+\([^;]*?\);/gs) ?? [];
      for (const call of consoleCalls) {
        // Secret values, not flags like `missingHookSecret: !hookSecret` or
        // words inside the log label.
        assert.doesNotMatch(
          call.replace(/'[^']*'/g, "''"),
          /(?<![!\w])(?:hookSecret|philSmsToken|payload|secret)\b|\.otp\b|\.token\b|buildAuthSmsMessage/,
          `${file}: ${call}`,
        );
      }
    }
  });

  it('shares one PhilSMS transport between contact-otp and the hook', () => {
    for (const file of [
      'supabase/functions/send-sms-hook/index.ts',
      'supabase/functions/contact-otp/index.ts',
    ]) {
      const source = read(file);
      assert.match(source, /from '\.\.\/_shared\/philsms\.ts'/, file);
      assert.doesNotMatch(source, /dashboard\.philsms\.com/, file);
    }
  });
});
