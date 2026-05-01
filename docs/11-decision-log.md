# Decision Log

This file records project decisions that affect scope, architecture, and implementation.

| ID | Date | Decision | Status | Rationale | Consequences |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | 2026-04-28 | Use Expo because the prototype already exists in Expo Go. | Accepted | The current project is already an Expo app, making iteration and testing faster for MVP/thesis work. | Continue with Expo Router and Expo-compatible libraries. |
| DEC-002 | 2026-04-28 | Use TypeScript for maintainability. | Accepted | TypeScript helps keep service contracts, data models, and screen props safer as the app grows. | New app code should be written in TypeScript with shared types in `/types`. |
| DEC-003 | 2026-04-28 | Use Supabase for MVP backend speed. | Accepted | Supabase provides Auth, PostgreSQL, Storage, and Row Level Security quickly enough for MVP delivery. | Backend calls should be isolated in `/services` so Supabase can be replaced later if needed. |
| DEC-004 | 2026-04-28 | Use PostgreSQL because the app has relational data. | Accepted | Users, profiles, services, jobs, conversations, verification, and reviews are relational and need constraints. | Use SQL migrations, foreign keys, indexes, and RLS policies. |
| DEC-005 | 2026-04-28 | Keep payments outside the app. | Accepted | Payments add legal, technical, and operational complexity beyond MVP/thesis scope. | Job budgets are informational only. Final payment and agreements happen outside Konektado. |
| DEC-006 | 2026-04-28 | Keep architecture migration-friendly for possible future self-hosting. | Accepted | The project may later move away from Supabase to a home server or custom backend. | Keep screens thin, isolate backend logic in `/services`, and avoid Supabase-specific logic in UI components. |
| DEC-007 | 2026-04-28 | Use lightweight onboarding with unverified viewer mode before full verification. | Accepted | New users should understand and enter the app quickly, while barangay verification remains the trust gate for marketplace interaction. | Initial onboarding stays simple. Verification collects heavier requirements such as contact confirmation, optional email, ID, services, credentials, and supporting details. Unverified users can browse but cannot post, message, save if gated, or review. |
| DEC-008 | 2026-04-28 | Prefer phone-first account entry, with optional email collected during verification. | Accepted | Mobile number entry is more familiar locally and has lower effort than asking for full profile details immediately. It also avoids anonymous viewer complexity by still creating a lightweight account. | Auth/onboarding should start with mobile number verification where feasible. Verification collects optional email, identity details, ID files, services, credentials, and selfie/photo for manual barangay review. |
| DEC-009 | 2026-05-01 | Use Home, Post, Messages, Profile as the final mobile navigation. | Accepted | The current Figma flow is built around discovery, listing creation/management, coordination, and profile management. | Replace the older Home/Explore/Profile prototype with four tabs. |
| DEC-010 | 2026-05-01 | Use message-based job interest instead of a formal application flow for MVP. | Accepted | Konektado behaves more like a local barangay marketplace than Upwork. Low-literacy users will understand messaging and hiring more easily than applications. | Remove Apply/Application from primary UI. Implement conversations, messages, and Mark Hired. Existing `job_applications` code becomes legacy/prototype code. |
| DEC-011 | 2026-05-01 | Use Services as the user-facing provider profile concept. | Accepted | Services is clearer than Skills for local users and matches the final profile/post designs. | UI should say Services. Data can temporarily map from `provider_profiles.service_type` until a services table exists. |
| DEC-012 | 2026-05-01 | One account has both Work Profile and Hiring Profile. | Accepted | Users can both offer services and hire help without switching accounts. | Profile tab needs two modes. Shared identity stays in `profiles`; role-specific data lives in provider/client profile data. |
| DEC-013 | 2026-05-01 | Public feed/search cards should not repeat verified badges by default. | Accepted | Verification is already the gate for interaction, and repeated badges clutter the feed. | Keep verification cues in profile, verification flow, details, and owner/admin states. |

## How to Add Decisions

When a major decision changes scope, architecture, data model, security, or delivery priorities, add a new row:

| ID | Date | Decision | Status | Rationale | Consequences |
| --- | --- | --- | --- | --- | --- |
| DEC-XXX | YYYY-MM-DD | Decision statement. | Proposed/Accepted/Replaced | Why this decision was made. | What this changes for the project. |
