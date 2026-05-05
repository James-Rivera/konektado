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
| Registration | `app/(auth)/register.tsx` | `auth.users`, `profiles` | P0 | Existing | MVP signup uses Supabase email OTP plus password creation. Phone-first/SMS auth is deferred until provider access and device testing are practical. |
| Login/logout | `app/(auth)/login.tsx`, profile screen | `auth.users` | P0 | Existing | Session handled by Supabase. |
| Role selection | `app/(auth)/role.tsx` | `profiles`, `user_roles` | P0 | Existing | Client, provider, and both-role intent are supported. Both stores client and provider role rows. |
| Onboarding profile | `app/(onboarding)/*` | `profiles`, `provider_profiles`, `client_profiles`, `user_preferences` | P0 | Existing | Role intent -> basic identity/location -> service preferences -> review -> complete -> Home. Completion requires `user_preferences.onboarding_completed_at` plus basic profile identity. No certificates, ID documents, or verification uploads are collected in first onboarding. |
| Unverified viewer mode | Main tabs, locked action prompts | `profiles`, `verifications`, `user_preferences` | P0 | Partial | Users can browse after lightweight onboarding but cannot interact until verified. Provider intent opens Home on Jobs; client intent opens Workers; both/missing intent opens For you. Verification unlock refresh is now connected; keep broader Home/Search scope frozen until the verified Post slice is stable. |
| Profile view/edit | `app/(tabs)/profile.tsx` | `profiles`, `provider_profiles` | P0 | Partial | Move direct queries into `ProfileService`. |
| Service profile | Work Profile, offer service screen, profile edit | `services`, `provider_profiles` | P0 | Partial | Service creation, owned-service listing, and active-service search now use the `services` table. Profile editing remains minimal. |
| Credential upload | `app/(onboarding)/certifications.tsx`, verification screen | `credentials`, `verification_files`, storage bucket | P0 | Partial | Verification file upload now uses Supabase Storage and `verification_files`. Camera capture for ID/selfie is a polish/hardening task; document/image picker remains acceptable for the verified Post slice. |
| Barangay verification request | `app/verification.tsx`, `components/verification/FigmaVerificationFlow.tsx`, profile settings | `verifications`, `verification_files`, `profiles` | P0 | Existing | Verification follows the established Figma storyboard: intro, preflight, account details, contact code UI, ID type, document upload/capture placeholder, face photo upload/capture placeholder, review, submit, pending, approved, and correction states. It writes to the current live `verifications` table, uploads files, handles rejected resubmission, and refreshes app state after approval. |
| Admin verification review | `app/admin/verifications.tsx` | `verifications`, `verification_files`, `profiles` | P0 | Existing | Barangay admins are routed to a focused verification dashboard with queue filters, request metrics, submitted profile/file details, in-app image preview, logout, and approve/reject actions through `AdminService`. It remains verification-focused, not a full moderation dashboard, and keeps current `verifications` naming for MVP. |
| Home feed | `app/(tabs)/index.tsx`, Figma dashboard | `jobs`, `services`, `profiles`, `reviews` | P0 | Partial | Home now loads real open jobs and active services from Supabase and preserves intent-based default filters. Advanced ranking and saved-item polish remain deferred. |
| Job posting | `app/create-job.tsx`, `app/(tabs)/post.tsx` | `jobs` | P0 | Partial | Job creation has service-layer support and verification gates, but the next implementation slice should make the verified Post flow demo-ready end to end. |
| Job browsing | Home/search screens | `jobs` | P0 | Partial | Providers can view open jobs. `explore` is legacy and should be replaced by Home/Search. |
| Provider browsing | Home/search screens | `profiles`, `provider_profiles`, `services`, `reviews` | P0 | Partial | Clients can view providers. `explore` is legacy and should be replaced by Home/Search. |
| Job interest messaging | Messages tab, job detail, feed cards | `conversations`, `messages`, `jobs` | P0 | Partial | Job detail starts/reuses a job conversation and conversation detail supports text messages. Service request chat remains deferred. |
| Hiring management | Messages tab, job history, post dashboard | `jobs`, `conversations` | P0 | Partial | Client can mark a conversation as hired; this updates conversation status and job accepted provider/status. |
| Search and filtering | Home search mode | `jobs`, `services`, `profiles` | P0 | Partial | Services and jobs have service-layer search hooks; Home currently applies lightweight local preference scoring. |
| Ratings and feedback | Job detail, profile detail | `reviews` | P1 | Partial | Review service and profile review listing exist; full review composer is still minimal/deferred. |
| Reports/moderation | Admin dashboard, report modal | `reports` | P1 | Planned | Basic moderation for unsafe content. |
| Basic messaging | Messages tab, `app/conversation/[conversationId].tsx` | `conversations`, `messages` | P0 | Partial | Real inbox and text conversation detail are connected for job conversations. No attachments, calls, read receipts, push notifications, or group chat. |
| Saved providers/jobs | Feed cards | `saved_items` | P1 | Planned or stubbed | Figma shows one-tap bookmark. Can be persisted if time allows; otherwise show local/demo state. |
| Notifications | Header, modal | `notifications` | P2 | Deferred | Keep simple unless needed for demo. |
