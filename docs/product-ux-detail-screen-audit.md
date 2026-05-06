# Konektado Product UX Detail Screen Audit

## Product Understanding From Source of Truth

Konektado is a barangay-verified local job matching and service access app for Barangay San Pedro residents. Its core value is safer, lower-friction local hiring: residents can offer services, clients can find workers or post simple jobs, and barangay admins support verification and moderation.

The MVP is not a booking, payment, payroll, escrow, contract, or full application system. Payments, agreements, exact scheduling, and final negotiation happen outside the app. The app should help people decide whether to message, coordinate, mark hired, and later review.

The main user roles are:

- Worker/service provider: needs to browse jobs, show trustworthy services, receive messages, and earn reviews after completed work.
- Client/employer: needs to browse workers, post jobs, understand worker trust signals, receive interested workers in Messages, and mark one hired.
- General resident/unverified viewer: can browse, but cannot post public jobs/services, message, save if gated, or review until barangay verification is approved.
- Barangay official/admin: verifies residents and supports moderation, but does not process payments or enforce work agreements.

Important source-of-truth rules:

- Use "Services", not "Skills", in user-facing UI.
- Do not use "Apply" or "Application" as the primary job flow. Workers show interest through Messages.
- Verification gates posting, messaging, saving if enabled, and reviews.
- Job details should be task-first.
- Worker details should be person-first.
- Public feed cards, search cards, Job Details, and Worker Profile detail screens should not show repeated public verification badges for MVP. Verification should appear as access-gate copy only where it explains locked actions.

## Confirmed Product Decisions

### Verification Cue / Access Gate

Konektado will not show repeated public verification badges on feed cards, search cards, Job Details, or Worker Profile detail screens for MVP.

Verification is primarily an access gate for meaningful actions such as messaging, posting, saving, and reviewing. Since users are already locked behind verification for those actions, repeated public badges are redundant and could imply that the barangay endorses or guarantees the quality or outcome of a job or service.

Allowed verification copy:

- Verification copy may appear in gated-action states.
- Verification copy may appear on verification/onboarding screens.
- Verification copy may appear when explaining why messaging, posting, saving, or reviewing is locked.

Do not add public badges like:

- `Barangay verified`
- `Barangay verified client`
- `Barangay verified worker`
- `Verified by barangay review`

Preferred access-gate copy:

- `Complete verification to message workers and clients.`
- `Verification unlocks messaging, posting, saving, and reviews.`

### Unavailable Worker Messaging

Unavailable-but-active workers may still receive messages when the service is active, messages are allowed, the viewer is verified, and the viewer does not own the service.

Availability is a status, not a hard messaging block. When useful, show helper copy: `Ask about next availability in Messages.`

Disable messaging only when the service is inactive, messages are off, the viewer is unverified, the viewer owns the service, or another existing hard-blocking state applies.

### Save / Bookmark

Keep Save/bookmark hidden until saved-items is properly implemented.

Do not show fake Save buttons, do not show placeholder Save alerts, and do not implement saved-items in this pass.

### Service Detail Route Semantics

`/services/[serviceId]` is the current route for a selected service offer. It may show person-level worker context, but the loaded record is service-specific and the route parameter is a service id.

`/workers/[workerId]` is reserved for a future general person-level worker profile screen. Do not create or link to that route until the product has a real worker-profile surface that is separate from a selected service offer.

## Executive Summary

Current status note: the ranked problem sections below preserve the original Product UX audit baseline. Phase 5 and post-Phase-5 stabilization have since fixed the detail CTA logic, fake trust metrics, Save visibility, selected-service route semantics, and service post review flow. Treat the Phase 5 Implementation Notes and `docs/stabilization-audit.md` as the current status source.

The current detail screens are structurally close to the intended MVP, but several product logic issues weaken trust and decision-making.

The biggest issue is that message CTAs are not fully state-aware. Job posts expose an "Allow messages before hiring" option, but `startJobConversation` does not check `job.allowMessages`, and Job Details always shows an active Message button. Closed or already-hired job states can also still show the same primary CTA until the service returns an error. Worker Profile has the same UI problem for services with `allow_messages = false`, although the service layer correctly blocks the action.

The second major issue is fake trust/history data. Worker Profile and marketplace helpers generate fallback ratings, jobs done, jobs posted, and hours worked when real review/job history is missing. That conflicts with the trust-first barangay positioning. Empty trust states should be honest and plain.

The third major issue is that Save is visible across cards/details but not functionally connected. In Home, verified users can tap the bookmark icon and get no feedback because the handler is undefined. In Search and Detail, verified users get "later slice" placeholder alerts. Since saving is explicitly a gated marketplace action, this should either work or be visually disabled/removed until it does.

The screens also need cleaner information ownership. Worker Profile repeats location, availability, and jobs done across hero/details; Job Details repeats status and service context; match cards repeat category/location rather than explaining actual relevance; and Job Details includes hardcoded "What to bring" copy that is not backed by job data.

## Ideal User Decisions Per Screen

### Worker Profile

- Primary user question: "Should I message this worker about this service?"
- Required information: worker name, selected service, service area, availability, rate expectation, services offered, short about/description, real rating/review state, real completed-job state, and whether messaging is available.
- Optional information: photos, experience, tags, other services from the same worker, public-safe credential labels if approved.
- Primary CTA: "Message worker" when verified and the service accepts messages.
- Secondary CTA: Save/bookmark remains hidden until saved-items is implemented.
- Trust signals needed: honest rating/review count, honest completed jobs count, safe public location only, and no private phone/address/ID exposure. Do not show repeated public verification badges on detail screens for MVP.

