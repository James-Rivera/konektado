# Konektado

Konektado is a barangay-level mobile app for connecting local hiring and local work services.

Stack:

- Expo Router + React Native + TypeScript
- Supabase Auth, Postgres, and Storage

This repository is currently in MVP build mode. The UI is largely aligned to the Konektado Figma, with core authentication, onboarding, verification, and admin verification review already wired.

## Current App State

### Implemented and working

- Auth flow
  - Email OTP signup + password creation.
  - Email/password login.
  - Session-based routing guards.
- Role and onboarding flow
  - Role intent supports client, provider, and both.
  - Multi-step onboarding under app/(onboarding).
  - Onboarding completion tracked through user_preferences and profile basics.
- Home dashboard foundation
  - Figma-style Home structure (top header, search, setup banner, filter pills, feed section).
  - Intent-based default feed filter (Jobs, Workers, or For you).
- Verification flow (resident side)
  - Multi-step verification request UI in app/verification.tsx and components/verification/FigmaVerificationFlow.tsx.
  - Prefill account details.
  - ID type selection, document upload placeholders, face-photo placeholder, review, submit, pending/success/failure states.
  - Writes verification request data and files to Supabase-backed tables/storage.
- Verification flow (admin side)
  - Admin verification dashboard in app/admin/verifications.tsx.
  - Queue listing and detail review.
  - Approve/reject actions with reviewer notes.
  - Profile verification status updates after admin action.
- Core marketplace foundations
  - Home and search surfaces are available.
  - Browse-only job and worker detail routes are available.
  - Message/Save/Post actions remain verification-gated for unverified users.

### Partially implemented (active MVP work)

- Post flow is still being finalized as a complete verified path.
- Home/search feed quality and ranking are not final.
- Messaging is connected at a basic level but not feature-complete.
- Profile management is functional but still needs service-layer and UX polish.

### Not complete yet (known gaps)

- Full real-time messaging feature set (attachments, read receipts, push notifications, group chat).
- Saved items persistence polish.
- Full moderation/reporting beyond verification review.
- Advanced search/filter ranking.
- In-app payments (out of MVP scope).

## Product Rules Used in This Repo

- Main tabs: Home, Post, Messages, Profile.
- One account can have both Work Profile and Hiring Profile.
- Use Services in UI wording, not Skills.
- Do not use Apply/Application as the main flow. Use Messages and Mark Hired.
- Verification gates posting, messaging, saving (if enabled), and reviews.

For detailed scope and decisions, read docs in order:

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

## Current Route Overview

- Auth: app/(auth)/index.tsx, app/(auth)/login.tsx, app/(auth)/register.tsx, app/(auth)/role.tsx
- Onboarding: app/(onboarding)/\*
- Main tabs: app/(tabs)/\*
- Verification: app/verification.tsx
- Admin verification review: app/admin/verifications.tsx
- Detail screens: app/job/[jobId].tsx, app/worker/[workerId].tsx, app/conversation/[conversationId].tsx

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables (Supabase URL and anon key) in your local Expo env setup.

3. Run the app:

```bash
npx expo start
```

Note:

- Do not auto-start Expo from agent scripts. Start it manually when testing.

## Database and Migrations

- Schema and migration scripts are under sql and supabase/migrations.
- Current project-aligned SQL references include:
  - sql/20260329_app_schema.sql
  - sql/20260329_profile_details.sql
  - sql/20260329_role_profile_split.sql
  - sql/20260329_strict_cert_status_decoupling.sql

If setting up a fresh backend, apply the migration set and verify RLS policies for profiles, onboarding, verification requests, and verification files.

## Recommended Next Priorities

1. Finalize verified Post flow end-to-end (creation and visibility in browse paths).
2. Complete verification capture polish where needed for production reliability.
3. Strengthen messaging and hire flow (Messages and Mark Hired path).
4. Add review flow polish.
5. Improve search/feed quality and saved-item persistence.

## Design Source of Truth

- Figma source: https://www.figma.com/design/v6jPKumENGxoQlWbwSFfo5/Konektado

Implement user-facing screens from Figma-first patterns, then adapt to existing project components and service-layer rules.
