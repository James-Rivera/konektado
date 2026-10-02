// PhilSMS transport shared by `contact-otp` (barangay contact verification) and
// `send-sms-hook` (Supabase Auth phone OTPs). Kept free of imports and Deno
// globals so the app's TypeScript check and the Node tests can load it too.
//
// Never pass OTPs, tokens, or message bodies to console output from here.

export const PHILSMS_API_BASE_URL = 'https://dashboard.philsms.com/api/v3';

export type PhilSmsFailureCode =
  | 'sms_provider_unauthenticated'
  | 'sms_sender_rejected'
  | 'sms_balance_error'
  | 'sms_request_rejected'
  | 'sms_delivery_failed';

export class SmsDeliveryError extends Error {
  code: PhilSmsFailureCode;

  constructor(code: PhilSmsFailureCode) {
    super('SMS delivery failed.');
    this.name = 'SmsDeliveryError';
    this.code = code;
  }
}

type PhilSmsResponse = {
  data?: { data?: { id?: unknown; uid?: unknown }; id?: unknown; uid?: unknown };
  message?: unknown;
  status?: unknown;
};

export type PhilSmsConfig = {
  senderId: string;
  token: string;
};

/**
 * PH mobile in PhilSMS/database form (`639XXXXXXXXX`). Mirrors
 * `public.normalize_ph_mobile` and `utils/phone.ts`.
 */
export function normalizePhilippineMobile(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, '') ?? '';
  if (/^09\d{9}$/.test(digits)) return `63${digits.slice(1)}`;
  if (/^639\d{9}$/.test(digits)) return digits;
  return null;
}

/** Accepts the token with or without a pasted `Bearer ` prefix. */
export function normalizePhilSmsToken(value: string) {
  return value.trim().replace(/^Bearer\s+/i, '').trim();
}

export function getPhilSmsHeaders(token: string) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export function classifyPhilSmsFailure(
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

/**
 * Sends one plain SMS and returns PhilSMS's message id (empty string when the
 * response has none). Throws `SmsDeliveryError` on any transport or provider
 * failure. `recipient` must already be normalized to `639XXXXXXXXX`.
 */
export async function sendPhilSms(
  config: PhilSmsConfig,
  recipient: string,
  message: string,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${PHILSMS_API_BASE_URL}/sms/send`, {
      method: 'POST',
      headers: getPhilSmsHeaders(config.token),
      body: JSON.stringify({
        recipient,
        sender_id: config.senderId,
        type: 'plain',
        message,
      }),
    });
  } catch {
    console.error('PHILSMS delivery failed', {
      response: null,
      status: null,
    });
    throw new SmsDeliveryError('sms_delivery_failed');
  }

  const result = (await response.json().catch(() => null)) as PhilSmsResponse | null;

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
