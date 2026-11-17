# Offline startup recovery

Status: implemented and checked locally on `offline-startup-recovery`, based on `a226f78`, and prepared for pull request review. Native and browser acceptance remain pending. No database changes are required.

A stored session does not establish that profile, preferences, or roles were read successfully. When required account reads are unavailable on startup, show a retryable recovery state instead of inferring incomplete onboarding or signing the resident out. Password recovery and required password creation remain higher priority. A confirmed missing or incomplete profile still enters onboarding.

During a same-account refresh, retain the last successfully loaded profile, preferences, and route status. Clear account-specific state on sign-out or account switch, and ignore stale in-flight results and errors. A session generation distinguishes signing back into the same account from the earlier session. Current password-recovery metadata takes effect immediately, even when the next session read fails.

Foreground activation and existing fallback polling retry reads; residents can also retry explicitly. This state is held in memory only and does not change verification gates or server authorization. It does not enable offline marketplace writes or persist profile data to device storage.

Onboarding drafts must not become editable when their required reads fail. Retry awaits the actual load, rejects outdated responses, and presents safe connection guidance rather than a misleading sign-in dialog.

## Local verification — 2026-11-17

- `npm run lint`: passed.
- CI-equivalent `npx --no-install eslint . --no-cache`: passed. An existing unused-import warning in `services/home-feed.service.ts` remains outside this change.
- `npx --no-install tsc --noEmit`: passed.
- `npm run test:service-classification`: 256 tests passed, including 15 new offline-recovery cases (11 hook orchestration cases and four draft-service cases).
- `node --test tests/release-preflight.test.cjs`: 16 tests passed.
- Independent source review found no remaining blocking findings after correcting account/session races and retry handling.
- The hook tests execute the actual profile provider and route-status hooks with deterministic React-hook/session/database mocks. They do not execute the real Expo Router, native React renderer, network stack, or Supabase service.
- The actual retry component rendered through React Native Web into an ignored static HTML fixture for 360 x 800, 390 x 844, and 430 x 932. Safe-area insets were mocked as zero. Browser inspection was blocked by the browser tool's local-file URL policy; responsive visual and native accessibility checks remain pending.
- Hashes confirmed that the original checkout's 18 uncommitted Home/Search files were unchanged.

## Acceptance checks still required

1. In an updated Android artifact, complete onboarding online, restart online, then force-stop and reopen in airplane mode. Required reads must show recovery rather than blank onboarding or an incorrect sign-in prompt. Include an expired access-token/network-refresh case.
2. Restore connectivity and tap Try again. Confirm the same account reaches the correct route without entering credentials. Repeat with another failed attempt; retry must remain available and indicate when a request is pending.
3. Lose connectivity after Home has loaded. Same-account profile/preferences and route state must remain available. Returning to the foreground and explicitly retrying should recover.
4. Verify an online account whose profile is genuinely missing/incomplete still enters onboarding. Failed draft reads must block empty editing; a successful retry must load the existing draft.
5. Sign out or switch accounts while profile/role reads are pending, including signing back into the same account. Old data, errors, and role results must not reappear.
6. Trigger password recovery/required password creation while account reads fail. The password flow must retain priority over Home and onboarding.
7. Check Android and web at 360 x 800, 390 x 844, and 430 x 932, with large text, safe areas, and keyboard interaction where applicable. Check keyboard focus and TalkBack; VoiceOver remains a separate iOS check.
8. Confirm verification, admin, and marketplace action restrictions remain enforced after recovery. Retaining in-memory display data must not grant additional interaction permissions.

## Review and rollback

The pilot is isolated from the existing Home/Search checkout. To leave the pilot, return to the original checkout; no source reset or database operation is necessary. Retain the pilot worktree until its changes are reviewed. If released later, revert the focused client commit and redeploy a verified compatible client; there is no migration to reverse for this fix.

The branch-specific `git.deploymentEnabled` rule in `vercel.json` disables automatic Vercel deployments for `offline-startup-recovery`. GitHub quality checks can run without starting a Vercel release build. Other branches retain their existing deployment behavior.

Opening or reviewing the pull request does not authorize merging, release builds, database changes, or deployment; those remain separate approval steps.
