# Konektado Agent Instructions

Use this file as the first stop for any AI or agent working in this repository.

## Source of Truth

- Read `/docs` before changing code.
- Treat `/docs` as the product, architecture, permissions, and design source of truth.
- Pay special attention to:
  - `docs/00-project-brief.md`
  - `docs/01-product-scope.md`
  - `docs/03-feature-map.md`
  - `docs/04-user-flows.md`
  - `docs/07-auth-and-permissions.md`
  - `docs/08-design-system.md`
  - `docs/09-development-rules.md`
  - `docs/10-ai-instructions.md`
  - `docs/11-decision-log.md`
  - `docs/12-coding-kickoff.md`

## Current MVP Decisions

- Auth for the MVP is email OTP signup plus password login through Supabase Auth.
- Do not require custom SMTP for the MVP. Supabase's default email sender is acceptable for local/demo work, but the Confirm sign up and Magic Link email templates must include `{{ .Token }}` for the app's email-code flow.
- Do not require SMS OTP, mobile OTP, or an SMS gateway for the MVP unless explicitly requested later.
- Phone-first auth can remain a future improvement when hardware/provider access is available.
- Main mobile navigation is Home, Post, Messages, Profile.
- One account can have both Work Profile and Hiring Profile.
- Use Services in the UI, not Skills.
- Do not implement Apply/Application as the primary flow. Use Messages and Mark Hired.
- Verification gates posting, messaging, saving if enabled, and reviews.
- No in-app payments.

## Coding Rules

- Keep screens thin.
- Do not put Supabase queries directly inside reusable UI components.
- Backend calls belong in `/services`.
- Reusable UI belongs in `/components`.
- Shared types belong in `/types`.
- Prefer existing project patterns and Expo-compatible packages.
- Do not invent features outside documented MVP scope.
- Do not start the Expo dev server automatically. The user will run Expo manually when they want to test the app.

## Documentation Rules

- Update `/docs` whenever product scope, auth/onboarding behavior, permissions, data model, architecture, or major UI direction changes.
- Record major decisions in `docs/11-decision-log.md`.
- If code and docs disagree, stop and update the docs or ask for clarification before building more behavior.
- Before editing code, list the files you intend to change and why.
- After editing, summarize changed files and run `npm run lint` when possible.
