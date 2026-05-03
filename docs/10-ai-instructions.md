# AI Instructions for Konektado

Use this instruction file when asking ChatGPT, Claude, Copilot, or another AI tool to help with Konektado.

```text
You are helping build Konektado, a barangay-verified job matching and service access mobile app for Barangay San Pedro residents.

Treat the /docs folder as the source of truth.

Core context:
- Mobile app built with Expo + React Native + TypeScript.
- Backend planned with Supabase Auth, PostgreSQL, and Supabase Storage.
- Architecture must stay migration-friendly in case the backend moves to a self-hosted server later.
- Figma is the visual source of truth for UI.

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

Out of scope for MVP:
- In-app payments.
- Payroll.
- Complex contract system.
- AI-powered matching.
- National ID API integration.
- Municipal or national government system integration.
- Advanced messaging such as attachments, calls, read receipts, or group chat.

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
- Home default filter comes from `user_preferences.intent`: provider opens Jobs, client opens Workers, both or missing opens For you.
- Do not require all ID, services, and credential details before the user can view the app.
- Use Supabase email OTP signup plus password creation for the MVP; login is email/password.
- Do not require custom SMTP for the MVP. Supabase's default email sender is acceptable for local/demo testing, but the Magic Link and Confirm sign up email templates must include `{{ .Token }}` for the app's email-code flow.
- Supabase Auth OTP length must be configured to 6 digits. The app and email template intentionally accept/display exactly six digits.
- In app code, onboarding email OTP codes must be handled through `services/auth.service.ts`. The MVP signup path is email -> OTP -> create password: call `signInWithOtp({ email, options: { shouldCreateUser: true, data } })`, resend by calling `signInWithOtp()` again, verify with `verifyOtp({ type: 'email' })`, then save the real password with `updateUser({ password })` after Supabase creates a session.
- Do not add SMS OTP, mobile OTP, or an SMS gateway unless explicitly requested later.
- Phone-first account entry remains a future option when provider access and device testing are available.
- Current auth state as of 2026-05-03, Asia/Shanghai: root cause found and fixed. Supabase Auth was configured to generate 8-digit OTP codes while the app and email template displayed and accepted 6 digits. Supabase Auth OTP length is now set to 6 digits. The UI is guarded 6-digit auto-submit.
- Before barangay verification, users are unverified viewers.
- Unverified viewers may browse limited public content but may not post jobs, create public service posts, message users, save if verification-gated, or leave reviews.
- The verification flow is where heavier requirements belong: contact confirmation, email confirmation, optional phone number, ID documents, services, credentials, selfie/photo for manual barangay comparison, and supporting details.
- Barangay verification is the trust gate for marketplace interaction.
- The main app navigation is Home, Post, Messages, Profile.
- One account can have both Work Profile and Hiring Profile.
- Use Services in UI, not Skills, unless referring to internal database/history.
- Do not implement Apply/Application as the primary flow. Use Messages and Mark Hired.
- Current implementation limitations: Home is still mostly demo/static, locked actions need full verification routing, and verified-origin database filtering is pending.

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
