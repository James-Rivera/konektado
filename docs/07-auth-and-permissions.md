# Auth and Permissions

## Authentication

Konektado uses Supabase Auth for MVP authentication.

Required behavior:

- Users preferably register and log in with a mobile number/OTP-style flow for low-friction entry.
- Email can be collected later during verification as an optional or recommended contact field.
- App stores sessions through Supabase's React Native auth storage.
- Screens must use an auth/session hook or service, not direct auth logic in every screen.
- App data must be protected with PostgreSQL Row Level Security.
- Authentication alone does not grant full marketplace interaction. Barangay verification is required for posting, applying, messaging, and reviewing.

## Unverified Viewer Mode

New users should be allowed into the app quickly after registration and basic role selection. Until barangay verification is approved, they are unverified viewers.

Unverified viewers can:

- Browse limited public jobs, workers, and service posts.
- Read educational prompts about verification and safe marketplace use.
- View their own profile and verification status.
- Submit or resubmit a verification request.
- Report a safety concern if reporting is enabled for viewers.

Unverified viewers cannot:

- Post jobs.
- Create public skill/service profiles or service posts.
- Apply to jobs.
- Message users.
- Leave reviews.
- Appear as verified users in public search.
- Access admin screens.

## Role-Based Permissions

| Resource/Action | Provider | Client | Barangay Admin |
| --- | --- | --- | --- |
| Read own profile | Yes | Yes | Yes |
| Update own profile | Yes | Yes | Yes |
| Read public provider profiles | Yes | Yes | Yes |
| Create skill profile | Yes | No | No, unless acting as provider |
| Update own skill profile | Yes | No | No, unless owner |
| Create job | No, unless active client role | Yes | No, unless acting as client |
| Browse open jobs | Yes | Yes | Yes |
| Apply to job | Yes | No | No, unless acting as provider |
| Review applications for own job | No | Yes | Admin read only for moderation |
| Submit verification request | Yes | Optional | No |
| Approve/reject verification | No | No | Yes |
| Create review | Yes, if job participant | Yes, if job participant | No, unless job participant |
| Create report | Yes | Yes | Yes |
| Moderate reports | No | No | Yes |

These role permissions apply after the user's barangay verification is approved. Before approval, the stricter unverified viewer rules apply.

## Resource Rules

| Resource | Read Rules | Create Rules | Update Rules | Delete Rules |
| --- | --- | --- | --- | --- |
| `profiles` | Owner can read full profile. Public users can read safe public fields. Admin can read needed fields. | Created for authenticated user. | Owner can update editable fields. Admin can update verification fields only through admin service. | Hard delete should be admin-only or handled through account deletion. |
| `user_roles` | Owner can read own roles. Admin can read roles. | Users can add client/provider role for self. | Owner can switch active client/provider role. Admin role is protected. | Admin-only or restricted. |
| `skills` | Authenticated viewers can read active public skills. Owner can read all own skills. Admin can read for moderation. | Verified provider owner only. | Verified provider owner only. Admin can hide/moderate if needed. | Provider owner can delete own skills if no required history depends on it. |
| `credentials` | Owner and admin can read. Public cannot read private files. | Provider owner only. | Provider owner can update metadata. Admin can update review status. | Owner can delete unused credentials. Admin can hide for moderation. |
| `verification_requests` | Owner and admin can read. | Owner can create own request. | Admin approves/rejects. Owner can cancel pending request. | Avoid hard delete; use status. |
| `jobs` | Open jobs are readable by authenticated viewers. Owner can read own jobs. Admin can read for moderation. | Verified client owner only. | Verified job owner can edit own open job. Admin can moderate. | Prefer status `cancelled` or `closed`; hard delete owner/admin only if safe. |
| `job_applications` | Verified provider can read own applications. Job owner can read applications to own jobs. Admin can read for moderation. | Verified provider only. | Verified provider can withdraw own. Job owner can accept/reject. | Prefer status changes. |
| `reviews` | Public can read approved public reviews. | Verified job participants only after completion. | Reviewer can edit own review if allowed. Admin can hide/moderate reported reviews. | Avoid hard delete; admin moderation preferred. |
| `reports` | Reporter can read own report. Admin can read all. | Authenticated users. | Admin updates status. | Admin-only. |
| `messages` | Sender and recipient only. | Sender only. | Sender can edit/delete only if feature supports it. | Sender/admin based on moderation rules. |

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
- The verification page is where heavier requirements belong: mobile/contact confirmation, optional email, ID, skills/services, credentials, selfie/photo for manual comparison, and supporting details.
- Verification contact details should reuse onboarding/profile values instead of asking the user to retype them.
- First name and last name can be edited during verification only to correct mismatches with the user's ID.
- Email collected during verification is private and used for verification updates, support, account recovery, and future login support if implemented.

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