### Job Details

- Primary user question: "Should I message the client to show interest in this job?"
- Required information: job title/service needed, status, schedule, public location, budget expectation, workers needed, description/scope, requirements or what to confirm, posted date, client identity/trust, and whether messages are allowed.
- Optional information: photos, tags, urgency, client review/history, client public profile link when available.
- Primary CTA: "Message client" or "Message about this job" for open/reviewing jobs that allow messages.
- Secondary CTA: Save/bookmark remains hidden until saved-items is implemented.
- Trust signals needed: client name, public-safe location, honest client rating/review state, honest jobs posted count, and clear boundary that payment/agreement is coordinated outside Konektado.

## Ranked Product UX Problems

### P0 - Product Logic / UX Blockers

#### 1. Job message availability is not honored end to end

- Problem: Job Details always shows Message, and `startJobConversation` allows messages for open/reviewing jobs even when the job was published with `allow_messages = false`.
- Evidence from code/UI/source-of-truth: `app/create-job.tsx:51` and `app/create-job-preview.tsx:253` expose the Allow messages option; `services/job.service.ts:173` persists `allow_messages`; `services/marketplace.helpers.ts:250` maps it to `allowMessages`; `app/job/[jobId].tsx:323` renders Message unconditionally; `services/conversation.service.ts:409` checks status but not `job.data.allowMessages`; `docs/05-data-model.md:256` says `allow_messages` controls whether verified workers can message from the post surface.
- Why it hurts the product: A client-facing setting can be ignored. This breaks user trust and creates a mismatch between the posting flow and the public detail screen.
- Recommended fix: Add a `job.data.allowMessages` guard in `startJobConversation`; compute CTA state in Job Details from verification, ownership, status, and `allowMessages`; show a disabled/explanatory state before the user taps.
- Exact replacement copy or layout rule: If messages are off, primary CTA becomes disabled text `Messages are off for this job`; helper copy: `The client is not accepting new messages from this post.`
- Affected files/components: `services/conversation.service.ts`, `app/job/[jobId].tsx`, likely `components/JobCard.tsx` and `components/search/SearchJobResultCard.tsx` if card-level Message actions return later.
- Risk level: Medium. The service fix is important but could affect existing demos where jobs have messages enabled.

#### 2. Detail CTAs are not state-aware for closed, hired, own, or unavailable records

- Problem: Job Details uses the same Message CTA for every loaded job state. Worker Profile uses Message for every active service, even when `allow_messages` can be false. Own-job and own-service cases are only explained after the service returns an error.
- Evidence from code/UI/source-of-truth: Job CTA is always rendered at `app/job/[jobId].tsx:323`; worker CTA is rendered in the selected service detail at `app/services/[serviceId].tsx`; `startJobConversation` blocks own jobs and non-open statuses at `services/conversation.service.ts:405` and `services/conversation.service.ts:409`; `startServiceConversation` blocks own services and services not accepting messages at `services/conversation.service.ts:466` and `services/conversation.service.ts:470`; docs say closed/cancelled jobs should not accept new interested workers in `docs/04-user-flows.md:119` and `docs/04-user-flows.md:141`.
- Why it hurts the product: Users see an action that appears available, then get a late error. That feels broken, especially for low digital literacy users.
- Recommended fix: Derive a display-level CTA state before rendering. Disable or replace Message for closed/cancelled/completed/in-progress jobs, own jobs/services, unavailable services, and `allowMessages = false`.
- Exact replacement copy or layout rule: Use `Message client` only for open/reviewing jobs that accept messages. Use `Job closed`, `Worker unavailable`, or `This is your post` as disabled CTA labels when applicable. Place one helper line above the CTA bar when the disabled reason matters.
- Affected files/components: `app/job/[jobId].tsx`, `app/services/[serviceId].tsx`, `services/conversation.service.ts`.
- Risk level: Medium. Requires careful role/current-user checks but improves clarity without redesign.

#### 3. Trust metrics are fabricated when real history is missing

- Problem: Worker Profile and marketplace helper functions generate fallback ratings, jobs done, jobs posted, and hours worked from stable pseudo-random counts.
- Evidence from code/UI/source-of-truth: Worker Profile created fallback completed jobs and hours in the selected service detail route; service helper fallbacks returned fake ratings/jobs at `services/marketplace.helpers.ts:323` and `services/marketplace.helpers.ts:331`; client helper fallbacks returned fake ratings/jobs posted at `services/marketplace.helpers.ts:355` and `services/marketplace.helpers.ts:363`. Source docs position Konektado as trust-first in `docs/00-project-brief.md:19` and say ratings/reviews update from real review data in `docs/04-user-flows.md:172`.
- Why it hurts the product: Konektado is a barangay trust product. Fake trust numbers can mislead residents and undermine the core safety promise.
- Recommended fix: Remove generated trust fallbacks from public surfaces. Show honest empty states when there are no reviews or completed jobs.
- Exact replacement copy or layout rule: Rating empty state: `No reviews yet`. Completed jobs empty state: `No completed Konektado jobs yet`. Client history empty state: `No posted-job history yet`. Remove `Hours worked` unless backed by real data.
- Affected files/components: `app/services/[serviceId].tsx`, `services/marketplace.helpers.ts`, `app/job/[jobId].tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/search.tsx`, `components/home/HomeFeedCard.tsx`, `components/search/SearchJobResultCard.tsx`, `components/search/SearchWorkerResultCard.tsx`.
- Risk level: High product impact, low technical risk. It may make demo data look less full unless seed data is improved honestly.

