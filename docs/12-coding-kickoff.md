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
- Demo feed data is still static in `constants/demo-data.ts`.
- Message, Save, and post-related actions are gated behind verification prompts.
- View Profile and View Job remain browse-only prompts for now.
- Konektado uses Satoshi only. Do not add or reintroduce other font families.
- `AGENTS.md` says not to start the Expo dev server automatically. The user will run Expo manually.

Current limitations to preserve in docs and implementation:

- Home is still mostly demo/static.
- Locked actions need full verification routing, not just prompts.
- Verified-origin database filtering is pending.
- Job detail, worker profile detail, real search, real messaging, saved items persistence, and post creation are not finished yet.
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

## Recommended Next Slice

Start with detail routing and verification gates before building database ranking.

1. Implement browse-only detail routes:
   - Job detail route from View Job.
   - Worker profile detail route from View Profile.
   - Use the same static/demo feed data first.
   - Keep these readable in viewer mode.
2. Replace locked-action alerts with consistent verification routing:
   - Message routes to verification when unverified.
   - Save routes to verification or shows a consistent verification prompt.
   - Post tab routes to verification when unverified.
   - Keep View Job and View Profile ungated.
3. Build the Post tab's first real MVP surface:
   - Verified users can start a job post flow.
   - Unverified users see the verification gate.
   - Do not implement full admin verification here.
4. Add real Home search/filter UI only after detail routes exist:
   - Keep filtering local/static first.
   - Do not build full database ranking yet.
5. Move remaining direct Supabase reads/writes out of screens as each touched screen is updated.

## Do Not Start With

- Full admin dashboard.
- Full verification upload/review pipeline.
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
Implement the next dashboard slice: browse-only Job Detail and Worker Profile Detail routes from the Home feed, then wire locked Message/Save/Post actions to a consistent verification gate.

Please:
1. Inspect the current Home, JobCard, WorkerCard, demo data, routing, and verification code.
2. List the files you intend to change before editing.
3. Keep feed data static/demo for this slice.
4. Keep View Job and View Profile available to unverified viewer-mode users.
5. Gate Message, Save, and Post actions behind verification.
6. Keep screens thin and put reusable UI in /components.
7. Run npm run lint and npx tsc --noEmit when possible.
```
