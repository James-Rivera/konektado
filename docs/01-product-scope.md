# Product Scope

## MVP Included Features

| Area | Included in MVP | Notes |
| --- | --- | --- |
| Authentication | Email OTP signup, email/password login, logout, session handling. | Use Supabase Auth. |
| Lightweight Onboarding | Let users enter the app quickly as unverified viewers. | Role intent -> basic identity/location -> service preferences -> review -> complete -> Home. Do not collect certificates, ID documents, or verification uploads here. |
| Roles | Client, provider, both, and barangay admin. | Both-role users receive client and provider role rows, but one active role is used in the app at a time. |
| Profiles | Basic identity, address, contact, about, availability, and verification status. | Keep private identity fields protected. |
| Service Profiles | Provider service categories, descriptions, experience, availability, and optional rate text. | Use "Services" in the UI; avoid abstract "skills" language for low-literacy users. |
| Credentials | Upload records for IDs, certificates, or proof of experience. | Store files in Supabase Storage and metadata in PostgreSQL. |
| Verification | Resident submits required details and documents; admin approves or rejects. | Verification unlocks interaction features and grants the verified badge. |
| Jobs | Client creates, edits, closes, or cancels a job post. | Payments and agreements remain outside the app. |
| Job Browsing | Providers browse open jobs. | Search/filter by category, location, status, budget, and date. |
| Messages / Interest | Verified users message job posters or workers to show interest and coordinate. | This replaces a formal application flow for MVP. |
| Hiring Decision | Clients can mark a worker as hired from a job-related conversation. | Keep the decision simple: interested, hired, completed, declined/cancelled. |
| Reviews | Completed job participants can leave rating and feedback. | One review per reviewer/reviewee/job. |
| Admin Dashboard | Basic review queues for verification requests, reports, users, jobs, and reviews. | Admin UI can be simple but must be reliable. |

## MVP Excluded Features

The following are intentionally out of scope for MVP:

- In-app payments.
- Payroll or automatic salary distribution.
- Escrow.
- Contract signing.
- AI-powered matching.
- National ID API verification.
- Integration with municipal, provincial, or national government systems.
- Complex scheduling or calendar booking.
- Advanced analytics.
- Multi-barangay administration.
- Push notifications beyond basic future support.
- Advanced chat features such as attachments, read receipts, calls, or group chat.

## Future Features

These can be considered after the MVP is stable:

- Advanced messaging features after basic MVP chat is stable, such as attachments, read receipts, calls, and group chat.
- Saved jobs and saved providers.
- Provider availability calendar.
- Notification center and push notifications.
- Admin analytics dashboard.
- More detailed provider portfolio.
- Multi-barangay support.
- Offline-friendly profile/job draft saving.
- Self-hosted backend migration.
- Public web directory view for approved providers.

## Thesis/Demo Priorities

The thesis demo should prove the core problem and workflow, not every possible feature.

Highest demo priority:

1. A resident can register and complete a profile.
2. A new user can choose find work, hire someone, or both, select lightweight service preferences, and enter the app as an unverified viewer with limited access.
3. A user can request barangay verification with email/contact confirmation, optional phone number, ID, services, and supporting details.
4. A barangay admin can approve or reject verification.
5. A verified provider can create a service profile.
6. A verified client can post a job.
7. A verified provider can browse a job and message the client to show interest.
8. A client can view interested workers in Messages and mark a worker as hired.
9. Verification-gated actions clearly block unverified users.
10. A completed job can receive a rating/review.

## Final MVP Screen Set

The coding MVP should prioritize the screens already represented in the current Figma structure:

| Tab / Area | Screens |
| --- | --- |
| Auth / Onboarding | Splash, login/register, role intent, light profile setup, verification gate. |
| Home | Dashboard feed, search mode, jobs/workers filters, empty state, verification prompt. |
| Post | Post dashboard, create job, offer service, drafts/active/paused states. |
| Details | Job details, public worker profile, public client profile. |
| Messages | Locked state, inbox, search contacts/messages, job conversation, service request, empty chat, report/delete dialogs. |
| Profile | Own Work Profile, own Hiring Profile, complete profile prompts, services, job history, worker feedback. |
| Admin | Web/admin-only verification queue and review details can be simpler than the mobile app. |

Demo acceptance standard:

- The main flows should work from app start to completion.
- The data should persist in Supabase/PostgreSQL.
- The UI should follow the Figma direction closely enough to demonstrate the intended product.
- Error states should be clear and non-technical.

## Current Implementation Limitations

- Home is still mostly demo/static and uses preferences only for ordering and filter defaults.
- Locked actions still need full verification routing.
- Verified-origin database filtering is pending.
