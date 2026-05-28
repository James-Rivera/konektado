# Data Model

This is the target PostgreSQL-style data model for the MVP. Supabase Auth owns account authentication, while public app data lives in PostgreSQL tables under the app schema.

Current implementation note: the first Supabase migration lives at `supabase/migrations/20260503001433_initial_app_schema.sql`. It creates the database surface the current app already calls during onboarding: `profiles`, `user_roles`, `provider_profiles`, `client_profiles`, `verifications`, `verification_files`, `jobs`, and the `verification-files` storage bucket. `supabase/migrations/20260503013000_user_preferences.sql` adds the lightweight taste setup table used before viewer entry. `supabase/migrations/20260503023000_marketplace_mvp.sql` adds the functional marketplace MVP surface: `services`, `conversations`, `messages`, `saved_items`, `reviews`, job compatibility fields, admin verification review policies, and verification-gated RLS for posting/messaging/reviews. `supabase/migrations/20260504100000_add_service_needed_to_jobs.sql` adds structured service-needed storage for public jobs and private drafts. `supabase/migrations/20260504103000_job_photos.sql` adds public job-photo storage and photo URL arrays for draft and published posts. `supabase/migrations/20260509103000_profile_completion_model.sql` adds public role-profile completion fields to `provider_profiles` and `client_profiles`. `supabase/migrations/20260513120000_adviser_marketplace_refinements.sql` adds split address fields, profile contact method, job/service rate ranges, private job location notes, experience/certification metadata, and custom service review status. `supabase/migrations/20260514100000_profile_address_split_fields.sql` adds province, subdivision/area, and landmark/address note for cleaner address privacy. `supabase/migrations/20260514120000_user_preferences_offered_delivery_mode.sql` stores provider onboarding work setup separately from service taxonomy values. `supabase/migrations/20260515120000_profile_builder_credentials_and_ranges.sql` adds optional credential metadata/storage access, separates negotiable flags from rate/budget type, and requires valid numeric min/max ranges for published/open marketplace rows. `supabase/migrations/20260515130000_profile_photos.sql` adds the public profile-photo bucket with owner-scoped writes for strongly recommended shared identity photos. `supabase/migrations/20260517110000_in_app_notifications.sql` adds owner-readable in-app notifications plus server-side creation triggers for messages, verification decisions, completed hired jobs, and report status updates. `supabase/migrations/20260519120000_canonical_rate_ranges_cleanup.sql` backfills legacy fixed-rate rows into canonical ranges where possible and marks fixed-rate columns deprecated. `supabase/migrations/20260519130000_expand_rate_type_pricing_units.sql` expands supported pricing units for demo-realistic rate range display. `supabase/migrations/20260526090000_public_photo_moderation.sql` adds backend-backed public photo moderation history and public-safe content visibility state.

## Common Types

Recommended enum values can be implemented as PostgreSQL enums or `text check` constraints.

| Type | Values |
| --- | --- |
| `app_role` | `client`, `provider`, `barangay_admin` |
| `verification_status` | `pending`, `approved`, `rejected`, `needs_more_info`, `cancelled`, `skipped` |
| `job_status` | `open`, `reviewing`, `in_progress`, `completed`, `closed`, `cancelled` |
| `conversation_status` | `active`, `hired`, `declined`, `archived`, `reported` |
| `rate_type` | `per_service`, `hourly`, `daily`, `weekly`, `per_project` |
| `experience_level` | `any`, `beginner`, `intermediate`, `experienced` |
| `custom_service_review_status` | `none`, `pending`, `approved`, `rejected` |
| `saved_item_type` | `job`, `provider` |
| `report_status` | `open`, `reviewing`, `resolved`, `dismissed` |
| `moderation_target_type` | `photo`, `user`, `job`, `service`, `report` |
| `photo_source_type` | `profile_photo`, `job_photo`, `service_photo` |
| `moderation_action` | `flag`, `hide`, `clear` |
| `content_visibility` | `visible`, `hidden` |

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
| `province` | `text` | Fixed to `Batangas` for the current service area. |
| `barangay` | `text` | Fixed raw value `San Pedro` for MVP; display as `Brgy. San Pedro`. |
| `purok_sitio` | `text` | Legacy optional field kept for backward compatibility; not exposed directly in public profile summaries. |
| `street` | `text` | Area / street / purok / sitio detail for owner/admin profile context; not exposed directly in public profile summaries. |
| `subdivision_area` | `text` | Additional area detail for owner/admin profile context; not exposed directly in public profile summaries. |
| `block_lot` | `text` | Private/admin-only address detail. |
| `house_number` | `text` | Private/admin-only house number or building name. |
| `landmark_note` | `text` | Private/admin-only landmark or note. |
| `street_address` | `text` | Private or limited visibility. |
| `city` | `text` | Fixed to `Santo Tomas` for the current service area. |
| `preferred_contact_method` | `text` | `app_message`, `phone`, or `email`; public contact data still stays private by default. |
| `phone` | `text` | Private by default; visible only when user chooses or after job acceptance. |
| `about` | `text` | Public profile summary. |
| `availability` | `text` | Public availability or response expectation. |
| `avatar_url` | `text` | Optional public profile-photo storage URL; strongly recommended for recognition, never sourced from private verification files. |
| `active_role` | `app_role` | Current app mode. |
| `barangay_verified_at` | `timestamptz` | Set when admin approves barangay verification. |
| `created_at` | `timestamptz` | Default `now()`. |
| `updated_at` | `timestamptz` | Updated on profile change. |

