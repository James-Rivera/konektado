# Posting and profile follow-up — 2026-11-15

The six approved follow-up repairs are implemented locally, on top of the A01–A24 repairs. The hosted demo and linked database have not been changed. This report supersedes the corresponding limitations in the November 13 implementation report.

## Delivered behavior

| Area | Result |
| --- | --- |
| Recoverable edits | Opening an existing job/service creates or resumes one owner-private edit draft. Autosave does not change the public post. Editors and reviews recover after refresh. Review carries an opaque draft ID and exact revision. Save updates the same listing atomically. |
| Lost updates | Draft writes compare the expected revision. Final saves compare the source listing version. Another session’s changes cannot be overwritten silently. A conflict preserves the draft and offers an explicit Load latest action; replacing it keeps a private previous snapshot. Back returns to the current editor rather than an older stacked editor. |
| Unsaved changes | In-app Keep editing / Discard changes dialogs protect unsaved or failed saves. Focus starts on Keep editing. Discard cancels pending saves and safely handles an in-flight save. Browser reload warnings remain for unsaved content. |
| Actionable errors | Job, service and Personal forms provide field links, inline descriptions, focus/scroll behavior and accessible error IDs. Picker errors open the corresponding picker. Exact pricing errors remain in the sheet and focus the appropriate amount. |
| Structured schedule | Jobs and job drafts store date, time preference, exact time, flexibility and Asia/Manila timezone separately. The server derives readable summaries. Display wording is not parsed for validation. |
| Older posts | Only unambiguous canonical legacy schedules are backfilled. Ambiguous/impossible schedules remain intact. The owner’s inventory exposes Needs update; the editor shows all correction links. Corrected prompts disappear as fields become valid. Status-only hiring/completion transitions are preserved. |
| Predictable pricing | Both forms use the shared slider, chevron unit picker, negotiable control and live summary. Drag/key movement snaps the moved thumb to ₱50; the untouched amount retains centavos. Start at ₱1,000; valid exact amounts expand the scale after confirmation. Fixed prices use equal bounds. |
| Profile feedback | Saving Hiring preserves unsaved Work changes. Saved feedback belongs only to the section saved, and disappears when that section changes. Personal validation focuses the missing name/area field. |
| Design authority | AGENTS.md and the design documentation record the user’s explicit Figma override. Approved behavior, accessibility and responsive usability govern these repairs. |

## Files changed in this follow-up

- Editors/reviews: app/create-job.tsx, app/create-service.tsx, app/create-job-preview.tsx, app/create-service-preview.tsx.
- Profile/inventory: app/profile/complete.tsx and app/(tabs)/post.tsx.
- Shared controls: ConfirmationDialog, FormErrorSummary, RateRangeInput, BottomSheet, PostOptionPickerSheet, DateTimePicker.web and both SearchRateRangeSlider implementations.
- Recovery/focus hooks: use-draft-autosave, use-unsaved-changes, use-form-error-navigation.
- Data/services: marketplace types/helpers, draft repository/services, job service, listing-edit, listing-repair, listing-validation, posting-publish, job-schedule and pricing.
- Database: 20261115090000_durable_listing_edits_and_schedules.sql, plus synthetic legacy/durable-edit SQL suites and updated existing validation fixtures.
- Tests/tools/docs: posting-followup.test.ts, adapted posting-repairs tests, full-screen synthetic harness, database runner, package test commands, DEC-141 and current repair contracts. The broad test command no longer removes the entire .test-build directory containing retained scratch databases.

## Verification

- npm run lint: passed.
- npx tsc --noEmit: passed.
- All TypeScript tests: **241 passed, zero failed**. Coverage includes real service/repository calls with replaced external I/O, schedule/timezone compatibility, exact-price preservation, reviewed revisions, stale draft writes, profile persistence and existing regressions.
- Local PostgreSQL: **all 41 migrations replayed cleanly**, all 34 canonical services validated, existing security suite passed. New tests cover edit ownership, verification/readiness, legacy correction, immutable draft provenance, revisions, source conflicts, rollback, idempotent response-loss retries and concurrent edits/publication. The concurrency assertion confirms one public update rather than duplicate posts. No linked-project access or reset was used.
- Production web export passed: npx expo export --platform web --output-dir .test-build/followup-web-verified --max-workers 2. An earlier sandboxed export bundled successfully but could not create generated folders; the local export passed with filesystem access.

