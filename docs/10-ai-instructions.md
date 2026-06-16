# AI Instructions for Konektado

Use this instruction file when asking ChatGPT, Claude, Copilot, or another AI tool to help with Konektado.

```text
You are helping build Konektado, a barangay-verified service and micro-gig marketplace for Barangay San Pedro residents.

Treat the /docs folder as the source of truth.

Core context:
- Mobile app built with Expo + React Native + TypeScript.
- Backend planned with Supabase Auth, PostgreSQL, and Supabase Storage.
- Architecture must stay migration-friendly in case the backend moves to a self-hosted server later.
- Figma is the visual source of truth for UI.
- Established Konektado Figma file: https://www.figma.com/design/v6jPKumENGxoQlWbwSFfo5/Konektado
- Before implementing or changing user-facing UI, check the established Konektado Figma file. If a matching screen/component exists, follow it closely. If not, derive the UI from nearby Konektado Figma patterns.

MVP features:
- Authentication.
- Lightweight onboarding with unverified viewer access.
- User profiles.
- Service profiles.
- Barangay verification workflow.
- Job posting.
- Job browsing.
- Message-based job interest and hiring.
- Search and filtering.
- Ratings and feedback.
- Basic admin dashboard.

Controlled MVP taxonomy:
- Home & Local Help: cleaning, laundry help, errands, delivery help, home assistance, minor home fix help, and yard or outdoor help.
- Learning & Digital Help: tutoring, encoding, Canva layout, presentation design, social media help, basic computer lessons, and school project guidance.
- Tech & Document Support: computer setup, phone setup, WiFi/router help, printer setup, basic troubleshooting, document formatting, and resume or form assistance.
- This is a taxonomy-only MVP. Do not add schema fields such as `service_type`, `risk_level`, `location_required`, or category tables unless explicitly requested later.
- Minor home fix help covers non-licensed household maintenance only, such as loose hinges, shelves, handles, and curtain-rod adjustments. Exclude plumbing, electrical work, construction, and appliance work involving wiring or internal disassembly.
- Barangay verification confirms resident identity and platform eligibility; it does not certify professional competence.

Out of scope for MVP:
- In-app payments.
- Payroll.
- Complex contract system.
- AI-powered matching.
- National ID API integration.
- Municipal or national government system integration.
- Advanced messaging such as calls, push delivery, per-message read receipts, or group chat. Private image messages and conversation unread counts are approved.
- Gaming services, account sharing, academic cheating, licensed/high-risk work, regulated advice, file-delivery workflows, or professional skill certification.

Architecture rules:
- Keep screens thin.
- Do not place database queries directly inside UI components.
- Put backend calls in /services.
- Put reusable UI in /components.
- Put shared types in /types.
- Put reusable hooks in /hooks.
- Put global state in /stores only when needed.
- Follow the data model in docs/05-data-model.md.
- Follow permissions in docs/07-auth-and-permissions.md.
- Follow API contracts in docs/06-api-contracts.md.
- Follow design rules in docs/08-design-system.md.
- Follow development rules in docs/09-development-rules.md.

Onboarding and verification rules:
- Keep initial onboarding lightweight so users can enter the app quickly.
- First onboarding uses role intent plus taste setup: "What services can you offer?" for workers, "What help do you need nearby?" for clients, and both sections for both-role users.
- Store taste setup in `user_preferences`; do not treat these preferences as certificates or barangay verification data.
- The first onboarding path is role intent -> basic identity/location -> service preferences -> review -> complete -> Home viewer mode.
- First onboarding completion requires `user_preferences.onboarding_completed_at` plus basic profile identity: first name, last name or full name, city, and barangay.
- First onboarding must not collect certificates, ID documents, selfie/photo uploads, or verification files.
- Home default filter comes from `user_preferences.intent`: provider opens Jobs, client opens Services, both or missing opens For you.
- Do not require all ID, services, and credential details before the user can view the app.
- Use Supabase email OTP signup plus password creation for the MVP; login is email/password.
- Do not require custom SMTP for the MVP. Supabase's default email sender is acceptable for local/demo testing, but the Magic Link and Confirm sign up email templates must include `{{ .Token }}` for the app's email-code flow.
- Supabase Auth OTP length must be configured to 6 digits. The app and email template intentionally accept/display exactly six digits.
- In app code, onboarding email OTP codes must be handled through `services/auth.service.ts`. The MVP signup path is email -> OTP -> create password: call `signInWithOtp({ email, options: { shouldCreateUser: true, data } })`, resend by calling `signInWithOtp()` again, verify with `verifyOtp({ type: 'email' })`, then save the real password with `updateUser({ password })` after Supabase creates a session.
- Do not use SMS/mobile OTP for account authentication. The approved barangay verification flow separately uses server-side contact OTP with restricted local simulation.
- Phone-first account entry remains a future option when provider access and device testing are available.
- Current auth state as of 2026-05-03, Asia/Shanghai: root cause found and fixed. Supabase Auth was configured to generate 8-digit OTP codes while the app and email template displayed and accepted 6 digits. Supabase Auth OTP length is now set to 6 digits. The UI is guarded 6-digit auto-submit.
- Before barangay verification, users are unverified viewers.
- Unverified viewers may browse limited public content but may not post jobs, create public service posts, message users, save if verification-gated, or leave reviews.
- The verification flow is where heavier requirements belong: contact confirmation, email confirmation, optional phone number, ID documents, services, credentials, selfie/photo for manual barangay comparison, and supporting details.
- Barangay verification is the trust gate for marketplace interaction.
- The main app navigation is Home, Search, Post, Messages, Profile.
- One account can have both Work Profile and Hiring Profile.
- Use Skills for profile-owned abilities and Services for active service listings. Do not use Skills when referring to active marketplace offers.
- Do not implement Apply/Application as the primary flow. Use Messages and Mark Hired.
- Keep profile ownership separate from listing ownership. Core Profile owns identity and trust; Work Profile owns skills/defaults/reputation/history; Hiring Profile owns client preferences/reputation/history. Services/jobs own rates, budgets, schedules, requirements, message options, and marketplace inventory.
- Current implementation limitations: Home is still mostly demo/static, locked actions route to a Figma-matched verification intro/request flow, admin verification review is still pending, and verified-origin database filtering is pending.

Before editing code:
- List the files you plan to change.
- Explain why each file needs to change.
- Ask before changing the architecture, data model, permissions model, or MVP scope.

When implementing:
- Do not invent features outside the documented scope.
- Use TypeScript types.
- Keep code simple and readable.
- Prefer existing project patterns.
- Add only necessary dependencies.
- Do not expose private verification data in public UI.
- Do not implement payments or external government integrations.

After implementation:
- Summarize what changed.
- List affected files.
- Mention any tests or checks run.
- Mention remaining limitations or follow-up tasks.
```

## Short Version

```text
Use /docs as the source of truth. Do not invent out-of-scope features. Follow the data model, permissions, service-layer architecture, and Figma design direction. Keep screens thin and put Supabase/backend calls in /services. List affected files before editing. Ask before changing architecture or scope. Summarize changes after implementation.
```
