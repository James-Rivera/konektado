# Home For You Personalization

This file is the implementation note for Home `For you` personalization work. The original audit and strategy details are in `docs/15-home-feed-personalization-strategy.md`; keep both documents aligned when changing ranking behavior.

## Phase 1 Implementation Notes

Implemented in this phase:

- Home feed ranking moved out of `app/(tabs)/index.tsx` into `services/home-feed.service.ts`.
- Home UI, database schema, onboarding screens, and Profile preference editing were left unchanged.
- `profiles.active_role` is now the primary feed mode signal.
- `user_preferences.intent` is used as the fallback mode signal.
- Provider mode ranks jobs with `user_preferences.offered_services` and `custom_offered_services`.
- Client mode ranks services with `user_preferences.needed_services` and `custom_needed_services`.
- Structured taxonomy matches are scored before text fallback by using `constants/service-taxonomy.ts`.
- Barangay and city matching now uses existing profile, job, service, and provider location fields.
- `For you` now uses mode-aware mixing instead of strict alternation.
- Trust ranking only uses real existing fields: review counts, average ratings, posted-job counts, and completed-job counts.

## Preserved Later Phases

Phase 2 remains out of scope for this pass:

- Shared app-level `user_preferences` state.
- First-class `intent = both` support in TypeScript and onboarding.
- Profile editing for discovery preferences.

Phase 3 remains out of scope for this pass:

- Recent-activity signals.
- A persisted feed-mode preference.
- Better location ranking based on structured geodata.

## Manual Test Checklist

- Provider user with Cleaning/Laundry preferences should see matching jobs prioritized in `For you`.
- Client user with Cleaning/Laundry needs should see matching services prioritized in `For you`.
- User with no preferences should still get a useful fallback feed based on mode, location, recency, and real trust fields.
- Switching `For you`, `Jobs`, and `Services` should remain fast.
- Existing Search and Home card behavior should remain visually unchanged.

## Expanded Taxonomy Update (2026-09-18, DEC-106/DEC-107)

- Ranking is unchanged in shape: exact service 1.0, canonical category 0.9, shared category 0.5, custom-text match 0.2, no preferences 0.25, no match 0.
- Structured matching now normalizes through `getStoredMvpServiceOption()` before comparing. Previously a listing stored under a legacy alias (for example `Basic home repair`) scored 0 against the canonical preference `Minor home fix help` because raw strings were compared. Covered by `tests/home-personalization.test.ts`.
- `getTaxonomyGroup` was renamed to `getTaxonomyCategory`. It returns a canonical CATEGORY, not a discovery group; the old name became actively misleading once discovery groups stopped matching categories one-to-one.
- The 13 new canonical services participate automatically: ranking is data-driven and enumerates nothing.
- Home category tiles are ordered by preference score across `HOME_DISCOVERY_GROUPS` only, so the `More services` Search fallback can never appear as a Home tile.
- Personalization still changes RANKING, not ACCESS. Every group stays in the list and no listing is filtered out by preferences, including custom `Other service` listings.

## Work Profile Skills in Ranking (2026-09-18, DEC-117, DEC-118)

- Work Profile skills now participate in provider / Find Work relevance. `withWorkProfileSkills` folds the merged `getMyProfileCompletion().work.offeredServices` into the ranking preferences, resolving aliases before de-duplicating. Previously skills lived on `provider_profiles` while ranking read `user_preferences`, so editing the Work Profile — or accepting the post-publish "Add to your Work Profile" prompt — changed nothing.
- `neededServices` is deliberately untouched. Find Work uses what the resident can do; Hire Help uses what they need hired. The two signals never merge, so a client is never pushed toward the work they already do themselves.
- Home discovery tiles are POSITIONALLY STABLE. The eight primary groups render in the fixed `HOME_DISCOVERY_GROUPS` order for every resident, role, and mode. They previously reordered by preference score and by Find work / Hire help, which reshuffled the grid mid-session when the resident tapped the mode control.
- Personalization changes what Konektado recommends and in what order. It never changes where the primary navigation sits, whether a group exists, or whether a listing is reachable.
