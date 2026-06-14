// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2.100.1';

type RequestBody = {
  action?: 'send' | 'verify';
  challengeId?: string | null;
  code?: string | null;
  phone?: string | null;
};

type PhilSmsFailureCode =
  | 'sms_provider_unauthenticated'
  | 'sms_sender_rejected'
  | 'sms_balance_error'
  | 'sms_request_rejected'
  | 'sms_delivery_failed';

type ContactOtpDeliveryStatus =
  | 'sent'
  | 'failed'
  | 'simulated'
  | 'already_sent'
  | 'rate_limited_existing_challenge';

class SmsDeliveryError extends Error {
  code: PhilSmsFailureCode;

  constructor(code: PhilSmsFailureCode) {
    super('SMS delivery failed.');
    this.name = 'SmsDeliveryError';
    this.code = code;
  }
}

const philSmsApiBaseUrl = 'https://dashboard.philsms.com/api/v3';
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
// Temporary development fallback. Rotate or remove this backup code before live deployment.
const backupCode = Deno.env.get('CONTACT_OTP_BACKUP_CODE')?.trim() || '676767';
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

function normalizePhilippineMobile(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, '') ?? '';
  if (/^09\d{9}$/.test(digits)) return `63${digits.slice(1)}`;
  if (/^639\d{9}$/.test(digits)) return digits;
  return null;
}

function normalizePhilSmsToken(value: string) {
  return value.trim().replace(/^Bearer\s+/i, '').trim();
}

function getPhilSmsHeaders() {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${philSmsToken}`,
    'Content-Type': 'application/json',
  };
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
    const response = await fetch(`${philSmsApiBaseUrl}/balance`, {
      method: 'GET',
      headers: getPhilSmsHeaders(),
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

  let response: Response;
  try {
    response = await fetch(`${philSmsApiBaseUrl}/sms/send`, {
      method: 'POST',
      headers: getPhilSmsHeaders(),
      body: JSON.stringify({
        recipient: phone,
        sender_id: philSmsSenderId,
        type: 'plain',
        message: `Your Konektado verification code is ${code}.`,
      }),
    });
  } catch {
    console.error('PHILSMS delivery failed', {
      response: null,
      status: null,
    });
    throw new SmsDeliveryError('sms_delivery_failed');
  }

  const result = await response.json().catch(() => null);

  if (!response.ok || result?.status === 'error') {
    const safeResponse = {
      message: typeof result?.message === 'string' ? result.message.slice(0, 240) : null,
      status: typeof result?.status === 'string' ? result.status : null,
    };
    console.error('PHILSMS delivery failed', {
      response: safeResponse,
      status: response.status,
    });
    throw new SmsDeliveryError(classifyPhilSmsFailure(response.status, safeResponse.message));
  }

  return String(
    result?.data?.uid ??
      result?.data?.id ??
      result?.data?.data?.uid ??
      result?.data?.data?.id ??
      '',
  );
}

function classifyPhilSmsFailure(
  status: number,
  message: string | null,
): PhilSmsFailureCode {
  const normalized = message?.toLowerCase() ?? '';

  if (
    status === 401 ||
    status === 403 ||
    normalized.includes('unauthenticated') ||
    normalized.includes('unauthorized') ||
    normalized.includes('invalid token') ||
    normalized.includes('authentication')
  ) {
    return 'sms_provider_unauthenticated';
  }
  if (normalized.includes('sender')) return 'sms_sender_rejected';
  if (
    normalized.includes('balance') ||
    normalized.includes('credit') ||
    normalized.includes('fund')
  ) {
    return 'sms_balance_error';
  }
  if (status === 400 || status === 422) return 'sms_request_rejected';
  return 'sms_delivery_failed';
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

async function handleSend(userId: string, body: RequestBody) {
  const phone = normalizePhilippineMobile(body.phone);
  if (!phone) {
    return errorJson('invalid_phone', 400, 'Enter a valid Philippine mobile number.');
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
        .select('id, sent_at, created_at')
        .eq('user_id', userId)
        .gte('created_at', hourAgo)
        .order('sent_at', { ascending: false }),
      admin
        .from('contact_otp_challenges')
        .select('id, created_at')
        .eq('phone_e164', phone)
        .gte('created_at', hourAgo),
      admin
        .from('contact_otp_challenges')
        .select('id, created_at')
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
  const recentUser = recentUserResult.data;
  const recentPhone = recentPhoneResult.data;
  const recentResends = recentResendsResult.data;
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
  if (!challengeId || !/^\d{6}$/.test(code)) {
    return errorJson('invalid_code', 400, 'Enter the complete 6-digit code.');
  }

  const { data: challenge, error } = await admin
    .from('contact_otp_challenges')
    .select('id, user_id, code_hash, expires_at, attempts, max_attempts, verified_at, consumed_at')
    .eq('id', challengeId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!challenge || challenge.user_id !== userId) {
    return errorJson('challenge_not_found', 404, 'Request a new verification code.');
  }
  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    return errorJson('code_expired', 400, 'This code has expired. Request a new one.');
  }
  if (challenge.consumed_at) {
    return errorJson('challenge_consumed', 400, 'Request a new verification code.');
  }
  if (challenge.attempts >= challenge.max_attempts) {
    return errorJson(
      'attempt_limit_reached',
      429,
      'Too many incorrect attempts. Request a new code.',
    );
  }
  if (challenge.verified_at) {
    return json({ challengeId, verified: true });
  }

  const candidateHash = await hashCode(challengeId, code);
  const matchesNormalCode = constantTimeEqual(candidateHash, challenge.code_hash);
  // This server-only backup accepts an active challenge; remove or rotate it before live deployment.
  const matchesBackupCode = constantTimeEqual(code, backupCode);

  if (!matchesNormalCode && !matchesBackupCode) {
    const attempts = challenge.attempts + 1;
    await admin
      .from('contact_otp_challenges')
      .update({ attempts })
      .eq('id', challengeId);
    return errorJson(
      attempts >= challenge.max_attempts ? 'attempt_limit_reached' : 'invalid_code',
      attempts >= challenge.max_attempts ? 429 : 400,
      attempts >= challenge.max_attempts
        ? 'Too many incorrect attempts. Request a new code.'
        : 'That code is incorrect. Try again.',
      { attemptsRemaining: Math.max(challenge.max_attempts - attempts, 0) },
    );
  }

  if (matchesBackupCode) {
    console.info('Contact OTP verified', {
      challengeId,
      method: 'backup_code',
      userId,
    });
  }

  const { error: updateError } = await admin
    .from('contact_otp_challenges')
    .update({ verified_at: new Date().toISOString() })
    .eq('id', challengeId)
    .is('verified_at', null);
  if (updateError) throw new Error(updateError.message);

  return json({ challengeId, verified: true });
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
    if (body.action === 'send') return await handleSend(user.id, body);
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
