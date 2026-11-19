# Human QA guide

Use with the [audit report](report.md), [test matrix](test-matrix.md) and [meeting record](meeting.md). This guide is a proposed test procedure, not a record of executed Android tests.

## Identify the app being tested

Record the exact source and installed build before running cases. The audit inspected HEAD `a226f780f1d4d3e1ceac7ae4a8bf55939a042245` plus pre-existing local changes on `link-home-search`. An older APK does not necessarily contain these changes. `docs/19-release-workflow.md` explicitly notes that the existing October preview APK predates the November repairs.

The human operator starts Expo manually when using source, or selects the intended installed APK. This audit did not start a development server, create an APK, or approve a deployment. Do not assume the hosted web app equals the local working tree.

Before backend/security tests, reconcile the three hosted-only migrations (QA-001). Use an isolated backend for exploit attempts, bulk fixtures, races and fault injection. The documented separate staging project was still pending; do not treat a shared demo as disposable. If no suitable environment exists, mark those cases Blocked and proceed with independent UI/source checks.

## Prepare synthetic actors

| Actor | Needed state | Purpose |
| --- | --- | --- |
| V | New account, unverified viewer, later pending verification | Browse/gates and onboarding/verification states. |
| C | Verified client with complete Core/Hiring Profile | Jobs, hire, completion and worker review. |
| W1 | Verified worker with complete Core/Work Profile | Service listing, messaging, hired worker and client review. |
| W2 | Another authorized verified worker | Race/outsider boundaries and competing interest. |
| A | Authorized barangay admin | Verification/moderation only. |

Use deliverable test email addresses controlled by the testers. Use only authorized test phone numbers/documents appropriate to the test environment. Never upload a genuine resident's ID simply to fill a test slot. Do not share account passwords, OTPs, signed private-file URLs or provider/service credentials in screenshots, reports or chat. Do not include a backup contact code in evidence.

Role readiness and verification are different states. Test verified-but-incomplete setup as well as verified-and-ready. If a two-role account is used, record which Work/Hiring prerequisites are satisfied for each action.

## First complete one controlled lifecycle

1. **Account entry:** Run AUTH-01/05. V signs up with email code, creates a password, completes lightweight onboarding and enters Home as a viewer. Log out and verify password login. Record real delivery latency/behavior without extrapolating it into a performance claim.
2. **Viewer boundaries:** V browses permitted jobs/services/profiles, then attempts Post, Message, Save and Review wherever reachable. Confirm verification routing and absence of persisted interaction. Pending verification must say under review rather than encourage duplicate submission.
3. **Verification:** Submit the approved contact/document path; A reviews full test evidence and approves. Check same-session refresh/unlock. Separately test rejection/correction and incomplete-upload recovery. Record that the current implementation requires contact-phone proof; optional-phone statements need reconciliation (QA-012).
4. **Publish:** C creates a job with a service, realistic test schedule, budget and approximate location. W1 creates a service. From another account, verify discovery, detail and public/private field separation. Keep private notes conspicuously synthetic for permission testing.
5. **Coordinate:** W1 messages C from the job. Send text and an allowed synthetic image in both directions. Check unread state and full job context before/after realtime updates (QA-004). Repeat service-origin chat context separately.
6. **Hire:** C marks W1 hired from that job conversation. Confirm the accepted worker and job state from both actors. Exercise supported lifecycle actions only; record the misleading Deactivate/Close menu if present (QA-007).
7. **Complete/review:** C opens Details while the job is in progress, waits for review status, then marks completed. Attempt Review immediately without leaving (QA-006). W1 checks reciprocal review eligibility. Confirm correct counterparty, once-only submission and no direct editing. Service-only chats are not automatically reviewable jobs.
8. **Complaint:** Report a test concern before hire and on a hired/completed conversation. If submission displays failure, inspect the admin queue before retrying (QA-005); record whether a complaint already exists. One controlled retry is enough in the isolated environment.
9. **Admin outcome:** A demonstrates reviewing/resolving/dismissing through the agreed staff procedure. Check what the reporter actually receives. Status tracking alone does not prove investigation or dispute resolution (QA-011).
10. **Persist/isolate:** Relaunch, reopen relevant history/saves/notifications, and switch accounts. Check correct state and no previous actor's content/cache leaking.

If an essential step fails, capture it and continue with independent cases. Do not fabricate a completed lifecycle or mutate hosted rows manually to bypass a failed step. A controlled fixture in an isolated environment can establish another case's precondition, but label it clearly.

## High-risk backend checks

These are engineer-assisted cases on authorized synthetic data. A human UI pass alone cannot establish server authorization.

