# Home Feed Personalization Strategy

## Purpose

This document audits how Konektado currently collects and uses onboarding preferences, then proposes an MVP-safe architecture and ranking model for the Home `For you` feed.

The goal is to turn onboarding preference selections into durable product data that improves discovery, without introducing AI/ML complexity or depending on data the current MVP does not actually have.

## Audit Summary

### What exists today

- The controlled taxonomy already exists in [`constants/service-taxonomy.ts`](C:\konektado\constants\service-taxonomy.ts).
- Onboarding collects service preferences from that taxonomy in [`app/(onboarding)/job.tsx`](C:\konektado\app\(onboarding)\job.tsx).
- Preferences are saved to `public.user_preferences` through [`services/onboarding.service.ts`](C:\konektado\services\onboarding.service.ts).
- Home loads preferences with `getMyUserPreferences()` and uses them for filter defaults plus lightweight text scoring in [`app/(tabs)/index.tsx`](C:\konektado\app\(tabs)\index.tsx).
- Jobs and services already expose real ranking signals such as:
  - structured service/category fields
  - barangay and location text
  - created date
  - review counts and average rating
  - completed hired-job counts for providers

### Main current gaps

1. The database and docs support `intent = 'both'`, but current TypeScript types and onboarding UI only support `client` or `provider`.
2. `ProfileProvider` does not load `user_preferences`, so preference data is not app-global state.
3. Home personalization is currently text-match based, not taxonomy-aware.
4. Home combines offered and needed preferences into one generic term list instead of using role-specific logic.
5. `For you` mixing is still mechanical because it alternates types after the first pick instead of using mode-aware quotas.
6. Users do not currently have a clear place in Profile to edit discovery preferences later.

## 1. Current Preference Data Flow

### Where onboarding preferences are collected

Preferences are collected in [`app/(onboarding)/job.tsx`](C:\konektado\app\(onboarding)\job.tsx).

- The screen uses `MVP_SERVICE_OPTIONS` from the taxonomy file.
- Provider-mode onboarding collects `offeredServices`.
- Client-mode onboarding collects `neededServices`.
- The client screen helper already frames this as Home personalization: "Choose a few services so Home can show better services first."

### What fields they are saved under

Preferences are saved by [`saveOnboardingProfile`](C:\konektado\services\onboarding.service.ts) into:

- `user_preferences.intent`
- `user_preferences.offered_services`
- `user_preferences.needed_services`
- `user_preferences.custom_offered_services`
- `user_preferences.custom_needed_services`
- `user_preferences.onboarding_completed_at`

There is also a legacy bridge for providers:

- `provider_profiles.service_type` is seeded from offered services for provider onboarding.

That legacy seed is useful for fallback and verification prefill, but it should not become the primary personalization source long term.

### Where preferences live

The current source of truth is `public.user_preferences`, defined in [`supabase/migrations/20260503013000_user_preferences.sql`](C:\konektado\supabase\migrations\20260503013000_user_preferences.sql).

Important details:

- One row per user
- Role intent supports `client`, `provider`, and `both`
- Offered and needed services are already separated

### Whether preferences are loaded by `ProfileProvider`

No.

[`hooks/use-profile.ts`](C:\konektado\hooks\use-profile.ts) loads:

- `profiles`
- `provider_profiles`

It does not load `user_preferences`, and it does not subscribe to `user_preferences` changes.

### Whether Home currently reads and uses those preferences

Yes, but only in a lightweight and generic way.

[`app/(tabs)/index.tsx`](C:\konektado\app\(tabs)\index.tsx):

- calls `getMyUserPreferences()`
- uses `intent` to pick the default tab
- combines all preference arrays into one normalized term list
- scores jobs and service posts by text inclusion against `scoreText`
- adds a tiny intent boost
- adds a tiny location phrase boost
- adds freshness

This is good as a starter slice, but it is not yet a true role-aware personalization model.

### Whether preferences are role-specific or generic

At the table level, they are already role-specific:

- `offered_services` for worker/provider interest
- `needed_services` for client need

At the Home feed level, they are currently treated too generically because all preference arrays are merged into one term set for scoring.

### Whether users can update preferences later from Profile

Not today.

[`app/(tabs)/profile.tsx`](C:\konektado\app\(tabs)\profile.tsx) shows Work Profile and Hiring Profile views, plus jobs/services/reviews, but it does not expose a "Discovery preferences" editor tied to `user_preferences`.

## Current Code Findings That Matter for Personalization

### Mixed-role support is incomplete in code

