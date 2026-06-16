# Konektado Search Discovery UX Audit

> Resolved on 2026-06-15: `Minor home fix help` is now the canonical MVP taxonomy label. References to `Basic home repair` below describe the pre-cleanup state and remain only as audit history or legacy compatibility context.

## Summary

Konektado Search works mechanically, but discovery is weak because the current chip model is flat, not grouped, not preference-aware, and only loosely aligned with the controlled taxonomy intent.

Today the Search tab shows a `Popular services` section driven by a fixed constant list. That list mixes physical/local and digital/remote services in one row, so a user looking for nearby physical work can immediately see unrelated labels such as `Tutoring`, `Canva layout`, and `Document formatting` beside local household help. The result is valid taxonomy labels, but poor discovery.

The current implementation is also inconsistent with the rest of the product direction:

- Home already uses `user_preferences` for lightweight ranking and default mode selection.
- Search does not use `user_preferences` at all.
- The filter icon exists, but the Search result header still opens a placeholder alert instead of a real filter surface.
- Broad `Basic home repair` labels still remain in taxonomy, demo content, seeded preferences, seeded jobs, and seeded services.

The safest MVP improvement is not a redesign. It is to replace flat popular chips with grouped taxonomy-aware discovery, add a small MVP filter sheet, and use deterministic code-level taxonomy metadata to support work-type and preference-aware ordering without changing schema.

## Current State

### Search screen behavior

Source: `app/(tabs)/search.tsx`

- Search keeps the current 300ms debounce.
- Search fetches only the active mode:
  - `jobs` calls `searchJobs()`
  - `workers` calls `searchServices()`
- Search uses `FlatList`.
- Search preserves stale-while-refresh behavior:
  - initial empty load shows skeletons
  - later refresh keeps old results and shows `Updating results...`
- Search keeps a sticky result header with the filter icon.
- Search keeps the current collapsible chip section.

### Where the current chips come from

Sources:

- `components/search/PopularServicesSection.tsx`
- `constants/search-demo-data.ts`
- `constants/service-taxonomy.ts`

Current flow:

1. `PopularServicesSection` renders the chip UI and label `Popular services`.
2. `search-demo-data.ts` exports `popularServices`.
3. `popularServices` is a direct map over `POPULAR_MVP_SERVICES`.
4. `POPULAR_MVP_SERVICES` is a hardcoded flat list in `constants/service-taxonomy.ts`.

Current flat Search chip list:

- `Cleaning`
- `Laundry help`
- `Tutoring`
- `Canva layout`
- `Computer setup`
- `Phone setup`
- `Document formatting`
- `Delivery help`

This means Search chips are:

- not driven by live popularity
- not driven by onboarding preferences
- not grouped by discovery intent
- not mode-specific for Find Jobs vs Find Services
- not work-type-aware

### Whether Home/Search chip logic is shared

It is not.

- Home has `For you`, `Jobs`, and `Services` quick tabs. Search still needs richer service discovery chips.
- Search alone has the `Popular services` chip section.

### Whether onboarding preferences affect Search chips

No.

`user_preferences` are loaded and used in Home ranking through:

- `app/(tabs)/index.tsx`
- `services/home-feed.service.ts`
- `services/onboarding.service.ts`

Search does not call `getMyUserPreferences()` and does not use `user_preferences` for:

- chip ordering
- default work type
- result ranking
- result filtering

### Search query and filtering capability today

#### Jobs

Source: `services/job.service.ts`

Current support:

- text search
- category filter
- barangay filter
- newest-first ordering

Current Search screen usage:

- only passes `text`
- does not pass category/barangay filters

#### Services

Source: `services/service-profile.service.ts`

Current support:

- text search
- limit
- newest-first ordering

Current Search screen usage:

- only passes `text`

There is no current structured service-side support for:

- service group
- exact category filter
- work type
- location scope
- sort mode

### Current taxonomy shape

Source: `constants/service-taxonomy.ts`

Current controlled taxonomy has three top-level categories:

- `Home & Local Help`
- `Learning & Digital Help`
- `Tech & Document Support`

