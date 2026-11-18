# Service-first onboarding (DEC-147)

The approved repair replaces the mandatory setup → category → service sequence with one service-selection entry and an explicit worker setup choice. It fixes the case where an online-only service remained selected and could be submitted after switching to On-site, while disappearing from the picker.

## Interaction

- Workers answer “What services can you offer?”; clients answer “What help might you need?” The explanation states that these choices personalize Home and do not create a public post.
- Choose services opens the existing shared multi-picker with the full service vocabulary. Common choices and search are primary; Browse by type is optional. Search aliases suggest canonical choices, which still require an explicit tap.
- A resident can explicitly add their own text without selecting a category, including when partial search suggestions exist. Excluded work is rejected, recognized aliases normalize to official services, duplicates collapse, and genuinely custom wording remains separate.
- Every selected official/custom service is reviewable and removable in the picker and in the confirmed screen list. Cancel/backdrop/Android sheet Back discard temporary picker edits. Apply updates the onboarding context; navigating screen Back and returning preserves confirmed choices within that mounted onboarding flow. This is not durable storage across process death or sign-out before final profile save.
- Workers explicitly choose On-site, Online or Both. A mode change never silently removes a selection or chooses Both. Incompatible official services remain visible with a named explanation; Next is disabled until the resident changes mode or removes the conflicts. Both allows either type; it does not require one service of each type. Unknown custom services cannot be automatically classified for mode, so the resident is told to choose their appropriate setup.
- Clients do not choose a temporary help-delivery mode. Their needed-service arrays remain the same stored preferences; no replacement column or schema migration is introduced.
- At least one service remains required. Review, explicit consent, save, optional identity verification and browse-only entry remain in the same order. No verification or Work/Hiring Profile readiness requirement is bypassed.

## Validation and shared-picker compatibility

`services/onboarding-selection.ts` normalizes aliases, duplicates and legacy sentinels. The screen and `saveOnboardingProfile` validate the same normalized selection before navigation or any role/database write. The save payload uses that same representation so a placeholder cannot satisfy a required selection and then disappear during persistence.

The shared picker filters search candidates before limiting displayed results. A typed alias cannot add a canonical service outside a caller's allowed vocabulary. Omitting a selection cap consistently means no cap for both tapped and typed additions; Work Profile callers retain their explicit 15-selection limit. Existing values are not truncated on opening. Failed Apply stays open with retry feedback. Changes remain compatible with single-selection listing callers.

The new screen uses wrapping rows, full selection visibility, real disabled Next semantics, checked radio/checkbox states and accessible removal labels. Search has an accessible label; selection and error feedback is available to assistive technology. Existing keyboard-aware picker and safe-area scaffolds are retained. Actual platform focus, keyboard and screen-reader behavior still requires acceptance testing.

## Verification and release boundaries

The full application suite passed 303 tests, and all 16 release guards passed. Focused actual-handler tests cover the Canva/On-site counterexample, mode correction, custom-only hiring, full-taxonomy input, confirmed Back/remount preservation, cancellation, partial-match custom entry, explicit versus omitted caps, alias scope and search filtering. The helper and actual save boundary reject unsupported work and sentinel-only choices before writes.

Static responsive checks rendered the actual screen and scaffold with React Native Web and Satoshi at exact 360×800, 390×844 and 430×932 viewports. Provider conflicts and long hiring selections passed all six checks: no horizontal page overflow, Next visible, text wrapping and conflict guidance reachable by scrolling. Screenshots and bounds metrics are retained in ignored `.test-build/stabilization-onboarding-*` artifacts. This harness uses zero safe-area insets, mocked icons and no open modal; it does not certify the production Router tree, picker dialog, keyboard, larger text or TalkBack. Those checks and real safe areas remain required before final acceptance. Android build/device acceptance remains deferred as requested; no Expo server, application build or deployment is started automatically.

No onboarding database migration is required. The separate [security stabilization](22-security-stabilization.md) migrations retain their own approval and deployment steps. The existing sequential multi-table onboarding save remains non-atomic; recovery from partial remote saves is separate work.

## Undo

Keep onboarding in a focused commit after the security checkpoint. Reverting the onboarding commit restores the previous onboarding interaction without reverting database security containment or the Featured removal. Do not remove applied security migrations or restore unsafe permissions to undo an onboarding design change.