### P1 - High Priority UX Issues

#### 4. Save is visible but not implemented consistently

- Problem: Save is a visible secondary action on details and cards, but it is placeholder or inert for verified users.
- Evidence from code/UI/source-of-truth: Job Details showed a Save alert at `app/job/[jobId].tsx:201`; Worker Profile showed a Save alert in the selected service detail route; Search Save used placeholders at `app/(tabs)/search.tsx:161` and `app/(tabs)/search.tsx:173`; Home passed `undefined` for verified-user saves at `app/(tabs)/index.tsx:525` and `app/(tabs)/index.tsx:535`, while `HomeFeedCard` still rendered the bookmark and stopped propagation at `components/home/HomeFeedCard.tsx:78` and `components/home/HomeFeedCard.tsx:240`. Docs list saved providers/jobs as planned/stubbed in `docs/03-feature-map.md:38`.
- Why it hurts the product: Bookmarking is presented as a real decision tool but may do nothing or show a demo placeholder.
- Recommended fix: Either connect `saved_items` or hide/disable Save until connected. Do not leave an active-looking button that is not real.
- Exact replacement copy or layout rule: If connected: `Save` -> `Saved`. If deferred: hide the icon from public cards/details or show a disabled helper only in preview/demo contexts.
- Affected files/components: `app/job/[jobId].tsx`, `app/services/[serviceId].tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/search.tsx`, `components/home/HomeFeedCard.tsx`, `components/search/SearchJobResultCard.tsx`, `components/search/SearchWorkerResultCard.tsx`.
- Risk level: Low if hidden; medium if implementing persistence.

#### 5. Match/relevance cards repeat metadata instead of explaining fit

- Problem: Search cards and Worker Profile use match text like "Offers cleaning help near Barangay San Pedro" or "Matches your search for cleaning help near location." This repeats category/location instead of explaining actual relevance.
- Evidence from code/UI/source-of-truth: Search job match copy is built at `app/(tabs)/search.tsx:224`; search worker match copy is built at `app/(tabs)/search.tsx:246`; Worker Profile match card is rendered only for `variant=match` in `app/services/[serviceId].tsx`; backlog says match reasons should be clearer in `docs/14-marketplace-fixes-backlog.md:212`.
- Why it hurts the product: Users do not learn why this result is better than another result. The card looks like decorative AI-style copy, not decision support.
- Recommended fix: Show match cards only when there is real search/filter/preference context. Generate reasons from service match, location/barangay, availability, schedule, budget/rate, status, and real trust signals.
- Exact replacement copy or layout rule: Do not repeat title/category/location already visible in the header. Use at most two concise reasons.
- Affected files/components: `app/(tabs)/search.tsx`, `components/search/SearchJobResultCard.tsx`, `components/search/SearchWorkerResultCard.tsx`, `app/services/[serviceId].tsx`.
- Risk level: Low.

#### 6. Worker Profile information is repeated and some sections own the wrong facts

- Problem: Worker Profile repeats location, availability, and jobs done in the hero and details grid; "Hours worked" is derived from fake job count; service categories appear both as services and tags.
- Evidence from code/UI/source-of-truth: Hero metrics showed rating/jobs/availability in the selected service detail route; Worker details repeated location/jobs/availability/hours; services/rate were separate; service tags appeared again; docs say worker details should be person-first and prioritize rating, jobs done, availability, services, and rate in `docs/03-feature-map.md:31`.
- Why it hurts the product: The page uses space repeating facts instead of answering practical questions: what service, when available, how much, and can I trust this worker?
- Recommended fix: Make the hero own identity, selected service, service area, one-line availability, and trust summary. Make details own practical fields not already shown: rate, experience, availability notes, service area, and response/messaging state if real.
- Exact replacement copy or layout rule: Replace "Worker details" grid with "Service details" for rate, availability, experience, service area. Move "Jobs completed" into a single trust row.
- Affected files/components: `app/services/[serviceId].tsx`.
- Risk level: Medium because layout changes must stay close to Figma.

#### 7. Job Details includes a hardcoded requirements section not backed by job data

- Problem: "What to bring" always says to bring a valid ID and confirm tools/materials, regardless of job category or poster input.
- Evidence from code/UI/source-of-truth: Hardcoded copy is at `app/job/[jobId].tsx:292`; job model has title, description, category, service needed, tags, photos, location, budget, workers, schedule, and listing options, but no requirements field in `types/marketplace.types.ts:25`; docs say jobs should be clear enough for providers to decide whether to message in `docs/04-user-flows.md:118`.
- Why it hurts the product: It can sound like Konektado requires ID at the job site and can imply safety policy that is not documented.
- Recommended fix: Rename this to "Before you message" or only show "Requirements" when the post has real requirements data. Encourage confirming details in Messages without inventing requirements.
- Exact replacement copy or layout rule: `Ask in Messages about exact location, tools, materials, and payment before starting.` For urgent jobs: `Confirm time, tools, and payment in Messages before you go.`
- Affected files/components: `app/job/[jobId].tsx`, future job builder if requirements become structured.
- Risk level: Low.

#### 8. Detail pages do not clearly communicate payment/agreement boundaries

