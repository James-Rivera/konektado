// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2.100.1';
import {
  getPhilSmsHeaders,
  normalizePhilippineMobile,
  normalizePhilSmsToken,
  PHILSMS_API_BASE_URL,
  sendPhilSms as sendPhilSmsMessage,
  SmsDeliveryError,
} from '../_shared/philsms.ts';

type RequestBody = {
  action?: 'send' | 'verify';
  challengeId?: string | null;
  code?: string | null;
  phone?: string | null;
};

type ContactOtpDeliveryStatus =
  | 'sent'
  | 'failed'
  | 'simulated'
  | 'already_sent'
  | 'rate_limited_existing_challenge'
  | 'auth_phone_confirmed';

type AuthUser = {
  id: string;
  phone?: string | null;
  phone_confirmed_at?: string | null;
};

// Marks challenges created from an Auth-confirmed phone (no SMS was sent).
// They are pre-verified and are excluded from the SMS rate-limit counts.
const authPhoneConfirmedProviderId = 'auth_phone_confirmed';
const contactOtpExpirySeconds = 30 * 60;
const contactOtpResendCooldownSeconds = 60;
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROJECT_URL') ?? '';
const serviceRoleKey =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '';
const hmacSecret = Deno.env.get('CONTACT_OTP_HMAC_SECRET') ?? '';
const philSmsToken = normalizePhilSmsToken(
  Deno.env.get('PHILSMS_API_TOKEN') ?? Deno.env.get('PHILSMS_BEARER_TOKEN') ?? '',
);
const philSmsSenderId = Deno.env.get('PHILSMS_SENDER_ID') ?? 'Konektado';
// Fallback for PhilSMS outages (DEC-134). Accepted for any active challenge the
// signed-in user owns. No default: unset or not exactly 6 digits disables it.
const configuredBackupCode = (Deno.env.get('CONTACT_OTP_BACKUP_CODE') ?? '').trim();
const backupCode = /^\d{6}$/.test(configuredBackupCode) ? configuredBackupCode : '';
const simulationEnabled = Deno.env.get('CONTACT_OTP_SIMULATE') === 'true';
const simulationUserIds = new Set(
  (Deno.env.get('CONTACT_OTP_SIMULATION_USER_IDS') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);
const simulationPhones = new Set(
  (Deno.env.get('CONTACT_OTP_SIMULATION_PHONES') ?? '')
    .split(',')
    .map(normalizePhilippineMobile)
    .filter(Boolean),
);

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-origin': '*',
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'content-type': 'application/json' },
    status,
  });
}

function errorJson(error: string, status: number, message?: string, extra?: Record<string, unknown>) {
  return json(
    {
      error,
      ...(message ? { message } : {}),
      ...(extra ?? {}),
    },
    status,
  );
}

async function getAuthenticatedUser(request: Request) {
  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return null;

  const client = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.getUser(authorization.slice(7));
  return error ? null : data.user;
}