Current service options:

- Home & Local Help:
  - `Cleaning`
  - `Laundry help`
  - `Errands`
  - `Delivery help`
  - `Home assistance`
  - `Basic home repair`
  - `Yard or outdoor help`
- Learning & Digital Help:
  - `Tutoring`
  - `Encoding`
  - `Canva layout`
  - `Presentation design`
  - `Social media help`
  - `Basic computer lessons`
  - `School project guidance`
- Tech & Document Support:
  - `Computer setup`
  - `Phone setup`
  - `WiFi/router help`
  - `Printer setup`
  - `Basic troubleshooting`
  - `Document formatting`
  - `Resume or form assistance`

### Demo/seed status

Search chips are not demo-data-driven, but demo and seed content still shape what users discover once results load.

Current demo/seed findings:

- `constants/marketplace-demo-data.ts` still contains `Basic home repair` in worker/services content.
- `supabase/seed.sql` still contains:
  - `Basic home repair` in `user_preferences`
  - a service row for `Basic home repair`
  - job rows with `service_needed = 'Basic home repair'`
- `supabase/migrations/20260506123000_refresh_demo_taxonomy_data.sql` repeats the same seeded taxonomy content.

Not found in Search/Home/demo/seed data as active categories:

- `Electrical`
- `Plumbing`
- `Construction`
- `Appliance repair`
- `Cooking`

One doc-only inconsistency remains:

- `docs/08-design-system.md` includes a copy example using `I offer plumbing repair`. That is not runtime data, but it conflicts with the current controlled taxonomy direction and should be cleaned up separately.

## Problems Found

### P0

- Search chips are a flat hardcoded list, so physical/local and digital/remote discovery are mixed without grouping.
- Search does not use onboarding preferences even though `user_preferences` already exist and Home already uses them.
- The filter icon is present, but filters are not implemented, so intentional discovery is underpowered.

### P1

- `Basic home repair` still appears in taxonomy, demo data, seed data, and seeded preferences. It is not one of the explicitly banned categories, but it is broad enough to blur the line between safe household help and higher-risk repair work.
- Search services cannot be filtered by exact category today because `searchServices()` only supports free-text search.

### P2

- Search chips are labeled `Popular services`, but they are not actually popularity-based.
- Search chips are identical for Find Jobs and Find Services even though those modes represent different intents.

### P3

- The codebase/docs still contain minor terminology drift:
  - docs/database support `intent = both`
  - current TypeScript onboarding intent only supports `client | provider`

This does not block Search improvements, but it matters for future preference logic.

## Recommended Search Discovery Model

### Search bar

Keep the current search bar and debounce.

Behavior:

- free-text remains the primary entry point
- chip taps can still feed the search query
- structured filters should refine results without replacing text search

### Find Jobs / Find Services

Keep the current segmented control and active-mode-only fetching.

Behavior:

- Find Jobs should prioritize work opportunities
- Find Services should prioritize service providers
- discovery chips and filters should adapt to the active mode

### Browse by category

Replace `Popular services` with `Browse by category`.

Recommended behavior:

- keep the current chip section footprint and collapsible behavior
- show grouped discovery first instead of a flat mixed list
- use preference-aware ordering
- use local-first defaults when preferences do not exist

Recommended collapsed state:

- show 4 to 6 high-signal chips only
- chips should be grouped or selected from one dominant group, not randomly mixed across all groups

Recommended expanded state:

- show service groups first
- show specific service categories under the selected group

### Filter bottom sheet

Add a practical MVP bottom sheet behind the existing filter icon beside the result header.

Use the existing reusable `components/BottomSheet.tsx`.

### Result header

Keep the sticky result header.

Improve it by making its filter icon functional and by reflecting active structured filters in the heading or in small active-filter pills if needed later.

## Recommended Taxonomy Groups

The current controlled taxonomy should be regrouped for discovery, not replaced at the database level.

Recommended discovery groups:

### Home & Local Help

Include:

- `Cleaning`
- `Laundry help`
- `Home assistance`
- `Yard or outdoor help`

### Errands & Assistance