- Problem: Budget and rate are shown, but the detail screens do not remind users that payment and final agreement happen outside Konektado.
- Evidence from code/UI/source-of-truth: Job budget is shown at `app/job/[jobId].tsx:251`; worker rate is shown in `app/services/[serviceId].tsx`; docs say no in-app payments and outside agreements in `docs/00-project-brief.md:88` and `docs/00-project-brief.md:98`; data model says budget is informational only in `docs/05-data-model.md:275`.
- Why it hurts the product: Users may infer booking/payment protection or guaranteed work from a marketplace-style detail screen.
- Recommended fix: Add a small neutral note near budget/rate or above the CTA bar.
- Exact replacement copy or layout rule: `Budget/rate is for coordination. Payment and final agreement happen outside Konektado.`
- Affected files/components: `app/job/[jobId].tsx`, `app/services/[serviceId].tsx`.
- Risk level: Low.

#### 9. Reviews section uses internal MVP copy

- Problem: Worker Profile review empty state says "Full public review history stays minimal in this MVP slice, but the real provider and service record are now live."
- Evidence from code/UI/source-of-truth: Copy was in the selected service detail route. Design rules require plain, user-readable labels in `docs/08-design-system.md:68`.
- Why it hurts the product: It exposes implementation language and makes the app feel unfinished.
- Recommended fix: Replace with user-facing empty/review copy.
- Exact replacement copy or layout rule: Empty: `No reviews yet. Reviews appear after completed Konektado jobs.` With reviews: `4.8 average from 6 reviews`.
- Affected files/components: `app/services/[serviceId].tsx`.
- Risk level: Low.

### P2 - Medium Priority Improvements

#### 10. Worker Profile route is service-specific but labeled as a full worker profile

- Problem: The previous `/worker/[workerId]` route received a service id, loaded one active service, and then showed "Worker Profile".
- Evidence from code/UI/source-of-truth: The current service detail route is `app/services/[serviceId].tsx`; `getServiceDetail` fetches by service id at `services/service-profile.service.ts:203`; Search and Home cards open selected service records; Worker Profile also shows "More services from this worker".
- Why it hurts the product: A user expects a person-level profile but lands on a selected-service detail. This can be correct, but the information architecture should make the selected service explicit.
- Recommended fix: Use `/services/[serviceId]` for the selected service offer and reserve `/workers/[workerId]` for a future provider-level profile route.
- Exact replacement copy or layout rule: Header title can stay `Worker Profile`; first service section title should be `Selected service` and include the service title, rate, availability, and tags.
- Affected files/components: `app/services/[serviceId].tsx`, `app/(tabs)/search.tsx`, `app/(tabs)/index.tsx`.
- Risk level: Low.

#### 11. Trust/verification placement decision

- Problem: The docs previously differed slightly on where public verification cues should appear. The confirmed MVP decision is to avoid repeated public verification badges on feed, search, Job Details, and Worker Profile screens.
- Evidence from code/UI/source-of-truth: Public profile type includes `barangayVerifiedAt` and `verifiedAt` in `types/marketplace.types.ts:21`; docs say public provider fields include verification badge in `docs/07-auth-and-permissions.md:146`; decision log says public feed/search cards should not repeat badges by default but details can keep verification cues in `docs/11-decision-log.md:19`; backlog says not to repeat verified badges in normal public detail sections in `docs/14-marketplace-fixes-backlog.md:117` and `docs/14-marketplace-fixes-backlog.md:129`.
- Why it hurts the product: Repeated verification badges could imply the barangay endorses or guarantees work quality/outcomes, while verification is primarily an access gate.
- Recommended fix: Keep public verification cues out of feed cards, search cards, Job Details, and Worker Profile. Use verification copy only in gated-action states and verification/onboarding screens.
- Exact replacement copy or layout rule: Use neutral gate copy such as `Complete verification to message workers and clients.` or `Verification unlocks messaging, posting, saving, and reviews.`
- Affected files/components: `app/job/[jobId].tsx`, `app/services/[serviceId].tsx`, card components if the decision changes.
- Risk level: Low.

#### 12. Search result cards use presence/availability cues without an unknown state

- Problem: SearchWorkerResultCard defaults `PresenceDot` to active when `worker.isActive` is missing.
- Evidence from code/UI/source-of-truth: `PresenceDot active={worker.isActive ?? true}` is at `components/search/SearchWorkerResultCard.tsx:25`; `WorkerCard` also defaults `isActive = true` at `components/WorkerCard.tsx:34`.
- Why it hurts the product: A green/active cue should mean something real. Unknown availability should not look active.
- Recommended fix: Add an unknown/neutral state or default to false unless availability text clearly indicates active.
- Exact replacement copy or layout rule: Unknown status line: `Availability to coordinate`; no active dot unless active availability is known.
- Affected files/components: `components/search/SearchWorkerResultCard.tsx`, `components/WorkerCard.tsx`, mapping in `app/(tabs)/search.tsx` and `app/(tabs)/index.tsx`.
- Risk level: Low.

#### 13. "Accepted" in Job Details is ambiguous

- Problem: The job summary grid labels `Accepted` as a count, but the MVP flow uses interested workers, Mark Hired, and job status. "Accepted" can sound like applications.
- Evidence from code/UI/source-of-truth: `Accepted` appears at `app/job/[jobId].tsx:263`; docs say use message-based interest and Mark Hired, not Apply/Application, in `docs/04-user-flows.md:125` and `docs/04-user-flows.md:142`.
- Why it hurts the product: It may pull the mental model back toward applications.
- Recommended fix: Use `Hired` or `Worker hired` if `accepted_provider_id` exists; otherwise omit the field or show `No worker hired yet` lower on owner/client contexts.
- Exact replacement copy or layout rule: For public worker-facing jobs, show `Workers needed: 2`; do not show `Accepted: 0` above the fold.
- Affected files/components: `app/job/[jobId].tsx`.
- Risk level: Low.

#### 14. Static demo data is stale and contains product-risky copy

