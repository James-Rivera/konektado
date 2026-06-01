# Auth and Permissions

## Authentication

Konektado uses Supabase Auth for MVP authentication.

Active MVP onboarding auth flow:

- User enters email.
- App checks the email through the `signup-email-check` Edge Function before requesting a signup OTP. If the email already belongs to a Konektado profile or completed Supabase Auth account, signup stops and directs the user to Log In before any OTP email is sent.
- App calls `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, data } })`.
- Supabase sends an email template containing `{{ .Token }}`, so the email shows a 6-digit OTP instead of requiring a link click.
- Keep the Magic Link and Confirm sign up templates aligned with the same six-box `{{ .Token }}` body.
- User enters the 6-digit OTP and the app verifies it with `verifyOtp({ type: 'email' })`.
- Supabase creates a session after OTP verification.
- Because Supabase client-side OTP signup can return a session for an existing confirmed email, the app also checks the returned session for an existing Konektado profile/role/preference row. If it looks like an existing account, the app signs out immediately and shows `This email already has a Konektado account. Please log in instead.`
- App redirects to Create Password and saves the password with `supabase.auth.updateUser({ password })`.
- Login after onboarding uses email/password.

Active MVP password recovery flow:

- User taps Forgot Password from Log In or from the duplicate-account signup alert.
- App calls `supabase.auth.resetPasswordForEmail(email)`.
- Supabase sends the Password Recovery template containing `{{ .Token }}`, so the user receives a 6-digit reset code inside the app-compatible email body.
- User enters the 6-digit code and the app verifies it with `verifyOtp({ type: 'recovery' })`.
- Supabase creates a temporary recovery session after the code is verified.
- App keeps the user on the Forgot Password route, lets them create a new password with `supabase.auth.updateUser({ password })`, then signs out and returns them to Log In.

Current OTP troubleshooting note:

- 2026-05-03, Asia/Shanghai: root cause found. Supabase Auth was configured to generate 8-digit OTP codes while the app and email template displayed and accepted 6 digits. Supabase Auth OTP length has been set to 6 digits.
- Next check: confirm the Supabase Dashboard **Magic Link** and **Confirm sign up** templates both contain the six-box `{{ .Token }}` email, request a fresh code, and confirm the code auto-submits after six digits.

Required behavior:

- Users register with Supabase email OTP, then create a password for email/password login.
- Sign Up must only continue for new accounts. Existing account emails must not enter onboarding, update passwords from the signup path, create duplicate profile rows, or silently route to the dashboard.
- Duplicate-email signup copy: `This email already has a Konektado account. Please log in instead.` Actions: `Go to Log In` and `Forgot password?`.
- Do not require custom SMTP for the MVP. Supabase's default email sender is acceptable for local/demo testing.
- The Supabase Auth email templates used by the signup OTP path must include `{{ .Token }}` so users receive a 6-digit code. Supabase Auth OTP length must be configured to 6 digits. For MVP signup, the app uses `signInWithOtp`; keep both **Magic Link** and **Confirm sign up** templates aligned.
- The Supabase Auth **Password Recovery** template must also include `{{ .Token }}` and should avoid link-only copy, because the app verifies recovery through a six-box code entry flow.
- In app code, verify signup email codes only through the auth service. Keep the request/resend/verify methods on Supabase email OTP/passwordless auth.
- Do not require SMS OTP, mobile OTP, or an SMS gateway for the MVP.
- Phone-first authentication can be revisited later when provider access and Android/device testing are available.
- Email is used for login, verification updates, support, and account recovery.

Current duplicate-email protection:

