# Auth and Permissions

## Authentication

Konektado uses Supabase Auth for MVP authentication.

Active MVP onboarding auth flow:

- User enters email.
- App calls `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, data } })`.
- Supabase sends an email template containing `{{ .Token }}`, so the email shows a 6-digit OTP instead of requiring a link click.
- Keep the Magic Link and Confirm sign up templates aligned with the same six-box `{{ .Token }}` body.
- User enters the 6-digit OTP and the app verifies it with `verifyOtp({ type: 'email' })`.
- Supabase creates a session after OTP verification.
- App redirects to Create Password and saves the password with `supabase.auth.updateUser({ password })`.
- Login after onboarding uses email/password.

Current OTP troubleshooting note:

- 2026-05-03, Asia/Shanghai: root cause found. Supabase Auth was configured to generate 8-digit OTP codes while the app and email template displayed and accepted 6 digits. Supabase Auth OTP length has been set to 6 digits.
- Next check: confirm the Supabase Dashboard **Magic Link** and **Confirm sign up** templates both contain the six-box `{{ .Token }}` email, request a fresh code, and confirm the code auto-submits after six digits.

Required behavior:

- Users register with Supabase email OTP, then create a password for email/password login.
- Do not require custom SMTP for the MVP. Supabase's default email sender is acceptable for local/demo testing.
- The Supabase Auth email templates used by the signup OTP path must include `{{ .Token }}` so users receive a 6-digit code. Supabase Auth OTP length must be configured to 6 digits. For MVP signup, the app uses `signInWithOtp`; keep both **Magic Link** and **Confirm sign up** templates aligned.
- In app code, verify signup email codes only through the auth service. Keep the request/resend/verify methods on Supabase email OTP/passwordless auth.
- Do not require SMS OTP, mobile OTP, or an SMS gateway for the MVP.
- Phone-first authentication can be revisited later when provider access and Android/device testing are available.
- Email is used for login, verification updates, support, and account recovery.
- Barangay verification email updates are custom transactional emails sent from backend code, not Supabase Auth templates. Keep them separate from the OTP auth templates.
- App stores sessions through Supabase's React Native auth storage.
- Screens must use an auth/session hook or service, not direct auth logic in every screen.
- App data must be protected with PostgreSQL Row Level Security.
- Authentication alone does not grant full marketplace interaction. Barangay verification is required for posting, messaging, saving if enabled, and reviewing.

## Unverified Viewer Mode

New users should be allowed into the app quickly after registration, role intent selection, and lightweight taste setup. Until barangay verification is approved, they are unverified viewers.

First onboarding supports:

- Find work: store offered services.
- Hire someone: store needed services.
- Both: store both offered and needed services while creating both client and provider role rows.

These preferences personalize browsing and do not replace barangay verification.

First onboarding path:

1. Role intent.
2. Basic profile identity and location.
3. Offered and/or needed service preferences.
4. Review.
5. Complete.
6. Home in viewer mode.

Completion requires `user_preferences.onboarding_completed_at` plus basic profile identity: first name, last name or full name, city, and barangay. First onboarding does not collect certificates, ID documents, selfie/photo uploads, or verification files.

Home default filter rules:

- Provider intent opens Jobs.
- Client intent opens Workers.
- Both intent, missing intent, or missing preferences open For you.

Unverified viewers can:

- Browse limited public jobs, workers, and service posts.
- Create and edit private job drafts.
- Read educational prompts about verification and safe marketplace use.
- View their own profile and verification status.
- Submit or resubmit a verification request.
- Report a safety concern if reporting is enabled for viewers.

Unverified viewers cannot:

- Publish jobs.
- Create public service profiles or service posts.
- Message users.
- Leave reviews.
- Appear as verified users in public search.
- Access admin screens.

## Role-Based Permissions

| Resource/Action               | Provider                      | Client                  | Barangay Admin                 |
| ----------------------------- | ----------------------------- | ----------------------- | ------------------------------ |
| Read own profile              | Yes                           | Yes                     | Yes                            |
| Update own profile            | Yes                           | Yes                     | Yes                            |
| Read public provider profiles | Yes                           | Yes                     | Yes                            |
| Create service profile        | Yes                           | No                      | No, unless acting as provider  |
| Update own service profile    | Yes                           | No                      | No, unless owner               |
| Create job                    | No, unless active client role | Yes                     | No, unless acting as client    |
| Browse open jobs              | Yes                           | Yes                     | Yes                            |
| Message about job/service     | Yes                           | Yes                     | Admin read only for moderation |
| Mark worker hired for own job | No                            | Yes                     | Admin read only for moderation |
| Submit verification request   | Yes                           | Optional                | No                             |
| Approve/reject verification   | No                            | No                      | Yes                            |
| Create review                 | Yes, if job participant       | Yes, if job participant | No, unless job participant     |
| Create report                 | Yes                           | Yes                     | Yes                            |
| Moderate reports              | No                            | No                      | Yes                            |

