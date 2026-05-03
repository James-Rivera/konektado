# Coding Kickoff

Use this file when starting a fresh coding chat for Konektado. Read `AGENTS.md` and the rest of `/docs` first.

## Current State

The repository is an Expo Router + React Native + TypeScript app backed by Supabase. The accepted MVP path is email OTP signup, password creation, lightweight onboarding, then unverified Home viewer mode.

Recently completed work:

- Auth/onboarding docs now match the current flow: role intent -> basic identity/location -> service preferences -> review -> complete -> Home viewer mode.
- First onboarding does not collect certificates, ID documents, or verification uploads.
- Onboarding completion is based on `user_preferences.onboarding_completed_at` plus basic profile identity.
- Home's initial filter comes from `user_preferences.intent`:
  - `provider` -> Jobs
  - `client` -> Workers
  - `both` or missing -> For you
- Dashboard/Home has been rebuilt closer to Figma:
  - Konektado wordmark and notification button in the top header.
  - Search bar.
  - Verification/setup banner for unverified users.
  - For you, Jobs, Workers filters.
  - Latest in your barangay feed section.
  - Mixed worker/job cards.
  - View Profile, View Job, Message, and Save actions.
- `KonektadoWordmark` is now shared from `components/KonektadoWordmark.tsx` and reused by onboarding/auth/dashboard.
- Feed cards were updated to match the Figma card direction:
- `components/WorkerCard.tsx`
- `components/JobCard.tsx`
- Job card metadata icons use the primary blue tint.
- Pill rows use the Figma full-width clipped frame behavior, with fixed-width filled pills and a right-edge chevron.
- Browse-only detail routes now exist for static feed items:
  - `app/job/[jobId].tsx`
  - `app/worker/[workerId].tsx`
- Static marketplace demo records now live in `constants/marketplace-demo-data.ts` and feed both Home/Search selectors and detail-route lookups.
- Worker detail has been rebuilt to match the current Figma worker profile direction:
  - `/worker/[workerId]` supports `default` and `match` variants.
  - `match` adds the `Why this worker fits` panel.
  - `default` keeps the cleaner profile layout and the Work History utility action.
- Root routing allows authenticated, onboarded users to stay on `job`, `worker`, and `verification` routes instead of redirecting back to tabs.
- Locked Home, Job Detail, Worker Detail, and Post actions route to `app/verification.tsx`, a Figma-matched verification intro/request flow.
- The verification intro now continues into a multi-step request flow and admin review loop:
  - Contact details prefilled from profile.
  - ID front and ID back uploads.
  - Optional certificate/work proof uploads.
  - Face photo upload slot.
  - Services or hiring purpose.
  - Review/confirm before submission.
  - File upload and pending request creation through `services/verification.service.ts`.
  - Pending, approved, and rejected/correction states.
- Barangay admin verification review is now connected:
  - `admin@konektado.test` bypasses resident onboarding and opens the admin verification dashboard.
  - Admin can filter pending/reviewed/all requests.
  - Admin can inspect submitted profile details, submitted note, files, and reviewer notes.
  - Image files can be previewed in app; non-image files can open externally.
  - Approval updates `verifications` and profile verification timestamps.
  - Rejection requires a reviewer note and supports user correction/resubmission.
- Profile refresh now watches for verification timestamp changes so approved users can unlock gated actions without stale unverified state.
- Worker detail layout has been made responsive and safe-area-aware so work-history content does not clip on devices with different display/font/nav-bar settings.
- Demo feed data is still static and is now shared from `constants/marketplace-demo-data.ts`.
- Message, Save, and post-related actions are gated behind verification routing.
- View Profile and View Job are available to unverified viewer-mode users as browse-only static details.
- Konektado uses Satoshi only. Do not add or reintroduce other font families.
- Established Figma file: `https://www.figma.com/design/v6jPKumENGxoQlWbwSFfo5/Konektado`. Check this file before implementing user-facing UI, and use nearby Konektado Figma patterns when an exact screen is missing.
- `AGENTS.md` says not to start the Expo dev server automatically. The user will run Expo manually.

Current limitations to preserve in docs and implementation:

- Home is still mostly demo/static.
- Locked actions route to the Figma-matched verification intro/request flow for unverified users.
- Verified-origin database filtering is pending and should stay frozen until verified job posting is stable.
- Verification completion is now the baseline for the next marketplace slice, not the active target.
- Camera capture for ID/selfie is not yet implemented. The current MVP path uses document/image picker upload and Supabase Storage.
- Real search, real messaging, saved items persistence, full service posting, and verified-origin feed data are not finished yet.
- Do not add Apply/Application as the primary flow. Use Messages and Mark Hired.

## Current Important Files

