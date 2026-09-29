/**
 * Philippine mobile number helpers. Mirrors `normalizePhilippineMobile` in
 * `supabase/functions/contact-otp` and `public.normalize_ph_mobile`, so the
 * app, the SMS function, and the database agree on what a valid number is.
 *
 * Accepts the forms residents actually type: 09171234567, 9171234567,
 * 639171234567, +63 917 123 4567.
 */
export function normalizePhilippineMobile(value: string | null | undefined): string | null {
  const digits = value?.replace(/\D/g, '') ?? '';
  if (/^09\d{9}$/.test(digits)) return `63${digits.slice(1)}`;
  if (/^9\d{9}$/.test(digits)) return `63${digits}`;
  if (/^639\d{9}$/.test(digits)) return digits;
  return null;
}

/** E.164 form (`+639171234567`) for Supabase Auth phone APIs. */
export function toE164PhilippineMobile(value: string | null | undefined): string | null {
  const normalized = normalizePhilippineMobile(value);
  return normalized ? `+${normalized}` : null;
}

/** Local display form (`0917 123 4567`) for "we sent a code to ..." copy. */
export function formatPhilippineMobile(value: string | null | undefined): string {
  const normalized = normalizePhilippineMobile(value);
  if (!normalized) return value?.trim() ?? '';
  const local = `0${normalized.slice(2)}`;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

/** True when the text looks like a phone number rather than an email. */
export function looksLikePhoneNumber(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && !trimmed.includes('@') && /^[+\d\s()-]+$/.test(trimmed);
}