These role permissions apply after the user's barangay verification is approved. Before approval, the stricter unverified viewer rules apply.

## Resource Rules

| Resource                | Read Rules                                                                                                                                     | Create Rules                                     | Update Rules                                                                                       | Delete Rules                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `profiles`              | Owner can read full profile. Public users can read safe public fields. Admin can read needed fields.                                           | Created for authenticated user.                  | Owner can update editable fields. Admin can update verification fields only through admin service. | Hard delete should be admin-only or handled through account deletion.        |
| `user_roles`            | Owner can read own roles. Admin can read roles.                                                                                                | Users can add client/provider role for self.     | Owner can switch active client/provider role. Admin role is protected.                             | Admin-only or restricted.                                                    |
| `services`              | Authenticated viewers can read active public services. Owner can read all own services. Admin can read for moderation.                         | Verified provider owner only.                    | Verified provider owner only. Admin can hide/moderate if needed.                                   | Provider owner can delete own services if no required history depends on it. |
| `credentials`           | Owner and admin can read. Public cannot read private files.                                                                                    | Provider owner only.                             | Provider owner can update metadata. Admin can update review status.                                | Owner can delete unused credentials. Admin can hide for moderation.          |
| `verification_requests` | Owner and admin can read.                                                                                                                      | Owner can create own request.                    | Admin approves/rejects. Owner can cancel pending request.                                          | Avoid hard delete; use status.                                               |
| `jobs`                  | Open jobs are readable by authenticated viewers. Owner can read own jobs. Admin can read for moderation.                                       | Verified client owner only.                      | Verified job owner can edit own open job. Admin can moderate.                                      | Prefer status `cancelled` or `closed`; hard delete owner/admin only if safe. |
| `job_drafts`            | Owner can read own drafts only.                                                                                                                | Authenticated owner, verified or unverified.     | Owner can update own drafts.                                                                       | Owner can delete own drafts.                                                |
| `conversations`         | Participants can read their own conversations. Job owner can read conversations tied to own jobs. Admin can read for moderation when reported. | Verified user only.                              | Participants can archive/decline where allowed. Job owner can mark hired.                          | Prefer status changes.                                                       |
| `messages`              | Conversation participants only. Admin can read only for moderation/report workflows.                                                           | Verified sender only.                            | Avoid editing messages in MVP.                                                                     | Prefer archive/report over hard delete.                                      |
| `reviews`               | Public can read approved public reviews.                                                                                                       | Verified job participants only after completion. | Reviewer can edit own review if allowed. Admin can hide/moderate reported reviews.                 | Avoid hard delete; admin moderation preferred.                               |
| `reports`               | Reporter can read own report. Admin can read all.                                                                                              | Authenticated users.                             | Admin updates status.                                                                              | Admin-only.                                                                  |

## Admin Rules

- Admin status must come from `user_roles.role = 'barangay_admin'` or a protected server-side claim.
- Users must not be able to assign themselves admin role.
- Admin actions should be routed through `AdminService`.
- Admin review decisions must store reviewer ID and timestamp.
- Admins should see only the data needed for verification or moderation.

## Verification Rules

- Barangay verification is not automatic.
- A user can submit a pending verification request with required files and required barangay details.
- Only barangay admins can approve or reject.
- Approval sets the user/profile verification indicator.
- Rejection stores a reason or note.
- Public UI should show verification status as a badge, not expose private files.
- Verification is the gate for user-to-user interaction features.
- The verification page is where heavier requirements belong: contact confirmation, email confirmation, optional phone number, ID, services, credentials, selfie/photo for manual comparison, and supporting details.
- Verification contact details should reuse onboarding/profile values instead of asking the user to retype them.
- First name and last name can be edited during verification only to correct mismatches with the user's ID.
- Email is private and used for login, verification updates, support, and account recovery.

## Public vs Private Data

Public-safe provider fields:

- Display name.
- Barangay/city level location.
- Service categories and descriptions.
- Availability text.
- Public rating summary.
- Verification badge.
- Public credential labels if approved and safe.

Private or restricted fields:

- Birthdate.
- Full street address.
- Phone number, unless user chooses to expose it or after accepted job contact flow.
- ID files.
- Certificate file URLs.
- Admin notes.
- Report details.
- Raw auth metadata.

## Row Level Security Direction

Every app table should have RLS enabled.

Minimum policy style:

```sql
-- Owner can read/update own profile.
auth.uid() = user_id

-- Public provider search reads safe rows through a view or restricted select policy.
is_active = true

-- Admin access checks a protected role.
exists (
  select 1
  from user_roles
  where user_roles.user_id = auth.uid()
    and user_roles.role = 'barangay_admin'
)
```

Prefer database views or service functions for public profile search so private columns are not accidentally exposed.