The product docs and database support `both`, but current app types do not.

- [`types/onboarding.types.ts`](C:\konektado\types\onboarding.types.ts) defines `OnboardingIntent` as only `client | provider`.
- [`app/(auth)/role.tsx`](C:\konektado\app\(auth)\role.tsx) only renders two choices.
- [`utils/save-role.ts`](C:\konektado\utils\save-role.ts) only writes one active role at a time from the selected role.
- [`services/onboarding.service.ts`](C:\konektado\services\onboarding.service.ts) normalizes only `client` and `provider`.

This means the app cannot yet represent the mixed-role behavior described in the product docs as first-class onboarding data.

### Home ranking is still text-first instead of taxonomy-first

Home scoring currently relies on a generated `scoreText` string and substring matches.

That misses the strongest structured fields we already have:

- job `service_needed`
- job `category`
- service `category`
- exact onboarding service selections from the controlled taxonomy

### Location relevance is too shallow

Current Home ranking gives a small boost only if the text contains phrases like:

- `barangay san pedro`
- `near your barangay`

This is not strong enough for a barangay-focused product. We already have profile barangay/city plus job/service barangay/location text, so we can do better with deterministic normalization even before adding coordinates.

### Some real trust signals already exist

The current services and jobs queries already compute or expose:

- provider average rating and review count
- provider completed hired-job count
- client average rating and review count
- client jobs posted count

That means MVP personalization can safely use real trust signals without inventing fake values.

## 2. Product Logic Recommendation

### Recommendation in one sentence

Use `user_preferences` as the preference source of truth, use `profiles.active_role` as the primary feed-mode switch, and rank candidates with deterministic weighted scoring based on exact taxonomy match, barangay proximity, freshness, and real trust signals.

### Feed mode recommendation

For MVP, resolve Home `For you` mode in this order:

1. `profiles.active_role`
2. `user_preferences.intent`
3. fallback to `mixed`

Recommended modes:

- `provider` mode: prioritize jobs
- `client` mode: prioritize services
- `mixed` mode: mix both with dynamic quotas

This keeps onboarding intent useful while allowing current account mode to matter more once users actively use both sides of the marketplace.

### For workers/providers

`For you` should primarily prioritize job posts matching selected offered-service interests.

Recommended behavior:

- Show mostly jobs.
- Allow a small amount of service/worker content only as secondary mixed discovery.
- Weight exact `service_needed` matches highest.
- Weight same-barangay jobs strongly.
- Weight fresh jobs strongly because open opportunities age quickly.

Recommended ratio for `provider` mode:

- Top 8 feed items: target around 6 jobs, up to 2 service cards
- If service cards are not strongly relevant, do not force them in

Reason:

- Providers open Home to find work opportunities.
- The dedicated `Services` tab already covers service browsing when needed.
- A provider-first `For you` feed should feel opportunity-first, not evenly mixed.

### For clients

`For you` should primarily prioritize services matching selected needed services.

Recommended behavior:

- Show mostly service/worker cards.
- Only include a small number of jobs when there is mixed-role context.
- Weight exact service-category matches highest.
- Weight same-barangay providers strongly.
- Weight real provider trust and availability next.

Recommended ratio for `client` mode:

- Top 8 feed items: target around 6 worker/service cards, up to 2 job cards
- If the user is clearly client-only, it is acceptable for `For you` to be almost entirely services

Reason:

- Clients open Home to find people who can help them nearby.
- Jobs from other clients are lower-value content unless the user also behaves like a provider.

### For mixed-role users

Mixed-role users should get a genuinely mixed feed, but the mix should depend on current mode, not simple alternation.

Recommended priority order:

1. `profiles.active_role`
2. explicit future Home mode preference if added later
3. recent behavior
4. raw onboarding `intent`

For MVP, use:

- `active_role = provider` -> provider-weighted mix
- `active_role = client` -> client-weighted mix
- `intent = both` with no reliable active role -> balanced mix

Future recommendation:

- Add a lightweight persistent preference such as `home_feed_mode` or "I want to hire / I want to work" only if role switching alone proves too coarse.
- Do not add that schema yet unless product testing shows confusion.

### Should users be able to update preferences later

Yes.

Add a later Profile setting such as:

- `Discovery preferences`

This should edit `user_preferences`, not public services directly.

Reason:

- Onboarding preferences describe what the user wants to discover.
- Public service posts describe what the user is actively offering.
- Those are related, but not always identical.

Example:

- A provider may offer `Cleaning` and `Laundry help`, but currently want Home to prioritize `Cleaning` jobs first.