Relationships:

- One profile belongs to one auth user.
- One profile can have many roles, services, jobs, conversations, reviews, reports, saved items, and verification requests.

Important constraints:

- `id` must equal `auth.uid()` for owner writes.
- Public search should not expose birthdate, full street address, house number, block/lot, landmark/address note, private phone/contact data, ID URLs, credential URLs, or verification document fields.
- Public profile search/cards may show only a safe computed location label such as barangay/city. Raw street, subdivision/area, purok/sitio, house number, block/lot, landmark/address notes, private contact data, and verification document fields must not be exposed through public profile summaries.
- `barangay_verified_at` should only be written by admin verification actions.
- Verification selfie, ID files, certificates, and admin notes must never be copied into public profile fields or `avatar_url`.

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

## user_preferences

Purpose: Lightweight onboarding preferences used to personalize viewer-mode browsing before full barangay verification.

| Field | Type | Notes |
| --- | --- | --- |
| `user_id` | `uuid` | Primary key. References `profiles(id)` on delete cascade. |
| `intent` | `text` | `client`, `provider`, or `both`. |
| `offered_delivery_mode` | `text` | Nullable provider work setup: `on_site`, `online`, or `both`. |
| `offered_services` | `text[]` | Services a worker can offer. |
| `needed_services` | `text[]` | Help a client may need nearby. |
| `custom_offered_services` | `text[]` | Free-text offered services from onboarding. |
| `custom_needed_services` | `text[]` | Free-text needed services from onboarding. |
| `onboarding_completed_at` | `timestamptz` | Set when first onboarding is complete. |
| `created_at` | `timestamptz` | Default `now()`. |
| `updated_at` | `timestamptz` | Updated on change. |

Important constraints:

- One row per user.
- Owner can select, insert, and update only their own preferences.
- These preferences are first-party personalization data, not verification proof.
- Provider work setup is separate from service taxonomy values. It filters category/service selection but must not be mixed into `offered_services`.
- For provider and both-role users, `provider_profiles.service_type` is seeded from offered services until the future `services` table is fully built.

## provider_profiles

Purpose: Role-specific public Work Profile completion details.

| Field | Type | Notes |
| --- | --- | --- |
| `user_id` | `uuid` | Primary key. References `profiles(id)` on delete cascade. |
| `service_type` | `text` | Legacy/onboarding service summary, currently comma-separated. |
| `headline` | `text` | Public worker headline shown in Profile trust surfaces. |
| `bio` | `text` | Public worker bio. |
| `service_area` | `text` | Public area where the provider can work. |
| `availability` | `text` | Public work availability. |
| `rate_text` | `text` | Optional public rate note only; not parsed as pricing. |
| `rate_min` | `numeric` | Required public minimum rate once Work Profile is complete. |
| `rate_max` | `numeric` | Required public maximum rate once Work Profile is complete; must be greater than or equal to `rate_min`. |
| `rate_type` | `text` | Pricing unit such as `per_service`, `hourly`, `daily`, `weekly`, `per_project`, `per_job`, `per_visit`, `per_load`, `per_order`, `per_meal`, or `per_session`. Negotiability is stored separately. |
| `rate_negotiable` | `boolean` | Optional signal that the provider is open to negotiation within the required range. |
| `custom_offered_services` | `text[]` | Free-text "Others / Specify" values, separate from official taxonomy values. |
| `custom_service_review_status` | `text` | Barangay/admin review status for custom offered services. |
| `response_time` | `text` | Optional response expectation. |
| `profile_completed_at` | `timestamptz` | Set when Work Profile required fields are complete. |
| `created_at` | `timestamptz` | Default `now()`. |
| `updated_at` | `timestamptz` | Updated on change. |

