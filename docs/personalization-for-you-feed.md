# Home For You Personalization

This file is the implementation note for Home `For you` personalization work. The original audit and strategy details are in `docs/15-home-feed-personalization-strategy.md`; keep both documents aligned when changing ranking behavior.

## Phase 1 Implementation Notes

Implemented in this phase:

- Home feed ranking moved out of `app/(tabs)/index.tsx` into `services/home-feed.service.ts`.
- Home UI, database schema, onboarding screens, and Profile preference editing were left unchanged.
- `profiles.active_role` is now the primary feed mode signal.
- `user_preferences.intent` is used as the fallback mode signal.
- Provider mode ranks jobs with `user_preferences.offered_services` and `custom_offered_services`.
- Client mode ranks services/workers with `user_preferences.needed_services` and `custom_needed_services`.
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
- Client user with Cleaning/Laundry needs should see matching workers/services prioritized in `For you`.
- User with no preferences should still get a useful fallback feed based on mode, location, recency, and real trust fields.
- Switching `For you`, `Jobs`, and `Workers` should remain fast.
- Existing Search and Home card behavior should remain visually unchanged.