- Problem: `constants/marketplace-demo-data.ts` no longer appears to feed the current detail/search screens, but docs still refer to it as a shared static source. It contains mojibake currency text and "Earned" history labels.
- Evidence from code/UI/source-of-truth: Search found references only in docs, not active imports; stale data includes `earningsText` in `constants/marketplace-demo-data.ts:51` and example work history at `constants/marketplace-demo-data.ts:234`; decision log still describes it as a shared source in `docs/11-decision-log.md:34`.
- Why it hurts the product: Future contributors may revive stale data that implies in-app earnings/payment or shows broken text.
- Recommended fix: Either remove/archive stale demo data or update docs to say current screens use Supabase seed data. If kept, replace `Earned` with neutral completed-work labels and fix encoding.
- Exact replacement copy or layout rule: Replace `Earned PHP 650` with `Completed last week` or `Budget was PHP 650, coordinated outside Konektado`.
- Affected files/components: `constants/marketplace-demo-data.ts`, `docs/11-decision-log.md`, `docs/12-coding-kickoff.md`.
- Risk level: Low.

### P3 - Polish / Cleanup

#### 15. Button labels can be more specific without adding complexity

- Problem: Detail primary CTAs say `Message`, while the decision is specifically messaging the client or worker.
- Evidence from code/UI/source-of-truth: Job Details label at `app/job/[jobId].tsx:329`; Worker Profile label in `app/services/[serviceId].tsx`; design system allows clear action labels in `docs/08-design-system.md:135`.
- Why it hurts the product: Generic `Message` is understandable, but more specific labels reduce uncertainty.
- Recommended fix: Use object-specific labels.
- Exact replacement copy or layout rule: Job: `Message client`. Worker: `Message worker`.
- Affected files/components: `app/job/[jobId].tsx`, `app/services/[serviceId].tsx`.
- Risk level: Low.

#### 16. More/options buttons are placeholders on discovery/detail surfaces

- Problem: More options buttons show placeholder alerts instead of useful actions such as report/share/hide.
- Evidence from code/UI/source-of-truth: Job Details options placeholder at `app/job/[jobId].tsx:65`; Worker Profile placeholder was in the selected service detail route; Search card placeholders at `components/search/SearchJobResultCard.tsx:28` and `components/search/SearchWorkerResultCard.tsx:38`; reports/moderation are planned in `docs/03-feature-map.md:36`.
- Why it hurts the product: It makes trust/safety UI look present but unfinished.
- Recommended fix: Either connect minimal report action or hide overflow until there is at least one real action.
- Exact replacement copy or layout rule: Overflow actions: `Report job`, `Report profile`, `Share` only if implemented.
- Affected files/components: Detail screens and search cards.
- Risk level: Low.

#### 17. Encoding artifacts should be cleaned before any static data is reused

- Problem: Some static/demo copy shows mojibake for peso signs, bullets, and apostrophes.
- Evidence from code/UI/source-of-truth: `constants/marketplace-demo-data.ts:81`, `constants/marketplace-demo-data.ts:136`, and `app/create-service-preview.tsx:158` show encoded punctuation artifacts in terminal output.
- Why it hurts the product: Broken local currency/copy undermines polish and readability.
- Recommended fix: Use ASCII-safe `PHP` and simple hyphens unless the repo is normalized for Unicode.
- Exact replacement copy or layout rule: `Rate PHP 200-800 - Available mornings`.
- Affected files/components: Static/demo constants and preview copy.
- Risk level: Low.

## Information Architecture Rules

- Header owns identity and orientation: screen title, back/options, primary title/name, selected service/job title, high-level status, public-safe location/service area.
- Trust row owns trust only: rating/reviews, completed jobs/jobs posted, verified state if product confirms it belongs on detail, and no fake numbers.
- Match card owns relevance reasoning only: it should not repeat the title, location, category, or generic status already visible elsewhere.
- Job summary owns practical task facts: schedule, budget, workers needed, status, service needed, urgency if present.
- Worker service section owns selected service facts: service title/category, rate, availability, experience, service area, and tags.
- Description/About owns narrative context: what the work is, what the worker offers, what the client needs.
- Requirements/Before messaging owns only real requirements or neutral reminders to confirm details in Messages.
- Poster/Provider card owns the other party identity and safe trust metrics; it should not include job/service tags.
- CTA bar owns the next best action and its availability state. It should not require tapping to discover that an action is unavailable.

## Ideal Worker Profile Structure

1. Header/app bar
   - Title: `Worker Profile`
   - Back and real overflow action if available.

2. Hero
   - Worker name.
   - Selected service title.
   - Public service area.
   - One-line availability.
   - No repeated public verification badge for MVP.

3. Trust summary
   - `4.8 average from 6 reviews` or `No reviews yet`.
   - `12 completed Konektado jobs` or `No completed Konektado jobs yet`.
   - Do not show fabricated hours worked.

4. Selected service
   - Services offered as clear pills.
   - Rate expectation: `Starts at PHP 450` or `Rate to coordinate`.
   - Experience if real.
   - Availability detail.

5. Match card, only from search/preference context
   - Title: `Why this worker may fit`
   - Body examples:
     - `Offers Cleaning, which matches your search. Available this weekend in Barangay San Pedro.`
     - `Near your barangay and has recent cleaning reviews.`

6. About this service
   - Short provider-written description.

7. Work photos
   - Only when images exist.

8. More services from this worker
   - Lower on page, after selected-service decision info.

9. Reviews
   - Real review summary and list if available.
   - Empty copy: `No reviews yet. Reviews appear after completed Konektado jobs.`

