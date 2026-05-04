# Konektado Agent Instructions

Use this file as the first stop for any AI or agent working in this repository.

## Source of Truth

- Read `/docs` before changing code.
- Treat `/docs` as the product, architecture, permissions, and design source of truth.
- Treat the established Konektado Figma file as the visual source of truth: `https://www.figma.com/design/v6jPKumENGxoQlWbwSFfo5/Konektado`.
- Before implementing or changing a user-facing screen/component, check the Konektado Figma design for the matching screen or component.
- If the exact screen exists in Figma, follow it closely.
- If the exact screen does not exist, derive the UI from nearby Konektado Figma patterns instead of inventing a separate style.
- Figma is the visual source of truth, but implementation must still be responsive and production-safe. Do not copy Figma as fixed absolute coordinates unless the design explicitly requires it.
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
- Unverified users may browse verified jobs/workers, but interaction actions must route to verification.
- No in-app payments.

## Implementation Scope Rules

- Work in focused vertical slices.
- Do not broadly convert unrelated Figma screens unless the task explicitly asks for them.
- Do not rewrite unrelated screens, routes, services, or shared components.
- Preserve working flows unless the task explicitly requires changing them.
- When implementing a feature, keep the scope limited to the requested workflow and its required dependencies.
- If existing code and the requested Figma design conflict, replace only the affected visual components. Do not rewrite unrelated logic.
- If a screen has already been completed and the task only needs wiring, do not redesign that screen.

## Figma Implementation Rules

- Treat Figma nodes as screen states or flow variants when appropriate, not automatically as separate routes.
- Inspect the Figma nodes first and identify what each one represents before coding.
- When multiple Figma nodes belong to one flow, implement them as one stateful flow unless the app architecture clearly requires separate routes.
- Match Figma layout, spacing, typography, colors, border radius, icon treatment, and component hierarchy closely.
- Do not preserve old visual components when they conflict with the current Figma direction.
- Reuse safe logic, navigation, services, types, and utilities where appropriate.
- Prefer creating flow-specific components when old components cause visual drift.
- Use “services” instead of “skills” in user-facing copy unless explicitly required by the latest approved copy.

## Coding Rules

- Keep screens thin.
- Do not put Supabase queries directly inside reusable UI components.
- Backend calls belong in `/services`.
- Reusable UI belongs in `/components`.
- Shared types belong in `/types`.
- Prefer existing project patterns and Expo-compatible packages.
- Do not invent features outside documented MVP scope.
- Do not start the Expo dev server automatically. The user will run Expo manually when they want to test the app.

## UI Implementation Rules

When implementing Figma designs, match the visual direction closely but do not hardcode the Figma frame size. The app must work across different phone sizes and safe-area environments.

### Responsive layout requirements

- Treat Figma frames as visual references, not fixed screen dimensions.
- Do not hardcode full-screen heights such as `height: 844` or fixed artboard widths such as `width: 390`.
- Avoid `position: absolute` for normal layout sections. Use it only for overlays, floating actions, or intentional layered UI.
- Use flex layouts, responsive widths, spacing tokens, and container padding.
- Cards, inputs, and major sections should usually use `width: '100%'` inside a padded container.
- Text must wrap naturally and must not overflow horizontally.
- Use `SafeAreaView` or `useSafeAreaInsets` for top and bottom spacing.
- For feeds and search results, prefer `FlatList`.
- For detail pages and forms, use `ScrollView` or another scrollable container.
- For forms, handle keyboard overlap with `KeyboardAvoidingView` or an equivalent pattern.
- Sticky bottom actions must respect the bottom safe area and must not cover content.
- Screens with bottom tabs or sticky footers must include enough `paddingBottom` or `contentInset` so the last content remains visible.
- Images should scale responsively and should not overflow their card/container.

### Required responsive checks

Before considering a UI task complete, check the screen against at least these device sizes:

- Small Android-like: `360 x 800`
- Figma baseline: `390 x 844`
- Tall phone: `430 x 932`

The screen should remain usable on all three sizes, including with long text, bottom navigation, sticky action buttons, and keyboard-open states where relevant.

## Data and Backend Rules

- Do not change Supabase schema, migrations, RLS, or seed files unless the task explicitly requires backend/database work.
- When schema changes are required, add a migration. Do not manually patch the remote database without documenting it.
- Do not run destructive database commands unless explicitly requested.
- Do not run `supabase db reset` unless the user confirms they are okay with resetting local data.
- Prefer `supabase db push` for applying committed migrations to the linked remote project.
- Keep RLS policies strict. Public/publishable keys must not allow access beyond documented policies.
- Never put service-role keys, database passwords, SMTP passwords, or provider secret keys in frontend code.

## Environment and Security Rules

- Do not commit `.env` files.
- Keep `.env`, `.env.local`, and other local secret files out of Git.
- Use `.env.example` for safe placeholders only.
- Expo public variables may use `EXPO_PUBLIC_`, but they must only contain values safe for client exposure.
- Never expose Supabase service-role keys, database passwords, email provider secrets, SMS provider secrets, or API secrets in client-side code.
- If a secret is accidentally committed, remove it from Git tracking and rotate the exposed secret.

## Documentation Rules

- Update `/docs` whenever product scope, auth/onboarding behavior, permissions, data model, architecture, or major UI direction changes.
- Record major decisions in `docs/11-decision-log.md`.
- If code and docs disagree, stop and update the docs or ask for clarification before building more behavior.
- Before editing code, list the files you intend to change and why.
- After editing, summarize changed files and run `npm run lint` when possible.
- Run `npx tsc --noEmit` when the task touches types, services, routes, database models, or shared data structures.