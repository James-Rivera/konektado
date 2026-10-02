/**
 * Mobile-number signup and login.
 *
 * Off by default. Supabase Auth phone sign-in needs the Phone provider enabled
 * and the `send-sms-hook` function attached as the Auth Send SMS hook (DEC-131;
 * it reuses the PhilSMS account behind `contact-otp`). Until that is set up,
 * every phone OTP request fails, so the mobile option stays hidden and signup,
 * login, and recovery remain email-first (DEC-014). See the enabling checklist
 * in docs/07-auth-and-permissions.md.
 *
 * Set `EXPO_PUBLIC_PHONE_AUTH_ENABLED=true` only after the provider is live.
 */
export const PHONE_AUTH_ENABLED = process.env.EXPO_PUBLIC_PHONE_AUTH_ENABLED === 'true';
