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
| Skill/service profile | Provider profile screens, profile edit | `skills`, `provider_profiles` | P0 | Planned | Current `service_type` can be migrated into `skills`. |
| Credential upload | `app/(onboarding)/certifications.tsx`, verification screen | `credentials`, `verification_files`, storage bucket | P0 | Partial | Document picker exists; storage integration should be finished. |
| Barangay verification request | `app/(onboarding)/verification.tsx`, profile settings | `verification_requests`, `verification_files`, `profiles` | P0 | Partial | Current flow collects files; admin review still needed. |
| Admin verification review | Admin dashboard screens | `verification_requests`, `profiles`, `provider_profiles` | P0 | Planned | Needed for thesis trust workflow. |
| Home feed | `app/(tabs)/index.tsx`, Figma dashboard | `jobs`, `skills`, `profiles`, `reviews` | P0 | Partial | Figma has polished feed direction; current screen is simpler. |
| Job posting | `app/create-job.tsx` | `jobs` | P0 | Partial | Direct query exists; move to `JobService`. |
| Job browsing | `app/(tabs)/explore.tsx` | `jobs` | P0 | Partial | Providers can view open jobs. |
| Provider browsing | `app/(tabs)/explore.tsx` | `profiles`, `provider_profiles`, `skills`, `reviews` | P0 | Partial | Clients can view providers. |
| Job application | `app/(tabs)/explore.tsx` | `job_applications` | P0 | Partial | Providers can apply; application review needs completion. |
| Application management | Job detail / client dashboard | `job_applications`, `jobs` | P0 | Planned | Clients need accept/reject workflow. |
| Search and filtering | Feed, Explore | `jobs`, `skills`, `profiles` | P0 | Planned | Search by job/service text, category, location, and verification. |
| Ratings and feedback | Job detail, profile detail | `reviews` | P1 | Planned | Keep simple: rating 1-5 plus comment. |
| Reports/moderation | Admin dashboard, report modal | `reports` | P1 | Planned | Basic moderation for unsafe content. |
| Optional messaging | Messages tab | `messages` or external contact links | P2 | Deferred | Figma includes Messages, but full chat can be deferred. |
| Saved providers/jobs | Feed cards | `saved_items` | P2 | Deferred | Figma shows Save button, but MVP can leave it inactive or future. |
| Notifications | Header, modal | `notifications` | P2 | Deferred | Keep simple unless needed for demo. |
