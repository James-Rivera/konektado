#!/usr/bin/env node

/**
 * Test harness for the verification email edge function.
 *
 * Usage:
 *   node scripts/test-verification-email.js <template> <requestId> [ctaUrl]
 *
 * Required env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional env:
 *   VERIFICATION_EMAIL_BASE_URL   (defaults to SUPABASE_URL)
 */

const template = process.argv[2];
const requestId = process.argv[3];
const ctaUrl = process.argv[4] || 'konektado://verification';

if (!template || !requestId) {
  console.error(
    'Usage: node scripts/test-verification-email.js <verification_submitted|verification_approved|verification_needs_more_info|verification_rejected> <requestId> [ctaUrl]',
  );
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = process.env.VERIFICATION_EMAIL_BASE_URL || supabaseUrl;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

if (!baseUrl) {
  console.error('Missing VERIFICATION_EMAIL_BASE_URL or SUPABASE_URL.');
  process.exit(1);
}

const allowedTemplates = new Set([
  'verification_submitted',
  'verification_approved',
  'verification_needs_more_info',
  'verification_rejected',
]);

if (!allowedTemplates.has(template)) {
  console.error(`Invalid template: ${template}`);
  process.exit(1);
}

async function main() {
  const url = `${baseUrl.replace(/\/$/, '')}/functions/v1/verification-email`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    body: JSON.stringify({
      ctaUrl,
      requestId,
      template,
    }),
  });

  const text = await response.text();

  console.log(`HTTP ${response.status}`);
  console.log(text);

  if (!response.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
