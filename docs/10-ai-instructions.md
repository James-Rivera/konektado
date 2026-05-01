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
- Do not require all ID, services, and credential details before the user can view the app.
- Prefer phone-first account entry if feasible, with optional email collected during verification.
- Before barangay verification, users are unverified viewers.
- Unverified viewers may browse limited public content but may not post jobs, create public service posts, message users, save if verification-gated, or leave reviews.
- The verification flow is where heavier requirements belong: mobile/contact confirmation, optional email, ID documents, services, credentials, selfie/photo for manual barangay comparison, and supporting details.
- Barangay verification is the trust gate for marketplace interaction.
- The main app navigation is Home, Post, Messages, Profile.
- One account can have both Work Profile and Hiring Profile.
- Use Services in UI, not Skills, unless referring to internal database/history.
- Do not implement Apply/Application as the primary flow. Use Messages and Mark Hired.

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