Important constraints:

- Owner can read, insert, and update only their own Work Profile.
- Work Profile completion is required before publishing service posts or messaging clients about jobs.
- Credentials and private verification files are separate from this public profile row.
- A completed Work Profile must use a valid numeric rate range: `rate_min > 0` and `rate_max >= rate_min`.

## client_profiles

Purpose: Role-specific public Hiring Profile completion details.

| Field | Type | Notes |
| --- | --- | --- |
| `user_id` | `uuid` | Primary key. References `profiles(id)` on delete cascade. |
| `headline` | `text` | Public client headline shown in Profile trust surfaces. |
| `bio` | `text` | Public client intro. |
| `needed_services` | `text[]` | Public services the client usually needs. |
| `custom_needed_services` | `text[]` | Free-text "Others / Specify" values, separate from official taxonomy values. |
| `preferred_schedule` | `text` | Public schedule or coordination preference. |
| `budget_preference` | `text` | Optional public budget expectation. |
| `profile_completed_at` | `timestamptz` | Set when Hiring Profile required fields are complete. |
| `created_at` | `timestamptz` | Default `now()`. |
| `updated_at` | `timestamptz` | Updated on change. |

Important constraints:

- Owner can read, insert, and update only their own Hiring Profile.
- Hiring Profile completion is required before publishing jobs or messaging workers about service posts.
- Onboarding `user_preferences.needed_services` may backfill this row, but preferences remain personalization data rather than verification proof.

## services

Purpose: Provider service profile entries shown in search and provider profiles.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `provider_id` | `uuid` | References `profiles(id)` on delete cascade. |
| `category` | `text` | Selected service label from the controlled MVP taxonomy, such as `Cleaning`, `Canva layout`, or `Computer setup`. |
| `title` | `text` | Short service title. |
| `description` | `text` | Service details. |
| `years_experience` | `numeric` | Optional. |
| `availability_text` | `text` | Example: weekends, afternoon, on call. |
| `rate_text` | `text` | Optional public note only; not an in-app payment record and not parsed as pricing. |
| `rate_min` | `numeric` | Required minimum rate for active service posts. |
| `rate_max` | `numeric` | Required maximum rate for active service posts; constrained so min is not greater than max. |
| `rate_type` | `text` | Pricing unit such as `per_service`, `hourly`, `daily`, `weekly`, `per_project`, `per_job`, `per_visit`, `per_load`, `per_order`, `per_meal`, or `per_session`. Negotiability is stored separately. |
| `rate_negotiable` | `boolean` | Optional signal that the provider is open to negotiation within the required range. |
| `experience_level` | `text` | `any`, `beginner`, `intermediate`, or `experienced`. |
| `certification_available` | `boolean` | Safe public metadata only. Do not expose document URLs. |
| `certification_note` | `text` | Optional safe public/admin note. |
| `custom_category` | `text` | Custom "Others / Specify" service text. |
| `custom_category_review_status` | `text` | Barangay/admin review status for custom service text. |
| `is_active` | `boolean` | Default `true`. |
| `created_at` | `timestamptz` | Default `now()`. |
| `updated_at` | `timestamptz` | Updated on edit. |

Relationships:

- A provider can have many services.
- Credentials can optionally connect to a service.

Important constraints:

- Only verified provider owner with completed Work Profile can create services. Only provider owner can update/delete their services.
- Public queries should only show active services.
- `category` and `title` are required. For the taxonomy-only MVP, `category` stores the selected service label rather than a separate category foreign key.
- Official taxonomy values drive search/filtering. Custom service text must stay separate so filters do not break and admins can review it.
- Active service posts must use a valid numeric rate range: `rate_min > 0` and `rate_max >= rate_min`.

Implementation note:

- The older docs and SQL may still mention `skills` or `provider_profiles.service_type`. The current UI language is Services. For development, prefer a `services` table or map the old `service_type` field into service-style UI until the table is added.

## credentials