10. CTA bar
   - `Message worker`
   - Save hidden until saved-items is implemented.
   - Payment note near CTA: `Rate is for coordination. Payment and final agreement happen outside Konektado.`

## Ideal Job Details Structure

1. Header/app bar
   - Title: `Job Details`
   - Back and real overflow action if available.

2. Job hero
   - Job title or formatted service-needed title.
   - Status pill.
   - Posted date.
   - Public location.
   - Schedule.
   - Budget if provided; otherwise `Budget to coordinate`.

3. Task summary
   - Service needed.
   - Workers needed.
   - Urgency/schedule.
   - Status.
   - Avoid `Accepted: 0` for public worker-facing detail.

4. Photos
   - Dedicated section if present.

5. What you will do
   - Job description.

6. Requirements or Before you message
   - Only real requirements if data exists.
   - Fallback: `Ask in Messages about exact location, tools, materials, and payment before starting.`

7. Job tags
   - Context tags only; avoid duplicating service needed if already prominent.

8. Posted by
   - Client name.
   - Public-safe barangay/location.
   - Honest client rating/review state.
   - Honest posted-jobs state.
   - No repeated public verification badge for MVP.

9. CTA bar
   - `Message client` for open/reviewing jobs that allow messages.
   - Save hidden until saved-items is implemented.
   - Disabled states for closed/cancelled/in-progress/own job/messages off.
   - Payment note: `Budget is for coordination. Payment and final agreement happen outside Konektado.`

## Match Card Logic

The match card should appear only when the user arrived from Search, Home For You personalization, or a selected service/filter. It should not appear on every direct-open detail screen unless there is a real preference/search context to explain.

Use these inputs where available:

- Search query text.
- Selected service/category.
- User onboarding preferences.
- Barangay/location.
- Job status.
- Schedule/availability.
- Budget/rate presence.
- Real rating/review/completed job signals.

Do not use the match card to repeat:

- The exact job title.
- The same location already in the hero.
- The same category already shown in service/job tags.
- Fake ratings/jobs done.

Worker match copy patterns:

- `Offers {service}, which matches your search. {Availability} in {barangay}.`
- `Near your barangay and available {availability}.`
- `Matches your saved service preference: {service}.`
- `Good fit for {service}; rate is listed and availability is clear.`

Job match copy patterns:

- `Needs {service}, which matches your work preferences. Schedule: {schedule}.`
- `Near your barangay and open for messages.`
- `Matches your {service} preference and includes a budget estimate.`
- `This job is open and needs {workersNeeded} worker(s).`

Fallback copy:

- Do not show the card if no match context exists.
- If product wants a fallback, use `Why this may fit` with one concrete fact: `This post is in your barangay.` Avoid generic "near you" if location is already visible.

## CTA and State Logic

Message:

- Verified user, open/reviewing job, messages allowed, not own job: show `Message client`.
- Verified user, active service, messages allowed, not own service: show `Message worker`.
- Unverified user: show enabled CTA that routes to verification, label `Verify to message` or keep primary label and show gate on tap. Recommended detail copy: `Complete barangay verification to message workers and clients.`
- Own job/service: disable CTA with `This is your post`.
- Job closed/cancelled/completed/in progress: disable CTA with `Job closed` or `Worker already hired`.
- Service inactive or messages off: disable CTA with `Messages unavailable`. Unavailable availability text alone is not a hard block when the service is active and messages are allowed.

Apply / Express Interest:

- Do not use `Apply` for MVP.
- If more explicit job-interest language is needed, use `Message to show interest` in helper text, not as the main button unless tested.

Save:

- Save/bookmark stays hidden until saved-items is implemented.
- Do not show fake Save buttons or placeholder Save alerts.

Unverified users:

- Can browse details.
- Primary interaction routes to verification.
- Helper copy: `Verification unlocks messaging, posting, saving, and reviews.`

Closed jobs:

- Keep readable if opened from Messages/history.
- Replace primary CTA with `Job closed`.
- Show status near title and a short explanation: `This job is no longer accepting new messages.`

Unavailable workers:

- Keep profile readable if active but unavailable.
- Show availability clearly.
- If messages are allowed, the CTA can remain `Message worker` with helper `Ask about next availability in Messages.`
- If messages are off, disable CTA.

Pending verification:

- For the current user: show verification pending state in gates and profile, not on unrelated public detail pages.
- For public profiles: do not expose private verification request state.

Missing data:

- Do not hide every missing field if it is decision-critical. Use honest, short fallbacks.

## Edge State Recommendations

- No rating yet: show `No reviews yet`.
- No jobs completed yet: show `No completed Konektado jobs yet`.
- No client jobs posted yet: show `No posted-job history yet`.
- No rate provided: show `Rate to coordinate`.
- No budget provided: show `Budget to coordinate`.
- No availability provided: show `Availability to coordinate`.
- User is unverified: allow browsing, route interaction to verification.
- Worker unavailable today: show availability as text; do not show active/presence dot unless availability is truly active.
- Job urgent: show an `Urgent` tag or schedule line near the hero, not buried only in tags.
- Job closed: keep details visible but disable interaction.
- Profile pending verification: do not expose pending private status publicly; owner can see it in Profile/Verification.
- Network slow: skeleton should preserve final structure and not imply missing trust fields.
- Partially missing data: prefer neutral fallbacks over fake numbers.

## Copy System

Location:

- `Barangay San Pedro`
- `Near {publicLocation}`
- `Service area: {barangay}`

Availability:

- `Available today`
- `Available {schedule}`
- `Availability to coordinate`
- `Unavailable today, back {time}`