Include:

- `Errands`
- `Delivery help`

### Learning & Tutoring

Include:

- `Tutoring`
- `Basic computer lessons`
- `School project guidance`

### Digital & Document Help

Include:

- `Encoding`
- `Canva layout`
- `Presentation design`
- `Social media help`
- `Document formatting`
- `Resume or form assistance`

### Tech Setup Help

Include:

- `Computer setup`
- `Phone setup`
- `WiFi/router help`
- `Printer setup`
- `Basic troubleshooting`

### Handling `Basic home repair`

Current state:

- still present in the accepted taxonomy
- still present in Search/Home/demo/seed content
- not one of the explicitly banned labels, but risky because `repair` is broad

Recommended MVP handling:

- do not keep broad `repair` wording as a top discovery chip
- use a code-level display mapping instead of a schema migration
- preferred safe display label:
  - `Minor home fix help`
  - or `Home maintenance help`

Recommended scope note for the category:

- allowed:
  - loose hinges
  - shelf tightening
  - simple fixture adjustment
  - minor non-licensed maintenance
- excluded:
  - electrical
  - plumbing
  - construction
  - appliance repair involving wiring or internal disassembly

If product wants zero ambiguity, remove this category from Search discovery surfaces first, then clean seed/demo data later. That is the safest product option.

## Physical vs Digital Filtering

### Recommendation

Add one simple work-type filter for both Find Jobs and Find Services:

- `Physical / on-site`
- `Digital / remote`
- `Either`

This should be taxonomy-driven, not schema-driven.

### Safe MVP mapping

Use code-level metadata in `constants/service-taxonomy.ts`.

Recommended mapping:

- `Physical / on-site`
  - `Cleaning`
  - `Laundry help`
  - `Errands`
  - `Delivery help`
  - `Home assistance`
  - `Yard or outdoor help`
  - `Minor home fix help` if retained
- `Digital / remote`
  - `Encoding`
  - `Canva layout`
  - `Presentation design`
  - `Social media help`
  - `Document formatting`
  - `Resume or form assistance`
- `Either`
  - `Tutoring`
  - `Basic computer lessons`
  - `School project guidance`
  - `Computer setup`
  - `Phone setup`
  - `WiFi/router help`
  - `Printer setup`
  - `Basic troubleshooting`

This mapping is imperfect, but it is safe and useful for MVP. It avoids schema changes and can be refined later.

### Default behavior

Recommended defaults:

- If preferences are mostly physical/local:
  - default Search filter to `Physical / on-site`
- If preferences are mostly digital:
  - default Search filter to `Digital / remote`
- If preferences are mixed:
  - default Search filter to `Either`
- If no preferences exist:
  - default to `Physical / on-site`

This should apply in both:

- Find Jobs
- Find Services

Rationale:

- Konektado is barangay-first
- physical/local discovery is the safer default when preference data is missing

## Popular Services / Browse Chips Logic

### Recommended replacement

Replace the current model with `Browse by category`.

This is better than keeping `Popular services` because the current chips are not truly popular and the main UX problem is clarity, not chip scarcity.

### What should show with preferences

If preferences exist:

- order groups by preference match first
- show categories from the user’s matched groups first
- use role-aware preference source:
  - Find Jobs uses `offered_services`
  - Find Services uses `needed_services`

Example:

- provider with `Cleaning`, `Laundry help`
  - first chips should come from `Home & Local Help`
- client with `Canva layout`
  - first chips should come from `Digital & Document Help`

### What should show without preferences

If no preferences exist:

- show local-first physical groups first
- recommended order:
  - `Home & Local Help`
  - `Errands & Assistance`
  - `Learning & Tutoring`
  - `Digital & Document Help`
  - `Tech Setup Help`

### What should show for Find Jobs

Find Jobs should prefer chips that represent the type of work to do.

Recommended:

- groups first
- then specific services under the active group
- prioritize physical/local group chips by default

### What should show for Find Services

Find Services should prefer chips that represent the type of help needed from a provider.

Recommended:

- same grouped structure
- but preference source should be `needed_services`
- when no preferences exist, still bias to local-first physical help