Purpose: Metadata for certificates, IDs, and proof-of-experience files.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `provider_id` | `uuid` | References `profiles(id)` on delete cascade. |
| `service_id` | `uuid` | Nullable reference to `services(id)` on delete set null. |
| `credential_type` | `text` | `tesda`, `training_certificate`, `barangay_certificate`, `work_proof`, `portfolio`, `other`. |
| `title` | `text` | User-facing label. |
| `issuer` | `text` | Optional issuing school, agency, company, or person. |
| `issued_at` | `date` | Optional. |
| `file_path` | `text` | Supabase Storage path. |
| `status` | `text` | `pending`, `approved`, or `rejected`. Credentials are optional trust boosters and do not block profile completion, publishing, or matching. |
| `created_at` | `timestamptz` | Default `now()`. |

Relationships:

- Belongs to provider.
- Optionally belongs to a service.
- Can be linked to a verification request through `verification_files`.

Important constraints:

- Only owner and admins can read private credential files.
- Public profile may show credential title/status, not private ID file URLs.

## verification_requests

Purpose: Barangay verification workflow for residents/providers.

Implementation note:

- Current app code still writes to the older `verifications` table and links files through `verification_files.verification_id`.
- A later cleanup should migrate that surface to the documented `verification_requests` naming and private file-path model when the admin review flow is built.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | References `profiles(id)` on delete cascade. |
| `request_type` | `text` | `barangay_identity`, `provider_service`, or `other`. |
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
| `category` | `text` | Top-level controlled category: `Home & Local Help`, `Learning & Digital Help`, or `Tech & Document Support`. |
| `service_needed` | `text` | Specific service selected under the job category. Required by current app validation before preview/publish. |
| `tags` | `text[]` | Optional short descriptors from the Post builder, maximum 4 in app UI. |
| `photo_urls` | `text[]` | Optional job photos uploaded from the post builder. Public job cards/details may show the first image. |
| `barangay` | `text` | Default `San Pedro`. |
| `location_text` | `text` | Human-readable location. |
| `public_location_text` | `text` | Approximate public location shown on cards/details. |
| `private_location_notes` | `text` | Owner/private coordination notes; do not select for public cards/details. |
| `budget_amount` | `numeric` | Deprecated legacy fixed budget amount. New app code reads/writes `budget_min` and `budget_max`. |
| `budget_min` | `numeric` | Required minimum budget for open/published job posts. |
| `budget_max` | `numeric` | Required maximum budget for open/published job posts; constrained so min is not greater than max. |
| `rate_type` | `text` | Pricing unit such as `per_service`, `hourly`, `daily`, `weekly`, `per_project`, `per_job`, `per_visit`, `per_load`, `per_order`, `per_meal`, or `per_session`. Negotiability is stored separately. |
| `budget_negotiable` | `boolean` | Optional signal that the client is open to negotiation within the required budget range. |
| `workers_needed` | `integer` | Optional positive worker count. |
| `schedule_text` | `text` | Optional. |
| `experience_level` | `text` | Required/preferred experience level. |
| `certification_required` | `boolean` | Safe requirement metadata. |
| `certification_note` | `text` | Optional safe certification note. |
| `allow_messages` | `boolean` | Default `true`; controls whether verified workers can message from the post surface. |
| `auto_reply_enabled` | `boolean` | Default `false`; stored for the Figma option but no auto-reply behavior in the verified Post slice. |
| `auto_close_enabled` | `boolean` | Default `false`; stored for the Figma option but no automatic close worker in the verified Post slice. |
| `status` | `job_status` | Default `open`. |
| `accepted_provider_id` | `uuid` | Nullable reference to provider profile. |
| `created_at` | `timestamptz` | Default `now()`. |
| `updated_at` | `timestamptz` | Updated on edit. |
| `closed_at` | `timestamptz` | Set when completed/closed/cancelled. |

Relationships:

- One client can create many jobs.
- One job can have many job-related conversations.
- One job can have reviews after completion.

Important constraints:

- Only client owner can edit own open jobs.
- New job-interest conversations allowed only when status is `open` or `reviewing`.
- Budget is informational only; payment is outside the app.
- Public discovery should exclude the current user's own jobs while owner views still show them.
- Photos, renewal behavior, auto-reply sending, and auto-close scheduling are deferred beyond the verified Post slice.
- Open/published job posts must use a valid numeric budget range: `budget_min > 0` and `budget_max >= budget_min`.

## job_drafts

