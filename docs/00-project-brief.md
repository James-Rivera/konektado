# Konektado Project Brief

## App Summary

Konektado is a barangay-verified job matching and service access mobile app for Barangay San Pedro residents. It helps local residents create trusted service profiles, helps clients find nearby service providers or post jobs, and gives barangay admins a basic workflow for user verification and moderation.

The MVP is an Expo + React Native + TypeScript mobile app backed by Supabase Auth, PostgreSQL, and Supabase Storage.

## Main Purpose

Konektado exists to make local hiring safer and easier inside the barangay.

The app should:

- Help residents show their skills, availability, credentials, and contact details.
- Help clients find verified local service providers.
- Help clients post simple jobs that providers can apply to.
- Help barangay admins verify resident identities and review platform activity.
- Keep trust visible through barangay verification, ratings, and clear profile information.

## Onboarding Philosophy

Konektado should let new users enter the app with as little friction as possible. The preferred entry model is phone-first: users start with a mobile number/OTP-style account flow, choose an intended role, and can understand the app before completing full barangay verification.

Before barangay verification, a user is treated as an unverified viewer:

- They may browse limited public marketplace content.
- They may understand available jobs, workers, and services.
- They may not post jobs, create public service posts, apply to jobs, message users, or leave reviews.

The heavier information requirements belong in the verification flow, not the first entry flow. Verification should collect or confirm the user's contact details, optional email, ID documents, skills/services, credentials, selfie/photo for manual comparison, and other barangay-required information.

## Target Users

| User Type | Description | Primary Need |
| --- | --- | --- |
| Resident / Service Provider | A Barangay San Pedro resident who offers skills or services. | Create a trusted profile and find job opportunities. |
| Client / Employer | A resident or local client looking for help with a task. | Find nearby providers or post jobs. |
| Barangay Admin | Authorized barangay personnel who verify users and moderate activity. | Review verification requests, reports, and platform activity. |

## MVP Features

The MVP should focus on a working, demo-ready flow:

- Authentication using Supabase Auth.
- Lightweight onboarding with unverified viewer access.
- Role selection for client and provider use cases.
- User profiles with resident identity and contact details.
- Skill/service profiles for providers.
- Credential upload metadata for proofs, certificates, or experience files.
- Barangay verification request workflow.
- Job posting by clients.
- Job browsing by providers.
- Job applications by providers.
- Search and filtering for jobs and providers.
- Ratings and feedback after a completed job.
- Basic admin dashboard for verification and moderation.

## Non-Goals

The MVP must not include:

- In-app payments.
- Payroll.
- Escrow or complex contract handling.
- AI-powered matching.
- National ID API integration.
- Municipal, national, or other government system integration.
- Full chat system unless timeline allows it.
- Automated background checks.
- Multi-barangay rollout.

Payments, agreements, scheduling details, and final negotiation happen outside the app.

## Current Project References

- Prototype: Expo Go / React Native project in this repository.
- UI source of truth: Figma file for Konektado.
- Current implementation direction: Expo Router, Supabase Auth, PostgreSQL tables, and React hooks.
- Current visual direction from Figma: mobile-first feed with search, For you/Jobs/Workers filters, worker/job cards, verification badges, and bottom navigation for Home, Post, Messages, and Profile.