async function hashCode(challengeId: string, code: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(hmacSecret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${challengeId}:${code}`),
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function canSimulate(userId: string, phone: string) {
  return (
    simulationEnabled &&
    (simulationUserIds.has(userId) || simulationPhones.has(phone))
  );
}

// Temporary diagnostic: remove after PHILSMS delivery is stable in the deployed function.
async function runPhilSmsBalanceDiagnostic() {
  try {
    const response = await fetch(`${PHILSMS_API_BASE_URL}/balance`, {
      method: 'GET',
      headers: getPhilSmsHeaders(philSmsToken),
    });
    const result = await response.json().catch(() => null);
    const succeeded = response.ok && result?.status === 'success';
    console.info('PHILSMS balance diagnostic', { succeeded });
    return succeeded;
  } catch {
    console.info('PHILSMS balance diagnostic', { succeeded: false });
    return false;
  }
}

async function sendPhilSms(phone: string, code: string) {
  await runPhilSmsBalanceDiagnostic();
  return sendPhilSmsMessage(
    { senderId: philSmsSenderId, token: philSmsToken },
    phone,
    `Your Konektado verification code is ${code}.`,
  );
}

function getWindowRetryAfterSeconds(
  rows: { created_at: string }[],
  windowMs: number,
  now: number,
) {
  if (!rows.length) return 0;
  const oldestCreatedAt = Math.min(
    ...rows.map((row) => new Date(row.created_at).getTime()),
  );
  return Math.max(1, Math.ceil((oldestCreatedAt + windowMs - now) / 1000));
}

function existingChallengeResponse({
  challenge,
  deliveryStatus,
  now,
  retryAfterSeconds,
}: {
  challenge: {
    expires_at: string;
    id: string;
    provider_message_id: string | null;
  };
  deliveryStatus: Extract<
    ContactOtpDeliveryStatus,
    'already_sent' | 'rate_limited_existing_challenge'
  >;
  now: number;
  retryAfterSeconds: number;
}) {
  return json({
    success: true,
    canVerify: true,
    challengeId: challenge.id,
    expiresIn: Math.max(
      0,
      Math.ceil((new Date(challenge.expires_at).getTime() - now) / 1000),
    ),
    resendAfter: retryAfterSeconds,
    retryAfterSeconds,
    simulated: challenge.provider_message_id === 'simulated',
    deliveryStatus,
    message:
      'A code was already sent. Please enter it below. You may request a new code later.',
  });
}

function isSmsChallenge(row: { provider_message_id?: string | null }) {
  return row.provider_message_id !== authPhoneConfirmedProviderId;
}

/**
 * True when Supabase Auth already proved ownership of `phone` (a mobile signup
 * confirmed it with an SMS OTP) and it is also the phone on the profile, which
 * is what `require_consumed_contact_otp` compares the challenge against.
 */
async function isAuthConfirmedProfilePhone(user: AuthUser, phone: string) {
  if (!user.phone_confirmed_at) return false;
  if (normalizePhilippineMobile(user.phone) !== phone) return false;

  const { data: profile, error } = await admin
    .from('profiles')
    .select('phone')
    .eq('id', user.id)
    .maybeSingle();
  if (error) {
    // Fall back to the normal SMS path rather than failing the request.
    console.error('Contact OTP profile phone lookup failed', {
      code: error.code ?? null,
      message: error.message,
    });
    return false;
  }

  return normalizePhilippineMobile(profile?.phone) === phone;
}

/**
 * Issues an already-verified challenge for an Auth-confirmed phone so mobile
 * signups are not sent a second SMS during barangay verification. The
 * verifications insert trigger still needs a verified, unconsumed challenge id.
 */
async function handleAuthConfirmedPhone(userId: string, phone: string) {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const { data: existing, error: lookupError } = await admin
    .from('contact_otp_challenges')
    .select('id, expires_at')
    .eq('user_id', userId)
    .eq('phone_e164', phone)
    .eq('provider_message_id', authPhoneConfirmedProviderId)
    .not('verified_at', 'is', null)
    .is('consumed_at', null)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lookupError) {
    console.error('Contact OTP confirmed-phone lookup failed', {
      code: lookupError.code ?? null,
      message: lookupError.message,
    });
    throw new Error('Contact OTP challenge lookup failed.');
  }

  let challengeId = existing?.id ?? null;
  let expiresAt = existing ? new Date(existing.expires_at).getTime() : 0;

  if (!challengeId) {
    challengeId = crypto.randomUUID();
    expiresAt = now + contactOtpExpirySeconds * 1000;
    // No code is ever sent for this challenge; store an unguessable hash so the
    // row still satisfies the schema.
    const codeHash = await hashCode(challengeId, crypto.randomUUID());
    const { error: insertError } = await admin.from('contact_otp_challenges').insert({
      code_hash: codeHash,
      expires_at: new Date(expiresAt).toISOString(),
      id: challengeId,
      max_attempts: 5,
      phone_e164: phone,
      provider_message_id: authPhoneConfirmedProviderId,
      user_id: userId,
      verified_at: nowIso,
    });
    if (insertError) {
      console.error('Contact OTP confirmed-phone challenge creation failed', {
        code: insertError.code ?? null,
        message: insertError.message,
      });
      throw new Error('Contact OTP challenge creation failed.');
    }
  }

  console.info('Contact OTP verified', { challengeId, method: 'auth_phone', userId });

  return json({
    success: true,
    canVerify: true,
    challengeId,
    expiresIn: Math.max(0, Math.ceil((expiresAt - now) / 1000)),
    resendAfter: 0,
    retryAfterSeconds: 0,
    simulated: false,
    deliveryStatus: 'auth_phone_confirmed',
    verified: true,
    message: 'Your mobile number is already confirmed.',
  });
}

async function handleSend(user: AuthUser, body: RequestBody) {
  const userId = user.id;
  const phone = normalizePhilippineMobile(body.phone);
  if (!phone) {
    return errorJson('invalid_phone', 400, 'Enter a valid Philippine mobile number.');
  }

  if (await isAuthConfirmedProfilePhone(user, phone)) {
    return await handleAuthConfirmedPhone(userId, phone);
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const tenMinutesAgo = new Date(now - 10 * 60 * 1000).toISOString();
  const [
    activeChallengeResult,
    recentUserResult,
    recentPhoneResult,
    recentResendsResult,
  ] =
    await Promise.all([
      admin
        .from('contact_otp_challenges')
        .select('id, expires_at, attempts, max_attempts, provider_message_id')
        .eq('user_id', userId)
        .eq('phone_e164', phone)
        .is('verified_at', null)
        .is('consumed_at', null)
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from('contact_otp_challenges')
        .select('id, sent_at, created_at, provider_message_id')
        .eq('user_id', userId)
        .gte('created_at', hourAgo)
        .order('sent_at', { ascending: false }),
      admin
        .from('contact_otp_challenges')
        .select('id, created_at, provider_message_id')
        .eq('phone_e164', phone)
        .gte('created_at', hourAgo),
      admin
        .from('contact_otp_challenges')
        .select('id, created_at, provider_message_id')
        .eq('user_id', userId)
        .eq('phone_e164', phone)
        .gte('created_at', tenMinutesAgo),
    ]);
  const lookupError =
    activeChallengeResult.error ??
    recentUserResult.error ??
    recentPhoneResult.error ??
    recentResendsResult.error;
  if (lookupError) {
    console.error('Contact OTP rate-limit lookup failed', {
      code: lookupError.code ?? null,
      message: lookupError.message,
    });
    throw new Error('Contact OTP challenge lookup failed.');
  }
  // Auth-confirmed challenges sent no SMS, so they do not count toward limits.
  const recentUser = recentUserResult.data?.filter(isSmsChallenge);
  const recentPhone = recentPhoneResult.data?.filter(isSmsChallenge);
  const recentResends = recentResendsResult.data?.filter(isSmsChallenge);
  const activeChallenge = activeChallengeResult.data;
  const reusableChallenge =
    activeChallenge && activeChallenge.attempts < activeChallenge.max_attempts
      ? activeChallenge
      : null;

  const latestSentAt = recentUser?.[0]?.sent_at
    ? new Date(recentUser[0].sent_at).getTime()
    : 0;
  const cooldownRetryAfter = Math.max(
    0,
    Math.ceil(
      (latestSentAt + contactOtpResendCooldownSeconds * 1000 - now) / 1000,
    ),
  );
  const userHourlyLimited = (recentUser?.length ?? 0) >= 5;
  const phoneHourlyLimited = (recentPhone?.length ?? 0) >= 5;
  const resendWindowLimited = (recentResends?.length ?? 0) >= 4;
  const sendWindowLimited =
    userHourlyLimited || phoneHourlyLimited || resendWindowLimited;

  const windowRetryAfter = Math.max(
    userHourlyLimited
      ? getWindowRetryAfterSeconds(recentUser ?? [], 60 * 60 * 1000, now)
      : 0,
    phoneHourlyLimited
      ? getWindowRetryAfterSeconds(recentPhone ?? [], 60 * 60 * 1000, now)
      : 0,
    resendWindowLimited
      ? getWindowRetryAfterSeconds(recentResends ?? [], 10 * 60 * 1000, now)
      : 0,
  );
  const retryAfterSeconds = Math.max(cooldownRetryAfter, windowRetryAfter);

  if (cooldownRetryAfter > 0 || sendWindowLimited) {
    if (reusableChallenge) {
      return existingChallengeResponse({
        challenge: reusableChallenge,
        deliveryStatus: sendWindowLimited
          ? 'rate_limited_existing_challenge'
          : 'already_sent',
        now,
        retryAfterSeconds,
      });
    }

    return errorJson(
      'rate_limited',
      429,
      `Wait ${retryAfterSeconds} seconds before requesting another code.`,
      { retryAfter: retryAfterSeconds, retryAfterSeconds },
    );
  }

  const challengeId = crypto.randomUUID();
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
  const codeHash = await hashCode(challengeId, code);
  const simulated = canSimulate(userId, phone);

  if (!simulated && (!philSmsToken || !philSmsSenderId)) {
    console.error('Contact OTP provider configuration is missing', {
      missingPhilSmsSenderId: !philSmsSenderId,
      missingPhilSmsToken: !philSmsToken,
    });
    return errorJson(
      'server_configuration_error',
      503,
      'Contact verification is not configured right now.',
    );
  }

  const { error: insertError } = await admin.from('contact_otp_challenges').insert({
    code_hash: codeHash,
    expires_at: new Date(now + contactOtpExpirySeconds * 1000).toISOString(),
    id: challengeId,
    max_attempts: 5,
    phone_e164: phone,
    resend_count: recentResends?.length ?? 0,
    user_id: userId,
  });
  if (insertError) {
    console.error('Contact OTP challenge creation failed', {
      code: insertError.code ?? null,
      message: insertError.message,
    });
    throw new Error('Contact OTP challenge creation failed.');
  }

  try {
    const providerMessageId = simulated ? 'simulated' : await sendPhilSms(phone, code);
    const { error: providerIdError } = await admin
      .from('contact_otp_challenges')
      .update({ provider_message_id: providerMessageId })
      .eq('id', challengeId);
    if (providerIdError) {
      console.error('Contact OTP provider message ID update failed', {
        code: providerIdError.code ?? null,
        message: providerIdError.message,
      });
    }
  } catch (error) {
    if (error instanceof SmsDeliveryError) {
      const { error: deliveryStatusError } = await admin
        .from('contact_otp_challenges')
        .update({ provider_message_id: `delivery_failed:${error.code}` })
        .eq('id', challengeId);
      if (deliveryStatusError) {
        console.error('Contact OTP delivery failure status update failed', {
          code: deliveryStatusError.code ?? null,
          message: deliveryStatusError.message,
        });
      }

      return json({
        success: true,
        canVerify: true,
        challengeId,
        expiresIn: contactOtpExpirySeconds,
        resendAfter: contactOtpResendCooldownSeconds,
        retryAfterSeconds: contactOtpResendCooldownSeconds,
        simulated: false,
        deliveryStatus: 'failed',
        deliveryError: error.code,
        message: 'SMS delivery may be delayed. You can still enter a valid code.',
      });
    }

    const { error: cleanupError } = await admin
      .from('contact_otp_challenges')
      .delete()
      .eq('id', challengeId);
    if (cleanupError) {
      console.error('Contact OTP failed challenge cleanup failed', {
        code: cleanupError.code ?? null,
        message: cleanupError.message,
      });
    }
    throw error;
  }

  return json({
    success: true,
    canVerify: true,
    challengeId,
    expiresIn: contactOtpExpirySeconds,
    resendAfter: contactOtpResendCooldownSeconds,
    retryAfterSeconds: contactOtpResendCooldownSeconds,
    simulated,
    deliveryStatus: simulated ? 'simulated' : 'sent',
    message: simulated
      ? 'A verification challenge is ready.'
      : 'We sent a verification code.',
  });
}

async function handleVerify(userId: string, body: RequestBody) {
  const challengeId = body.challengeId?.trim() ?? '';
  const code = body.code?.replace(/\D/g, '') ?? '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(challengeId)) {
    return errorJson('challenge_not_found', 404, 'Request a new verification code.');
  }
  if (!/^\d{6}$/.test(code)) {
    return errorJson('invalid_code', 400, 'Enter the complete 6-digit code.');
  }

  let candidateHash = await hashCode(challengeId, code);
  const usedBackupCode = Boolean(backupCode) && constantTimeEqual(code, backupCode);
  if (usedBackupCode) {
    // Submit the challenge's own hash so the atomic function still applies
    // ownership, expiry, consumption, and attempt-lock checks under its row lock.
    const { data: challenge, error: lookupError } = await admin
      .from('contact_otp_challenges')
      .select('code_hash')
      .eq('id', challengeId)
      .eq('user_id', userId)
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    if (challenge?.code_hash) candidateHash = challenge.code_hash;
  }

  const { data, error } = await admin.rpc('verify_contact_otp_atomic', {
    p_candidate_hash: candidateHash,
    p_challenge_id: challengeId,
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
  const result = data as { status?: string; attemptsRemaining?: number } | null;
  if (result?.status === 'verified') {
    if (usedBackupCode) {
      console.info('Contact OTP verified', { challengeId, method: 'backup_code', userId });
    }
    return json({ challengeId, verified: true });
  }
  if (result?.status === 'challenge_not_found') {
    return errorJson('challenge_not_found', 404, 'Request a new verification code.');
  }
  if (result?.status === 'code_expired') {
    return errorJson('code_expired', 400, 'This code has expired. Request a new one.');
  }
  if (result?.status === 'challenge_consumed') {
    return errorJson('challenge_consumed', 400, 'Request a new verification code.');
  }
  if (result?.status === 'attempt_limit_reached') {
    return errorJson('attempt_limit_reached', 429, 'Too many incorrect attempts. Request a new code.', {
      attemptsRemaining: 0,
    });
  }
  if (result?.status === 'invalid_code') {
    return errorJson('invalid_code', 400, 'That code is incorrect. Try again.', {
      attemptsRemaining: result.attemptsRemaining ?? 0,
    });
  }
  throw new Error('Unexpected contact OTP verification result.');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return errorJson('method_not_allowed', 405);
  const missingServerConfiguration = {
    hmacSecret: !hmacSecret,
    serviceRoleKey: !serviceRoleKey,
    supabaseUrl: !supabaseUrl,
  };
  if (Object.values(missingServerConfiguration).some(Boolean)) {
    console.error('Contact OTP server configuration is missing', missingServerConfiguration);
    return errorJson('server_configuration_error', 503);
  }

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return errorJson('unauthorized', 401);

    const body = (await request.json()) as RequestBody;
    if (body.action === 'send') return await handleSend(user, body);
    if (body.action === 'verify') return await handleVerify(user.id, body);
    return errorJson('invalid_action', 400, 'Choose a supported contact verification action.');
  } catch (error) {
    console.error('Contact OTP request failed', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'UnknownError',
    });
    return errorJson('internal_error', 500, 'Contact verification failed.');
  }
});
