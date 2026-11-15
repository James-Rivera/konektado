# Posting, pricing, and profile completion audit

Date: 2026-11-13, Asia/Manila.

Assessment: hold production sign-off for these workflows until the high-priority issues below are resolved and exercised end to end. This is an audit and a proposed repair plan, not approval of a new product design. No application code, schema, public listing, saved profile, or Figma design was changed. The later interactive pass created three owner-private test drafts; details and limitations are in the follow-up report.

**Review the [visual and interactive follow-up](interactive-posting-profile-audit-2026-11-13.md) alongside this report.** It records the walkthrough on `https://demo.konektado.app`, screenshots at three phone sizes, seven additional findings (A18–A24), and a proposed control-by-control design for review. A17 below records the slider/chevron issue raised after the original audit. These proposals were not implemented during the audit. See the later [authorized implementation and verification report](posting-profile-implementation-2026-11-13.md).

## Scope and evidence

Reviewed the product/flow/permission/design documentation, both listing builders and previews, profile completion and its service, pricing helpers, related discovery queries, draft autosave, and committed Supabase migrations. Inspected the established Figma Post and Profile pages and screenshots of these nodes:

- [Job Listing Builder](https://www.figma.com/design/v6jPKumENGxoQlWbwSFfo5/Konektado?node-id=230-8767).
- [Services Listing Builder](https://www.figma.com/design/v6jPKumENGxoQlWbwSFfo5/Konektado?node-id=271-12103).
- [Edit Profile](https://www.figma.com/design/v6jPKumENGxoQlWbwSFfo5/Konektado?node-id=491-8830).
- [Update Profile](https://www.figma.com/design/v6jPKumENGxoQlWbwSFfo5/Konektado?node-id=491-8318).

The inspected Figma builders show a single Budget / Starting rate input rather than today's expanded pricing system. The Profile references provide edit sections and completion prompts; they do not specify the current Core/Work/Hiring completion editor. Figma is useful for visual structure, but these references alone do not resolve the newer pricing and readiness rules. Some reference copy/services are older than the controlled MVP taxonomy and accepted decisions.

Evidence classifications:

- **Confirmed source:** direct behavior or mismatch visible in the current source/migrations.
- **Reproduced in isolation:** real TypeScript functions executed with in-memory session/database boundaries, without remote writes.
- **Observed on demo:** visible interaction exercised on `demo.konektado.app`; see the follow-up for the exact account state, viewport, actions, and screenshots.
- **Release risk:** missing protection established in source; the failure scenario still needs device/integration reproduction.
- **UX recommendation:** proposed product/design change, not a claim about measured resident behavior.

The initial phase was source/Figma analysis and isolated probes. The later phase adds a browser walkthrough and three-size visual checks, documented in the follow-up. No Expo server was started. No current APK walkthrough, live RLS test, deployment parity comparison, or production database inspection was performed. Conclusions about backend enforcement refer to committed migrations, not proof of live deployment state.

## Provider/client differences

| Concern | Provider service | Client job | Assessment |
| --- | --- | --- | --- |
| Price label | Rate range | Estimated budget | Appropriate role-specific language. |
| Price entry | Required minimum and maximum | Required minimum and maximum | Same underlying range model already exists. |
| Price unit | Eleven visible choices; defaults to per service | Choices hidden; new jobs default to per job; edits preserve stored unit | Different interaction and hidden meaning on edited jobs. |
| Negotiation | Visible switch | Switch hidden; stored value preserved | Users have different control over the same concept. |
| Live price preview | Visible | Hidden | Inconsistent feedback before the review screen. |
| Shortcuts | No equivalent quick ranges | Quick budget ranges | Inconsistent assistance; preset values are not evidence of fair local rates. |
| Price note | Optional note stored | No equivalent | Service note is not rendered by the audited preview/detail/profile paths. |
| Classification | Search-first service/specialty flow | Category then service | Some difference is justified, but control patterns and terminology need consistency. |
| Scheduling | Availability text | Date, time block/exact time, flexibility | Appropriate difference: ongoing offer versus a specific task. |
| Editing | Save directly in editor | Next, preview, Save | Different review/commit behavior. |
| After publishing | Post dashboard, with optional profile-service suggestion | Job detail, or active posts depending on return context | Needs a clear, consistent confirmation and next action. |
| Identity prerequisite | Shared basics + verification + Work Profile | Shared basics + verification + Hiring Profile | Correct role distinction, poorly explained at the late publishing gate. |
| Profile form | Two work-summary fields, services/skills, area, availability | Intro title, intro, common needs, coordination style, schedule | Both are substantial forms; the client path especially asks for abstract prose before a simple hire. |

The problem is not that two independent pricing backends must be replaced. Both use `RateRangeInput`, `validateRateRange`, and common formatting; listing tables already hold structured ranges and units. Most inconsistency comes from configuration, copy, feedback, and incomplete behavior around this shared model.

## High-priority findings

### A01 — Removed profile selections return after Save

**Reproduced in isolation.** `services/profile-completion.service.ts:513` unions Work Profile selections with onboarding preferences; line 521 does the same for Hiring Profile needs. Saves at lines 354 and 400 update the role profile, without updating/removing the old preference selections.

Probe: onboarding offered Cleaning and Laundry help. Saving Work Profile with only Cleaning returned both Cleaning and Laundry help. Saving Hiring Profile with only Cleaning also returned Encoding from the previous onboarding preferences.

Impact: users cannot reliably remove public capabilities/common needs; old choices also continue influencing readiness and discovery.

Proposed fix: make role-profile selections authoritative after the role profile is explicitly saved. Use onboarding preferences as a one-time/default fallback, or synchronize the intended ownership through an atomic save. Preserve intentional private discovery preferences separately. Update frontend reads, ranking, and SQL readiness together; SQL currently also unions preferences. Add save/remove/reload regression coverage.

### A02 — Saving incomplete setup can announce that the profile is ready

**Reproduced in isolation + confirmed source.** `saveWorkProfile` and `saveHiringProfile` allow partial values. A blank Work Profile save returned `error: null` and `workComplete: false`. `app/profile/complete.tsx:260` nonetheless shows a fixed success message and navigates back. Lines 1231–1232 say the profile is ready for posts and messages regardless of the returned readiness or verification state.

Hiring completion also has conflicting definitions: the readiness builder accepts a headline **or** bio (`services/profile-completion.service.ts:820`), while `isHiringProfileInputComplete` at line 1087 requires both before setting `profile_completed_at`. A headline-only fixture was `hiringComplete: true` with a null completion timestamp. The SQL readiness function uses the OR-style fallback, so this example is not proof of a UI-versus-RLS denial; it is proof that the completion timestamp and readiness rules disagree.

Proposed fix: distinguish Save changes / Save progress from Complete setup. Derive messages and continuation from actual verification and role readiness. Show missing fields inline and continue to the next required section rather than exiting. Keep partial saves if useful, but never claim readiness for them. Establish one completion specification with parity fixtures for display, save state, and SQL.

### A03 — Read failures can masquerade as an incomplete profile

**Reproduced in isolation.** `getMyProfileCompletion` at line 144 checks only the main `profiles` error. Errors from provider profile, client profile, preferences, credentials, and verification reads are discarded. A simulated client-profile read failure returned `error: null` with an empty hiring headline and `hiringComplete: false`.

Impact: a network/permission problem can show false setup prompts, block a ready user, or present empty fields that the user can save over existing details.

Proposed fix: distinguish a successful empty result from unavailable data. Fail essential readiness reads visibly; disable saving unhydrated sections; retain known values on recoverable refresh errors. Optional credential failures should have their own state without becoming false identity/setup results. Test partial-query failures and recovery.

### A04 — The job form promises multiple workers; hiring supports one

**Confirmed source.** `app/create-job.tsx:64` offers 1, 2, 3, 4, and 5+ workers. Hiring writes one `jobs.accepted_provider_id`, moves the job to in progress, and enforces `conversations_one_hired_worker_per_job` (`supabase/migrations/20260913090000_security_permission_boundaries.sql:333`, line 365).

Impact: a client can publish a three-worker job but cannot record three hires or complete/review each worker through the existing model. The form also does not explain whether the budget is per worker or total.

Proposed fix for this MVP: explicitly support one hired provider per job and align the editor/copy with that capability. First identify any existing multi-worker listings before changing their presentation. If multi-worker hiring is essential, it is a separate database/workflow slice with assignments, capacity, per-worker completion/reviews, and budget basis; changing the picker alone cannot implement it.

### A05 — Private job notes travel in route parameters

**Confirmed source; browser exposure requires runtime verification.** `app/create-job.tsx:867` and line 889 serialize the whole draft, including `privateLocationNotes`, into the preview route parameters. Expo web navigation can encode these params in the URL, creating an unnecessary browser-history/share/log exposure surface.

Proposed fix: route by owner-private draft ID and load the preview through the service. Keep unsaved edit state in a scoped in-memory controller or private edit draft. Verify that address notes never appear in URLs/history. Do not weaken the existing private-column grants to make preview hydration convenient.

### A06 — Several visible options/promises have no corresponding delivered behavior

**Confirmed source in the audited repository.** Both forms expose Auto-reply; jobs expose Auto-close and services expose Pause listing when unavailable. These flags are stored and read out in previews, but the audit found no implementation that executes those advertised automations. Hiring changes job status independently of the auto-close flag; this does not implement timed closing or toggle-dependent behavior.

The job form says exact instructions will be shown to the accepted worker (`app/create-job.tsx:1239`); the private-notes RPC authorizes only the job owner/admin (`20260913090000_security_permission_boundaries.sql:185`). The current code does not deliver that accepted-worker handoff.

Proposed fix: remove unsupported automation controls from the production form until their behavior is implemented and tested. For the current private-notes policy, explain that notes remain private and that the client coordinates the meeting point through Messages. If automatic hired-worker access is required, add an explicitly scoped authorization change and test unrelated, interested, hired, and former participants.

### A07 — Publish has no durable retry identity

**Release risk from source; no remote duplicate was created.** Publishing calls plain listing inserts, followed by a separate draft delete (`app/create-job-preview.tsx:168`, line 188; `app/create-service-preview.tsx:199`, line 241). A local busy state prevents ordinary repeat taps but cannot resolve a committed insert whose response was lost. Draft cleanup can fail after publication and leave a publishable draft behind.

Proposed fix: make publishing a server operation with a stable owner-scoped draft/request identity. A retry should return the same listing, and draft consumption should be atomic or recoverable by a recorded published listing ID. Test response loss, retry, concurrent requests, and draft cleanup failure.

### A08 — UI validation is stronger than the listing service/backend contract

**Confirmed source.** The service editor checks description, location, and blocked custom-service wording; `services/service-profile.service.ts:132` checks category/title and range but permits an empty description and arbitrary custom classification. Job services check text presence but do not enforce the category/service membership relationship or the editor's structured date requirements. The reviewed SQL policies enforce ownership/readiness, not the controlled taxonomy's complete publishing contract.

Impact: another client or a crafted direct request can bypass UI-only product restrictions. This does not mean it can bypass ownership/verification RLS.

Proposed fix: define the publish contract once, enforce it in the service and trusted database boundary, and reuse it in the editor. Apply strict rules to publishing while allowing incomplete private drafts. Validate scope exclusions, classification relationships, required public content, lengths, ranges, and schedules. Plan compatibility handling for existing records before tightening constraints.

## Pricing and discovery findings

### A09 — Shared component, different interaction model

**Confirmed source.** Jobs hide units, negotiation, and preview (`app/create-job.tsx:1117`); services show them (`app/create-service.tsx:830`). Both require two positive amounts. Service users see eleven unit chips, while a client editing an existing hourly job cannot see/change that stored unit in the editor.

Proposed UX: a common price section with role-specific heading (Your rate / Your budget), explicit PHP, visible price basis, the same range control and live summary, and consistent negotiation behavior. Use a small set of relevant unit suggestions plus an accessible picker for the rest. Show the stored unit on edits. Explain fixed amounts by supporting equal bounds; do not require users to invent a range. A proposed Fixed price / Price range selector can map to the existing equal-min/max storage, but should be validated against the desired MVP simplicity before adding another control.

The local `docs/ux-principles.md` explicitly recommends a range slider with optional precision inputs. The current editors show only min/max inputs, while Search already has a slider. Reuse interaction principles, but do not blindly reuse Search's 0–5000+ cap/100-peso steps: a search bound is not an authoritative publishing-price limit, and lower-priced services need precision.

### A10 — Service price notes are saved but not shown

**Reproduced in isolation + confirmed source.** The editor collects a Rate note (`app/create-service.tsx:852`). `formatServiceRate` accepts `rateText` but ignores it (`services/marketplace.helpers.ts:356`); the audited preview, service detail, and public profile paths do not render a separate note. A fixture containing Cleaning supplies included displayed only the numeric range/unit.

Proposed fix: display a separate What is included / Price note field in preview and service detail, or remove collection until there is a useful destination. Keep notes separate from numeric pricing and prevent them from silently becoming a second conflicting price source.

### A11 — Price filtering mixes units and can miss matching results

**Confirmed source.** Search sends only numeric range bounds; it does not expose/pass a unit (`app/(tabs)/search.tsx:259`). A 500-peso hourly rate and a 500-peso whole-job price therefore match the same numeric filter. Both queries apply `limit` before the in-memory overlap filter (`services/job.service.ts:321`, `services/service-profile.service.ts:400`). Matching rows outside that first fetched set are never considered.

Proposed fix: expose the relevant unit context without implying that unlike prices are equivalent, and apply range overlap and owner exclusions before pagination at the query/database boundary. Do not invent hour-to-job conversions. Test a match beyond the first page and same-number/different-unit listings.

### A12 — Price display/input details need a defined policy

**Confirmed source + isolated formatter probe.** Positive decimals pass validation, but `formatCurrency` rounds to whole pesos (`services/marketplace.helpers.ts:275`). Entered 200.25–200.75 rendered as 200–201. The formatter also silently reorders reversed bounds while submit validation rejects them. Numeric fields lack explicit accessibility labels linked to their visible Minimum/Maximum labels, and selected unit text still uses the light `color.primary` that the design docs prohibit for readable text (`components/RateRangeInput.tsx:203`).

Proposed fix: choose whole-peso-only validation or faithful decimal display, keep preview and validation consistent, add currency context and screen-reader labels/errors, and use the accessible text token. Verify touch targets and selected/focus/error states on device. A numeric keyboard is not validation against pasted invalid values.

## Profile and authoring UX findings

### A13 — Completion reads like a database form rather than a short task

**UX recommendation based on source.** Core/Work/Hiring tabs expose internal terminology, repeated explanations and optional-photo banners compete with required work, and the forms offer overlapping prompts: About my work plus Work summary; Hiring introduction title plus Hiring intro; coordination style plus a separate contact preference. Requirements are not consistently marked. A user sent from Publish learns late that another substantial profile form is necessary.

Proposed UX: call shared identity Personal details, retain Work Profile/Hiring Profile as useful role names, and show only the role needed for the attempted action. Explain what is missing and why. Prefer one useful public introduction per role; use chips/pickers and an Other option for common scheduling/coordination defaults. Keep photos and credentials visibly optional. Pre-fill safe existing data without repeatedly merging removed choices back in. Avoid weakening verification requirements as a shortcut.

Reducing fields that currently gate actions is a product/permission decision. Update docs, frontend readiness, and SQL together if those requirements change. Keep profile identity/reputation separate from listing prices and budgets, as DEC-090 already requires. The current separation is a sound foundation.

### A14 — Saving one profile mode can discard edits in another

**Confirmed source path; needs device regression coverage.** All three modes have independent unsaved local state. Save persists only the active mode, then `hydrateForms(result.data)` replaces all three modes and `router.back()` leaves the screen (`app/profile/complete.tsx:260`). There is no dirty-state/back guard or profile autosave. A user can edit Work, switch to Hiring, save Hiring, and lose the Work edits.

Proposed fix: keep editing scoped to a section or track dirty state per mode. Save the intended section explicitly, preserve other edits, and confirm discard on back/mode exit where appropriate. Continue the original task after successful setup using safe context, without automatically publishing or messaging on the user's behalf.

### A15 — Location labels describe behavior the app does not provide

**Confirmed source.** Core Profile requires `street`, calls it Public area, and says Shown publicly (`app/profile/complete.tsx:529`). The public-summary RPC deliberately excludes raw street/purok/subdivision fields and derives a barangay/city label (`supabase/migrations/20260528123000_public_profile_safe_rpc.sql:36`). The Current area card is also hardcoded, and Change opens a sheet with one non-editable option (`app/profile/complete.tsx:707`, line 773).

Proposed fix: align collection, privacy copy, public preview, and readiness with the actual coarse-location policy. For this single-barangay launch, show the fixed supported area plainly instead of a Change action that cannot change anything. Do not expose raw street data merely to make the existing label true. Decide explicitly whether private area detail is necessary to gate marketplace interaction.

### A16 — Drafts and error recovery need visible feedback

**Confirmed source + release risks.** Listing autosave serializes writes and flushes on blur/background, which is useful. Background/debounced `flush()` results are discarded and only `flush` is returned by the hook (`hooks/use-draft-autosave.ts:145`, line 178); there is no Saving / Saved / Could not save status exposed to the editor. Invalid numeric input can also become null in the saved draft. Form validation does not consistently focus/scroll to the first error; profile save errors appear near the top even when Save was pressed at the bottom. Service edits commit directly while job edits require Preview.

Proposed fix: expose autosave state and retry, retain raw authoring values where necessary for recovery, give field-level errors and first-error focus, and use one deliberate review/commit pattern across both post types. Keep previews faithful to actual details, including notes and optional settings that really work.

### A17 — Pricing asks residents to manage fields instead of guiding a price choice

**Confirmed on the demo in the screenshot follow-up; interaction recommendation pending review.** Both posting forms still require typing minimum and maximum amounts. Provider pricing adds eleven visible unit buttons, several layers of explanatory copy, negotiation, and a summary; client pricing instead adds preset ranges and hides unit/negotiation/inline summary. Neither posting form has a slider. The draggable two-handle control exists in Search filters, where dragging the upper handle visibly updates the selected amount.

This is a distinct usability problem even if all values save correctly. Sharing a component and storing the same fields does not establish that either interaction is simple. The provider form should not be treated as the finished reference merely because it exposes more controls. The earlier conversational recommendation to default to manual entry was too broad: deciding whether to keep budget presets is separate from deciding whether typing or dragging is the primary interaction.

User-requested direction for review: a visible price-basis row with a chevron that opens a picker, the same range-slider interaction in both posting forms, live amount/unit feedback, and optional exact amount entry. Avoid copying Search's upper-bound/filter semantics into a published price: a listing must retain an exact amount, allow a fixed price and amounts above the visual slider scale, and use appropriate precision. A slider alone does not fix hidden price notes, negotiation meaning, saving, discovery queries, or backend correctness.

The [interactive follow-up](interactive-posting-profile-audit-2026-11-13.md) now records the resident-task walkthrough, repeated typing, choice counts, discoverability, feedback, and comparisons with existing patterns. Findings and proposed product changes remain subject to the user's review.

### A18 — “PHP 2,000+” sets an undisclosed fixed maximum

**Observed on demo.** Tapping the client budget preset labeled `PHP 2,000+` fills minimum `2000` and maximum `3000`. The label suggests an open upper bound but the form and preview store/show a bounded range. Either label the exact range or remove the preset when adopting the shared slider. Source: `app/create-job.tsx:96`.

### A19 — Familiar service terms work for providers but not clients

**Observed on demo.** Searching `karpintero` in the client job's Service needed sheet returns No matches found; the provider's service picker returns Carpentry for the same input. The client sheet also calls the service list All categories and leaves unrelated Suggested chips visible during an unmatched search. Reuse the existing canonical/alias-aware service search across the two tasks; preserve single versus multiple selection as appropriate. Source: `components/PostOptionPickerSheet.tsx:42` and the existing classification helpers.

### A20 — Viewing a new form creates a draft, and profile defaults are mislabeled as an older draft

**Observed on demo.** After the two intentional audit drafts were saved, Post showed 9 drafts. Opening a fresh job, typing nothing, and leaving increased the count to 10 and added an Untitled job draft. Category/service/schedule values had been injected from Hiring Profile. The editor labeled that profile-based schedule Loaded from an older draft. Count only resident edits as draft-starting activity, and identify copied defaults by their real source. Source: `app/create-job.tsx:419`, line 619 and line 645; service meaningful-draft detection also counts copied availability.

### A21 — Preview is not a complete review of important post details

**Observed on demo.** The service preview omitted the entered description and rate note; its repeated availability sentence occupied more space than those missing details. The job card's combined price/schedule line was ellipsized at 390px, preventing the full time/flexibility summary from being checked there. Keep the public-card sample, but add a readable facts/description/price-note review below it. This expands A10 beyond the price note alone.

### A22 — Custom profile services can be entered through two competing controls

**Observed on demo.** Typing Balloon decoration in the Work Profile picker displays an Add “Balloon decoration” result while a second Other service text field and Add action remain below it. Keep one search-or-type field and one explicit add-custom result; do not ask residents to decide which text-entry path owns their answer. Profile selections were cancelled, not saved.

### A23 — The existing slider is not ready to reuse unchanged on web

**Observed rendered DOM + interaction check.** Search's two handles have `role=slider` and names, but neither exposes `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, or `tabindex` in the rendered web DOM. A keyboard press action on the maximum handle could not complete; dragging did change the selected range. Provide focusable controls, keyboard adjustment, correct values, and an exact-input alternative before reuse. This is not a completed screen-reader or native-accessibility test.

### A24 — The Service posts section shows jobs and an inert chevron

**Observed on demo + confirmed source.** Under Service posts / Active services: 3, the dashboard displayed two job titles also repeated under Recent posts. The source renders mixed `recentPosts.slice(0, 2)` below the service counts, rather than active service rows (`app/(tabs)/post.tsx:287`). The Active services row's chevron is a non-interactive View. Show correctly typed inventory with real management destinations, avoid duplicate mixed lists, and remove chevrons that do not open anything.

## What should be preserved

- Structured listing-owned price ranges, units, and negotiation flags; do not move these into profile completion.
- Server-enforced verification/readiness, owner-private drafts, private verification documents, and safe public-profile reads.
- Atomic single-worker hire/completion RPCs and review relationship checks; do not replace these with optimistic independent writes.
- The shared pricing formatter/validator and autosave infrastructure, after fixing the gaps above.
- Natural differences between an ongoing service offer and a dated job request. Consistency means the same concepts behave alike, not that both forms ask identical questions.

## Proposed repair order

1. **Agree on the launch contract.** One hired provider per job unless multi-worker work is explicitly funded; precise budget basis; supported price units; partial-save versus ready semantics; public versus private location; which profile fields really gate each action. Record approved changes in the decision log and relevant source-of-truth docs before implementation.
2. **Fix persistence and correctness.** A01–A08: authoritative selections, honest save/read states, single-worker alignment, private preview transport, honest options, retry-safe publish, and a validated publishing boundary. Use migrations for database changes; do not manually patch production rows.
3. **Unify price authoring and discovery.** A09–A12: one price-section pattern with explicit unit/currency, equivalent feedback, faithful notes/display, and filters applied before pagination.
4. **Simplify completion and unify editor behavior.** A13–A16: task-aware setup, fewer redundant prompts, optional enhancements separated from blockers, preserved edits, truthful location controls, autosave/retry visibility, and consistent review/save actions. Reuse Figma section/input/header/sheet patterns and theme tokens.
5. **Run acceptance tests on the release artifacts.** Test the same version on web and Android, with the intended linked migrations and two prepared user roles. Only then sign off these workflows for production.

## Release acceptance matrix

| Scenario | Required outcome |
| --- | --- |
| Provider, client, both-role | Same identity; only the relevant role setup gates the attempted action; completing one does not falsely claim the other is ready. |
| Unverified / pending / rejected / verified incomplete / ready | Correct explanation and destination; private drafting remains possible; direct publish/message bypass denied. |
| Remove onboarding selection, save, reload | Removed capability/need stays removed; discovery/readiness follows the approved ownership rule. |
| Partial save / complete save | Saved progress is distinguished from readiness; timestamp/display/server predicates agree under documented fallbacks. |
| One essential profile query fails | Retry state; no empty replacement form is saveable over unavailable data. |
| Edit several profile sections, save/back | No silent loss; section ownership and discard behavior are explicit. |
| Fixed/equal range, normal range, reversed, blank, zero, decimal, pasted comma/currency text | Consistent validation and accurate unit/currency/display; no silently changed amount. |
| Edit legacy unit/negotiable listing | Stored meaning is visible; save preserves or intentionally changes it. |
| Price note | Same useful note in editor, preview, and public detail. |
| Search range and unit, matching row beyond first page | Valid matches are found; unlike units are explained, not presented as normalized prices. |
| Multi-worker old listing | Truthful supported hiring path; no silent data rewrite. |
| Private notes and unrelated/hired users | Authorization matches copy; URLs/history contain no private notes. |
| Interrupted publish / concurrent retry / draft deletion failure | Exactly one published listing for one publishing intent, recoverable success state. |
| App background / poor network / relaunch | Honest autosave status and recovery; no false Saved/Ready state. |
| 360x800, 390x844, 430x932 | Wrapped long text, readable errors, reachable actions, safe areas, keyboard-open inputs, long names/notes, and large text remain usable. |
| Screen reader / keyboard / touch | Named price inputs, selected unit announced, clear errors, visible focus, usable touch targets. |

## Checks completed in this audit

- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `npx tsc -p tsconfig.test.json` followed by `node --require ./scripts/test-alias-hook.cjs --test ".test-build/tests/*.test.js"`: 196 tests passed, 42 suites, zero failures.
- Isolated real-function probes reproduced selection resurrection, partial-save/readiness inconsistency, ignored secondary-read errors, omitted rate-note display, decimal rounding, and reversed-range preview normalization. These probes mocked session/database boundaries and are not live integration/RLS tests.
- The later phase adds the interactive follow-up and screenshot assets. No application code was changed, and no new product decision has been marked Accepted. No production-readiness claim is implied by passing static/unit checks or browser-only visual checks.
