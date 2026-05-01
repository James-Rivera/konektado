# Feature Map

Priority labels:

- P0: Required for MVP/thesis demo.
- P1: Important but can be simplified if timeline is tight.
- P2: Optional or future-facing.

Status labels:

- Existing: already present in the prototype in some form.
- Partial: started but needs service-layer cleanup or completion.
- Planned: should be implemented for MVP.
- Deferred: keep out of MVP unless time allows.

| Feature | Primary Screens | Main Data Tables | Priority | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Registration | `app/(auth)/register.tsx` | `auth.users`, `profiles` | P0 | Existing | Current prototype uses Supabase email/password; target flow prefers phone-first entry if feasible. |
| Login/logout | `app/(auth)/login.tsx`, profile screen | `auth.users` | P0 | Existing | Session handled by Supabase. |
| Role selection | `app/(auth)/role.tsx` | `profiles`, `user_roles` | P0 | Existing | Client/provider roles already started. |
| Onboarding profile | `app/(onboarding)/*` | `profiles`, `provider_profiles`, `client_profiles` | P0 | Existing | Collect personal, location, and provider data. |
| Unverified viewer mode | Main tabs, locked action prompts | `profiles`, `verification_requests` | P0 | Planned | Users can browse after lightweight onboarding but cannot interact until verified. |
| Profile view/edit | `app/(tabs)/profile.tsx` | `profiles`, `provider_profiles` | P0 | Partial | Move direct queries into `ProfileService`. |
| Service profile | Work Profile, offer service screen, profile edit | `services`, `provider_profiles` | P0 | Planned | UI label is Services. Current `provider_profiles.service_type` can seed the first service. |
| Credential upload | `app/(onboarding)/certifications.tsx`, verification screen | `credentials`, `verification_files`, storage bucket | P0 | Partial | Document picker exists; storage integration should be finished. |
| Barangay verification request | `app/(onboarding)/verification.tsx`, profile settings | `verification_requests`, `verification_files`, `profiles` | P0 | Partial | Current flow collects files; admin review still needed. |
| Admin verification review | Admin dashboard screens | `verification_requests`, `profiles`, `provider_profiles` | P0 | Planned | Needed for thesis trust workflow. |
| Home feed | `app/(tabs)/index.tsx`, Figma dashboard | `jobs`, `services`, `profiles`, `reviews` | P0 | Partial | Figma has polished feed direction; current screen is simpler. |
| Job posting | `app/create-job.tsx` | `jobs` | P0 | Partial | Direct query exists; move to `JobService`. |
| Job browsing | Home/search screens | `jobs` | P0 | Partial | Providers can view open jobs. `explore` is legacy and should be replaced by Home/Search. |
| Provider browsing | Home/search screens | `profiles`, `provider_profiles`, `services`, `reviews` | P0 | Partial | Clients can view providers. `explore` is legacy and should be replaced by Home/Search. |
| Job interest messaging | Messages tab, job detail, feed cards | `conversations`, `messages`, `jobs` | P0 | Planned | Replaces formal Apply flow for MVP. A worker messages a client to show interest. |
| Hiring management | Messages tab, job history, post dashboard | `jobs`, `conversations` | P0 | Planned | Client can mark an interested worker as hired. |
| Search and filtering | Home search mode | `jobs`, `services`, `profiles` | P0 | Planned | Search by job/service text, category, location, and availability. |
| Ratings and feedback | Job detail, profile detail | `reviews` | P1 | Planned | Keep simple: rating 1-5 plus comment. |
| Reports/moderation | Admin dashboard, report modal | `reports` | P1 | Planned | Basic moderation for unsafe content. |
| Basic messaging | Messages tab | `conversations`, `messages` | P0 | Planned | Required by current Figma and product flow. Keep MVP simple: text messages, job context, safety prompts. |
| Saved providers/jobs | Feed cards | `saved_items` | P1 | Planned or stubbed | Figma shows one-tap bookmark. Can be persisted if time allows; otherwise show local/demo state. |
| Notifications | Header, modal | `notifications` | P2 | Deferred | Keep simple unless needed for demo. |
