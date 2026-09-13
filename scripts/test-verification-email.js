#!/usr/bin/env node

/**
 * Test harness for the verification email edge function.
 *
 * Usage:
 *   node scripts/test-verification-email.js <requestId>
 * This sends a real email; use only an authorized test account/request.
 *
 * Required env:
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY (or EXPO_PUBLIC_SUPABASE_KEY)
 *   VERIFICATION_EMAIL_ACCESS_TOKEN (signed-in owner for pending, admin for decisions)
 *
 * Optional env:
 *   VERIFICATION_EMAIL_BASE_URL   (defaults to SUPABASE_URL)
 */

const requestId = process.argv[2];

if (!requestId) {
  console.error(
    'Usage: node scripts/test-verification-email.js <requestId>',
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
  process.env.SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_KEY;
const baseUrl = process.env.VERIFICATION_EMAIL_BASE_URL || supabaseUrl;
const accessToken = process.env.VERIFICATION_EMAIL_ACCESS_TOKEN;

if (!supabaseUrl || !supabaseKey || !accessToken) {
  console.error('Missing Supabase URL, public API key, or VERIFICATION_EMAIL_ACCESS_TOKEN.');
  process.exit(1);
}

if (!baseUrl) {
  console.error('Missing VERIFICATION_EMAIL_BASE_URL or SUPABASE_URL.');
  process.exit(1);
}

async function main() {
  const url = `${baseUrl.replace(/\/$/, '')}/functions/v1/verification-email`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseKey,
    },
    body: JSON.stringify({
      requestId,
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
