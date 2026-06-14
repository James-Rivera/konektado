# Supabase Setup

This folder contains the database and email assets needed by the Konektado app.

## Database

Apply the migrations in `migrations/` to the Supabase project before testing onboarding and marketplace flows.

Recommended dashboard path:

1. Open Supabase Dashboard.
2. Go to SQL Editor.
3. Paste the full migration SQL.
4. Run it once.

CLI path, if the project is linked locally:

```bash
npx supabase db push
```

The migrations create the current app baseline:

- `profiles`
- `user_roles`
- `provider_profiles`
- `client_profiles`
- `verifications`
- `verification_files`
- `jobs`
- `job_drafts`
- `service_drafts`
- `services`
- `conversations`
- `messages`
- `saved_items`
- `reviews`
- Storage bucket `verification-files`

The current onboarding flow writes to these tables immediately after the user creates a password and picks a role.
The Post flow also uses `jobs.tags`, `jobs.workers_needed`, `jobs.allow_messages`, `jobs.auto_reply_enabled`, `jobs.auto_close_enabled`, and the private `job_drafts` and `service_drafts` tables for owner-only autosave and resume before publish.

## Verification Emails

The barangay verification workflow uses a custom Supabase Edge Function at `functions/verification-email/` to send transactional emails for:

- verification submitted
- verification approved
- more information needed
- verification rejected

These emails are separate from the Supabase Auth OTP templates. Keep the OTP templates in `email-templates/` for login/signup codes. The deployed verification function renders inline HTML from `functions/verification-email/index.ts`, with matching reference files kept in `functions/verification-email/templates/`.

The current verification email HTML in `functions/verification-email/` matches the four Konektado Figma status email designs:

- verification submitted
- verification approved
- more information needed
- verification rejected

The function can send through either:

- Resend configured in `VERIFICATION_EMAIL_RESEND_API_KEY` and `VERIFICATION_EMAIL_FROM_EMAIL` / `VERIFICATION_EMAIL_FROM_NAME`, or
- a webhook relay configured in `VERIFICATION_EMAIL_WEBHOOK_URL`, or
- SMTP credentials configured in `VERIFICATION_EMAIL_SMTP_HOST`, `VERIFICATION_EMAIL_SMTP_PORT`, `VERIFICATION_EMAIL_SMTP_USER`, `VERIFICATION_EMAIL_SMTP_PASS`, `VERIFICATION_EMAIL_FROM_EMAIL`, and `VERIFICATION_EMAIL_FROM_NAME`

Preferred setup now that the project owns `konektado.app`:

- use Resend directly on the verified `konektado.app` sender domain
- keep SMTP only as fallback or temporary local unblock

Supabase Auth OTP emails remain separate from this edge-function workflow. If you want a unified sender identity, align both systems on the same `konektado.app` branding/domain, but do not merge the implementation paths.

See [docs/13-verification-email-setup.md](../docs/13-verification-email-setup.md) for deploy and test steps.

## Contact OTP Backup Code

The `functions/contact-otp/` Edge Function keeps PHILSMS delivery, random OTP generation,
hashed challenge storage, expiry, cooldowns, attempt limits, and rate limits. During active
development, it also accepts a server-only backup code for an existing challenge owned by
the authenticated user.

Set the backup code as a Supabase Edge Function secret:

```bash
npx supabase secrets set CONTACT_OTP_BACKUP_CODE=676767
```

The function defaults to `676767` when the secret is missing. This fallback is temporary and
must be removed or rotated before live deployment. Never expose this value through an
`EXPO_PUBLIC_*` variable or return it from the Edge Function.

Successful backup verification follows the normal challenge lifecycle: the Edge Function
sets `verified_at`, and the database trigger sets `consumed_at` when the resident submits the
barangay verification request.

Manual test checklist:

- Request a contact OTP, enter `676767`, and confirm the active challenge verifies.
- Enter `676767` without requesting an OTP first and confirm verification fails.
- Request an OTP, wait until the challenge expires, enter `676767`, and confirm verification fails.
- Confirm an expired challenge shows inline recovery, then request a fresh challenge and verify that the new challenge replaces the expired ID.
- Request an OTP, enter an incorrect code, and confirm verification fails and records an attempt.
- Enter five incorrect codes for one challenge, then enter `676767`, and confirm that challenge remains blocked.
- Request an OTP, immediately request another, and confirm the existing challenge returns with `deliveryStatus = already_sent`, HTTP `200`, and no second provider send.
- Reach the hourly or ten-minute send window with a usable challenge and confirm it returns with `deliveryStatus = rate_limited_existing_challenge`, HTTP `200`, and code entry remains available.
- Reach a send window without a usable challenge and confirm the function returns HTTP `429` until a new SMS send is allowed.
- Complete barangay verification submission and confirm the verified challenge is consumed once.

PHILSMS troubleshooting:

