# Linked Home and Search discovery

Approved on 2026-11-16. Home keeps its feed and Search keeps its dedicated screen. The search entry and the two intent options form one compact discovery section on each screen.

The user clarified and approved the visual structure after reviewing the development server: one inset white card with one outer border/shadow, a search row, a thin horizontal divider, and the two intent options underneath. The input and mode selector have no separate enclosing pill borders or shadows. Home's original curved blue hero, sun placement and 25px overlap are retained; the space outside the inset card stays transparent. Search/filter actions are sibling controls inside a non-interactive row, avoiding nested HTML buttons.

The development-mode nested-button warning also affected existing feed cards. Their identity/body navigation actions and Save action are now sibling buttons within a non-interactive card; the visible card content and save/verification behavior are retained.

- Find work shows job posts; Hire help shows offered services. Exactly one intent is active. The first intent follows the account's existing role/preferences; mixed or missing preferences start with Find work. Once selected, intent survives navigation and profile refreshes.
- Both screens use the same labels. The search entry says Search jobs… or Search services… and Home shows the last typed query when returning from Search.
- A tab-scoped, account-keyed in-memory session holds intent, query and applied filters. Browser/native Back, the Home tab and reopening Search use that same session. Account changes and restarting the app clear it. No discovery data is persisted to the database or device storage.
- Home's work type, broad category, location and sort carry into Search. Broad categories retain every matching canonical service rather than being guessed as a single discovery group. A carried category is visible and clearable in Search's filter sheet.
- Search updates to common filters are reflected on Home. Search-specific service groups, specific services, rates, experience, certification and verified-only filters remain available in Search and survive mode changes and return visits. The Home feed continues to use its common feed filters; these extra Search refinements do not silently change the Home feed.
- Selecting a Home category shortcut starts a category search, clearing the previous query and conflicting broad/specific category selection. Compatible location/rate filters remain. Explicit Search group/service selections replace an inherited broad category.
- Home's Apply & refine in Search action applies its common selections and opens the Search filters. Closing a sheet without an Apply action leaves its edits unapplied; closing Search's sheet cancels edits made there, while retaining the selections already applied on Home. Reset acts on the open sheet until Apply; Clear search explicitly clears the Search query and filters.
- The legacy Jobs/Services/Workers route parameters remain supported as one-shot deep links. They are consumed so an old route parameter cannot override a later user selection.

Existing marketplace services, verification gates, ranking and database permissions are retained. No new queries, migrations, dependencies, deployment or remote configuration are required by this UI-state change.

## Validation

Run application lint/TypeScript and the existing test suite. The discovery-session tests cover bidirectional common filters, preserved query/advanced filters through mode changes, complete broad-category mapping, contradictory selections and session reset.

Check 360 × 800, 390 × 844 and 430 × 932: open Search from each Home mode, type a long query, switch intent, apply/cancel/reset filters, return with Back and with Home, then reopen Search. Verify selected labels, placeholders, query, filter counts, category visibility, no horizontal overflow, 44px actions and keyboard-visible usability. Profile refreshes must not clear selections; changing accounts must clear them. Native Android Back/keyboard behavior still requires device acceptance testing.

Implementation checks passed: application lint and TypeScript, all 247 tests (including six discovery-session cases), and a localhost fixture running the actual Home/Search screens with synthetic profile/search data and backend access disabled. Browser checks covered intent/query continuity, bidirectional common filters, visible broad categories, cancel after Reset, profile refresh, account change, and long-query layout on both screens at all three sizes. The intent buttons measured 44px high; no horizontal document overflow was observed. A focused search input remained visible in a reduced 360 × 440 viewport. The fixture uses a React Navigation stack adapter rather than the production Expo tab shell, so it does not certify native hardware Back, a real soft keyboard, or the bottom-tab transition. Those acceptance checks remain in the checklist above. No app export, APK build, backend migration, commit, push, or deployment was performed for this change.

After the visual clarification, the user-authorized Expo development server was used to verify the revised layout with the dedicated demo account and real read-only marketplace queries. Home and Search each use the same inset card with one outer border/shadow. At viewport widths 360, 390 and 430, card widths were 320, 350 and 390 with no horizontal document overflow; Home's surrounding wrapper was transparent and the original blue hero curve/sun overlap was visually checked. Search query/mode continuity and the independent Home filter action passed. The development page contained zero nested HTML buttons and produced no new console errors after a fresh reload. Lint, application TypeScript and all 247 tests passed again. This validates the browser correction, not native Android acceptance; no listing/profile/save writes, database migration, commit, push or deployment were performed. The same guarded undo command covers the added shared card and the feed-card markup correction.

## Undo

Integrated checkpoint validation (2026-11-17): the combined Home/Search changes, merged offline recovery, and separate tooling cleanup passed `npm run lint`, CI-equivalent uncached ESLint, application TypeScript, all 262 application tests, and all 16 release-guard tests. Uncached lint retains one existing unused-import warning in `services/home-feed.service.ts`. Native Android acceptance remains pending. No push, release build, database change, or deployment was performed for this checkpoint.

Original source baseline: `a226f780f1d4d3e1ceac7ae4a8bf55939a042245`, on `link-home-search`. The integrated checkpoint is on `home-search-and-tooling`, based on merged main `6248296`. Home/Search and tooling cleanup are preserved as separate commits.

To undo the committed Home/Search checkpoint, prepare a normal reviewed Git revert of only its dedicated feature commit. Retain the separate tooling-cleanup commit and the merged offline-recovery fixes. Review conflicts and rerun validation before any approved push or deployment. This change has no database migration to reverse.

The original development checkout and its ignored `.test-build` snapshot remain untouched. Its guarded local undo helper applies only to that original uncommitted copy: it checks feature-file hashes, refuses later edits, and retains added files rather than deleting them. It must not be used to undo this integrated checkpoint or a deployed release.