- Server-side check: `supabase/functions/signup-email-check` uses the service role on the backend to check for an existing `profiles.email` or completed Supabase Auth user during an explicit signup attempt. Service-role keys must never be placed in mobile/client code.
- Client-side fallback: after signup OTP verification, the app checks whether the returned session already has profile, role, or onboarding preference rows. If so, it signs out immediately and shows the duplicate-email message.
- In-progress signup exception: Auth users with `user_metadata.signup_password_required = true` are treated as incomplete signup attempts rather than completed accounts, so they can still continue the OTP-to-password flow.
- Remaining risk: the auth-admin check pages through recent users and is intended for MVP/demo scale. If user volume grows, replace it with a dedicated server-side lookup path.
- Barangay verification email updates are custom transactional emails sent from backend code, not Supabase Auth templates. Keep them separate from the OTP auth templates.
- App stores sessions through Supabase's React Native auth storage.
- Screens must use an auth/session hook or service, not direct auth logic in every screen.
- The global splash should appear only for initial app boot/font/session hydration. Auth and onboarding transitions should keep the current screen visible while status reloads, then route when settled.
- App data must be protected with PostgreSQL Row Level Security.
- Authentication alone does not grant full marketplace interaction. Barangay verification is required first, and public role-profile completion is required before posting, messaging, hiring, applying/expressing interest, or reviewing.

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
- Client intent opens Services.
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

## Public Profile Completion Gate

Barangay verification proves the account belongs to a real resident. Public profile completion proves the resident has enough visible context for another person to safely start a marketplace interaction.

Completion layers:

- Core Profile: public name, preferred contact method, barangay/city, approximate address, private house number or block/lot for admin/private coordination, intro, and availability.
- Work Profile: worker headline, bio, official taxonomy services, separate custom "Others / Specify" services, service area, availability, rate range/type, and optional rate note.
- Hiring Profile: client headline, bio, official taxonomy services needed, separate custom "Others / Specify" services, preferred schedule, and optional budget preference.

Verified/setup state:

- `Unverified`: may browse public content but cannot interact.
- `Verified · Setup incomplete`: still shows verified identity status and may browse public content, but gated actions route to Complete Profile.
- `Ready`: verified plus the relevant Work or Hiring Profile is complete for the attempted action.

Action gates:

- Publishing jobs requires barangay verification plus a completed Hiring Profile.
- Messaging workers about service posts requires barangay verification plus a completed Hiring Profile.
- Publishing services requires barangay verification plus a completed Work Profile.
- Messaging clients about jobs requires barangay verification plus a completed Work Profile.
- Sending messages in an existing conversation checks the sender's role in that conversation and applies the matching Work/Hiring Profile gate.
- Marking a worker hired requires the client to remain verified and Hiring Profile complete.
- Leaving a review requires verification, relevant role setup, and a completed/confirmed job relationship.

Private verification files, ID uploads, selfie files, certificates, and admin notes must not be copied into public profile fields or used as public profile photos. A public profile photo is strongly recommended for recognition and trust, but remains optional and does not gate MVP actions.

## Role-Based Permissions

| Resource/Action               | Provider                      | Client                  | Barangay Admin                 |
| ----------------------------- | ----------------------------- | ----------------------- | ------------------------------ |
| Read own profile              | Yes                           | Yes                     | Yes                            |
| Update own profile            | Yes                           | Yes                     | Yes                            |
| Read public provider profiles | Yes                           | Yes                     | Yes                            |
| Create service profile        | Yes, after Work Profile       | No                      | No, unless acting as provider  |
| Update own service profile    | Yes                           | No                      | No, unless owner               |
| Create job                    | No, unless active client role | Yes, after Hiring Profile | No, unless acting as client    |
| Browse open jobs              | Yes                           | Yes                     | Yes                            |
| Message about job/service     | Yes, after Work Profile       | Yes, after Hiring Profile | Admin read only for moderation |
| Mark worker hired for own job | No                            | Yes                     | Admin read only for moderation |
| Submit verification request   | Yes                           | Optional                | No                             |
| Approve/reject verification   | No                            | No                      | Yes                            |
| Create review                 | Yes, if job participant       | Yes, if job participant | No, unless job participant     |
| Create report                 | Yes                           | Yes                     | Yes                            |
| Moderate reports              | No                            | No                      | Yes                            |