Purpose: Private job-post drafts. These let unverified users compose a post before barangay verification without making the post public.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | References `profiles(id)` on delete cascade. |
| `title` | `text` | Optional while drafting. Required before preview/publish in app UI. |
| `description` | `text` | Optional while drafting. Required before preview/publish in app UI. |
| `category` | `text` | Optional while drafting. Required before preview/publish in app UI. Uses the top-level controlled category. |
| `service_needed` | `text` | Optional while drafting. Required before preview/publish in app UI. |
| `tags` | `text[]` | Optional, maximum 4 in app UI. |
| `photo_urls` | `text[]` | Optional uploaded photo URLs from the job builder. |
| `barangay` | `text` | Defaults to the user's barangay or `Barangay San Pedro`. |
| `location_text` | `text` | Human-readable location. |
| `public_location_text` | `text` | Approximate public location copied to the published job. |
| `private_location_notes` | `text` | Private address/coordination notes copied only to the owner/private job row. |
| `budget_amount` | `numeric` | Deprecated legacy fixed draft budget amount. New app code reads/writes `budget_min` and `budget_max`. |
| `budget_min` | `numeric` | Draft minimum budget. Required before publishing. |
| `budget_max` | `numeric` | Draft maximum budget. Required before publishing. |
| `rate_type` | `text` | Pricing unit such as `per_service`, `hourly`, `daily`, `weekly`, `per_project`, `per_job`, `per_visit`, `per_load`, `per_order`, `per_meal`, or `per_session`. Negotiability is stored separately. |
| `budget_negotiable` | `boolean` | Draft copy of the negotiation preference. |
| `workers_needed` | `integer` | Optional positive worker count. |
| `schedule_text` | `text` | Optional. |
| `experience_level` | `text` | Required/preferred experience level. |
| `certification_required` | `boolean` | Safe requirement metadata. |
| `certification_note` | `text` | Optional safe certification note. |
| `allow_messages` | `boolean` | Draft copy of the listing option. |
| `auto_reply_enabled` | `boolean` | Draft copy of the listing option. |
| `auto_close_enabled` | `boolean` | Draft copy of the listing option. |
| `created_at` | `timestamptz` | Default `now()`. |
| `updated_at` | `timestamptz` | Updated on edit. |

Important constraints:

- Drafts are owner-private and never appear in Home, Search, Job Detail, provider browsing, conversations, or admin queues.
- Both verified and unverified authenticated users can create, update, read, and delete only their own drafts.
- Publishing a draft creates a real `jobs` row only after barangay verification and Hiring Profile completion pass.

## conversations

Purpose: Conversation thread between two users, usually tied to a job or a service.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `job_id` | `uuid` | Nullable reference to `jobs(id)` on delete set null. |
| `service_id` | `uuid` | Nullable reference to `services(id)` on delete set null. |
| `client_id` | `uuid` | References `profiles(id)` on delete cascade. |
| `provider_id` | `uuid` | References `profiles(id)` on delete cascade. |
| `started_by` | `uuid` | References `profiles(id)`. |
| `status` | `conversation_status` | Default `active`. |
| `hired_at` | `timestamptz` | Nullable. Set when client marks worker hired. |
| `created_at` | `timestamptz` | Default `now()`. |
| `updated_at` | `timestamptz` | Updated on status change. |

Relationships:

- Belongs to a client and provider.
- May belong to a job.
- May belong to a service.
- Has many messages.

Important constraints:

- Unique active `(job_id, provider_id)` when `job_id` is present.
- Unique `(service_id, client_id, provider_id)` when `service_id` is present.
- Provider cannot start interest on their own job.
- Only job owner/client can mark a worker hired for that job.
- Both participants can archive their own view if per-user conversation state is later added.

## messages

Purpose: Basic in-app text messages for marketplace coordination.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `conversation_id` | `uuid` | References `conversations(id)` on delete cascade. |
| `sender_id` | `uuid` | References `profiles(id)` on delete cascade. |
| `body` | `text` | Message text. |
| `read_at` | `timestamptz` | Nullable. |
| `created_at` | `timestamptz` | Default `now()`. |

Relationships:

- Message belongs to one conversation.
- Sender must be one of the conversation participants.

Important constraints:

- Only conversation participants can read messages.
- Only verified users with the relevant Work or Hiring Profile can send messages.
- MVP messages are text-only. Attachments, read receipts, calls, and group chat are future features.

