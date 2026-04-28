# Product Scope

## MVP Included Features

| Area | Included in MVP | Notes |
| --- | --- | --- |
| Authentication | Email/password login, registration, logout, session handling. | Use Supabase Auth. |
| Lightweight Onboarding | Let users enter the app quickly as unverified viewers. | Do not force all verification details before the user understands the app. |
| Roles | Client, provider, and barangay admin. | A user can have one or more roles, but one active role is used in the app at a time. |
| Profiles | Basic identity, address, contact, about, availability, and verification status. | Keep private identity fields protected. |
| Skill Profiles | Provider service categories, descriptions, experience, availability, and optional rate text. | Use clear categories, not AI matching. |
| Credentials | Upload records for IDs, certificates, or proof of experience. | Store files in Supabase Storage and metadata in PostgreSQL. |
| Verification | Resident submits required details and documents; admin approves or rejects. | Verification unlocks interaction features and grants the verified badge. |
| Jobs | Client creates, edits, closes, or cancels a job post. | Payments and agreements remain outside the app. |
| Job Browsing | Providers browse open jobs. | Search/filter by category, location, status, budget, and date. |
| Applications | Providers apply to open jobs; clients review applications. | Keep application statuses simple. |
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

- Advanced messaging features after basic MVP chat is stable.
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
2. A new user can enter the app as an unverified viewer with limited access.
3. A user can request barangay verification with mobile/contact confirmation, optional email, ID, skills/services, and supporting details.
4. A barangay admin can approve or reject verification.
5. A verified provider can create a skill/service profile.
6. A verified client can post a job.
7. A verified provider can browse and apply to a job.
8. A client can review applications.
9. Verified users show a clear verification badge.
10. A completed job can receive a rating/review.

Demo acceptance standard:

- The main flows should work from app start to completion.
- The data should persist in Supabase/PostgreSQL.
- The UI should follow the Figma direction closely enough to demonstrate the intended product.
- Error states should be clear and non-technical.
