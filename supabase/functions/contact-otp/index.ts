// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2.100.1';

type RequestBody = {
  action?: 'send' | 'verify';
  challengeId?: string | null;
  code?: string | null;
  phone?: string | null;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROJECT_URL') ?? '';
const serviceRoleKey =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '';
const hmacSecret = Deno.env.get('CONTACT_OTP_HMAC_SECRET') ?? '';
const philSmsToken = Deno.env.get('PHILSMS_API_TOKEN') ?? '';
const philSmsSenderId = Deno.env.get('PHILSMS_SENDER_ID') ?? 'Konektado';
const simulationEnabled = Deno.env.get('CONTACT_OTP_SIMULATE') === 'true';
const returnTestCode = Deno.env.get('CONTACT_OTP_RETURN_TEST_CODE') === 'true';
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

function normalizePhilippineMobile(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, '') ?? '';
  if (/^09\d{9}$/.test(digits)) return `63${digits.slice(1)}`;
  if (/^639\d{9}$/.test(digits)) return digits;
  return null;
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

async function sendPhilSms(phone: string, code: string) {
  const response = await fetch('https://app.philsms.com/api/v3/sms/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${philSmsToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Your Konektado verification code is ${code}. It expires in 10 minutes.`,
      recipient: phone,
      sender_id: philSmsSenderId,
      type: 'plain',
    }),
  });
  const result = await response.json().catch(() => null);

  if (!response.ok || result?.status === 'error') {
    throw new Error(result?.message || 'The SMS provider could not send the code.');
  }

  return String(result?.data?.uid ?? result?.data?.id ?? '');
}

async function handleSend(userId: string, body: RequestBody) {
  const phone = normalizePhilippineMobile(body.phone);
  if (!phone) return json({ error: 'Enter a valid Philippine mobile number.' }, 400);

  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const tenMinutesAgo = new Date(now - 10 * 60 * 1000).toISOString();
  const [{ data: recentUser }, { data: recentPhone }, { data: recentResends }] =
    await Promise.all([
      admin
        .from('contact_otp_challenges')
        .select('id, sent_at')
        .eq('user_id', userId)
        .gte('created_at', hourAgo)
        .order('sent_at', { ascending: false }),
      admin
        .from('contact_otp_challenges')
        .select('id')
        .eq('phone_e164', phone)
        .gte('created_at', hourAgo),
      admin
        .from('contact_otp_challenges')
        .select('id')
        .eq('user_id', userId)
        .eq('phone_e164', phone)
        .gte('created_at', tenMinutesAgo),
    ]);

  if ((recentUser?.length ?? 0) >= 5 || (recentPhone?.length ?? 0) >= 5) {
    return json({ error: 'Too many code requests. Try again in an hour.' }, 429);
  }

  if ((recentResends?.length ?? 0) >= 4) {
    return json({ error: 'Resend limit reached. Wait 10 minutes before requesting another code.' }, 429);
  }

  const latestSentAt = recentUser?.[0]?.sent_at
    ? new Date(recentUser[0].sent_at).getTime()
    : 0;
  const retryAfter = Math.ceil((latestSentAt + 60_000 - now) / 1000);
  if (retryAfter > 0) {
    return json(
      { error: `Wait ${retryAfter} seconds before requesting another code.`, retryAfter },
      429,
    );
  }

  const challengeId = crypto.randomUUID();
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
  const codeHash = await hashCode(challengeId, code);
  const simulated = canSimulate(userId, phone);

  if (!simulated && (!philSmsToken || !philSmsSenderId)) {
    return json({ error: 'Contact verification is not configured yet.' }, 503);
  }

  const { error: insertError } = await admin.from('contact_otp_challenges').insert({
    code_hash: codeHash,
    expires_at: new Date(now + 10 * 60 * 1000).toISOString(),
    id: challengeId,
    phone_e164: phone,
    resend_count: recentResends?.length ?? 0,
    user_id: userId,
  });
  if (insertError) throw new Error(insertError.message);

  try {
    const providerMessageId = simulated ? 'simulated' : await sendPhilSms(phone, code);
    await admin
      .from('contact_otp_challenges')
      .update({ provider_message_id: providerMessageId })
      .eq('id', challengeId);
  } catch (error) {
    await admin.from('contact_otp_challenges').delete().eq('id', challengeId);
    throw error;
  }

  return json({
    challengeId,
    expiresIn: 600,
    resendAfter: 60,
    simulated,
    ...(simulated && returnTestCode ? { testCode: code } : {}),
  });
}

async function handleVerify(userId: string, body: RequestBody) {
  const challengeId = body.challengeId?.trim() ?? '';
  const code = body.code?.replace(/\D/g, '') ?? '';
  if (!challengeId || !/^\d{6}$/.test(code)) {
    return json({ error: 'Enter the complete 6-digit code.' }, 400);
  }

  const { data: challenge, error } = await admin
    .from('contact_otp_challenges')
    .select('id, user_id, code_hash, expires_at, attempts, max_attempts, verified_at, consumed_at')
    .eq('id', challengeId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!challenge || challenge.user_id !== userId) {
    return json({ error: 'Request a new verification code.' }, 404);
  }
  if (challenge.consumed_at || challenge.verified_at) {
    return json({ challengeId, verified: true });
  }
  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    return json({ error: 'This code has expired. Request a new one.' }, 400);
  }
  if (challenge.attempts >= challenge.max_attempts) {
    return json({ error: 'Too many incorrect attempts. Request a new code.' }, 429);
  }

  const candidateHash = await hashCode(challengeId, code);
  if (!constantTimeEqual(candidateHash, challenge.code_hash)) {
    const attempts = challenge.attempts + 1;
    await admin
      .from('contact_otp_challenges')
      .update({ attempts })
      .eq('id', challengeId);
    return json(
      {
        attemptsRemaining: Math.max(challenge.max_attempts - attempts, 0),
        error: attempts >= challenge.max_attempts
          ? 'Too many incorrect attempts. Request a new code.'
          : 'That code is incorrect. Try again.',
      },
      attempts >= challenge.max_attempts ? 429 : 400,
    );
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
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  if (!supabaseUrl || !serviceRoleKey || !hmacSecret) {
    return json({ error: 'Contact verification is not configured yet.' }, 503);
  }

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return json({ error: 'Please sign in again to continue.' }, 401);

    const body = (await request.json()) as RequestBody;
    if (body.action === 'send') return await handleSend(user.id, body);
    if (body.action === 'verify') return await handleVerify(user.id, body);
    return json({ error: 'Choose a supported contact verification action.' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Contact verification failed.';
    return json({ error: message }, 500);
  }
});
