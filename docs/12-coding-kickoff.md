# Coding Kickoff

Use this file when starting a fresh coding chat for Konektado.

## Current State

The current repository is an Expo Router + React Native + TypeScript app backed by Supabase. The code still contains an older prototype structure:

- `Home / Explore / Profile` tabs.
- Some direct Supabase queries inside screens.
- A legacy `job_applications` flow.
- Starter theme tokens that do not yet match the Figma design.
- Email OTP signup plus password login is the accepted MVP path; SMS/mobile OTP is deferred.

The current product/design direction is documented in `/docs` and in the Konektado Figma file. Development should now move toward:

- `Home / Post / Messages / Profile` tabs.
- Home feed with jobs and workers.
- Post dashboard and create job/offer service flows.
- Basic message-based job interest.
- Work Profile and Hiring Profile in one account.
- Verification-gated marketplace actions.
- Email OTP signup and email/password login for MVP.

## Recommended First Coding Slice

Start with the app shell and design foundation before implementing database-heavy flows.

1. Create Konektado theme tokens in `constants/theme.ts`.
2. Add shared UI components:
   - `AppHeader`
   - `BottomNav`
   - `SearchBar`
   - `Pill`
   - `NoticeBanner`
   - `PrimaryButton`
   - `EmptyState`
   - `WorkerCard`
   - `JobCard`
3. Replace tabs with:
   - Home
   - Post
   - Messages
   - Profile
4. Build static/dummy-data versions of:
   - Home feed
   - Post dashboard
   - Messages locked/inbox placeholder
   - Profile Work/Hiring tabs
5. Run lint and verify the app boots.

This slice gives the project a stable visual and navigation base before adding Supabase services.

## Do Not Start With

- Full admin dashboard.
- Full verification upload pipeline.
- Advanced chat features.
- Push notifications.
- Payment logic.
- Rebuilding every Figma variant.

## Ideal Fresh Chat Prompt

```text
We are starting Konektado development from the current repo.

Please inspect the repository and read the /docs folder first. Treat /docs as the source of truth, especially:
- docs/00-project-brief.md
- docs/01-product-scope.md
- docs/03-feature-map.md
- docs/05-data-model.md
- docs/06-api-contracts.md
- docs/08-design-system.md
- docs/09-development-rules.md
- docs/10-ai-instructions.md
- docs/12-coding-kickoff.md

Project context:
- Konektado is a barangay-level job and service matching mobile app.
- Stack: Expo Router, React Native, TypeScript, Supabase.
- Current Figma direction uses Home, Post, Messages, Profile.
- One account can have both Work Profile and Hiring Profile.
- Use Services in UI, not Skills.
- Do not implement Apply/Application as the primary flow. Use Messages and Mark Hired.
- Verification gates posting, messaging, saving if enabled, and reviews.
- No in-app payments.

First task:
Build the first development slice: app shell + shared UI foundation.

Please:
1. Inspect the existing code structure.
2. Tell me the files you will change.
3. Update the tab navigation to Home, Post, Messages, Profile.
4. Add or update Konektado theme tokens.
5. Create reusable UI components needed for the Figma-style screens.
6. Implement static/dummy-data versions of Home, Post, Messages, and Profile tabs.
7. Keep screens thin and avoid Supabase queries inside UI components.
8. Run lint if possible and report any issues.

Do not build the full database flow yet. The goal is to make the app match the Figma shell and prepare clean components for the next slices.
```
