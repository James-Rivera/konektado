// @ts-nocheck
// Supabase Auth "Send SMS" hook (HTTPS). Auth calls this instead of a built-in
// SMS provider for phone signup, phone login OTPs, and phone password recovery,
// and we deliver the code through the same PhilSMS account as `contact-otp`.
//
// Deploy with `--no-verify-jwt`: Auth signs requests with the Standard Webhooks
// secret (SEND_SMS_HOOK_SECRET), not a user JWT. See docs/07 and DEC-131.
//
// Never log the OTP, the hook secret, the PhilSMS token, or the message body.
import {
  normalizePhilSmsToken,
  sendPhilSms,
  SmsDeliveryError,
} from '../_shared/philsms.ts';
import {
  buildAuthSmsMessage,
  parseSendSmsHookPayload,
  toPhilSmsRecipient,
  verifyStandardWebhook,
} from './webhook.ts';

const hookSecret = Deno.env.get('SEND_SMS_HOOK_SECRET') ?? '';
const philSmsToken = normalizePhilSmsToken(
  Deno.env.get('PHILSMS_API_TOKEN') ?? Deno.env.get('PHILSMS_BEARER_TOKEN') ?? '',
);
const philSmsSenderId = Deno.env.get('PHILSMS_SENDER_ID') ?? 'Konektado';

/** Auth hook error shape: Auth relays `message` and `http_code` to the client. */
function hookError(httpCode: number, message: string) {
  return new Response(JSON.stringify({ error: { http_code: httpCode, message } }), {
    headers: { 'content-type': 'application/json' },
    status: httpCode,
  });
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return hookError(405, 'Method not allowed.');

  if (!hookSecret) {
    console.error('Send SMS hook configuration is missing', { missingHookSecret: true });
    return hookError(500, 'SMS sending is not configured.');
  }

  const payload = await request.text();
  const verification = await verifyStandardWebhook({
    headers: request.headers,
    payload,
    secret: hookSecret,
  });
  if (!verification.ok) {
    console.warn('Send SMS hook rejected an unsigned request', { reason: verification.reason });
    return hookError(401, 'Invalid hook signature.');
  }

  const hookRequest = parseSendSmsHookPayload(payload);
  if (!hookRequest) {
    console.warn('Send SMS hook received an unexpected payload');
    return hookError(400, 'Invalid SMS hook payload.');
  }

  const recipient = toPhilSmsRecipient(hookRequest.phone);
  if (!recipient) {
    console.warn('Send SMS hook refused a non-PH number', { userId: hookRequest.userId });
    return hookError(400, 'Only Philippine mobile numbers (+63 9XX XXX XXXX) are supported.');
  }

  if (!philSmsToken || !philSmsSenderId) {
    console.error('Send SMS hook provider configuration is missing', {
      missingPhilSmsSenderId: !philSmsSenderId,
      missingPhilSmsToken: !philSmsToken,
    });
    return hookError(500, 'SMS sending is not configured.');
  }

  try {
    await sendPhilSms(
      { senderId: philSmsSenderId, token: philSmsToken },
      recipient,
      buildAuthSmsMessage(hookRequest.otp),
    );
  } catch (error) {
    const code = error instanceof SmsDeliveryError ? error.code : 'sms_delivery_failed';
    console.error('Send SMS hook delivery failed', { code, userId: hookRequest.userId });
    return hookError(500, 'Error sending SMS. Please try again.');
  }

  console.info('Send SMS hook delivered', { userId: hookRequest.userId });
  return new Response(JSON.stringify({}), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  });
});
