# Supabase Setup

This folder contains the database and email assets needed by the Konektado app.

## Database

Apply the migration in `migrations/20260503001433_initial_app_schema.sql` to the Supabase project before testing onboarding.

Recommended dashboard path:

1. Open Supabase Dashboard.
2. Go to SQL Editor.
3. Paste the full migration SQL.
4. Run it once.

CLI path, if the project is linked locally:

```bash
npx supabase db push
```

The migration creates the current app baseline:

- `profiles`
- `user_roles`
- `provider_profiles`
- `client_profiles`
- `verifications`
- `verification_files`
- `jobs`
- Storage bucket `verification-files`

The current onboarding flow writes to these tables immediately after the user creates a password and picks a role.

## Auth Email Templates

Copy the body in `email-templates/magic-link-otp.html` into both Supabase Auth templates:

- Magic Link
- Confirm sign up

Supabase Auth OTP length must be configured to 6 digits because the app and template both use six OTP boxes.