- The current PHILSMS API base URL is `https://dashboard.philsms.com/api/v3`. Do not use the older `https://app.philsms.com/api/v3` host.
- Store the token as the raw value, such as `900|xxxxx`, without a `Bearer ` prefix. The function reads `PHILSMS_API_TOKEN` first and falls back to `PHILSMS_BEARER_TOKEN`.
- Before sending, a temporary server-side diagnostic checks `GET /balance` and logs only whether it succeeded.
- If PHILSMS delivery fails after challenge creation, the function keeps the challenge active and returns HTTP `200` with `deliveryStatus = failed` and a stable `deliveryError`. This lets the authenticated user continue to code entry and use the server-only backup code while expiry, cooldown, attempt, and rate limits remain active.
- SMS sends have a 60-second cooldown, a five-per-user or five-per-phone hourly limit, and a four-per-user-and-phone ten-minute limit. When these block a new send but a usable challenge exists for the same authenticated user and phone, the function returns that challenge without calling PHILSMS again.
- Challenges expire after thirty minutes during active development/testing and allow five incorrect verification attempts. Expiry and attempt exhaustion apply only to that challenge and are checked before both normal and backup code comparison.
- Routine send, resend, delayed-delivery, incorrect-code, cooldown, and expired-code messages render inline. Blocking alerts are reserved for an expired session or a server failure when no usable challenge exists.
- Provider response details are logged only in Edge Function logs. The app receives a stable, user-safe error and never receives provider credentials or OTP values.

## Signup Duplicate Email Check

The signup flow uses `functions/signup-email-check/` before sending a signup OTP. The function runs server-side with the Supabase service role and checks whether the submitted email already belongs to a Konektado profile.

Expected app behavior:

- Existing email: signup stops with `This email already has a Konektado account. Please log in instead.`
- New email: signup continues through email OTP, password creation, role, and onboarding.

Deploy the function before testing duplicate-email signup behavior:

```bash
npx supabase functions deploy signup-email-check
```

The mobile app also has a fallback guard after OTP verification because Supabase client-side OTP signup may return a session for an existing confirmed email. If that happens, the app signs out immediately and sends the user to Log In instead of dashboard/onboarding.

Current troubleshooting notes:

- `404 Requested function was not found` means the function is not deployed for the target project.
- `401 UNAUTHORIZED_INVALID_JWT_FORMAT` means the test request used the wrong Supabase JWT. Use `SUPABASE_SERVICE_ROLE_KEY` for the test script when calling the deployed edge function.

## Demo Seed

`seed.sql` creates fixed demo accounts and marketplace data for MVP testing. It is idempotent for the fixed demo UUIDs and emails, so it can be rerun to restore the scenario.

Run against the linked Supabase project:

```bash
npx supabase db query --linked -f supabase/seed.sql
```

In this WSL workspace, the installed CLI package is a Windows binary, so use:

```bash
cmd.exe /c "node_modules\.bin\supabase.cmd db query --linked -f supabase\seed.sql"
```

All demo accounts use password `Test12345!`.

| Email | Role/state | Use |
| --- | --- | --- |
| `admin@konektado.test` | Barangay admin | Open `/admin/verifications` and approve/reject pending requests. |
| `client@konektado.test` | Verified client | View posted jobs, inbox, hired worker, completed job review history. |
| `worker@konektado.test` | Verified provider | Browse open jobs, message client, view services/reviews. |
| `worker2@konektado.test` | Verified provider | Secondary provider for search and cleaning conversation. |
| `viewer@konektado.test` | Unverified viewer with pending verification | Test verification-gated actions and admin approval. |
| `rejected@konektado.test` | Unverified provider with rejected verification | Test rejected verification correction state. |

`admin@konektado.test` is a barangay admin account, not a resident marketplace onboarding account. It should bypass the resident onboarding path and be used directly with `/admin/verifications`.

The seed includes:

- 6 auth users/profiles.
- 3 active services.
- 4 jobs across `open`, `reviewing`, `in_progress`, and `completed`.
- 3 conversations and 5 messages.
- 5 verification requests across `approved`, `pending`, and `rejected`.
- 2 completed-job reviews.

## Presentation Content Reseed

`reseed_presentation_content_preserve_auth.sql` keeps existing Supabase Auth users and identities so login accounts continue to work, but refreshes visible Konektado app data attached to selected non-admin accounts.

The script:

- selects 6 to 12 existing non-admin profiles and fails clearly if fewer than 6 are available
- preserves `auth.users`, auth identities, migrations, storage bucket configuration, verification files, and credential files
- updates selected profile display fields with fictional Barangay San Pedro sample content
- regenerates provider and client profile display fields
- clears old marketplace/content rows from notifications, reports, reviews, saved items, messages, conversations, job drafts, service drafts, services, and jobs
- inserts 30 active service listings, 20 open job posts, safe conversations/messages, reviews, and saved items
- uses current service taxonomy values from `constants/service-taxonomy.ts`
- uses mixed generated avatar-style profile images with some initials fallbacks
- keeps listing images optional: some services/jobs have relevant category photos and some intentionally have no image

The generated profiles, listings, and messages are fictional sample marketplace content for system demonstration. They should be reset or replaced before official launch.

Local database:

```bash
npx supabase db query -f supabase/reseed_presentation_content_preserve_auth.sql
```

Linked remote project:

```bash
npx supabase db query --linked -f supabase/reseed_presentation_content_preserve_auth.sql
```

Explicit remote database URL:

```bash
npx supabase db query --db-url "$SUPABASE_DB_URL" -f supabase/reseed_presentation_content_preserve_auth.sql
```

Supabase SQL Editor:

1. Open the target project in Supabase Dashboard.
2. Go to SQL Editor.
3. Paste the full contents of `supabase/reseed_presentation_content_preserve_auth.sql`.
4. Run the SQL and review the verification result sets at the bottom.

## Auth Email Templates

Copy the body in `email-templates/magic-link-otp.html` into both Supabase Auth templates:

- Magic Link
- Confirm sign up

Supabase Auth OTP length must be configured to 6 digits because the app and template both use six OTP boxes.
