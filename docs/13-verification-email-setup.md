# Verification Email Setup

This guide covers the custom barangay verification emails used by the resident verification workflow.

These emails are **not** Supabase Auth emails. Keep the OTP signup templates separate from this flow.

## What This Uses

- Supabase Edge Function: `supabase/functions/verification-email/`
- HTML templates:
  - `verification-submitted-content.html`
  - `verification-approved-content.html`
  - `verification-needs-more-info-content.html`
  - `verification-rejected-content.html`
- Local test script: `npm run test:verification-email`

## Recommended Production Transport

Current preferred path:

- Use a domain-backed transactional provider on `konektado.app`.
- Prefer a relay/API-style send path for custom verification emails.
- Keep SMTP only as a local unblock path or fallback.

Reasoning:

- These emails are operational backend emails, not user mailbox traffic.
- Edge functions are a better fit for provider relay/API delivery than for long-term mailbox SMTP credentials.
- Provider-backed delivery gives cleaner logs, sender reputation control, and simpler production debugging.
- Supabase Auth OTP emails remain a separate system and should stay separate from this verification workflow.

## Function Behavior

The function loads the verification row and profile row for a given `requestId`, renders the correct email template, and sends it through either:

- a webhook relay, or
- SMTP

The function supports these templates:

- `verification_submitted`
- `verification_approved`
- `verification_needs_more_info`
- `verification_rejected`

Supported placeholder values:

- `{{Name}}`
- `{{Full Name}}`
- `{{Barangay}}`
- `{{Submitted Date}}`
- `{{Approved Date}}`
- `{{Status}}`
- `{{Admin Reason}}`
- `{{CTA URL}}`

## Environment Variables

Set these in the Supabase Edge Function environment:

### Relay mode

- `VERIFICATION_EMAIL_WEBHOOK_URL`
- `VERIFICATION_EMAIL_WEBHOOK_SECRET` if your relay expects a shared secret

Recommended now that the project owns `konektado.app`:

- Point `VERIFICATION_EMAIL_WEBHOOK_URL` at a small relay that sends through your transactional provider for `konektado.app`.
- Use the same branded sender identity you want residents to see for verification updates.
- Keep verification email transport separate from Supabase Auth template configuration, even if both use the same sending domain.

### SMTP mode

- `VERIFICATION_EMAIL_SMTP_HOST`
- `VERIFICATION_EMAIL_SMTP_PORT`
- `VERIFICATION_EMAIL_SMTP_USER`
- `VERIFICATION_EMAIL_SMTP_PASS`
- `VERIFICATION_EMAIL_FROM_EMAIL`
- `VERIFICATION_EMAIL_FROM_NAME`

Optional:

- `VERIFICATION_EMAIL_CTA_URL`

If your project already uses a provider relay for auth emails, mirror the same transport settings here so verification updates use the same sender path.

If the project has both relay and SMTP configured, prefer relay for deployed environments and reserve SMTP for fallback/testing.

## Local Testing

If you want to test the function locally:

1. Start the Supabase local stack or local edge function server.
2. Point the test script at the local function base URL.
3. Run the script with a real verification request id.

Example:

```powershell
$env:VERIFICATION_EMAIL_BASE_URL = "http://127.0.0.1:54321"
npx supabase functions serve verification-email
npm run test:verification-email -- verification_submitted <requestId>
```

## Deployed Testing

To deploy the function to the linked Supabase project:

```bash
npx supabase functions deploy verification-email --project-ref dudlohdeydcbsvgccexd
```

Then run:

```bash
npm run test:verification-email -- verification_submitted <requestId>
```

The script reads:

- `SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY` or `EXPO_PUBLIC_SUPABASE_KEY`
- `VERIFICATION_EMAIL_BASE_URL` if you want to override the target URL

## Notes

- Uploaded IDs and documents are never attached to these emails.
- The edge function lives in backend code, not Supabase Auth email templates.
- `konektado.app` is the sending-domain baseline for branded transactional verification emails. Treat SMTP mailbox credentials as temporary infrastructure, not the long-term production path.
- The deployed function should not depend on reading HTML template files from the edge runtime filesystem. If you see an error like `path not found: .../templates/layout.html`, deploy the latest `verification-email` function version from this repo.
- A `404 Requested function was not found` response means the function has not been deployed at the target Supabase project yet.
- A `401 UNAUTHORIZED_INVALID_JWT_FORMAT` response means the request was signed with the wrong Supabase key. The test runner should use `SUPABASE_SERVICE_ROLE_KEY` first, then fall back to anon/public keys only for non-authenticated local checks.
- If the runner prints `Missing SUPABASE_URL or Supabase JWT key.`, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the current PowerShell session before rerunning the command.