Rate/budget:

- `Starts at PHP {amount}`
- `PHP {min}-{max}`
- `Rate to coordinate`
- `Budget PHP {amount}`
- `Budget to coordinate`

Verification:

- `Complete verification to message workers and clients.`
- `Verification unlocks messaging, posting, saving, and reviews.`

Match reason:

- `Matches your {service} search and is in your barangay.`
- `Needs {service}, which matches your work preferences.`
- `Near your barangay and open for messages.`

Empty rating:

- `No reviews yet`
- `Reviews appear after completed Konektado jobs.`

No jobs completed:

- `No completed Konektado jobs yet`

Closed job:

- `This job is closed`
- `This job is no longer accepting new messages.`

Unverified user restriction:

- `Complete barangay verification to message workers and clients.`
- `Verification unlocks messaging, posting, saving, and reviews.`

External payment/agreement note:

- `Budget is for coordination. Payment and final agreement happen outside Konektado.`
- `Rate is for coordination. Payment and final agreement happen outside Konektado.`

## Implementation Plan

1. Fix message availability and CTA state
   - Files/components likely affected: `services/conversation.service.ts`, `app/job/[jobId].tsx`, `app/services/[serviceId].tsx`.
   - What to change: enforce `allowMessages` for jobs, derive disabled CTA labels, prevent late error-only UX.
   - Why: protects poster settings and avoids misleading primary actions.
   - Manual test: open open job, closed job, own job, messages-off job, service messages-off profile, unverified user.

2. Remove fake trust metrics
   - Files/components likely affected: `services/marketplace.helpers.ts`, `app/services/[serviceId].tsx`, cards/search mappings.
   - What to change: replace generated ratings/counts with honest empty states; remove derived hours.
   - Why: trust-first product cannot rely on fabricated public history.
   - Manual test: seed profile with no reviews/jobs; seed profile with real reviews/jobs; compare cards and details.

3. Hide Save until saved-items is implemented
   - Files/components likely affected: details, Home card, Search cards, saved item service if implemented.
   - What to change: hide Save/bookmark until saved-items is properly implemented.
   - Why: visible bookmarks should be real.
   - Manual test: confirm no active fake Save button or placeholder Save alert appears on detail, Home, or Search surfaces.

4. Clean Worker Profile IA
   - Files/components likely affected: `app/services/[serviceId].tsx`.
   - What to change: reduce repeated facts, make selected service explicit, replace internal review copy, remove fake hours.
   - Why: helps clients decide whether to message.
   - Manual test: worker with multiple services, no reviews, with reviews, no rate, no availability.

5. Clean Job Details IA
   - Files/components likely affected: `app/job/[jobId].tsx`.
   - What to change: replace hardcoded "What to bring", rename ambiguous fields, add outside-payment note, show missing budget/schedule honestly.
   - Why: helps workers decide whether to show interest through Messages.
   - Manual test: open job with budget, no budget, urgent tag, closed status, photo/no photo.

6. Improve match card logic
   - Files/components likely affected: `app/(tabs)/search.tsx`, search cards, Worker Profile match variant.
   - What to change: show match only with real context and use concrete reasons.
   - Why: turns match copy into decision support.
   - Manual test: search by service, tap popular service, direct-open from Home, no query.

7. Clean stale demo data and encoding
   - Files/components likely affected: `constants/marketplace-demo-data.ts`, docs that still describe it as active if no longer true.
   - What to change: archive or update stale static records; remove payment-implying `Earned` labels.
   - Why: prevents future UI drift.
   - Manual test: verify no active import breaks; if retained, review all demo screens.

## Questions for Human Confirmation

- Should Job Details ever use `Message to show interest`, or should the button stay simply `Message client`?
- Should job requirements/what-to-bring become structured data in the job builder, or stay as part of description/tags for MVP?

## Implementation Checklist

## Product UX Implementation Status

- Current phase: Phase 5 — Product UX detail screen fixes
- Status: Implemented, pending manual device QA

First P0/P1 items in scope:

- P0 Issue 1 — Honor job `allow_messages` in both Job Details CTA state and `startJobConversation`.
- P0 Issue 2 — Make Job Details and Worker Profile message CTAs state-aware for unverified users, own posts/services, closed or hired jobs, inactive services, and messages-off records.
- P0 Issue 3 — Remove generated/fake public trust metrics and use honest empty states for reviews, completed jobs, and posted-job history.
- P1 Issue 4 — Remove active fake Save/bookmark behavior from detail and discovery surfaces where saved items are not implemented.
- P1 Issue 6, Issue 7, Issue 8, Issue 9, and Issue 15 — Apply small detail-screen copy and information-architecture fixes: selected-service clarity, `Before you message`, external payment/agreement notes, user-facing reviews copy, and specific `Message client` / `Message worker` labels.

Files planned for this phase:

- `services/conversation.service.ts` — add the missing job `allowMessages` guard.
- `services/marketplace.helpers.ts` — replace generated trust fallbacks with honest empty states.
- `app/job/[jobId].tsx` — compute state-aware CTA, disable/hide fake Save, add payment note, replace hardcoded "What to bring", and remove ambiguous repeated fields.
- `app/services/[serviceId].tsx` — compute state-aware CTA, disable/hide fake Save, remove fake jobs/hours, clarify selected service/rate, and replace internal review copy.
- `components/home/HomeFeedCard.tsx`, `components/search/SearchJobResultCard.tsx`, `components/search/SearchWorkerResultCard.tsx`, `app/(tabs)/search.tsx` — keep Save from appearing as an active placeholder where saved items are not connected.
- `docs/product-ux-detail-screen-audit.md` — record implementation notes, validation, deferred items, and manual testing.