- Android production bundle passed: npx expo export --platform android --output-dir .test-build/followup-android --max-workers 2 (Hermes bundle, 1,994 modules). This compiles native dependencies; it is not an installed APK test.

## Interactive evidence

These checks run the actual production screen components and navigation guards with synthetic local storage/profile/network boundaries. They are not authenticated hosted Supabase end-to-end tests. Real SQL permission and atomicity checks are separate above.

- New job and new service: enter details → review → publish → one new listing. Equal ₱350 bounds show a fixed service price; job budget can be chosen without typing.
- Existing job and service: private edit → review → refresh → Save changes; listing identity retained.
- Offline save: failure/retry feedback, Keep editing, reconnect and retry.
- Source conflict: Save refuses an overwrite, Load latest requires a concrete confirmation, refreshed editor loads current source.
- Errors: empty title focuses Job title and references job-title-error. Empty Personal area focuses Area / street / purok and references profile-street-error. Correction links open the date picker and resolve legacy worker count.
- Exact pricing: a reversed range stays open and focuses maximum; high exact prices and centavos survive review; moving minimum preserves the maximum’s .75 centavos.
- Date picker: typed browser dates are committed through the input event as well as change, fixing a stale-date state found during the walkthrough. Nov 20, 2050 persisted into the new-job review.
- Profile: saving Hiring keeps Work edits, shows no misleading saved banner in Work, and Back opens the focused Keep/Discard dialog. Keyboard Tab reaches Discard.
- CSS viewports checked: 360×800 (legacy correction/profile), 390×844 (job/error/profile), 430×932 (service review). Text wraps and no horizontal overflow was observed. Saved images may be scaled to scrollbar-reduced content width by the capture tool.
- Android emulator Chrome: actual onscreen keyboard entry remained visible in the service form; Android Back dismissed the keyboard while retaining the entered text and saved status. This exercises the web screen on Android, not a native APK.

| Evidence | Screenshot |
| --- | --- |
| Shared client budget slider and unit picker | [390px](audit-assets/2026-11-15/client-pricing-390.jpg) |
| Client title focus/error | [390px](audit-assets/2026-11-15/error-focus-390.jpg) |
| Source conflict | [390px](audit-assets/2026-11-15/source-conflict-390.jpg) |
| Provider review, exact prices and note | [430px](audit-assets/2026-11-15/service-review-430.jpg) |
| Older-post correction | [360px](audit-assets/2026-11-15/legacy-correction-360.jpg) |
| Personal field error | [390px](audit-assets/2026-11-15/profile-field-error-390.jpg) |
| New job review | [390px](audit-assets/2026-11-15/new-job-review-390.jpg) |

## Release status and remaining checks

Apply the November 13 migration first, then the November 15 migration, before deploying this client. Back up and review legacy inventory in staging. The new client requires the new draft revision and commit RPC contracts; the older publish RPCs remain as create-only compatibility wrappers.

No production deployment, cloud build upload, remote schema mutation, database reset or Expo development server was performed. Changes are uncommitted for review.

Before production sign-off, run authenticated create/edit/recovery/conflict flows on migrated staging and the actual Android release artifact. Native keyboard/safe-area/device-back behavior, TalkBack, and iOS VoiceOver remain unverified. Browser labels/focus and Android Chrome keyboard checks do not certify native assistive technology behavior.

Reproduce screen checks with node scripts/preview-posting-components.cjs --flows, then node scripts/serve-posting-preview.cjs --flows (loopback port 4176, static files/fonts only). The SQL runner documents its isolated localhost PostgreSQL settings and retains uniquely named synthetic databases for inspection. Use npm run test:posting for the focused TypeScript regressions and npm run test:posting:database for database checks.
