# Data Model

This is the target PostgreSQL-style data model for the MVP. Supabase Auth owns account authentication, while public app data lives in PostgreSQL tables under the app schema.

Current prototype note: the repo already has `profiles`, `user_roles`, `provider_profiles`, `client_profiles`, `jobs`, and `job_applications` migrations. This document is the source of truth for the next stable schema. Existing fields like `provider_profiles.service_type` can be migrated into the `skills` table when the skill profile feature is expanded.

## Common Types

Recommended enum values can be implemented as PostgreSQL enums or `text check` constraints.

| Type | Values |
| --- | --- |
| `app_role` | `client`, `provider`, `barangay_admin` |
| `verification_status` | `pending`, `approved`, `rejected`, `cancelled` |
| `job_status` | `open`, `in_progress`, `completed`, `closed`, `cancelled` |
| `application_status` | `applied`, `shortlisted`, `accepted`, `rejected`, `withdrawn` |
| `report_status` | `open`, `reviewing`, `resolved`, `dismissed` |

## users

Purpose: Account identity managed by Supabase Auth. Do not create or update this table directly from app screens.

Supabase table: `auth.users`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, used as foreign key in app tables. |
| `email` | `text` | User login email. |
| `phone` | `text` | Optional, if enabled in Supabase Auth. |
| `created_at` | `timestamptz` | Account creation time. |

Relationships:

- `profiles.id` references `auth.users.id`.

Important constraints:

- App code should access current user through Supabase Auth methods.
- Do not store passwords in app tables.

## profiles

Purpose: Shared user profile and resident identity details.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. References `auth.users(id)` on delete cascade. |
| `email` | `text` | Cached email for display/admin search. |
| `first_name` | `text` | Required after onboarding. |
| `last_name` | `text` | Required after onboarding. |
| `full_name` | `text` | Public name fallback built from first and last name. |
| `birthdate` | `date` | Private or limited visibility. |
| `barangay` | `text` | Default should be `San Pedro` for MVP. |
| `street_address` | `text` | Private or limited visibility. |
| `city` | `text` | City/municipality. |
| `phone` | `text` | Private by default; visible only when user chooses or after job acceptance. |
| `about` | `text` | Public profile summary. |
| `avatar_url` | `text` | Optional storage URL. |
| `active_role` | `app_role` | Current app mode. |
| `barangay_verified_at` | `timestamptz` | Set when admin approves barangay verification. |
| `created_at` | `timestamptz` | Default `now()`. |
| `updated_at` | `timestamptz` | Updated on profile change. |

Relationships:

- One profile belongs to one auth user.
- One profile can have many roles, skills, jobs, applications, reviews, reports, and verification requests.

Important constraints:

- `id` must equal `auth.uid()` for owner writes.
- Public search should not expose birthdate, full street address, or private phone by default.
- `barangay_verified_at` should only be written by admin verification actions.

## user_roles

Purpose: Allows a user to act as a client, provider, or barangay admin.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, default `gen_random_uuid()`. |
| `user_id` | `uuid` | References `profiles(id)` on delete cascade. |
| `role` | `app_role` | Role name. |
| `is_active` | `boolean` | Whether this is the active role. |
| `created_at` | `timestamptz` | Default `now()`. |

Relationships:

- Many roles can belong to one profile.

Important constraints:

- Unique `(user_id, role)`.
- Only one active non-admin user role should be active at a time.
- `barangay_admin` assignment must be admin-only or manual in Supabase.

## skills

Purpose: Provider service profile entries shown in search and provider profiles.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `provider_id` | `uuid` | References `profiles(id)` on delete cascade. |
| `category` | `text` | Example: cleaning, hauling, plumbing, tutoring. |
| `title` | `text` | Short service title. |
| `description` | `text` | Service details. |
| `years_experience` | `numeric` | Optional. |
| `availability_text` | `text` | Example: weekends, afternoon, on call. |
| `rate_text` | `text` | Optional public text; not an in-app payment record. |
| `is_active` | `boolean` | Default `true`. |
| `created_at` | `timestamptz` | Default `now()`. |
| `updated_at` | `timestamptz` | Updated on edit. |

Relationships:

- A provider can have many skills.
- Credentials can optionally connect to a skill.

Important constraints:

- Only provider owner can create/update/delete their skills.
- Public queries should only show active skills.
- `category` and `title` are required.

## credentials

Purpose: Metadata for certificates, IDs, and proof-of-experience files.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `provider_id` | `uuid` | References `profiles(id)` on delete cascade. |
| `skill_id` | `uuid` | Nullable reference to `skills(id)` on delete set null. |
| `credential_type` | `text` | `id_front`, `id_back`, `certificate`, `experience`, `other`. |
| `title` | `text` | User-facing label. |
| `issuer` | `text` | Optional issuing school, agency, company, or person. |
| `issued_at` | `date` | Optional. |
| `file_path` | `text` | Supabase Storage path. |
| `status` | `verification_status` | Default `pending` if submitted for review. |
| `created_at` | `timestamptz` | Default `now()`. |

Relationships:

- Belongs to provider.
- Optionally belongs to a skill.
- Can be linked to a verification request through `verification_files`.

Important constraints:

- Only owner and admins can read private credential files.
- Public profile may show credential title/status, not private ID file URLs.

## verification_requests

