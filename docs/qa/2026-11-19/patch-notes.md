# Konektado QA patch notes — 19 November 2026

Status: **verified in a local release candidate.** The demo still runs `f69a12af`; migration `20261118235200` is pending. QA-012 remains deferred by request.

## Fixed

- **Complaint security:** Residents cannot submit complaints already marked resolved or supply staff reviewer details. Complaint targets are checked against the actual job owner, service provider, conversation participants or review author.
- **Complaint privacy:** Internal staff notes and reviewer identity are protected from resident reads. Staff enter a separate safe outcome message for the reporter, which is fully readable in notifications.
- **Chat information:** Realtime refresh retains accurate job/service prices, schedules, locations and lifecycle information. Failed refresh keeps loaded details and offers Retry.
- **Reporting hired conversations:** Accepted complaints no longer produce a false failure by attempting to change protected hiring state.
- **Completion and reviews:** Review eligibility refreshes after completion and when returning to Details. Older responses cannot overwrite newer state.
- **Job actions:** Your Posts and Job Detail use the same action rules. A job in progress offers neither Deactivate nor Close, and a completed job still offers Review when eligible.
- **Photo moderation:** Failed moderation checks withhold images for that load while keeping listing/profile text available. Normal image display recovers after a successful check.
- **Admin backlog:** Server filtering, complete counts and pagination keep older unresolved complaints accessible. Received retains its previous meaning.
- **Report form:** Scrollable content, reachable Submit/Cancel actions and opt-in keyboard handling improve small-phone usability.
- **Account switching:** An old review-report response cannot close or clear a new account's submission.

## Added

- Full complaint and relevant subject inspection, separate internal notes and reporter outcome, and retained private staff-decision history.
- Verification-gated review reporting and admin hide/restore controls. Hidden reviews leave public text and rating summaries; restoration returns them. Original reviews remain immutable.
- Internal demo-editor links to the protected complaint-investigation workflow.
- Focused regression coverage for lifecycle, visibility, report validation and account-switch behavior.

## Database comparison completed

The user-approved final comparison against the linked Konektado Supabase demo project was **read-only**.

| Check | Result |
| --- | --- |
| Hosted migration history | 45 versions |
| Local migration files | 46 versions |
| Hosted versions missing locally | None |
| Common version/name mismatches | None |
| Three recovered migration contents | All match hosted stored statements after restoring statement-ending semicolons and normalizing line endings/outer whitespace |
| Local migrations not yet hosted | One: `20261118235200_secure_report_review_moderation.sql` |

The three recovered historical files are `20261118054147_contain_photo_visibility_writes.sql`, `20261118054152_scope_conversation_moderation.sql`, and `20261118054156_restrict_function_permissions.sql`. They must not be reapplied under new versions.

The first raw text hashes differed because stored statements omit their ending separators. Reconstructing runnable SQL with a semicolon per statement produced direct text equality for each recovered file. This was a migration-history/source comparison, not a complete live-schema or hosted functional audit. [Comparison record](migration-comparison.json).

## Verification and release status

Completed on the release candidate: lint, TypeScript, a local production-mode web export, **327 application tests**, **16 release checks**, **57 local HTTP security checks**, the 46-migration replay, SQL permission suites, and hiring/posting/edit concurrency. The initial repair work also checked the report form in a browser at 360×800, 390×844, 430×932 and reduced height. [Full verification record](repair-verification.md).

The updated client and migration require a coordinated cutover because older clients can lose access to complaint history and staff actions. Native Android acceptance remains pending. [Release procedure](../../19-release-workflow.md).
