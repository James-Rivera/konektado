# QA repairs and verification — 19 November 2026

## Release candidate verification

The QA changes were integrated onto the live web source `f69a12af27da41cf4fdc4d91afba6aa7e4bd46ed` in an isolated local checkout. This preserves production's photo safeguards and the read-only staff view of reported chats. Your Posts now uses the shared job-action rules from Job Detail. Its regression covers open, cancelled, in-progress and completed jobs. The historical report fixture now uses a signed-in reporter for valid records and models an invalid legacy record in the scratch database. Permission tests reflect the signed-in review trust-summary requirement.

The integrated candidate passed lint, TypeScript, 327 application tests, 16 release-preflight tests, a local production-mode web export with synthetic configuration, and all three isolated database suites. Those suites replayed 46 migrations and passed 57 combined HTTP security checks, photo and conversation privacy, function permissions, and concurrent hire, publish and edit checks. The native Android test and hosted smoke test are pending. The sections below record the original audit and repair verification that preceded integration.

## Scope and result

The user approved multi-agent confirmation and repair of the original QA findings, **excluding QA-012's conflicting-instructions cleanup**. Functional, Security/Data and UX/Requirements agents implemented separate slices and challenged each other's work; the QA Lead integrated and verified them. Existing unrelated Home/Search changes were preserved.

The repairs passed local verification. Hosted and native Android acceptance are pending. [Repair contract](repair-contract.md)

## Findings, confirmation and disposition

| Finding | Confirmation obtained | Repair / disposition |
| --- | --- | --- |
| QA-001 migration history | Retrieved the exact stored statement arrays for the three hosted-only versions; replayed the restored 45 historical migrations successfully. The subsequently user-approved read-only comparison confirmed all 45 version/name pairs and the three recovered statement contents. | Three canonical files recovered without renaming/reapplying remotely. The new 46th migration is the sole local pending release change. See the final comparison below. |
| QA-002 forged report review fields | Actual local PostgreSQL/RLS baseline allowed a resident to insert a resolved report with fabricated reviewer metadata. | Column grants and INSERT invariants deny resident administrative fields. Corrected SQL and HTTP bypass tests pass. |
| QA-003 internal notes | Actual local baseline allowed the reporter to SELECT their report's internal note. | Database column access protects notes/reviewer identity; admin-checked RPCs provide staff access; reporter projection/outcome excludes them. |
| QA-004 realtime context | Baseline service/state regressions reproduced loss of job/service detail; failed-read fallback also reproduced. | Actual listing hydration, protected refresh state, accessible Retry and stale-response protection; regression tests pass. |
| QA-005 hired-chat reporting | Baseline service regression showed accepted report followed by failed status write; local backend confirms hired state remains protected. | No second lifecycle write after durable complaint creation. Actual mounted Details shows successful reporting; HTTP test inserts a hired-chat complaint without changing hiring state. |
| QA-006 completion/review | Baseline actual-screen selector/key regression reproduced stale pre-completion eligibility. | Status/focus refresh and stale-result protection. Mounted production Details completed a synthetic job, opened Review immediately without navigating away, and showed submitted state. |
| QA-007 impossible job actions | Baseline action-matrix regression exposed Deactivate/Close for in-progress jobs. | Shared lifecycle policy hides unsupported actions and another hire. No post-hire cancellation policy was invented. |
| QA-008 moderation error | Four baseline actual-service tests failed: hidden/unknown photo URLs survived returned errors or missing decisions. | Five service tests pass after distinguishing failed reads from successful empty results; error/rejection withholds images, preserves text, does not mutate input and recovers after a successful retry. |
| QA-009 backlog | Server fixture/tests cover old unresolved reports outside the newer terminal-report slice; browser fixture demonstrates a second open-report page. | Server status filtering, correct counts, deterministic ordering, Previous/Next pagination and preserved Received semantics. |
| QA-010 report reachability | Source sizing/layout defect; no claim of baseline Android reproduction. | Real ReportSheet browser check: reachable actions at 360×800, 390×844, 430×932 and reduced 360×440; no horizontal overflow and successful submission. Native soft keyboard still needs acceptance. |
| QA-011 complaint outcome | Baseline source established status-only handling, truncated complaint and no note/outcome editor. | Full complaint/subject inspection, internal rationale, separate required terminal outcome, private decision history, complete safe notification text and canonical internal-editor link. Basic staff investigation is supported, not automatic arbitration. |
| QA-012 contradictory instructions | Previously established; user deferred this work. | **Deferred.** Older navigation/phone/Figma instructions were not reconciled. New repair behavior is documented separately. |
| QA-013 abusive reviews | Baseline source lacked review report target/admin visibility path. | Verification-gated review reporting, derived counterparty, staff hide/restore with rationale/audit, consistent public text/rating/count removal and restoration. Original immutable review retained. |

