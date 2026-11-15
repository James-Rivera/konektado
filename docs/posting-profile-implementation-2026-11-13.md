# Posting, pricing and profile repairs

Historical first-pass report. The 2026-11-15 follow-up supersedes the ephemeral edit previews, text schedule storage, and variable slider precision described here; see [current follow-up implementation and verification](posting-followup-implementation-2026-11-15.md).

Implementation of the reviewed A01–A24 audit, authorized on 2026-11-13. This is local development evidence; the hosted demo and linked database were not changed. Read the [repair contract](17-posting-profile-repair-contract.md) for the accepted behavior.

## Delivered changes

| Audit | Change |
| --- | --- |
| A01–A03 | Explicit role saves make service selections authoritative. Removed selections no longer return from onboarding. One introduction satisfies role readiness. Secondary read failures show a retry state instead of editable empty data. Partial saves report progress. |
| A04 | Jobs clearly support one hired provider. The redundant worker-count picker is removed. Legacy multi-worker drafts require choosing one provider before review. |
| A05 | Review routes contain a private draft ID or a short-lived edit token. Private instructions and descriptions are no longer serialized into URLs. Edit tokens clear on sign-out/sign-in and OTP authentication. |
| A06 | Unsupported auto-reply/close/pause controls are removed. Listing writes disable these flags. Private instructions remain owner/admin-only; the UI explains coordination through Messages. |
| A07 | Two authenticated RPCs publish owned drafts transactionally, record a durable publication identity, and consume the draft. Retrying or publishing concurrently returns the same listing. |
| A08 | Service and database validation enforce content lengths, controlled classifications, excluded custom trades, two-decimal positive ranges, one provider, and valid dated schedules. Invalid and past dates are rejected. Private drafts remain incomplete-editable. |
| A09, A12, A17, A18, A23 | Both forms use the same chevron unit picker, draggable range, live summary, negotiation control and optional exact-entry sheet. Equal bounds display one fixed price. Centavos remain visible; reversed bounds are flagged. The misleading budget presets are removed. Web sliders have native keyboard/focus/value semantics and 44px thumb targets. |
| A10, A21 | Reviews show full descriptions, pricing notes, schedules/availability and location information. Service details show the price note separately from the numeric price. |
| A11 | Search exposes a price-unit filter and explains that units are not converted. Range and unit predicates reach the database before the result limit. |
| A13–A15 | Personal, Work and Hiring setup use one introduction per role, common preference choices with custom entry, live required-field progress, and optional photos below essentials. Saving one section preserves other edits; back/reload guards protect unsaved profile edits. Private-area copy matches the coarse public-location policy; the fixed area has no fake Change action. |
| A16, A20 | Passive defaults do not create drafts. Editors expose Saving/Saved/error status and retry. Private editor state preserves invalid/reversed raw prices across reopen. Validation scrolls to an error summary. Both listing edit flows explicitly review before saving. Review-load failures offer Retry. |
| A19, A22 | The client service picker uses the same alias matching as providers. The redundant custom-service text input in profile selection is removed. |
| A24 | One post inventory has All/Jobs/Services filters, with accurate status labels. Drafts initially show three entries with an explicit View all action; services are not duplicated in a misleading mixed section. |

## Verification

- Passed: `npm run lint` and `npx tsc --noEmit`.
- Passed: 229 TypeScript tests, including 33 new posting/profile regressions. The new tests execute actual services with external I/O replaced; they cover save/reload selection removal, read failures, readiness, price precision, invalid input, private review tokens, draft recovery, publication read-failure retries, query predicates and schedule validation.
- `node scripts/test-posting-database.cjs`: clean replay of all 40 migrations into an isolated local PostgreSQL database; the existing security suite; all 34 canonical services checked against SQL validation; new ownership, verification, direct-write validation, rollback and idempotency assertions; two concurrent publication connections returning one listing. No linked-project access or reset is used.
- Passed production web export: `npx expo export --platform web --output-dir .test-build/posting-web --max-workers 2`.
- Interactive browser checks of the actual shared production components in a network-disabled harness: 360×800, 390×844, 430×932. Drag, keyboard increment/decrement, unit selection, negotiation feedback, centavos, equal bounds, reversed-range errors, preference choices/custom wrapping, and `karpintero` → Carpentry were exercised.

The component harness is not an authenticated full-app walkthrough. Native keyboard overlap, TalkBack/VoiceOver, device back behavior and authenticated hosted save/reopen/publish flows still need release validation after the migration is applied. No Expo development server was started. The earlier audit screenshots remain historical evidence of the old interface.

## Screenshots of implemented components

| State | Evidence |
| --- | --- |
| Shared pricing, small phone | [360px](audit-assets/2026-11-13/after/pricing-360.jpg) |
| Exact entry and reversed range | [360px](audit-assets/2026-11-13/after/exact-error-360.jpg) |
| Unit picker | [360px](audit-assets/2026-11-13/after/unit-picker-360.jpg) |
| Client budget, keyboard focus, negotiation | [390px](audit-assets/2026-11-13/after/budget-390.jpg) |
| Provider rate and complete review text | [430px](audit-assets/2026-11-13/after/pricing-430.jpg) |
| Profile choices and custom preference | [360px](audit-assets/2026-11-13/after/profile-preferences-360.jpg) |
| Familiar service-name search | [360px](audit-assets/2026-11-13/after/service-alias-360.jpg) |

These are labelled component previews, not screenshots of a deployed app. Sizes refer to verified CSS viewports; browser scrollbars reduce content width, and the capture tool scales the saved image to that content width. No horizontal overflow was observed at the three sizes.

## Deployment and compatibility

Apply `supabase/migrations/20261113090000_posting_profile_repairs.sql` before deploying the updated client. It adds role-selection confirmation, private draft editor state, publish validation triggers and atomic publish RPCs. Existing rows are not rewritten or deleted. Existing drafts remain readable without editor state.

An old published listing with missing descriptions/prices, mismatched classifications, an undated schedule or a past date may need correction before editing or reactivation. Review existing active inventory in staging before rollout. Hiring/completing a job and ownership/privacy permissions remain covered by the existing security suite. Unknown custom services continue through the existing moderation path.

Schedule summaries remain the existing storage format. The client and database validate the editor's English dated summary, including calendar validity and today's date in Asia/Manila. Changing that display format later requires updating both validators; a future normalized schedule model can remove this coupling.

For review previews of existing listing edits, refreshing the browser discards the short-lived in-memory snapshot; go back to the editor and review again. New ID-backed private draft reviews can reload.

To reproduce local component checks, run `node scripts/preview-posting-components.cjs`, then `node scripts/serve-posting-preview.cjs`. The latter serves only the built harness and whitelisted font assets on loopback port 4175. It performs no Supabase writes. Local SQL test connection settings are documented at the top of `scripts/test-posting-database.cjs`; test fixtures use synthetic accounts and the runner retains its uniquely named scratch database for inspection.

Do not treat this implementation as production sign-off until the migrated staging app and the Android artifact have completed the remaining device and authenticated flow checks.
