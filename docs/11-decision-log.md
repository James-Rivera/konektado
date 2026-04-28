# Decision Log

This file records project decisions that affect scope, architecture, and implementation.

| ID | Date | Decision | Status | Rationale | Consequences |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | 2026-04-28 | Use Expo because the prototype already exists in Expo Go. | Accepted | The current project is already an Expo app, making iteration and testing faster for MVP/thesis work. | Continue with Expo Router and Expo-compatible libraries. |
| DEC-002 | 2026-04-28 | Use TypeScript for maintainability. | Accepted | TypeScript helps keep service contracts, data models, and screen props safer as the app grows. | New app code should be written in TypeScript with shared types in `/types`. |
| DEC-003 | 2026-04-28 | Use Supabase for MVP backend speed. | Accepted | Supabase provides Auth, PostgreSQL, Storage, and Row Level Security quickly enough for MVP delivery. | Backend calls should be isolated in `/services` so Supabase can be replaced later if needed. |
| DEC-004 | 2026-04-28 | Use PostgreSQL because the app has relational data. | Accepted | Users, profiles, skills, jobs, applications, verification, and reviews are relational and need constraints. | Use SQL migrations, foreign keys, indexes, and RLS policies. |
| DEC-005 | 2026-04-28 | Keep payments outside the app. | Accepted | Payments add legal, technical, and operational complexity beyond MVP/thesis scope. | Job budgets are informational only. Final payment and agreements happen outside Konektado. |
| DEC-006 | 2026-04-28 | Keep architecture migration-friendly for possible future self-hosting. | Accepted | The project may later move away from Supabase to a home server or custom backend. | Keep screens thin, isolate backend logic in `/services`, and avoid Supabase-specific logic in UI components. |
| DEC-007 | 2026-04-28 | Use lightweight onboarding with unverified viewer mode before full verification. | Accepted | New users should understand and enter the app quickly, while barangay verification remains the trust gate for marketplace interaction. | Initial onboarding stays simple. Verification collects heavier requirements such as contact confirmation, optional email, ID, skills/services, credentials, and supporting details. Unverified users can browse but cannot post, apply, message, or review. |
| DEC-008 | 2026-04-28 | Prefer phone-first account entry, with optional email collected during verification. | Accepted | Mobile number entry is more familiar locally and has lower effort than asking for full profile details immediately. It also avoids anonymous viewer complexity by still creating a lightweight account. | Auth/onboarding should start with mobile number verification where feasible. Verification collects optional email, identity details, ID files, skills/services, credentials, and selfie/photo for manual barangay review. |

## How to Add Decisions

When a major decision changes scope, architecture, data model, security, or delivery priorities, add a new row:

| ID | Date | Decision | Status | Rationale | Consequences |
| --- | --- | --- | --- | --- | --- |
| DEC-XXX | YYYY-MM-DD | Decision statement. | Proposed/Accepted/Replaced | Why this decision was made. | What this changes for the project. |