These role permissions apply after the user's barangay verification is approved and the relevant public role profile is complete. Before approval, the stricter unverified viewer rules apply.

## Resource Rules

| Resource                | Read Rules                                                                                                                                     | Create Rules                                     | Update Rules                                                                                       | Delete Rules                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `profiles`              | Owner can read full profile. Public users can read safe public fields. Admin can read needed fields.                                           | Created for authenticated user.                  | Owner can update editable fields. Admin can update verification fields only through admin service. | Hard delete should be admin-only or handled through account deletion.        |
| `user_roles`            | Owner can read own roles. Admin can read roles.                                                                                                | Users can add client/provider role for self.     | Owner can switch active client/provider role. Admin role is protected.                             | Admin-only or restricted.                                                    |
| `services`              | Authenticated viewers can read active public services. Owner can read all own services. Admin can read for moderation.                         | Verified provider owner with completed Work Profile only. | Verified provider owner only. Admin can hide/moderate if needed.                                   | Provider owner can delete own services if no required history depends on it. |
| `credentials`           | Owner and admin can read. Public cannot read private files.                                                                                    | Provider owner only.                             | Provider owner can update metadata. Admin can update review status.                                | Owner can delete unused credentials. Admin can hide for moderation.          |
| `verification_requests` | Owner and admin can read.                                                                                                                      | Owner can create own request.                    | Admin approves/rejects. Owner can cancel pending request.                                          | Avoid hard delete; use status.                                               |
| `jobs`                  | Open jobs are readable by authenticated viewers. Owner can read own jobs. Admin can read for moderation.                                       | Verified client owner with completed Hiring Profile only. | Verified job owner can edit own open job. Admin can moderate.                                      | Prefer status `cancelled` or `closed`; hard delete owner/admin only if safe. |
| `job_drafts`            | Owner can read own drafts only.                                                                                                                | Authenticated owner, verified or unverified.     | Owner can update own drafts.                                                                       | Owner can delete own drafts.                                                |
| `conversations`         | Participants can read their own conversations. Job owner can read conversations tied to own jobs. Admin can read for moderation when reported. | Verified user with relevant role profile only.   | Participants can archive/decline where allowed. Job owner can mark hired.                          | Prefer status changes.                                                       |
| `messages`              | Conversation participants only. Admin can read only for moderation/report workflows.                                                           | Verified sender with relevant role profile only. | Avoid editing messages in MVP.                                                                     | Prefer archive/report over hard delete.                                      |
| `reviews`               | Public can read approved public reviews.                                                                                                       | Verified job participants only after completion. | Reviewer can edit own review if allowed. Admin can hide/moderate reported reviews.                 | Avoid hard delete; admin moderation preferred.                               |
| `reports`               | Reporter can read own report. Admin can read all.                                                                                              | Authenticated users.                             | Admin updates status.                                                                              | Admin-only.                                                                  |
| `admin_moderation_actions` | Barangay admins only. Normal users cannot read admin reasons, notes, or history.                                                            | Barangay admins only.                            | Barangay admins only.                                                                              | Avoid hard delete; preserve audit history.                                   |
| `content_visibility`    | Barangay admins can read full rows. Public app clients use only a safe visibility view without admin notes/reasons.                             | Barangay admins only.                            | Barangay admins only.                                                                              | Avoid hard delete; use `visible`/`hidden`.                                   |

## Admin Rules

- Admin status must come from `user_roles.role = 'barangay_admin'` or a protected server-side claim.
- Users must not be able to assign themselves admin role.
- Admin actions should be routed through `AdminService`.
- Admin review decisions must store reviewer ID and timestamp.
- Admins should see only the data needed for verification or moderation.
- Public photo moderation is limited to public profile avatars, public job photos, and public service photos.
- Photo Flag writes an admin moderation action and keeps public visibility unchanged.
- Photo Hide writes an admin moderation action and sets content visibility to `hidden`; public screens must stop rendering the image.
- Photo Clear writes an admin moderation action and sets content visibility back to `visible`.
- Public photo moderation does not physically delete storage files in the current phase.
- Public job/service photo storage owners may delete only their own staged objects so cancelled edits and failed database saves can clean up uploaded files.
- Admin moderation reasons and notes must never be exposed in normal public app queries.