Purpose: Barangay verification workflow for residents/providers.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | References `profiles(id)` on delete cascade. |
| `request_type` | `text` | `barangay_identity`, `provider_skill`, or `other`. |
| `status` | `verification_status` | Default `pending`. |
| `submitted_note` | `text` | Optional note from resident. |
| `reviewer_id` | `uuid` | Nullable reference to admin profile. |
| `reviewer_note` | `text` | Admin note shown after review if appropriate. |
| `created_at` | `timestamptz` | Default `now()`. |
| `reviewed_at` | `timestamptz` | Set on approval/rejection. |
| `updated_at` | `timestamptz` | Updated on change. |

Relationships:

- A user can have many verification requests over time.
- One request can have many files.

Important constraints:

- Only owner can create their own request.
- Only barangay admins can approve/reject.
- Consider a partial unique index to prevent multiple pending requests of the same type per user.

## verification_files

Purpose: Link uploaded files or credentials to a verification request.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `verification_request_id` | `uuid` | References `verification_requests(id)` on delete cascade. |
| `credential_id` | `uuid` | Nullable reference to `credentials(id)` on delete set null. |
| `file_type` | `text` | `id_front`, `id_back`, `certificate`, `experience`, `other`. |
| `file_path` | `text` | Storage path if not using `credentials`. |
| `created_at` | `timestamptz` | Default `now()`. |

Relationships:

- Belongs to one verification request.

Important constraints:

- Required ID front and ID back for barangay identity verification.
- File access must be private to owner and admins.

## jobs

Purpose: Client-posted work opportunities.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `client_id` | `uuid` | References `profiles(id)` on delete cascade. |
| `title` | `text` | Required. |
| `description` | `text` | Required for useful matching. |
| `category` | `text` | Optional but recommended. |
| `barangay` | `text` | Default `San Pedro`. |
| `location_text` | `text` | Human-readable location. |
| `budget_amount` | `numeric` | Optional. |
| `schedule_text` | `text` | Optional. |
| `status` | `job_status` | Default `open`. |
| `accepted_provider_id` | `uuid` | Nullable reference to provider profile. |
| `created_at` | `timestamptz` | Default `now()`. |
| `updated_at` | `timestamptz` | Updated on edit. |
| `closed_at` | `timestamptz` | Set when completed/closed/cancelled. |

Relationships:

- One client can create many jobs.
- One job can have many applications.
- One job can have reviews after completion.

Important constraints:

- Only client owner can edit own open jobs.
- New applications allowed only when status is `open`.
- Budget is informational only; payment is outside the app.

## job_applications

Purpose: Provider applications to client jobs.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `job_id` | `uuid` | References `jobs(id)` on delete cascade. |
| `provider_id` | `uuid` | References `profiles(id)` on delete cascade. |
| `message` | `text` | Optional application note. |
| `status` | `application_status` | Default `applied`. |
| `created_at` | `timestamptz` | Default `now()`. |
| `updated_at` | `timestamptz` | Updated on status change. |

Relationships:

- Belongs to one job.
- Belongs to one provider.

Important constraints:

- Unique `(job_id, provider_id)`.
- Provider cannot apply to own job.
- Only job owner can accept/reject.
- Provider can withdraw own application before final decision.

## reviews

Purpose: Ratings and feedback after completed jobs.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `job_id` | `uuid` | References `jobs(id)` on delete cascade. |
| `reviewer_id` | `uuid` | References `profiles(id)` on delete cascade. |
| `reviewee_id` | `uuid` | References `profiles(id)` on delete cascade. |
| `rating` | `smallint` | Required, 1 to 5. |
| `comment` | `text` | Optional. |
| `created_at` | `timestamptz` | Default `now()`. |
| `updated_at` | `timestamptz` | Updated on edit. |

Relationships:

- Belongs to a job.
- Connects reviewer and reviewee profiles.

Important constraints:

- `rating` must be between 1 and 5.
- Unique `(job_id, reviewer_id, reviewee_id)`.
- Reviews allowed only for users connected to the completed job.

## reports

Purpose: Optional MVP moderation queue for unsafe users, jobs, applications, or reviews.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `reporter_id` | `uuid` | References `profiles(id)` on delete set null. |
| `target_type` | `text` | `user`, `job`, `application`, `review`, `message`. |
| `target_id` | `uuid` | ID of reported record. |
| `reason` | `text` | Required short reason. |
| `details` | `text` | Optional explanation. |
| `status` | `report_status` | Default `open`. |
| `reviewed_by` | `uuid` | Nullable admin profile ID. |
| `created_at` | `timestamptz` | Default `now()`. |
| `reviewed_at` | `timestamptz` | Set after admin action. |

Relationships:

- Reporter is a profile.
- Target is polymorphic by `target_type` and `target_id`.

Important constraints:

- Users can create reports.
- Admins can read/update report status.
- Public users cannot browse all reports.

## messages

Purpose: Optional/deferred direct messaging. MVP may use external communication instead.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `job_id` | `uuid` | Nullable reference to `jobs(id)` on delete set null. |
| `sender_id` | `uuid` | References `profiles(id)` on delete cascade. |
| `recipient_id` | `uuid` | References `profiles(id)` on delete cascade. |
| `body` | `text` | Message text. |
| `read_at` | `timestamptz` | Nullable. |
| `created_at` | `timestamptz` | Default `now()`. |

Relationships:

- Sender and recipient are profiles.
- Message may be connected to a job.

Important constraints:

- Only sender and recipient can read the message.
- Keep deferred unless the MVP timeline supports it.
- External SMS/Messenger/contact flow is acceptable for MVP.