## saved_items

Purpose: One-tap bookmark state for saved jobs and providers.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | References `profiles(id)` on delete cascade. |
| `item_type` | `saved_item_type` | `job` or `provider`. |
| `item_id` | `uuid` | Target record ID. |
| `created_at` | `timestamptz` | Default `now()`. |

Important constraints:

- Unique `(user_id, item_type, item_id)`.
- Saving is verification-gated if final product requires all interactions to be gated. If time is tight, save can be a local/demo-only state.

## notifications

Purpose: Basic in-app update center for user-visible marketplace and trust events.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | References `profiles(id)` on delete cascade. |
| `type` | `text` | Event key such as `message_received`, `verification_approved`, `job_completed`, or `report_status_updated`. |
| `title` | `text` | Short user-facing title. |
| `body` | `text` | Optional user-facing detail. |
| `route` | `text` | Optional internal app route opened from the notification row. |
| `metadata` | `jsonb` | Optional event metadata for app logic/debugging. |
| `read_at` | `timestamptz` | Nullable; set when the user reads the notification. |
| `created_at` | `timestamptz` | Default `now()`. |

Important constraints:

- Users can select only their own notifications and update only `read_at`.
- App clients cannot insert arbitrary notifications.
- Server-side trigger logic creates MVP notifications for new messages, verification decisions, completed hired jobs, and report status changes.
- Push delivery and preference management remain out of MVP scope.

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

Purpose: Optional MVP moderation queue for unsafe users, jobs, conversations, messages, or reviews.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `reporter_id` | `uuid` | References `profiles(id)` on delete set null. |
| `target_type` | `text` | `user`, `job`, `conversation`, `review`, `message`. |
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

## admin_moderation_actions

Purpose: Internal audit history for barangay admin moderation reviews.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `target_type` | `text` | `photo`, `user`, `job`, `service`, or `report`. |
| `target_id` | `text` | Stable target identifier. Public photos use `source_type:source_id:image_url_hash`. |
| `source_type` | `text` | Nullable. For photos: `profile_photo`, `job_photo`, or `service_photo`. |
| `source_id` | `uuid` | Nullable profile/job/service row id. |
| `owner_id` | `uuid` | Nullable owner profile id. |
| `image_url` | `text` | Public image URL snapshot, if the target is a photo. |
| `image_path` | `text` | Public storage bucket/path snapshot when derivable from the URL. |
| `action` | `text` | `flag`, `hide`, or `clear`. |
| `reason` | `text` | Admin-selected reason. Not public. |
| `note` | `text` | Optional admin note. Not public. |
| `status` | `text` | `flagged`, `hidden`, or `cleared`. |
| `reviewed_by` | `uuid` | Admin profile id. |
| `reviewed_at` | `timestamptz` | Review timestamp. |
| `created_at` | `timestamptz` | Default `now()`. |
| `updated_at` | `timestamptz` | Updated on change. |

Important constraints:

- Only barangay admins can read, insert, or update moderation actions.
- Public users must never read admin reasons, notes, or internal moderation history.
- Phase 2 uses this table for public-facing profile, job, and service photos only.
- Verification files, government IDs, certificates, credential files, and signed verification URLs must never be represented as public photo moderation targets.

## content_visibility

Purpose: Public UI enforcement state for moderated public photos.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `content_type` | `text` | `profile_photo`, `job_photo`, or `service_photo`. |
| `content_id` | `text` | Stable content key, matching public photo moderation target id. |
| `source_id` | `uuid` | Nullable profile/job/service row id. |
| `owner_id` | `uuid` | Nullable owner profile id. |
| `image_url` | `text` | Public image URL snapshot. |
| `visibility` | `text` | `visible` or `hidden`. |
| `hidden_reason` | `text` | Admin-only reason. |
| `hidden_by` | `uuid` | Admin profile id. |
| `hidden_at` | `timestamptz` | Set when hidden. |
| `created_at` | `timestamptz` | Default `now()`. |
| `updated_at` | `timestamptz` | Updated on change. |

Important constraints:

- Barangay admins can read and write full rows.
- Normal users do not read this base table because it contains admin-only fields.
- Public app filtering uses the `public_content_visibility` view, which exposes only `content_type`, `content_id`, `source_id`, `owner_id`, `image_url`, and `visibility`.
- Hiding a public image removes it from app UI but does not revoke an already-public storage URL. Physical storage takedown is a future phase.

