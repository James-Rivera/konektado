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
- Root routing allows authenticated, onboarded users to stay on `job`, `worker`, and `verification` routes instead of redirecting back to tabs.
- Locked Home, Job Detail, Worker Detail, and Post actions route to `app/verification.tsx`, a Figma-matched verification intro/request flow.
- The verification intro now continues into a multi-step request flow:
  - Contact details prefilled from profile.
  - ID front and ID back uploads.
  - Optional certificate/work proof uploads.
  - Services or hiring purpose.
  - Review/confirm before submission.
  - Pending request saved through `services/verification.service.ts`.
- Demo feed data is still static in `constants/demo-data.ts`.
- Message, Save, and post-related actions are gated behind verification routing.
- View Profile and View Job are available to unverified viewer-mode users as browse-only static details.
- Konektado uses Satoshi only. Do not add or reintroduce other font families.
- Established Figma file: `https://www.figma.com/design/v6jPKumENGxoQlWbwSFfo5/Konektado`. Check this file before implementing user-facing UI, and use nearby Konektado Figma patterns when an exact screen is missing.
- `AGENTS.md` says not to start the Expo dev server automatically. The user will run Expo manually.

Current limitations to preserve in docs and implementation:

- Home is still mostly demo/static.
- Locked actions route to the Figma-matched verification intro/request flow.
- Verified-origin database filtering is pending.
- Admin verification review, approval/rejection, and post-approval unlock refresh are not connected yet.
- Real search, real messaging, saved items persistence, full service posting, and verified-origin feed data are not finished yet.
- Do not add Apply/Application as the primary flow. Use Messages and Mark Hired.

## Current Important Files

- `app/(tabs)/index.tsx` - Dashboard/Home screen and current feed wiring.
- `components/JobCard.tsx` - Figma-style job feed card.
- `components/WorkerCard.tsx` - Figma-style worker feed card.
- `components/KonektadoWordmark.tsx` - shared Konektado logo.
- `constants/demo-data.ts` - static Home feed data and Home filters.
- `constants/theme.ts` - shared colors, spacing, radius, and Satoshi typography tokens.
- `services/onboarding.service.ts` - onboarding/preferences access.
- `hooks/use-profile.ts` - profile state used by Home verification checks.
- `app/(tabs)/post.tsx` - current Post tab placeholder/gated entry.
- `app/job/[jobId].tsx` - static browse-only job detail route.
- `app/worker/[workerId].tsx` - static browse-only worker profile detail route.
- `app/verification.tsx` - Figma-matched verification intro/request flow for locked actions.
- `services/verification.service.ts` - verification prefill, request creation, and file upload service.
- `types/verification.types.ts` - verification request/status types.

## Recommended Next Slice

Continue from the connected verification request flow before building database ranking.

1. Build admin verification review:
   - List pending `verifications` rows.
   - Show submitted profile snapshot and uploaded files.
   - Approve/reject with reviewer note.
   - On approval, set the profile verification timestamp.
2. Build the Post tab's first real MVP surface:
   - Verified users can start a job post flow.
   - Unverified users see the verification gate.
   - Use services instead of direct Supabase writes.
3. Add real Home search/filter UI only after detail routes exist:
   - Keep filtering local/static first.
   - Do not build full database ranking yet.
4. Move remaining direct Supabase reads/writes out of screens as each touched screen is updated.

## Do Not Start With

- Full admin dashboard.
- Full admin verification review pipeline.
- Advanced chat features.
- Push notifications.
- Payment logic.
- Database ranking/search.
- Rebuilding every Figma variant.
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
Continue from the connected verification request flow. Build admin verification review next, then let verified users start the real job post flow from the Post tab.

Please:
1. Inspect the current Home, JobCard, WorkerCard, Job Detail, Worker Detail, Post tab, demo data, routing, and verification code.
2. List the files you intend to change before editing.
3. Keep feed data static/demo until the verification/posting slice is stable.
4. Keep View Job and View Profile available to unverified viewer-mode users.
5. Keep Message, Save, and Post actions behind barangay verification.
6. Put backend calls in /services and avoid Supabase queries in reusable UI components.
7. Keep screens thin and put reusable UI in /components.
8. Run npm run lint and npx tsc --noEmit when possible.
```
