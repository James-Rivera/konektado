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
- `services`
- `conversations`
- `messages`
- `saved_items`
- `reviews`
- Storage bucket `verification-files`

The current onboarding flow writes to these tables immediately after the user creates a password and picks a role.
The Post flow also uses `jobs.tags`, `jobs.workers_needed`, `jobs.allow_messages`, `jobs.auto_reply_enabled`, `jobs.auto_close_enabled`, and the private `job_drafts` table for draft persistence before publish.

## Verification Emails

The barangay verification workflow uses a custom Supabase Edge Function at `functions/verification-email/` to send transactional emails for:

- verification submitted
- verification approved
- more information needed
- verification rejected

These emails are separate from the Supabase Auth OTP templates. Keep the OTP templates in `email-templates/` for login/signup codes, and keep the verification email HTML files in the edge function folder.

The function can send through either:

- a webhook relay configured in `VERIFICATION_EMAIL_WEBHOOK_URL`, or
- SMTP credentials configured in `VERIFICATION_EMAIL_SMTP_HOST`, `VERIFICATION_EMAIL_SMTP_PORT`, `VERIFICATION_EMAIL_SMTP_USER`, `VERIFICATION_EMAIL_SMTP_PASS`, `VERIFICATION_EMAIL_FROM_EMAIL`, and `VERIFICATION_EMAIL_FROM_NAME`

If your auth emails already use a provider relay, mirror the same provider settings here so verification updates stay on the same sender path.

See [docs/13-verification-email-setup.md](../docs/13-verification-email-setup.md) for deploy and test steps.

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

## Auth Email Templates

Copy the body in `email-templates/magic-link-otp.html` into both Supabase Auth templates:

- Magic Link
- Confirm sign up

Supabase Auth OTP length must be configured to 6 digits because the app and template both use six OTP boxes.
