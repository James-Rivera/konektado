// Pure pieces of the Supabase Auth "Send SMS" hook: Standard Webhooks signature
// verification, payload parsing, and the PH-only recipient rule. No imports and
// no Deno globals, so `tests/send-sms-hook.test.ts` can exercise it under Node.
//
// Spec: https://www.standardwebhooks.com/ (signed content is
// `${webhook-id}.${webhook-timestamp}.${raw body}`, HMAC-SHA256, base64).

export const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

export type WebhookVerification =
  | { ok: true }
  | {
      ok: false;
      reason: 'missing_headers' | 'invalid_secret' | 'stale_timestamp' | 'invalid_signature';
    };

export type SendSmsHookRequest = {
  otp: string;
  phone: string;
  userId: string | null;
};

const encoder = new TextEncoder();

/**
 * Supabase shows the hook secret as `v1,whsec_<base64>`. Accept that form, the
 * bare `whsec_<base64>` form, or the raw base64, and return the key bytes.
 */
export function decodeWebhookSecret(secret: string): ArrayBuffer | null {
  const base64 = secret.trim().replace(/^v1,/, '').replace(/^whsec_/, '');
  if (!base64) return null;
  try {
    const binary = atob(base64);
    const key = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(key);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return key.byteLength ? key : null;
  } catch {
    return null;
  }
}

function toBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function signStandardWebhook(
  key: ArrayBuffer,
  id: string,
  timestamp: string,
  payload: string,
) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(`${id}.${timestamp}.${payload}`),
  );
  return toBase64(new Uint8Array(signature));
}

export async function verifyStandardWebhook({
  headers,
  nowSeconds = Math.floor(Date.now() / 1000),
  payload,
  secret,
  toleranceSeconds = WEBHOOK_TOLERANCE_SECONDS,
}: {
  headers: { get(name: string): string | null };
  nowSeconds?: number;
  payload: string;
  secret: string;
  toleranceSeconds?: number;
}): Promise<WebhookVerification> {
  const id = headers.get('webhook-id');
  const timestamp = headers.get('webhook-timestamp');
  const signatureHeader = headers.get('webhook-signature');
  if (!id || !timestamp || !signatureHeader) {
    return { ok: false, reason: 'missing_headers' };
  }

  const key = decodeWebhookSecret(secret);
  if (!key) return { ok: false, reason: 'invalid_secret' };

  const timestampSeconds = Number(timestamp);
  if (
    !/^\d+$/.test(timestamp) ||
    !Number.isSafeInteger(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > toleranceSeconds
  ) {
    return { ok: false, reason: 'stale_timestamp' };
  }

  const expected = await signStandardWebhook(key, id, timestamp, payload);
  // The header may carry several space-separated `v1,<base64>` signatures
  // (for example during a secret rotation). Any one match is enough.
  const matches = signatureHeader
    .split(' ')
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith('v1,'))
    .some((entry) => constantTimeEqual(entry.slice(3), expected));

  return matches ? { ok: true } : { ok: false, reason: 'invalid_signature' };
}

/**
 * Only Philippine mobiles are deliverable through PhilSMS. Auth stores phones
 * as E.164 digits (`639171234567`, sometimes with a leading `+`); anything else,
 * including local `09...` forms, is rejected rather than guessed at.
 */
export function toPhilSmsRecipient(phone: string | null | undefined): string | null {
  const trimmed = phone?.trim().replace(/^\+/, '') ?? '';
  return /^639\d{9}$/.test(trimmed) ? trimmed : null;
}

export function parseSendSmsHookPayload(payload: string): SendSmsHookRequest | null {
  let body: unknown;
  try {
    body = JSON.parse(payload);
  } catch {
    return null;
  }

  const record = body as {
    sms?: { otp?: unknown };
    user?: { id?: unknown; phone?: unknown };
  } | null;
  const otp = record?.sms?.otp;
  const phone = record?.user?.phone;
  if (typeof otp !== 'string' || !/^\d{6,10}$/.test(otp)) return null;
  if (typeof phone !== 'string') return null;

  return {
    otp,
    phone,
    userId: typeof record?.user?.id === 'string' ? record.user.id : null,
  };
}

export function buildAuthSmsMessage(otp: string) {
  return `Your Konektado code is ${otp}. Do not share this code with anyone.`;
}