Risks:

- CTA availability now depends on current user id, verification state, job status, service activity, and message settings; missed edge cases could hide a valid message path.
- Removing fake trust metrics will make sparse seed/demo data look less full, but it is required for trust accuracy.
- Hiding or disabling Save may reduce visible affordances until saved-items is implemented, but it avoids a fake action.
- Detail-screen layout changes are intentionally small, but still need manual checks on small phones for CTA helper text and bottom spacing.

- [x] Confirm ideal information architecture
- [x] Fix repeated information
- [ ] Improve match card logic
- [x] Improve Worker Profile details
- [x] Improve Job Details content
- [x] Standardize CTA behavior
- [x] Add/clean edge states
- [ ] Update mock/seed data if needed
- [ ] Test with multiple worker/job examples

## Phase 5 Implementation Notes

Implemented changes:

- Job Details now computes the primary CTA from verification state, ownership, job status, and `allowMessages`.
- Worker Profile now computes the primary CTA from verification state, ownership, service activity, and `allowMessages`.
- Service-specific detail routing now uses `app/services/[serviceId].tsx` and `/services/[serviceId]`; `/workers/[workerId]` is reserved for a future person-level worker profile.
- `startJobConversation` now rejects jobs where `allowMessages` is false, matching the public detail-screen CTA state.
- Detail CTAs now use specific labels: `Message client`, `Message worker`, or explicit disabled/gated labels such as `Verify to message`, `This is your post`, `Job closed`, `Worker already hired`, `Messages are off for this job`, and `Messages unavailable`.
- Job Details now shows `Budget is for coordination. Payment and final agreement happen outside Konektado.`
- Worker Profile now shows `Rate is for coordination. Payment and final agreement happen outside Konektado.`
- Worker Profile keeps messaging enabled for unavailable-but-active services when messages are allowed, and uses `Ask about next availability in Messages.` as helper copy.
- Job Details replaced hardcoded `What to bring` copy with `Before you message` guidance that asks users to confirm exact location, tools, materials, and payment in Messages.
- Job Details removed the repeated poster-location trust metric and replaced ambiguous `Accepted` with `Worker hired`.
- Worker Profile now makes the selected service explicit, changes `Worker details` to `Service details`, removes fake hours worked, and uses practical service fields: rate, availability, service area, and experience.
- Reviews now use user-facing empty copy: `No reviews yet` and `Reviews appear after completed Konektado jobs.`
- Generated/fake trust fallbacks were removed from marketplace helpers. Empty states now use `No reviews yet`, `No completed Konektado jobs yet`, and `No posted-job history yet`.
- Save/bookmark buttons are hidden on detail, Home, and Search surfaces while saved-items persistence remains unimplemented.

Validation results:

- `npm.cmd run lint` passed.
- `npx.cmd tsc --noEmit` passed.
- `git diff --check` passed with line-ending normalization warnings only.

Manual testing checklist:

- Open Job Details as verified worker; confirm `Message client` is enabled for open/reviewing jobs with messages on.
- Open Job Details as unverified user; confirm `Verify to message` routes to verification.
- Open own job; confirm CTA says `This is your post` and does not open a conversation.
- Open closed/cancelled/completed job; confirm CTA is disabled and does not open a conversation.
- Open in-progress job; confirm CTA says `Worker already hired`.
- Open job with messages off; confirm CTA says `Messages are off for this job`.
- Open Worker Profile as verified client; confirm `Message worker` is enabled for active services with messages on.
- Open Worker Profile as unverified user; confirm `Verify to message` routes to verification.
- Open own service; confirm CTA says `This is your service`.
- Open unavailable-but-active service with messages on; confirm `Message worker` remains available with next-availability helper copy.
- Open inactive service or service with messages off; confirm CTA is disabled with inactive/messages-off copy.
- Open worker/job with no reviews or completed jobs; confirm fake ratings, fake jobs done, fake jobs posted, and fake hours worked are gone.
- Confirm payment/agreement notes are visible but not intrusive.
- Confirm Save/bookmark is not shown as an active fake action.
- Confirm detail screens do not repeat location, availability, rate, or job-count information unnecessarily.

Deferred items:

- Match card logic still needs a separate pass to use real search/preference context rather than generic relevance copy.
- Full saved-items persistence remains deferred by confirmed product decision; Save is hidden rather than implemented.
- Search overflow/more-options actions remain placeholder actions and should become real report/share actions or be hidden in a later trust/safety pass.
- Database, review-system expansion, booking/payment, admin, and performance work remain out of scope for this product UX phase.

Post-Phase-5 stabilization:

- Fixed a service post flow regression where `Review service post` navigated to `create-service-preview`, but the root route guard did not allow or register that top-level preview route and replaced it with the Home/Dashboard tabs.
- `create-service-preview` is now registered in the root stack and included in the authenticated main-app route allowlist, matching the existing `create-job-preview` behavior.
- The service preview Publish action now routes unverified users to verification before calling the service creation API, preserving the preview/back stack instead of relying on a late service-layer rejection.
- Service Post form now uses one forward action, matching Job Post: the header `Next` validates and opens preview, and the lower duplicate `Review service post` button was removed.
- Service preview now uses `Post service` as the final submit action; publishing still happens only from the preview screen.

Needs human confirmation:

- Whether Job Details should ever use `Message to show interest`, or stay simply `Message client`.
- Whether job requirements/what-to-bring should become structured data in the job builder, or stay in description/tags for MVP.