## Filter Bottom Sheet Specification

The filter sheet should stay MVP-sized and only expose filters the current data can reasonably support.

### Entry point

- existing filter icon in `SearchResultHeader`

### Section 1: Work type

Label:

- `Work type`

Options:

- `Physical / on-site`
- `Digital / remote`
- `Either`

Behavior:

- single-select
- default from preference inference

### Section 2: Service group

Label:

- `Service group`

Options:

- `All groups`
- `Home & Local Help`
- `Errands & Assistance`
- `Learning & Tutoring`
- `Digital & Document Help`
- `Tech Setup Help`

Behavior:

- single-select
- selecting a group limits the specific category list

### Section 3: Specific service category

Label:

- `Specific service`

Options:

- `All services`
- only the services under the selected group

Behavior:

- single-select
- if a specific service is chosen, it overrides the broader group for final matching

### Section 4: Location scope

Label:

- `Location scope`

Options:

- `Same barangay`
- `Nearby`

Behavior:

- single-select
- `Same barangay` should use exact barangay match
- `Nearby` should use the broadest safe locality available in current data

Implementation note:

- because current public marketplace data is barangay-first and not coordinate-based, `Nearby` may behave almost the same as `Same barangay` in the current demo dataset

### Section 5: Rate range

Label:

- `Rate range`

Behavior:

- default to `Any rate`, which applies no minimum or maximum filter
- use one two-thumb slider with `₱100` steps from `₱0` to `₱5,000+`
- show the selected range live as `Up to ₱500`, `₱700 – ₱1,500`, or `₱2,000+`
- treat the visible `₱5,000+` endpoint as an open upper bound
- do not show duplicate preset rate buckets or require numeric typing
- count a custom range as one active Search filter

Implementation note:

- Search stores nullable min/max values in UI state and reuses the existing range-overlap service logic. No schema change is required.

### Section 6: Sort

Label:

- `Sort`

Options:

- `Most relevant`
- `Newest`
- `Nearby`

Behavior:

- single-select
- defaults to `Most relevant`

### Sheet actions

- `Apply`
- `Reset`
- close by backdrop tap

### Non-goals for MVP sheet

Do not add:

- schedule filters
- rating filters
- multiple barangay selector
- advanced remote-only availability logic

## Data/Implementation Notes

### What the current data can already support

Without schema changes, current data can support:

- taxonomy group mapping
- exact service category mapping
- onboarding preference-aware ordering
- mode-aware ranking
- same-barangay filtering
- newest sort
- lightweight relevance sort

Using current fields:

- jobs:
  - `category`
  - `service_needed`
  - `barangay`
  - `location_text`
  - `created_at`
- services:
  - `category`
  - `barangay`
  - `location_text`
  - `created_at`
- user personalization:
  - `user_preferences.offered_services`
  - `user_preferences.needed_services`

### Safe mapping strategy

For MVP, prefer code-level metadata in `constants/service-taxonomy.ts`:

- service -> discovery group
- service -> work type
- service -> display label override
- optional deprecated/high-risk alias mapping

This avoids migrations and keeps all Search logic aligned with the controlled taxonomy source.

### Query-layer recommendation

Safest implementation path:

1. add structured taxonomy metadata constants
2. update Search chips to use grouped taxonomy data
3. load `user_preferences` in Search for ordering/defaults
4. add optional structured filters to service-layer search

Recommended service-layer additions:

- `searchJobs()`:
  - exact `service_needed`
  - category group
  - barangay
  - sort mode
- `searchServices()`:
  - exact `category`
  - barangay
  - sort mode

Work type should be derived in code by expanding to allowed service-category labels, not by adding a database field.

### Why client-side filtering alone is not enough

Client-side filtering on top of the current `limit: 30` fetch is risky because:

- server queries currently sort newest-first
- the first 30 newest rows may omit relevant items from another group
- local post-filtering can make Search appear empty or biased

Client-side UI state is fine, but structured filters should ideally narrow the query itself.

## High-Risk/Excluded Category Check

### Still present

- `Basic home repair`