## Verification Rules

- Barangay verification is not automatic.
- A user can submit a pending verification request with required files and required barangay details.
- Only barangay admins can approve or reject.
- Approval sets the user/profile verification indicator.
- Rejection stores a reason or note.
- Public UI should not show repeated verification badges on feed cards, search cards, Job Details, or selected service detail screens for MVP. Verification copy belongs in gated-action states, verification/onboarding screens, and owner-facing status surfaces; private files are never exposed publicly.
- Verification is the identity gate for user-to-user interaction features; Work/Hiring Profile completion is the public-context gate before posting or messaging.
- The verification page is where heavier requirements belong: contact confirmation, email confirmation, optional phone number, ID, services, credentials, selfie/photo for manual comparison, and supporting details.
- Verification contact details should reuse onboarding/profile values instead of asking the user to retype them.
- First name and last name are the current verified/legal-name fields. They can be edited normally only before the user submits for barangay verification.
- After a verification request is submitted, the verified/legal name is locked in the profile UI, verification UI, service layer, and database trigger. Pending, approved, and rejected users cannot silently change it through generic profile updates.
- Barangay admins should use `Needs Correction` when a submitted name looks like an honest mismatch with the ID or barangay record. The reason `Name does not match submitted ID` allows the resident to correct their name during the controlled resubmission flow.
- Barangay admins should use `Rejected` only for suspicious, fake, invalid, or unrelated identity documents.
- Internal demo/admin-only tooling may override names for presentation data or explicit admin correction, but normal users must not access that pathway.
- Email is private and used for login, verification updates, support, and account recovery.

## Public vs Private Data

Public marketplace/profile screens must read profile identity through the safe public profile summary RPC, not by selecting directly from `profiles`. Direct full-row `profiles` reads are reserved for the profile owner, barangay admins, and explicitly guarded internal tooling. Public profile summaries expose a computed public location label only; raw street, subdivision/area, and purok/sitio fields stay out of public profile summary responses.

Public-safe provider fields:

- Display name.
- Approximate profile location label such as barangay and city.
- Public profile headline and bio.
- Offered or needed service categories.
- Service area and preferred schedule text.
- Service categories and descriptions.
- Availability text.
- Public rating summary.
- Product-approved verification/access-gate copy where needed; do not repeat public verification badges on MVP feed, search, or detail surfaces.
- Public credential labels if approved and safe.

Private or restricted fields:

- Birthdate.
- Full street address, house number, and block/lot.
- Phone number, unless user chooses to expose it or after accepted job contact flow.
- ID files.
- Certificate file URLs.
- Admin notes.
- Report details.
- Raw auth metadata.
- Private job location notes or meetup/address instructions.
- Admin moderation reasons, notes, and internal action history.

Discovery privacy rules:

- General Home, Search, browsing, and message/apply discovery hide the current user's own public jobs/services.
- Public Home and Search discovery show only active/open marketplace content owned by barangay-verified users. Pending, rejected, or otherwise unverified users' jobs/services remain hidden from public discovery even if a seed/script accidentally leaves the row active.
- Owner surfaces such as My Posts, Manage Posts, and Profile activity still show the user's own content.
- Public job/service cards and details must use shared rate-range formatting and approximate location only.
- Custom "Others / Specify" services are stored separately from official taxonomy values and can be marked for barangay/admin review so taxonomy filters continue to work.
- Hidden public photos must be filtered before rendering public profile avatars, job photos, service photos, feed cards, search cards, and detail galleries. Hidden profile photos should fall back to initials/default avatars.

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