## 3. Architecture Recommendation

### Keep `user_preferences` as the source of truth

Do not move onboarding preference storage into `profiles`.

Why:

- The table already exists.
- It already separates provider and client preference sets.
- It keeps personalization data separate from public profile identity.

### Extend app state to load preferences globally

Recommended MVP-safe approach:

- Keep `ProfileRecord` focused on `profiles`.
- Extend `ProfileContextValue` with a sibling `preferences` field, or add a dedicated `useUserPreferences` hook/provider with the same refresh lifecycle.

Either approach is acceptable, but one shared source is important because preferences are already used by:

- onboarding completion logic
- Home personalization
- verification prefill
- future Profile editing

Recommended preference:

- Add `preferences` to the profile context instead of repeatedly fetching them in screen code.

### Move Home scoring out of the screen

Create a dedicated service such as:

- `services/home-feed.service.ts`

Responsibilities:

- resolve feed mode
- normalize preference sets
- score jobs for a user
- score services for a user
- build the final `For you` feed with mode-aware quotas

`app/(tabs)/index.tsx` should stay focused on:

- loading state
- tab state
- rendering
- navigation

This follows the repo's service-layer rules and makes scoring easier to test and adjust.

### Use taxonomy helpers as the first ranking layer

Prefer exact structured comparisons before text fallback:

- provider-mode job match:
  - compare `user_preferences.offered_services` to `job.service_needed`
  - fallback to taxonomy group via `getCategoryForMvpService`
- client-mode service match:
  - compare `user_preferences.needed_services` to `service.category`
  - fallback to taxonomy group via `getCategoryForMvpService`

Use free-text custom preference arrays only as secondary fallback, not as the main ranking path.

### Treat `provider_profiles.service_type` as legacy fallback only

Continue reading it only when:

- older accounts have no `user_preferences`
- verification prefill needs a fallback string

Do not use it as the primary source once `user_preferences` is available.

## 4. MVP Scoring Algorithm

### Design goals

- deterministic
- easy to explain
- no fake ratings or fake job counts
- no dependence on unavailable coordinates or structured schedules
- strong use of existing structured taxonomy fields

### Candidate scoring by mode

#### A. Jobs scored for provider-mode discovery

Use when the feed is trying to help a provider find work.

```ts
jobScore =
  serviceMatch * 45 +
  locationMatch * 20 +
  recency * 15 +
  clientTrust * 10 +
  modeBoost * 10
```

Suggested component rules:

- `serviceMatch`
  - `1.0` exact match between preference and `job.service_needed`
  - `0.5` same taxonomy group between preference and `job.category`
  - `0.2` text/tag fallback match from custom preferences
  - `0` otherwise
- `locationMatch`
  - `1.0` exact same barangay
  - `0.5` same city or location text contains user barangay
  - `0` otherwise
- `recency`
  - normalize open jobs so newest gets the strongest boost
  - example: 0 to 1 over the last 7 days
- `clientTrust`
  - use only real review/job history data already computed in `job.service.ts`
  - small bounded score, not dominant
- `modeBoost`
  - `1.0` in provider mode
  - smaller or zero outside provider mode

#### B. Services scored for client-mode discovery

Use when the feed is trying to help a client find nearby workers.

```ts
serviceScore =
  serviceMatch * 45 +
  locationMatch * 20 +
  availabilityMatch * 10 +
  providerTrust * 15 +
  recency * 5 +
  modeBoost * 5
```

Suggested component rules:

- `serviceMatch`
  - `1.0` exact match between preference and `service.category`
  - `0.5` same taxonomy group
  - `0.2` text/tag fallback from custom preferences
  - `0` otherwise
- `locationMatch`
  - same rules as jobs
- `availabilityMatch`
  - `1.0` when provider looks active/available
  - `0` when clearly unavailable/offline
  - use current text/binary presence logic only as a light signal
- `providerTrust`
  - use real `averageRating`, `reviewCount`, and `completedJobsCount`
  - cap the contribution so new providers are not buried forever
- `recency`
  - lighter than job recency
- `modeBoost`
  - `1.0` in client mode
  - smaller or zero outside client mode

### Suggested bounded trust formulas

Keep trust understandable and small:

```ts
providerTrust =
  Math.min(service.reviewCount, 3) * 2 +
  Math.min(service.completedJobsCount, 3) * 2 +
  (service.averageRating && service.averageRating >= 4.5 ? 3 : 0)

clientTrust =
  Math.min(job.clientReviewCount, 3) * 2 +
  Math.min(job.clientJobsPostedCount, 3) * 1 +
  (job.clientAverageRating && job.clientAverageRating >= 4.5 ? 1 : 0)
```

