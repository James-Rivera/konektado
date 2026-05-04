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
- A `404 Requested function was not found` response means the function has not been deployed at the target Supabase project yet.
- A `401 UNAUTHORIZED_INVALID_JWT_FORMAT` response means the request was signed with the wrong Supabase key. The test runner should use `SUPABASE_SERVICE_ROLE_KEY` first, then fall back to anon/public keys only for non-authenticated local checks.
- If the runner prints `Missing SUPABASE_URL or Supabase JWT key.`, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the current PowerShell session before rerunning the command.
