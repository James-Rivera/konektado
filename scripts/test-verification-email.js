#!/usr/bin/env node

/**
 * Test harness for the verification email edge function.
 *
 * Usage:
 *   node scripts/test-verification-email.js <template> <requestId> [ctaUrl]
 *
 * Required env:
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY (or EXPO_PUBLIC_SUPABASE_KEY)
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

loadEnvFile('.env.local');
loadEnvFile('.env');

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.VERIFICATION_EMAIL_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_KEY;
const baseUrl = process.env.VERIFICATION_EMAIL_BASE_URL || supabaseUrl;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or Supabase JWT key.');
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
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
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
    if (response.status === 404) {
      console.error(
        'The verification-email function is not deployed at this Supabase project URL. Deploy it first, or point VERIFICATION_EMAIL_BASE_URL to a local Supabase function server.',
      );
    }

    process.exitCode = 1;
  }
}

function loadEnvFile(fileName) {
  const fs = require('node:fs');
  const path = require('node:path');

  const filePath = path.join(process.cwd(), fileName);

  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex <= 0) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    if (process.env[key]) continue;

    let value = trimmed.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