Still appears in:

- taxonomy constants
- Search/Home-adjacent demo content
- seeded preferences
- seeded services
- seeded jobs

### Not found as active Search/Home/demo/seed categories

- `Electrical`
- `Plumbing`
- `Construction`
- `Appliance repair`
- `Cooking`

### Recommendation

- do not reintroduce any excluded category
- remove or rename broad `repair` discovery labels
- if the product keeps the current allowed repair-adjacent category, constrain it through display naming and explicit exclusions

## Recommended Implementation Plan

### Phase A: taxonomy grouping constants

- extend `constants/service-taxonomy.ts` with:
  - discovery groups
  - work-type mapping
  - optional display label override for `Basic home repair`
  - helper functions for group/category lookup

Why this is safe:

- no schema change
- single source of truth
- reusable for Search, Home, onboarding, and future filter UI

### Phase B: Search chips use grouped taxonomy

- replace flat `popularServices` with grouped discovery data
- rename section to `Browse by category`
- keep the current collapsible area and chip footprint
- order chips by preferences when available
- default to physical/local-first when preferences are missing

Why this is safe:

- no card changes
- no result-list redesign
- no fetch-behavior regression

### Phase C: add MVP filter bottom sheet

- wire the existing Search filter icon to a real bottom sheet
- add only:
  - work type
  - service group
  - specific service
  - location scope
  - sort

Why this is safe:

- uses existing `BottomSheet`
- focused MVP surface
- no schema change required

### Phase D: preference-aware chip ordering

- load `user_preferences` in Search
- derive default work type
- order groups/categories using:
  - `offered_services` for Find Jobs
  - `needed_services` for Find Services

Why this is safe:

- consistent with Home
- deterministic
- no ranking black box

### Phase E: deeper ranking improvements later

- unify Home and Search discovery metadata
- refine nearby ranking
- add behavior-based signals only after live usage exists

## Open Questions for Human Confirmation

1. Should `Basic home repair` remain in the MVP at all, or should it be removed from discovery now?
2. If it remains, which safer display label is preferred:
   - `Minor home fix help`
   - `Home maintenance help`
3. Should Search chips default to group chips only, or should collapsed state still show a few specific services under the top-ranked group?
4. For `Nearby`, is the intended MVP meaning:
   - same barangay only
   - same city
   - any Konektado result outside exact barangay match
5. Do you want Search preferences to stay read-only from onboarding data for now, or should Profile later get a dedicated discovery-preferences editor?

## Manual Test Plan

### Physical-only discovery

- onboarding/profile preferences favor physical/local services
- open Search in Find Jobs
- confirm grouped chips prioritize local physical groups
- confirm default work type is `Physical / on-site`
- confirm digital groups/categories are not shown first

### Digital-only discovery

- onboarding/profile preferences favor digital services
- open Search in Find Services
- confirm grouped chips prioritize digital/document groups
- confirm default work type is `Digital / remote`

### No preferences

- use an account with no meaningful preferences
- open Search
- confirm chips default to local physical groups first
- confirm default work type is `Physical / on-site`

### Find Jobs

- switch to Find Jobs
- confirm result fetch still loads jobs only
- confirm chips and filters affect job queries/results only
- confirm job cards remain unchanged

### Find Services

- switch to Find Services
- confirm result fetch still loads services only
- confirm chips and filters affect worker queries/results only
- confirm worker cards remain unchanged

### Excluded categories

- search for `plumbing`, `electrical`, `construction`, `appliance repair`, `cooking`
- confirm none appear as browse chips
- confirm demo/seed Search results do not surface banned categories

### Old demo rows

- inspect demo and seeded Search results
- confirm `Basic home repair` is either:
  - removed from discovery
  - or renamed/mapped to the approved safer label

### Filter reset

- apply several filters
- tap `Reset`
- confirm:
  - work type returns to its default
  - service group resets
  - specific category resets
  - location scope resets
  - sort resets to `Most relevant`

### Empty results

- choose a narrow combination of text plus filters
- confirm empty state still appears correctly
- confirm `Clear search` still works

