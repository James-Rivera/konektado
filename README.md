# Konektado

Konektado is a barangay-verified mobile marketplace for local jobs and services in Barangay San Pedro. It helps residents find trusted nearby service providers, post simple jobs, coordinate through messages, and gives barangay admins a focused verification review workflow.

The MVP is built with Expo, React Native, TypeScript, Expo Router, and Supabase Auth/PostgreSQL/Storage.

## Table of Contents

- [Product Scope](#product-scope)
- [Current Status](#current-status)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Supabase Setup](#supabase-setup)
- [Quality Checks](#quality-checks)
- [Architecture Rules](#architecture-rules)
- [Design Source of Truth](#design-source-of-truth)
- [Security Notes](#security-notes)
- [Documentation](#documentation)

## Product Scope

Konektado is focused on a thesis/demo-ready MVP:

- Email OTP signup, password creation, email/password login, and session routing.
- Lightweight onboarding for client, provider, or both-role users.
- Unverified viewer mode so users can browse before barangay approval.
- Barangay verification request flow with file uploads and admin review.
- Home marketplace feed for jobs and workers.
- Job posting and browsing.
- Message-based job interest and coordination.
- Mark Hired workflow.
- Reviews and basic moderation foundations.
- Admin verification dashboard.

Out of scope for the MVP:

- In-app payments, payroll, escrow, and contract signing.
- AI matching.
- National ID, municipal, provincial, or national government integrations.
- SMS OTP.
- Advanced chat features such as calls, attachments, read receipts, group chat, and push notifications.

## Current Status

Implemented or connected:

- Supabase Auth email OTP signup plus password creation.
- Email/password login and session guards.
- Role intent and onboarding completion through `user_preferences`.
- Figma-aligned Home feed foundation.
- Browse-only job and worker detail routes.
- Verification request flow with Supabase Storage uploads.
- Admin verification queue with approve/reject actions.
- Real services/jobs foundations and basic messaging/hiring workflows.
- Verification gates for posting, messaging, saving where enabled, and reviews.

Known MVP limitations:

- Some marketplace surfaces still use demo/static data or lightweight ranking.
- Verified-origin database filtering is still being hardened.
- Search, saved items, reviews, and profile management need more polish.
- Camera capture for verification files is not yet the baseline path; upload picker support is the current MVP path.

## Tech Stack

- Expo 55
- React 19
- React Native 0.83
- TypeScript
- Expo Router
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- Supabase Edge Functions
- ESLint through Expo

## Repository Structure

```text
app/                  Expo Router screens and navigation
components/           Reusable UI and flow components
constants/            Theme tokens, app constants, demo data
docs/                 Product, architecture, permissions, and design source of truth
hooks/                Reusable React hooks
scripts/              Local utility scripts
services/             Backend/service-layer functions
sql/                  SQL references and notes
supabase/             Supabase config, migrations, functions, email templates
types/                Shared TypeScript types
utils/                Low-level utilities such as the Supabase client
```

## Prerequisites

- Node.js compatible with Expo 55.
- npm.
- Expo Go or an Android/iOS simulator.
- A Supabase project for Auth, PostgreSQL, Storage, and Edge Functions.
- Supabase CLI when working with migrations or functions.

## Environment Variables

Create a local `.env` file for development. Do not commit it.

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_KEY=your_supabase_anon_or_publishable_key
```

Only `EXPO_PUBLIC_*` values are available to the Expo client. Never place service-role keys, database passwords, SMTP passwords, Resend keys, or other backend secrets in Expo public variables.

The verification email test script can also read:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VERIFICATION_EMAIL_BASE_URL=your_supabase_or_local_function_base_url
```

These values are for local/backend testing only and must stay out of client code.

## Local Development

Install dependencies:

```bash
npm install
```

Start Expo manually:

```bash
npm start
```

Platform shortcuts:

```bash
npm run android
npm run ios
npm run web
```

Agents should not start Expo automatically. Run the dev server manually when you are ready to test the app.

## Supabase Setup

Supabase assets live under `supabase/`.

Important locations:

- `supabase/migrations/` - current migration set.
- `supabase/functions/verification-email/` - barangay verification email Edge Function.
- `supabase/email-templates/` - Auth email OTP template references.
- `supabase/README.md` - backend-specific setup notes.

Auth requirements:

- Signup uses Supabase email OTP through `signInWithOtp`.
- The app expects a 6-digit code.
- Supabase Auth OTP length must be configured to 6 digits.
- Magic Link and Confirm sign up templates must include `{{ .Token }}`.
- SMS OTP is intentionally not required for the MVP.

Verification email requirements:

- Barangay verification status emails are separate from Supabase Auth emails.
- Production transport should prefer Resend on the verified `konektado.app` sender domain.
- See `docs/13-verification-email-setup.md` for Edge Function environment variables and testing.

## Quality Checks

Run lint before marking work complete:

```bash
npm run lint
```

Run TypeScript checks when changing routes, services, hooks, types, database-facing code, or shared data structures:

```bash
npx tsc --noEmit
```

Test the verification email function when changing email templates or transport:

```bash
npm run test:verification-email -- verification_submitted <requestId>
```

Manual smoke paths for MVP work:

- Register -> verify email OTP -> create password -> onboarding -> Home.
- Unverified user browses jobs/workers but is routed to verification for locked actions.
- Resident submits verification request.
- Admin approves or rejects a verification request.
- Verified client posts a job.
- Verified provider opens a job and starts a message.
- Client marks a worker as hired.

## Architecture Rules

Keep implementation aligned with the documented architecture:

- Screens in `app/` should stay thin.
- Backend calls belong in `services/`.
- Reusable UI belongs in `components/`.
- Shared types belong in `types/`.
- Reusable hooks belong in `hooks/`.
- Supabase-specific details should be isolated behind services or utilities where practical.
- Do not put database queries directly inside reusable UI components.
- Do not add broad dependencies for small utilities.
- Keep Row Level Security strict for all app tables.

Product rules that should not regress:

- Main tabs are Home, Post, Messages, and Profile.
- One account can have both Work Profile and Hiring Profile.
- Use "Services" in user-facing copy, not "Skills".
- Do not make Apply/Application the primary flow. Use Messages and Mark Hired.
- Verification gates marketplace interactions.
- No in-app payments.

## Design Source of Truth

Figma is the visual source of truth for user-facing screens:

https://www.figma.com/design/v6jPKumENGxoQlWbwSFfo5/Konektado

Before implementing or changing a screen/component, inspect the matching Figma node when available. If the exact screen is missing, derive the UI from nearby Konektado patterns and keep the implementation responsive instead of copying fixed frame dimensions.

Konektado uses Satoshi as the app font family. Do not introduce another font family unless the design system changes.

## Security Notes

- Do not commit `.env`, `.env.local`, or local secret files.
- Keep service-role keys and provider secrets out of frontend code.
- Public Expo variables must contain only client-safe values.
- Do not expose private verification files, admin notes, raw auth metadata, or restricted profile data in public UI.
- Use Supabase RLS and service-layer checks for permission-sensitive actions.
- Prefer status changes over hard deletes for business records.

## Documentation

The `/docs` directory is the source of truth for product, architecture, permissions, and implementation decisions. Start with:

- `docs/00-project-brief.md`
- `docs/01-product-scope.md`
- `docs/03-feature-map.md`
- `docs/04-user-flows.md`
- `docs/05-data-model.md`
- `docs/06-api-contracts.md`
- `docs/07-auth-and-permissions.md`
- `docs/08-design-system.md`
- `docs/09-development-rules.md`
- `docs/10-ai-instructions.md`
- `docs/11-decision-log.md`
- `docs/12-coding-kickoff.md`
- `docs/13-verification-email-setup.md`

Update `/docs` when product scope, auth/onboarding behavior, permissions, data model, architecture, or major UI direction changes. This README should remain the production entry point; the deeper docs should carry detailed product and engineering decisions.