- `app/(tabs)/index.tsx` - Dashboard/Home screen and current feed wiring.
- `components/JobCard.tsx` - Figma-style job feed card.
- `components/WorkerCard.tsx` - Figma-style worker feed card.
- `components/KonektadoWordmark.tsx` - shared Konektado logo.
- `constants/marketplace-demo-data.ts` - shared static jobs, workers, worker-detail content, and lookup helpers.
- `constants/demo-data.ts` - Home feed selectors and Home filters.
- `constants/theme.ts` - shared colors, spacing, radius, and Satoshi typography tokens.
- `services/onboarding.service.ts` - onboarding/preferences access.
- `hooks/use-profile.ts` - profile state used by Home verification checks.
- `app/(tabs)/post.tsx` - current Post tab placeholder/gated entry.
- `app/job/[jobId].tsx` - static browse-only job detail route.
- `app/worker/[workerId].tsx` - static browse-only worker profile detail route.
- `app/verification.tsx` - Figma-matched verification intro/request flow for locked actions.
- `app/admin/verifications.tsx` - admin verification dashboard with queue filters, metrics, file links, and approve/reject workflow.
- `services/verification.service.ts` - verification prefill, request creation, and file upload service.
- `services/admin.service.ts` - admin verification request listing and review actions.
- `types/verification.types.ts` - verification request/status types.

## Recommended Next Slice

Build the first real verified marketplace action: job posting.

1. Verified job posting:
   - Keep Post locked for unverified users and route them to verification.
   - Let approved clients create a real job through `JobService.createJob`.
   - Keep the Post screen thin and use service-layer validation/errors.
   - Show useful form fields for the MVP: title, service/category, description, barangay/city, schedule text, budget/rate text, and optional photo if existing project patterns support it.
   - After creation, route to the created job detail or Post dashboard state.
   - Make the new job visible in the relevant Home/Search/job browsing path without building advanced ranking.
2. Verification capture polish, only if needed before or during the Post slice:
   - Add Expo-compatible camera/image-picker capture for ID front, ID back, barangay certificate, and face photo.
   - Normalize captured images into the existing `VerificationService` file input shape.
   - Do not change the `verifications` or `verification_files.verification_id` schema just to add camera capture.
3. Keep Home/Search ranking, saved-item persistence, and full admin moderation out of this slice.

Following slices, in order:

1. Job-interest messaging and Mark Hired.
2. Reviews.
3. Search/feed ranking and saved-item polish.
4. Broader admin moderation/reporting.

## Do Not Start With

- Broad admin moderation dashboard.
- Advanced chat features.
- Push notifications.
- Payment logic.
- Database ranking/search.
- Rebuilding every Figma variant.
- Messages expansion before verified Post is demo-ready.
- Camera capture as a large separate phase unless the demo explicitly requires it before Post.
- Starting Expo automatically.

## Fresh Chat Prompt

```text
We are continuing Konektado from the current repo.

Please inspect the repository and read AGENTS.md and /docs first. Treat /docs as the source of truth, especially:
- docs/00-project-brief.md
- docs/01-product-scope.md
- docs/03-feature-map.md
- docs/04-user-flows.md
- docs/07-auth-and-permissions.md
- docs/08-design-system.md
- docs/09-development-rules.md
- docs/10-ai-instructions.md
- docs/11-decision-log.md
- docs/12-coding-kickoff.md

Current context:
- Stack: Expo Router, React Native, TypeScript, Supabase.
- Konektado is a barangay-level job and service matching mobile app.
- Main tabs are Home, Post, Messages, Profile.
- One account can have both Work Profile and Hiring Profile.
- Use Services in UI, not Skills.
- Do not implement Apply/Application as the primary flow. Use Messages and Mark Hired.
- Verification gates posting, messaging, saving if enabled, and reviews.
- Home/Dashboard is currently a Figma-style static/demo mixed jobs/workers feed.
- Home initial filter uses onboarding intent: provider -> Jobs, client -> Workers, both/missing -> For you.
- Konektado uses Satoshi only.
- Do not start the Expo dev server automatically; I will run Expo manually.

Next task:
Build verified job posting as the next vertical slice. Use the completed verification/admin flow as the gate that unlocks Post.

Please:
1. Inspect the current Home, JobCard, WorkerCard, Job Detail, Worker Detail, Post tab, demo data, routing, and verification code.
2. List the files you intend to change before editing.
3. Keep feed data static/demo until the verification/posting slice is stable.
4. Keep View Job and View Profile available to unverified viewer-mode users.
5. Keep Message, Save, and Post actions behind barangay verification.
6. Put backend calls in /services and avoid Supabase queries in reusable UI components.
7. Keep screens thin and put reusable UI in /components.
8. Keep admin verification review working; do not expand it into full moderation in this slice.
9. Implement verified job creation through `JobService.createJob`.
10. Ensure unverified users still route to verification from Post.
11. Make newly created jobs visible in the simplest existing browsing path without advanced ranking.
12. Treat camera capture for verification as optional polish unless explicitly requested before Post.
13. Run npm run lint and npx tsc --noEmit when possible.
```