- **Report metadata (QA-002):** Attempt explicit resolved/dismissed status and reviewer/time/notes as an ordinary resident. Test each administrative field and inspect stored state. Normal creation must still work; legitimate admin review must retain its audit identity.
- **Internal notes (QA-003):** Agree whether `admin_notes` is internal. Have A write a harmless distinctive internal test note using an authorized test path. Check reporter-safe and direct API reads, unrelated resident denial and admin access. Do not populate genuine investigative information to demonstrate a leak.
- **Role/gate bypasses:** Attempt protected public-field, admin role, verification timestamp, post/message/save/review writes as the wrong actor. Record the denial and absence of side effects, not only the hidden button.
- **Private files:** Owner/admin/outsider read and approved-credential overwrite/delete boundaries; message attachment participant scope; no private-location column exposure. Keep URL tokens redacted in shared artifacts.
- **Races/retries:** Concurrent hires must yield exactly one accepted worker. Lost-response retries must preserve draft/publication/review invariants. Contact-code attempts must respect expiry, user/phone binding, attempt serialization and single consumption.
- **Moderation errors (QA-008):** Hide a synthetic photo, confirm it disappears, then induce failure only in visibility reads. The normal listing can still succeed. A generic network outage that hides all content does not test this mechanism. Recover and verify authorized Clear.
- **Queue size (QA-009):** Populate only an isolated dataset with an old unresolved complaint behind 120 newer terminal reports. Verify discovery/pagination/counts. Do not generate 120 complaints on the shared demo.

The offline harness can be rerun from the repository root:

```powershell
node docs/qa/2026-11-18/evidence.cjs
```

It makes no network or database requests and loads no environment file. It validates narrow source behavior with synthetic I/O; it does not replace these backend/device checks or establish exploit success.

## Phone-size, keyboard and accessibility pass

Check **360×800, 390×844 and 430×932**. Record actual device density/window dimensions rather than equating physical pixels and React Native layout units. Use an emulator or representative devices for size coverage; source/browser fixtures cannot certify Android hardware Back or a real soft keyboard.

At each size, exercise Home/Search, posting/profile/verification forms, job/service details, chat/Details and Report. Use long names/titles/service labels, long descriptions, large system text, and realistic bottom inset/navigation configurations.

- No horizontal overflow, cut-off text, covered final list rows or hidden validation errors.
- Sticky actions and tabs respect safe areas; content can scroll above them.
- Focused fields and Submit/Cancel remain reachable with keyboard open and dismissed.
- Report reasons/details/actions remain reachable (QA-010); cancellation preserves or discards changes as documented.
- TalkBack announces useful names, selected/disabled/loading states and errors in a sensible focus order.
- Primary touch targets remain usable; success/error/verification states are understandable without color alone.
- Hardware Back, permission denial, image-picker cancellation, app background/resume and interrupted connection do not trap the user or silently lose meaningful edits.

Do not mark responsive acceptance Passed from calculated source dimensions. Capture actual evidence at all three sizes, with keyboard/font cases.

## Capture and triage findings

For a failed case, use the required report fields: Issue ID, Feature/Component, Severity, Finding Type, Description, Evidence, Steps to Reproduce, Expected Behavior, Actual or Predicted Behavior, Recommended Fix, and Human QA Verification Steps. Link to an existing QA ID where the mechanism matches; create a new ID for a distinct failure.

Recommended execution-log columns are specified in the matrix. Store sanitized screenshots/videos with case ID, build and timestamp, for example `CHAT-05_build-identifier_before.png` and `after.png`. Preserve private originals only in the project's approved private evidence location; do not commit IDs, contacts, OTPs, secrets or sensitive conversation evidence.

Use **Pass**, **Fail**, **Blocked**, or **Not run**. A code review or simulated probe is labeled as such. A potential defect becomes a confirmed workflow defect only when the relevant evidence supports that boundary. When a fix is ready, repeat its reproduction and the directly affected regression cases on the new identified build.

Do not delete test accounts/data or reset a backend as routine cleanup without the environment owner's authorization. Keep synthetic data identifiable, and use the agreed retention/cleanup procedure after evidence is preserved.

## Defense readiness evidence

Before claiming readiness, produce an actual traceable core lifecycle, disposition every P0 failure/blocker, retest fixes, and state any accepted limits. Remaining Medium issues should have an owner, feasible next action and explicit demo/paper consequence.

Reconcile requirements before the defense: optional phone/contact proof, four versus five tabs, decline/cancellation, unmatched jobs, complaint outcomes and abusive-review handling. No anonymity, automatic matching, payments, professional certification, multi-barangay operation or complete dispute-resolution guarantee should be inferred from the current UI.

Supply manuscript chapters, evaluation instruments/results and human test logs for a later evidence comparison. Respondent categories/counts, security/performance claims, hosting sustainability and monetization/regulatory responses remain unassessed. This audit created no research findings or evaluation statistics.