## Executed verification

### Application/source checks

- `npm run lint` and application `npx --no-install tsc --noEmit`: **passed**, exit 0.
- `npm run test:service-classification`: **267 passed, zero failures**, including the prior 247 cases plus 20 focused lifecycle, visibility, report helper and account-switch regressions. The final result is recorded in `.test-build/qa-repair-final-tests.log`.
- `node --test tests/release-preflight.test.cjs`: **16 passed**, zero failures.
- Functional regressions: six baseline failures covering the original mechanisms; nine targeted lifecycle checks pass after repair.
- Visibility regressions: four baseline failures and five passing corrected checks.
- Report helper checks cover server pagination requests and required outcome/rationale validation.
- The review-report hook test executes the actual hook with deferred services and a minimal hook scheduler: A submits → account switches to B → B submits → A finishes. A's response cannot close B's report, clear B's busy state or show A's toast.
- `git diff --check` passes. New tests exercise behavior; historical source assertions remain as prior repository coverage.

Use the regression suites above for release acceptance. The original audit evidence remains in the local QA workspace.

### Real isolated database/API checks

Environment: fresh PostgreSQL 18.1 cluster bound to `127.0.0.1:55439`, synthetic identities, minimal local Supabase Auth/Storage contracts, and official PostgREST 16.3 bound only to localhost. The downloaded archive matched its published SHA-256. No `.env`, hosted credentials, real resident records, email, SMS or Storage uploads were used by these runners.

1. `scripts/test-qa-report-security.cjs` replayed the restored **45-migration baseline**, demonstrated both metadata injection and private-note access, then applied migration 46 and passed `supabase/tests/report-review-security.sql` and **29 HTTP checks**. Checks include resident/admin/outsider boundaries, safe outcomes and notifications, full counts, Received/reopen semantics, review context/author derivation, conflicting listing/user targets, hired-chat reporting, relevant chat evidence, hide/restore, aggregates and retained immutable evidence/audit.
2. `scripts/test-database-security.cjs` passed the **46-migration clean replay**, existing SQL/RLS suite, **28 HTTP checks**, failed-second-write hiring rollback and concurrent-hire single-winner checks. Its valid-job fixture was brought into compliance with the existing November publishing contract; no production validation was weakened.
3. `scripts/test-posting-database.cjs` passed **46 migrations**, all 34 canonical service contracts, security and posting/profile SQL/RLS, validation/rollback/retry, durable edits, stale writes, legacy repair, source conflicts, concurrent publication and concurrent edit checks.

The recovered historical default-grant change exposed a test-harness assumption: newly created temporary assertion functions no longer automatically allow authenticated execution. Only those test helpers received explicit grants in the isolated SQL suites. Application permissions were not widened to make tests pass.

These tests use real PostgreSQL and HTTP authorization but a minimal platform stub. They do not certify managed Auth mail, Storage HTTP signing, Realtime transport or Android operation.

### Mounted browser checks

The Lead bundled static fixtures without starting Expo. They mount production components/routes with explicitly synthetic, in-memory service boundaries; unexpected backend access is disabled. A localhost static file server was used solely for browser checks.

- **Report form:** all three required sizes plus reduced height; long subject, scrolled reasons, text entry, selected reason, reachable Submit/Cancel and successful submission. No horizontal overflow observed. Reduced height approximates limited space; it is not a real Android keyboard test.
- **Production conversation Details:** complete hired job → immediate review form → five-star submit → submitted state; then report completed conversation → successful feedback. Real screen effects/layout run; service persistence is synthetic in this fixture and verified separately by service/SQL tests.
- **Production admin Reports:** 32 open records alongside 125 terminal records; page 2 shows `31–32 of 32 open reports`; full complaint/review text; separate notes/outcome; resolve + Hide → correct queue update; reopen shows hidden evidence; Restore → publicly visible again. Admin no-overflow checks covered 360×800, 390×844 and 430×932. Backend hide/restore/audit/privacy is tested separately through real local SQL/HTTP.

Screenshots are retained as synthetic-only ignored evidence:

