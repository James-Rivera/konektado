# Verification Email Setup

This guide covers the custom barangay verification emails used by the resident verification workflow.

These emails are **not** Supabase Auth emails. Keep the OTP signup templates separate from this flow.

## What This Uses

- Supabase Edge Function: `supabase/functions/verification-email/`
- Inline HTML templates in `supabase/functions/verification-email/index.ts`
- Matching reference HTML files in `supabase/functions/verification-email/templates/`
- Local test script: `npm run test:verification-email`

The current email HTML matches these four Konektado Figma verification-status designs:

- `532:3589` verification submitted
- `607:2364` verification approved
- `607:2417` more information needed
- `607:2471` verification rejected

## Recommended Production Transport

Current preferred path:

- Use Resend on the verified `konektado.app` sender domain.
- Send the custom verification emails directly through the Resend Email API.
- Keep SMTP only as a local unblock path or fallback.

Reasoning:

- These emails are operational backend emails, not user mailbox traffic.
- Edge functions are a better fit for provider relay/API delivery than for long-term mailbox SMTP credentials.
- Provider-backed delivery gives cleaner logs, sender reputation control, and simpler production debugging.
- Supabase Auth OTP emails remain a separate system and should stay separate from this verification workflow.

## Function Behavior

The function loads the verification row and profile row for a given `requestId`, renders the correct email template, and sends it through:

- Resend API when `VERIFICATION_EMAIL_RESEND_API_KEY` is set
- a webhook relay when `VERIFICATION_EMAIL_WEBHOOK_URL` is set
- SMTP as a fallback

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
- `{{CTA Label}}`
- `{{Info Note Section}}`
- `{{Privacy URL}}`
- `{{Terms URL}}`
- `{{Help URL}}`
- `{{Unsubscribe URL}}`
- `{{Instagram URL}}`
- `{{Facebook URL}}`

Testing support:

- The function accepts an optional request-body `idempotencyKey`.
- Production callers can omit it and keep the default stable key: `verification-email:<template>:<requestId>`.
- `npm run test:verification-email` generates a unique test key automatically so repeated template tests do not hit Resend's 24-hour idempotency conflict.

## Environment Variables

Set these in the Supabase Edge Function environment:

### Resend mode

- `VERIFICATION_EMAIL_RESEND_API_KEY`
- `VERIFICATION_EMAIL_FROM_EMAIL`
- `VERIFICATION_EMAIL_FROM_NAME`

Optional fallback compatibility:

- `RESEND_API_KEY`

Recommended now that the project owns `konektado.app`:

- Set `VERIFICATION_EMAIL_FROM_EMAIL` to the verified `konektado.app` sender address you want residents to see.
- Use the same branded sender identity you want residents to see for verification updates.
- Keep verification email transport separate from Supabase Auth template configuration, even if both use the same sending domain.

### Relay mode

- `VERIFICATION_EMAIL_WEBHOOK_URL`
- `VERIFICATION_EMAIL_WEBHOOK_SECRET` if your relay expects a shared secret

Use this only if you are temporarily routing through a custom relay service rather than Resend directly.

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

If the project has both Resend and SMTP configured, prefer Resend for deployed environments and reserve SMTP for fallback/testing.

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

npm run test:verification-email -- verification_submitted 561523e5-af3e-4cca-9a32-036e6599d793
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
- `konektado.app` is the sending-domain baseline for branded transactional verification emails. Treat SMTP mailbox credentials as temporary infrastructure, not the long-term production path. Resend is the preferred production transport for this workflow.
- The deployed function should not depend on reading HTML template files from the edge runtime filesystem. If you see an error like `path not found: .../templates/layout.html`, deploy the latest `verification-email` function version from this repo.
- A `404 Requested function was not found` response means the function has not been deployed at the target Supabase project yet.
- A `401 UNAUTHORIZED_INVALID_JWT_FORMAT` response means the request was signed with the wrong Supabase key. The test runner should use `SUPABASE_SERVICE_ROLE_KEY` first, then fall back to anon/public keys only for non-authenticated local checks.
- If the runner prints `Missing SUPABASE_URL or Supabase JWT key.`, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the current PowerShell session before rerunning the command.
