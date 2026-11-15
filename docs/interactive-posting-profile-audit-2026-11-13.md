# Visual and interactive audit: posting, pricing, and profile completion

Date: 2026-11-13, Asia/Manila. Review target: [demo.konektado.app](https://demo.konektado.app).

**Historical audit, followed by authorized development.** See the [implementation and verification report](posting-profile-implementation-2026-11-13.md) for repairs and release limitations. Read with the [source/backend audit](posting-pricing-profile-audit-2026-11-13.md), which now tracks A01–A24. This follow-up addresses the user's request to assess the actual interaction rather than only the existence and persistence of fields.

## Assessment

The central issue is effort and unclear responsibility: residents must translate a simple goal into multiple inputs, repeated explanations, and inconsistent controls. Some existing patterns are useful—the two-choice post-type sheet, searchable provider service picker, date dialog, schedule summary, and live range label—but they are applied unevenly.

The provider price form is not a finished UX to copy. Both posting forms need the same simpler price interaction. The current profile setup also needs a clearer task sequence, not just a restyled form. Confirmed correctness defects must be repaired alongside any UI changes.

## Method, coverage, and boundaries

This was an **expert walkthrough using first-time-resident tasks**, not a usability study with actual first-time residents. The browser was already signed in to an existing verified, completed, both-role demo account. No fresh account was created; fresh/unverified/incomplete gates remain source-reviewed rather than exercised in this pass.

The walkthrough used actual page navigation, pickers, text entry, empty/reversed-input validation, private draft saving, preview/edit navigation, profile tabs, unsaved back navigation, and Search slider dragging. Screenshots and rendered DOM observations were collected through browser controls. No request interception, auth bypass, or injected application state was used.

| Scenario | Actually exercised |
| --- | --- |
| Client: “I need help assembling a shelf” | Post entry → job editor → service search → budget/worker controls → date/time → private saved draft → Preview → Edit. Stopped before Publish. |
| Provider: “I offer furniture assembly” | Profile-based choices/all-service search → editor → reversed/valid price entry → unit/negotiation/note → private saved draft → Preview → Edit. Stopped before Publish. |
| Shared profile | Core details, location Change sheet, privacy/coordination copy, navigation. No Save or photo upload. |
| Work Profile | Text fields, service picker/search/custom result, availability/area, tab switching, a temporary unsaved title, Back, and reopening to confirm the original saved title remained. |
| Hiring Profile | Introduction fields, common needs, coordination/schedule fields, bottom action reachability. No Save. |
| Existing price interaction | Search filter sheet, range summary, upper-handle dragging, rendered accessibility attributes, attempted keyboard operation. Closed without Apply filters. |
| Responsive views | 360×800, 390×844, 430×932 browser viewports; pricing, picker/layout wrapping, profile modes, and scrollable actions were inspected. |

Native Android/iOS keyboard overlap, real device touch accuracy, large system text, TalkBack/VoiceOver, live permission failures, offline recovery, fresh-user verification gates, public publishing, and production RLS were **not** certified. Browser resizing is not native-device testing. This pass did not rerun the source audit's lint/type/unit suite because only documentation/screenshots changed.

### Test data left by the walkthrough

The existing account began this pass with **7 drafts** and ended with **10**:

- `[UX audit] Help assembling a small shelf` — owner-private job draft.
- `[UX audit] Furniture assembly and shelf setup for small homes` — owner-private service draft.
- One Untitled job draft created by the passive open-and-leave test (A20).

The named descriptions explicitly say they are private audit drafts and should not be published. They were left for inspection. Existing drafts were not deleted. No public post, message, hiring decision, saved profile, verification state, schema, application code, or Figma design was changed. The temporary Work Profile title was discarded without saving; reopening showed the original saved title.

## Findings and recommended interactions

Priority describes repair order: P1 = fix before production sign-off; P2 = important UX correction; P3 = lower-cost simplification. Recommendations that change required fields or permissions are proposals for review, not approved scope changes.

### V01 — Pricing requires too much visible decision-making (P2, A09/A17)

**Observed:** both roles type two amounts. Providers additionally face eleven unit buttons, two layers of price helper copy, a negotiation block with another explanation, a summary block, and a rate note. Clients get a different set of assistance: four presets but no unit control or immediate summary. At 360px the provider units wrap into four rows; the complete pricing task extends beyond a screenful once its surrounding content is included.

**Resident question:** “How much do I charge / how much can I offer?” The form makes them reason about the storage fields and all possible units at once.

**Proposed interaction for both roles:** one visible unit row such as `Price per: Visit ⌄`, opening a single-choice sheet; a two-handle slider with a live range; tappable amounts for precision; one short negotiation option with a defined meaning. Keep Your rate / Your budget as role-specific labels. A fixed price must also be easy to express. The slider scale, increments, and fixed-price interaction still need an explicit product decision.

Reuse the app's existing chevron/sheet pattern and the slider's visual interaction after addressing V13. Do not add a slider while leaving every old input, preset, and explanation equally prominent.

Evidence: [provider at 390px](audit-assets/2026-11-13/15-service-pricing-390.jpg), [provider at 360px](audit-assets/2026-11-13/16-service-pricing-360.jpg), [provider at 430px](audit-assets/2026-11-13/17-service-pricing-430.jpg), [client at 360px](audit-assets/2026-11-13/33-job-pricing-360.jpg), [client at 430px](audit-assets/2026-11-13/34-job-pricing-430.jpg).

### V02 — The highest budget preset misrepresents its effect (P1, A18)

**Reproduction:** in the client form tap `PHP 2,000+`. Minimum becomes 2000 and maximum becomes 3000; the later preview confirms ₱2,000–₱3,000 per job. This is not an unlimited upper bound.

**Proposed fix:** either label it `₱2,000–₱3,000` or remove the preset as part of the shared interaction. Do not silently assign a maximum to an open-ended label. This can be fixed independently of the larger redesign.

Evidence: [preset selected with its actual amounts](audit-assets/2026-11-13/06-job-budget-preset-mismatch-390.jpg).

### V03 — The same familiar service term produces different answers (P1, A19)

**Reproduction:** search `karpintero` in the job's Service needed picker: No matches found. Search the same text through provider Browse all services: Carpentry appears.

The job sheet also labels its list All categories while it is actually listing services. During the failed search, Suggested Cleaning/Laundry chips remain visible even though they do not match the query.

**Proposed interaction:** use the existing alias-aware search for both tasks. A resident should be able to search the help directly without first understanding the stored category. Let selecting the service derive its category. Keep browsing by type as an optional route, and show matching suggestions rather than unrelated fallback chips during a search. Do not introduce AI classification.

Evidence: [client search](audit-assets/2026-11-13/07-job-local-term-search-390.jpg), [provider search](audit-assets/2026-11-13/12-provider-local-term-search-390.jpg). Source: `components/PostOptionPickerSheet.tsx:42` uses substring filtering; provider search uses the established classification helpers.

### V04 — Merely looking creates a draft, and copied defaults have misleading provenance (P2, A20)

**Reproduction:** with 9 drafts visible, open a fresh job and leave without typing or choosing a value. Returning to Post shows 10 drafts, including a new Untitled job draft. The form had copied the first Hiring Profile need and general scheduling text. It described the scheduling text as Loaded from an older draft even though this was a new job.

**Impact:** browsing creates apparent unfinished work, pushes useful inventory farther down, and can make a resident wonder whether they accidentally started or saved something. Auto-selecting the first common need is especially questionable for a person with several needs.

**Proposed interaction:** create a draft after a resident's meaningful edit, not after app-generated defaults. Explain copied data as From your Hiring/Work Profile and keep it changeable. For multiple common needs, offer a short chooser instead of silently taking the first. Show Saving / Saved / Could not save once drafting really begins.

Evidence: [initial 7-draft dashboard](audit-assets/2026-11-13/01-post-entry-390.jpg), [10 drafts after the two named drafts and passive test](audit-assets/2026-11-13/32-passive-visit-created-draft-390.jpg). Source: job `hasMeaningfulDraft` and profile-default effect; service defaults can similarly trigger meaningful-draft detection.

### V05 — Preview does not show everything residents need to approve (P1, A10/A21)

**Observed:** the service editor contained a description and `Audit note: basic assembly tools included.` Both were absent from the preview. The preview gave space to a long availability sentence and placeholder metrics instead. In job preview, the one-line price/date/time/flexibility summary was ellipsized at 390px.

**Proposed interaction:** keep a sample public card, then show a readable review of title, description, service, full price basis, date/time or availability, location visibility, included-cost note, and relevant messaging setting. Give each section an Edit action. Do not make important details available only through a compressed feed card. Use the same review/commit convention for jobs and services.

Evidence: [service preview missing description/note](audit-assets/2026-11-13/18-service-preview-missing-note-390.jpg), [job preview with truncated summary](audit-assets/2026-11-13/10-job-preview-390.jpg). The note remained in the editor after returning through Edit, confirming collection was not the problem.

### V06 — Error handling and preview disagree (P1, A12/A16)

**Reproduction:** set provider minimum to 500 and maximum to 200. The live summary displays the apparently valid `₱200–₱500 / service`. Next then displays Maximum amount must be at least the minimum.

**Other observation:** blank Next exposes inline errors in the long forms; errors belong to individual sections, but there is no concise required-field checklist or consistent first-invalid-field focus. In the inspected job error state the Next button retained focus rather than the first invalid input.

**Proposed interaction:** show one consistent invalid-range state rather than silently reordering only the preview. Mark required fields clearly and move/focus the resident to the first problem when continuing. Preserve their entered values and distinguish input mistakes from connection/save failures. Exact typing must remain available even after a slider is added.

Evidence: [reversed inputs with a neat summary](audit-assets/2026-11-13/13-service-reversed-range-preview-390.jpg), [submit error](audit-assets/2026-11-13/14-service-price-error-390.jpg), [blank-job validation](audit-assets/2026-11-13/05-job-empty-validation-390.jpg).

### V07 — Shared identity setup gives optional photo guidance too much priority (P2, A13)

**Observed:** Core Profile opens with a photo section, explanatory note, and photo-guidelines action before name/location/contact tasks. The Core label and shared trust basics explanation require interpretation. In this completed-account view, most actions are editing already known data rather than showing what is still required for a resident's original task.

**Proposed interaction:** call this Personal details, show a short checklist of missing shared requirements, and prefill already confirmed identity. Put optional photo improvement after required setup or in a clearly optional card. When setup is opened from posting/messaging, explain exactly what remains for that task and return to it after completion. Never imply a photo or credential is required if it is optional.

Evidence: [Core at 390px](audit-assets/2026-11-13/19-profile-core-top-390.jpg), [360px](audit-assets/2026-11-13/36-profile-core-360.jpg), [430px](audit-assets/2026-11-13/35-profile-core-430.jpg).

### V08 — Role setup demands repeated prose instead of manageable choices (P2, A13)

**Observed:** Work asks About my work, Work summary, service selection, a typed Service area, and typed Default availability. Hiring asks Hiring introduction title, Hiring intro, common needs, Coordination style, and General scheduling preference. Shared profile already asks Preferred coordination and Public intro. There is no visible completion count/required checklist inside the editor to explain which role fields block the intended action.

**Proposed interaction:** one useful public introduction per role; a search/select list for services; a saved area/picker; day/time chips with an optional free-text exception; a plain coordination preference rather than requiring an abstract paragraph. Introduce only fields the resident needs for this role. Make later editing possible without reopening all setup sections.

Reducing which fields are mandatory changes the readiness contract. Do not remove UI requirements while SQL continues requiring them. Decide the minimum public context, then update documentation, frontend readiness, save semantics, and server checks together. Keep profile pricing out of these forms.

Evidence: [Work Profile](audit-assets/2026-11-13/22-profile-work-390.jpg), [Hiring Profile](audit-assets/2026-11-13/25-profile-hiring-390.jpg), [shared coordination and intro](audit-assets/2026-11-13/21-profile-core-bottom-390.jpg).

### V09 — Custom profile-service entry repeats the same task (P3, A22)

**Reproduction:** in Work service selection, type Balloon decoration. The sheet offers Add “Balloon decoration” while still presenting a second Other service input with a separate Add button. The resident has two apparent places to enter the same answer.

**Proposed interaction:** keep one search-or-type field; if nothing fits, offer one explicit Add custom result. Keep selected chips and Done/Cancel. Use the existing deterministic normalization and scope checks; do not add hidden automatic publishing/classification. The test was cancelled without adding a service to the profile.

Evidence: [duplicate custom-entry routes](audit-assets/2026-11-13/24-profile-custom-service-390.jpg).

### V10 — Back silently discards unsaved profile editing (P1, A14)

**Reproduction:** temporarily change the Work title, switch Hiring → Work, and confirm the local edit remains. Tap Go back: the app leaves without a discard warning. Reopen Work Profile: the original saved title returns. No Save was pressed, so the public profile was not changed.

The source audit also found that saving one mode replaces all three local forms; that separate cross-mode save-loss case was not exercised against the live profile in this pass because it would change saved profile data.

**Proposed interaction:** scope edits to one section or track dirty state per section. Show Save changes and Cancel/discard deliberately. Preserve other unsaved sections when one section is saved. Separate progress-saving from readiness and return to the original task only when its actual requirements are satisfied.

### V11 — Location control labels are inconsistent with their function (P2, A15)

**Observed:** Current area → Change opens Choose service area, with the same single San Pedro area and disabled other areas. There is no actual choice. Another required field is called Public area / Shown publicly, while the public-summary policy intentionally withholds raw street/purok data and returns a coarse barangay/city label.

**Proposed interaction:** display the fixed supported locality as information, not a pretend chooser. Use distinct labels for Home area and Areas you serve. Explain precisely what is shared and what remains private; do not expose private location merely to make existing copy true. Provide a public preview where privacy matters.

Evidence: [Change sheet](audit-assets/2026-11-13/20-profile-area-change-390.jpg), [Public area copy](audit-assets/2026-11-13/21-profile-core-bottom-390.jpg). The public/private contract itself remains source-reviewed; no private data-access bypass was attempted.

### V12 — Post dashboard mixes inventory and repeats it under the wrong heading (P1, A24)

**Observed:** below Service posts and Active services: 3, two job titles appear. The same jobs appear again under Recent posts. The source confirms mixed recent posts are rendered in the service section. The Active services chevron is a non-interactive View rather than a management action. All drafts are placed before active inventory, so each accidental draft increases the scroll to reach it.

**Proposed interaction:** one owner inventory area with clear Jobs / Services and Active / Drafts / Inactive filters or tabs. Show correctly typed rows once, include meaningful counts, and make View/manage destinations real. Retain the simple “I need help / I offer a service” creation sheet. Do not copy the dashboard's duplicate lists into a redesign.

Evidence: [jobs under Service posts](audit-assets/2026-11-13/31-post-service-section-390.jpg). Source: `app/(tabs)/post.tsx:287`.

### V13 — The existing slider is a visual starting point, not a complete component (P1 before reuse, A23)

**Observed:** dragging the upper handle changed the selected range. The label updated immediately. At 360/390/430 widths the inspected track and Apply/Reset controls fit in the sheet. However, rendered handles had role/name but no `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, or `tabindex`. A keyboard press action on the maximum handle could not complete. This is not evidence of a full screen-reader test.

The slider is currently a **filter**: zero/open bounds and a ₱5,000+ cap are useful search semantics, not valid substitutes for a published exact amount. It also has no precision text entry in that filter.

**Proposed interaction:** reuse its visual range pattern, then provide web focus/arrow-key support, correctly exposed values, precision input, equal/fixed amount handling, and a way to enter amounts above the visible scale. Define suitable steps rather than copying ₱100 increments into every service. Test real touch, keyboard, and screen readers separately.

Evidence: [slider at 390px](audit-assets/2026-11-13/28-search-slider-390.jpg), [360px](audit-assets/2026-11-13/29-search-slider-360.jpg), [430px](audit-assets/2026-11-13/30-search-slider-430.jpg). The filter was closed without applying the test range.

## Recommended control for each task

These are proposed interactions for review, not implemented designs.

| Resident task | Simplest recommended interaction | Existing pattern to build from |
| --- | --- | --- |
| Decide whether to hire or offer work | Two plainly labeled choices | Keep the Post type sheet; its labels describe resident intent. |
| Find the right service | Search familiar terms, then select; Browse by type optional | Provider alias-aware service search. Reuse for jobs and profile, with correct single/multi-select behavior. |
| Choose what an amount covers | One current-value row with chevron → single-choice sheet | Existing picker/sheet structure; avoid eleven always-visible chips. |
| Set a budget/rate range | Two-handle slider + live PHP range + tap for exact entry | Search slider's visual pattern, with A23 repaired and publishing semantics defined. |
| State a fixed amount | Clearly supported exact amount, stored as equal bounds if the current schema remains | Existing equal-min/max support; decide whether Fixed/Range selection helps enough to justify another control. |
| Say whether price can change | One clear optional toggle or choice | Shared pattern for both roles after defining negotiation meaning. |
| Explain included costs | Optional short note, shown in review and public detail | Keep service rate note only if it reaches the recipient. |
| Set a specific job schedule | Date picker + one time choice; exact time only when selected | Existing time-block/exact-time interaction and readable schedule summary. |
| Set usual availability | Day/time choices with optional exception text | Reuse familiar chips/picker patterns; keep response time separate. |
| Give location context | Saved locality/area plus a truthful public/private summary | Existing coarse-location privacy policy, with consistent labels. |
| Describe the resident | One useful introduction per role, known identity prefilled | Existing Core/Work/Hiring data separation, simplified labels/requirements. |
| Enter an unlisted profile service | One search-or-type field with explicit custom-add result | Keep normalized search; remove duplicate Other input. |
| Review before posting | Full readable facts/description and Edit links, plus optional card sample | Existing preview routes, made complete and consistent. |
| Leave an edit | Save changes or confirm discard when dirty | Add a shared dirty-state convention; do not silently save public changes on navigation. |
| Manage posts | One typed inventory list with status filters | Existing Post ownership/lifecycle logic; repair section mapping and fake affordances. |

## Proposed flow sketches

**Client:** I need help → choose service → describe task → choose date/time → choose budget/unit → review complete details → explicit Publish.

**Provider:** I offer a service → choose service → describe offer → confirm area/availability → choose rate/unit → review complete details → explicit Publish.

**Profile setup from a blocked action:** explain required setup → prefilled Personal details → relevant Work or Hiring requirements → accurate completion result → return to the original task. Optional photo/credentials are clearly separate. Returning must not publish or send a message automatically.

These sketches should be checked against Figma's existing layout patterns and the documented permissions before implementation. They do not create additional routes automatically; a few stateful steps/sections may be sufficient.

## Responsive review results

| Surface | 360×800 | 390×844 | 430×932 | Conclusion |
| --- | --- | --- | --- | --- |
| Post type sheet | Both choices inspected | Both choices inspected | Both choices inspected | Useful existing interaction; retain. |
| Client pricing | Inputs/presets wrap; scrolling reaches schedule | Inputs/presets usable; preset mismatch reproduced | Inputs/presets wrap; date remains reachable | No demonstrated need for fixed-width artboards; interaction is the problem. |
| Provider pricing | Eleven units occupy four rows; remaining price content needs scroll | Units occupy three rows; multiple helper blocks | Units occupy three rows; content still extensive | Replace choice clutter rather than shrinking text to fit. |
| Core/Work/Hiring forms | Text/chips wrap; Hiring bottom Save reached by scroll | Main interactions and unsaved navigation inspected | Wider wraps inspected for all modes | Forms fit the tested widths, but effort, privacy labels, and feedback still need repair. |
| Search slider | Track/summary and footer inspected | Drag/DOM/keyboard-attempt checks | Track/summary and footer inspected | Reuse only after accessibility, exact-entry, and price-semantics work. |

These are focused visual spot checks with the existing seeded profile and audit descriptions. They are not a blanket pass for every long string, text-scale setting, or native keyboard state. Early transition frames were not treated as stable layout defects; replacement captures were made where viewport reflow had not settled.

## Review decisions before implementation

| Decision | Recommendation | Implication |
| --- | --- | --- |
| Pricing control | Same chevron unit picker + range interaction on both roles; exact input available | Approve the interaction, then define fixed-price behavior, steps, scale, negotiation, and higher amounts. |
| Client service selection | Search first; derive stored category from selected canonical service | Reuses deterministic taxonomy instead of teaching residents the backend category structure. |
| Profile minimum | One useful intro per role; structured defaults where choices are known | Required-field changes must update docs and SQL readiness together. |
| Worker count | One hired provider per job for current MVP | Align UI with existing atomic hiring; multi-worker support is a separate data/workflow feature. |
| Review screen | Same complete review/commit convention for jobs/services | Fix missing notes/descriptions and hidden/truncated key facts. |
| Draft creation | Start after resident edits; label copied defaults truthfully | Preserve useful autosave without creating work merely from a visit. |
| Unsupported controls | Remove until behavior exists; repair fake navigation affordances | Do not promise automation or private-address access that the current backend does not deliver. |

## Implementation order after review

1. Repair correctness: A01–A08, A18/A19/A21/A24. Preserve strict permissions and use migrations for required backend changes.
2. Define and implement the shared pricing interaction, including accessible input and faithful display/filter semantics.
3. Simplify task-based profile completion and dirty-state/save feedback, with a coordinated readiness contract.
4. Repair Post inventory/draft behavior and unify review/edit conventions.
5. Re-run regression/integration tests and native/web acceptance with fresh and prepared accounts, all verification states, real keyboards/touch, screen readers, poor networks, and the actual release artifacts.

## Evidence location

The [screenshot directory](audit-assets/2026-11-13/) contains 38 numbered JPEG captures. Links above select the evidence most useful for review. Screenshots show the existing demo plus private audit input; they are not proposed UI mockups. No new design has been approved or implemented.
