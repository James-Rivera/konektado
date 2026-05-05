# Konektado Project Brief

## App Summary

Konektado is a barangay-verified job matching and service access mobile app for Barangay San Pedro residents. It helps local residents create trusted service profiles, helps clients find nearby service providers or post jobs, and gives barangay admins a basic workflow for user verification and moderation.

The MVP is an Expo + React Native + TypeScript mobile app backed by Supabase Auth, PostgreSQL, and Supabase Storage.

## Main Purpose

Konektado exists to make local hiring safer and easier inside the barangay.

The app should:

- Help residents show their services, availability, credentials, and contact details.
- Help clients find verified local service providers.
- Help clients post simple jobs that workers can view and respond to through messaging.
- Help barangay admins verify resident identities and review platform activity.
- Keep trust visible through barangay verification, ratings, and clear profile information.

## Onboarding Philosophy

Konektado should let new users enter the app with as little friction as possible. For the MVP, use Supabase email OTP for signup, then let the user create a password for normal email/password login. Custom SMTP is not required; Supabase's default email sender is acceptable for MVP/demo work, but the Supabase Confirm sign up and Magic Link email templates must show `{{ .Token }}` instead of only a link, and Supabase Auth OTP length must be configured to 6 digits. Phone-first or SMS OTP entry remains a future improvement when provider access and device testing are practical.

Before barangay verification, a user is treated as an unverified viewer:

- They may browse limited public marketplace content.
- They may understand available jobs, workers, and services.
- They may not post jobs, create public service posts, message users, save marketplace items, or leave reviews.

During first onboarding, users choose whether they want to find work, hire someone, or do both. They then select lightweight service preferences:

- Workers answer "What services can you offer?"
- Clients answer "What help do you need nearby?"
- Both-role users answer both.

These choices personalize the first viewer feed. They are not certificates, proof, or barangay verification data.

The first onboarding path is:

1. Role intent.
2. Basic identity and location.
3. Lightweight service preferences.
4. Review.
5. Complete.
6. Home in viewer mode.

First onboarding completion means `user_preferences.onboarding_completed_at` is set and the user has basic profile identity: first name, last name or full name, city, and barangay. It does not collect certificates, ID documents, selfie/photo uploads, or other verification files.

Home uses onboarding intent to choose the first selected feed filter:

- Provider intent opens Home on Jobs.
- Client intent opens Home on Workers.
- Both intent, missing intent, or missing preferences open Home on For you.

The heavier information requirements belong in the verification flow, not the first entry flow. Verification should collect or confirm the user's contact details, email, optional phone number, ID documents, services, credentials, selfie/photo for manual comparison, and other barangay-required information.

## Target Users

| User Type | Description | Primary Need |
| --- | --- | --- |
| Resident / Service Provider | A Barangay San Pedro resident who offers services. | Create a trusted work profile and find job opportunities. |
| Client / Employer | A resident or local client looking for help with a task. | Find nearby providers or post jobs. |
| Barangay Admin | Authorized barangay personnel who verify users and moderate activity. | Review verification requests, reports, and platform activity. |

## MVP Features

The MVP should focus on a working, demo-ready flow:

- Authentication using Supabase Auth.
- Lightweight onboarding with unverified viewer access.
- Role selection for client, provider, and both-role use cases.
- User profiles with resident identity and contact details.
- Skill/service profiles for providers.
- Credential upload metadata for proofs, certificates, or experience files.
- Barangay verification request workflow.
- Job posting by clients.
- Job browsing by providers.
- Message-based job interest and coordination.
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

## Current Product Direction

The current Figma direction has moved Konektado away from a strict Upwork-style application model and closer to a barangay marketplace model.

Final app navigation:

- Home
- Post
- Messages
- Profile

Core interaction model:

- Home is a mixed discovery feed for jobs and workers.
- Search is for comparison and filtering.
- Post is for creating and managing job posts or service visibility.
- Messages is the main coordination path after a user shows interest.
- Profile has two modes in one account: Work Profile and Hiring Profile.

Important product language:

- Use "Services" in the UI instead of "Skills" when describing what a worker offers.
- Use "Message", "View Job", "View Profile", "Mark Hired", and "Job History".
- Do not use "Apply" or "Application" as the primary user-facing flow unless a future formal application feature is added.
- Public feed cards do not need repeated verification badges because interaction is already verification-gated.

## Current Project References

- Prototype: Expo Go / React Native project in this repository.
- UI source of truth: Figma file for Konektado.
- Current implementation direction: Expo Router, Supabase Auth, PostgreSQL tables, and React hooks.
- Current visual direction from Figma: mobile-first feed with search, For you/Jobs/Workers filters, worker/job cards, post dashboard, message flows, dual-mode profile, and bottom navigation for Home, Post, Messages, and Profile.

## Current Implementation Limitations

- Home is still mostly demo/static and uses preferences only for ordering and filter defaults.
- Locked actions now route to a Figma-matched verification intro and users can submit a pending verification request with contact details, ID files, services/purpose, and supporting files.
- Verified-origin database filtering is pending.