- `.test-build/qa-repairs-report-form-360.jpg` — 360×440 reduced-height form with reachable actions.
- `.test-build/qa-repairs-review-open-390.jpg` — review form after same-screen completion.
- `.test-build/qa-repairs-review-submitted-390.jpg` — completed job and submitted review.
- `.test-build/qa-repairs-admin-decision-390.jpg` — separate staff/outcome fields and moderation controls.

Browser test tabs were closed and viewport overrides reset. Native keyboard, Back, TalkBack, actual font/safe-area configurations, two real devices and hosted transport acceptance remain pending.

## Changed file groups

- Conversation/lifecycle: `services/conversation.service.ts`; conversation thread/Details and job-detail routes; `utils/marketplace-lifecycle.ts`.
- Photo visibility: `services/content-visibility.service.ts`.
- Complaints/reviews: `services/report.service.ts`; `types/report.types.ts`; `utils/report-review.ts`; `hooks/use-review-report.ts`; public-profile review cards; report sheet; opt-in shared sheet keyboard handling; admin report page.
- Required callers: internal demo report service/screen and full reporter outcome text in `app/notifications.tsx`.
- Database: three recovered historical files, one additive report/review migration and focused SQL/HTTP tests. Existing security/posting/edit test harnesses receive explicit temporary-helper grants; old HTTP fixtures satisfy existing publishing validation.
- Regressions: `tests/qa-conversation-lifecycle.test.ts`, `tests/qa-photo-visibility.test.ts`, `tests/qa-report-ui.test.ts`, `tests/qa-review-report.test.ts`, and synthetic report fixture.
- Documentation: repair contract, this evidence record and a narrow decision-log entry. The original audit and pre-existing unrelated working-tree edits remain preserved.

## Peer review decisions

- Functional challenged plain listing report identity/context; Security added canonical owner derivation and negative SQL/HTTP tests.
- Functional required real read-only admin inspection links and conversation-over-listing target priority; UX/Security aligned them.
- Lead preserved prior Received semantics instead of silently broadening the queue definition.
- UX/Lead found a global busy flag could be cleared by an old account's response; UX replaced it with per-request/account tracking and an actual-hook regression.
- Security verified private notes never enter reporter projection/notification and that optional name hydration cannot turn a saved complaint into a false failure. Lead removed notification truncation so the safe outcome is readable.
- Final cross-reviews found no remaining material blocker in the repaired local source. That is not native/hosted acceptance or a guarantee of no other defects.

## Release status and remaining work

No commit, push, APK build, deployment, remote schema/policy write, seed or data reset was performed. Exact historical migrations were recovered from earlier successful read-only metadata access. At the close of the initial repair work, an **optional final independent hosted hash comparison was rejected by automatic approval review**, which stated that the specific private hosted project destination was not authorized beyond local QA verification. It was not retried through another tool. That initially limited fresh hosted verification; the subsequent explicit user approval and successful comparison are recorded below.

### Final comparison after explicit user approval

On 19 November 2026, the user explicitly approved the final read-only migration comparison against the linked Konektado demo project. That subsequent authorized check completed successfully: **45 hosted versions, 46 local files, no hosted-only versions, no common version/name mismatch, and exactly one pending local migration (`20261118235200_secure_report_review_moderation.sql`)**. The earlier approval-review limitation is therefore resolved for this comparison only.

Direct reconstructed-text comparison confirmed all three recovered files match the hosted stored statements. Stored statements omit their terminal separators; each statement was trimmed, terminated with a semicolon and joined with blank lines, with CRLF normalized to LF. Initial raw joined-text hashes differed for that formatting reason; reconstructed contents matched exactly. This does not claim that all older migration file bodies or the entire current live schema were compared. No migration or hosted write was performed. See [patch notes](patch-notes.md) and [comparison metadata](migration-comparison.json).

The new client depends on migration 46. The privacy migration intentionally breaks the old client's private-column reads/direct report writes, so do not apply it alone to a shared live environment. Use a reviewed coordinated client/database release with the existing backup and deployment safeguards. Source changes here are ready for that review; the live app must not be described as repaired by this local work.

Before defense acceptance: run the original [human QA guide](../2026-11-18/human-qa-guide.md) against the identified new Android build and suitable backend, with emphasis on OTP delivery, private files, Realtime reconnect, Android keyboard/Back/TalkBack, reporter outcomes, staff investigation and review moderation. Resolve QA-012 separately when the user returns to it. Manuscript/respondent/performance/evaluation claims remain unassessed without supplied evidence.
