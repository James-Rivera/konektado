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
- `services`
- `conversations`
- `messages`
- `saved_items`
- `reviews`
- Storage bucket `verification-files`

The current onboarding flow writes to these tables immediately after the user creates a password and picks a role.

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