This keeps trust useful without overpowering exact service and location relevance.

### Suggested location normalization

Because the MVP has no latitude/longitude yet, normalize plain text:

```ts
function getLocationMatch({
  candidateBarangay,
  candidateLocationText,
  userBarangay,
  userCity,
}: Inputs) {
  if (normalize(candidateBarangay) === normalize(userBarangay)) return 1;
  if (normalize(candidateLocationText).includes(normalize(userBarangay))) return 0.8;
  if (normalize(candidateLocationText).includes(normalize(userCity))) return 0.4;
  return 0;
}
```

This is much more useful than the current phrase-only boost and still fits the MVP.

## 5. Feed Assembly Recommendation

### Do not strictly alternate item types

The current alternation logic makes `For you` feel synthetic.

Recommended feed assembly:

- score all job candidates and service candidates
- sort each list descending
- merge with mode-aware quotas, not forced alternation

Suggested quotas:

- provider mode: 3 jobs, then 1 service if strong enough
- client mode: 3 services, then 1 job if strong enough
- mixed mode: choose the highest next score, but cap runs so one type does not dominate forever

Example rule:

```ts
if (mode === 'provider') {
  targetPattern = ['job', 'job', 'job', 'service'];
}

if (mode === 'client') {
  targetPattern = ['service', 'service', 'service', 'job'];
}

if (mode === 'mixed') {
  targetPattern = dynamicByTopScore;
}
```

Also add a minimum relevance threshold:

- If the opposite-type candidate is far below the next primary candidate, skip it.

That preserves "mixed discovery" without forcing low-value cards into the top of the feed.

## 6. Recommended MVP Rollout

### Phase 1: Safe ranking cleanup

- Keep current schema
- Keep current Home UI
- Move scoring to a service
- Switch from text-first matching to taxonomy-first matching
- Use role-specific preference arrays instead of one merged list
- Improve barangay matching
- Replace forced alternation with mode-aware mixing

Implementation status: completed in `services/home-feed.service.ts`.

Notes:

- `app/(tabs)/index.tsx` now keeps loading, tab state, rendering, and navigation in the screen while delegating ranking and `For you` assembly to the service.
- Feed mode resolution follows Phase 1 scope: `profiles.active_role` first, then `user_preferences.intent`, then `mixed`.
- Provider-mode job ranking uses `offered_services` and `custom_offered_services`.
- Client-mode worker/service ranking uses `needed_services` and `custom_needed_services`.
- Exact taxonomy matches are scored before same-category and custom text fallback matches.
- Location ranking uses existing profile barangay/city plus job/service/provider barangay and location text.
- Mode-aware feed assembly uses provider-first, client-first, or balanced mixing without forcing low-relevance opposite-type cards into the top of the feed.
- No schema changes, AI/ML, onboarding changes, Profile preference editor, or `intent = both` TypeScript expansion were added in this phase.

### Phase 2: Preference state cleanup

- Load `user_preferences` through shared app state
- Support `intent = both` in TypeScript and onboarding flow
- Add a later Profile editor for `Discovery preferences`

### Phase 3: Better behavioral tuning

- Add lightweight recent-activity signals
- Persist a feed-mode preference only if product testing needs it
- Add better location ranking only after structured geodata exists

## 7. Recommended Decisions

### Decision A

Use `user_preferences` as the canonical personalization source.

### Decision B

Use `profiles.active_role` as the primary `For you` mode switch, with `intent` as fallback.

### Decision C

Keep `For you` mixed, but weighted by current mode rather than strict alternation.

### Decision D

Rank with deterministic weighted scoring based on:

- exact service match
- barangay proximity
- freshness
- availability when real
- real trust/completion data when present

### Decision E

Do not introduce AI/ML matching for MVP.

## Final Recommendation

The best MVP architecture is:

1. Keep onboarding preferences in `user_preferences`.
2. Make preferences available as shared app state, not a Home-only fetch.
3. Move Home feed ranking into a dedicated service.
4. Score with exact taxonomy matches first, then location, freshness, and real trust.
5. Use `active_role` to decide whether `For you` behaves provider-first, client-first, or mixed.
6. Add mixed-role support and editable discovery preferences next, before introducing any more advanced personalization.

This gives Konektado a personalization model that is explainable, maintainable, aligned with the current MVP data model, and strong enough to make onboarding preferences feel meaningfully useful.
