# Konektado Stabilization Audit

## Current Project Status

Konektado is in post-stabilization after several focused fixes across performance, product UX, auth, routing, and posting flows.

The app is structurally stronger than the original audits described: messaging now has realtime reconciliation, Home and Search avoid the largest rendering/refetch problems, profile state is centralized, detail-screen CTAs are state-aware, duplicate-email signup has a guard, and the service post review route no longer falls back to Home.

The main remaining gap is not another large implementation slice. The main gap is manual QA on real devices and seeded user states. Several important flows have passed lint/typecheck but still need end-to-end validation: auth signup/login, onboarding completion, verification gates, messaging, service posting, job posting, and app restart/foreground behavior.

## Recently Completed Work

Messaging:

- Conversation detail subscribes to `messages` inserts and `conversations` updates.
- Messages inbox subscribes to conversation/message changes while focused.
- Optimistic sends no longer routinely refetch and overwrite local pending messages.
- Conversation preview cache can upsert full conversation summaries.

Search/Home performance:

- Search input is debounced.
- Search fetches only the active mode first.
- Search and Home use bounded query limits.
- Obvious scalar text filtering moved into Supabase `ilike` filters.
- Home precomputes feed variants to avoid repeated sort/scoring work on tab switches.
- Home and Search now normalize worker/provider avatar display from `profiles.avatar_url`; service photos remain separate card imagery.
- Search now reuses the Home-style collapsible header pattern: search controls collapse on result scroll while the result context header stays sticky.
- The hosted Supabase demo now uses the same controlled taxonomy as local seed data, refreshed through a repeatable service-role script.

List virtualization/skeletons:

- Home feed uses `FlatList`.
- Search results use `FlatList`.
- Home/Search initial skeletons are closer to final card layouts.
- Search keeps existing results visible during refresh.

Profile/auth state:

- `ProfileProvider` centralizes profile/session state.
- Per-screen `useProfile` polling was removed.
- Root `useProfileStatus` polling was removed.
- Onboarding completion now refreshes shared profile state before routing.

Product UX detail screens:

- Job and service CTAs now account for verification, ownership, message settings, and closed/inactive states.
- Fake trust metrics were removed in favor of honest empty states.
- Save/bookmark UI is hidden until saved-items is implemented.
- Payment/agreement boundary notes were added.
- Service detail route semantics now use `/services/[serviceId]`; `/workers/[workerId]` is reserved for a future person-level profile.

Duplicate-email signup guard:

- Signup calls `signup-email-check` before requesting an OTP.
- OTP verification has a fallback guard that signs out existing-account sessions and shows the account-exists message.
- Login can be opened with the email prefilled after a duplicate-email signup attempt.

Service post flow:

- Root routing now allows `create-service-preview`.
- Service form uses one forward action: header `Next`.
- Service preview owns the final `Post service` action.
- Service Builder writes owner-private `service_drafts` rows through the shared debounced autosave lifecycle.
- Unverified service publish attempts save the draft and route to verification before calling `createService`.

Unified draft persistence:

- Job and Service builders create private drafts only after the first meaningful edit.
- Both builders debounce changed serialized content, skip writes during initial hydration, and flush before Preview, backgrounding, or route exit.
- Post lists both draft types and resumes them into the correct builder.
- Published rows remain separate from drafts; inactive services are not used as a draft layer.

Hosted demo data:

- A repeatable `refresh:cloud-demo-taxonomy` script updates the hosted Supabase demo rows to match the controlled MVP taxonomy.
- Local resets still use `supabase/seed.sql`; the hosted project is synced separately so the cloud demo stays aligned with the latest product copy and category set.

## Remaining Issues by Priority

### P0 — Must Fix Before Demo/User Testing

No confirmed P0 code blocker was found in this audit pass.

Manual QA is still required before demo/user testing because many fixes were validated by lint/typecheck and static inspection, not real-device runs. If manual QA finds any redirect loop, publish failure, duplicate signup bypass, or broken messaging realtime path, that issue should become P0 immediately.

### P1 — Should Fix Soon

#### Password reset is only a placeholder

- Problem: Duplicate-email signup offers `Forgot password?`, but the login/register actions currently show a placeholder alert instead of a real reset flow.
- Evidence from code/docs: `app/(auth)/register.tsx` and `app/(auth)/login.tsx` both alert that password reset is not configured; `docs/07-auth-and-permissions.md` requires the duplicate-email actions.
- Affected files: `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, `services/auth.service.ts`, Supabase email templates if reset is added.
- User impact: Existing users who forgot their password are correctly blocked from signup but cannot recover access inside the app.
- Recommended fix: Implement Supabase password reset or revise the action copy before demo if reset is not in scope.
- Risk: Medium because reset links/OTP templates must be configured carefully.
- Manual test: Trigger duplicate signup, tap Forgot password, verify the intended reset path works or copy clearly says it is unavailable in demo.

#### User-facing mojibake/encoding artifacts remain

- Problem: Some UI/docs text contains encoding artifacts such as `Donâ€™t`, `Â·`, and `â€”`.
- Evidence from code/docs: `app/create-service-preview.tsx` includes `Donâ€™t` and `Â·`; audit docs also contain encoded dash artifacts.
- Affected files: `app/create-service-preview.tsx`, docs with copied encoded punctuation.
- User impact: Text can look broken and reduce polish/trust in a demo.
- Recommended fix: Replace mojibake with ASCII-safe copy or proper UTF-8 in a small copy cleanup pass.
- Risk: Low.
- Manual test: Open Service Preview and scan all visible copy.

#### Product UX manual QA is still incomplete

- Problem: Phase 5 states are implemented, but detail screens have not been manually tested across all roles/statuses.
- Evidence from docs: `docs/product-ux-detail-screen-audit.md` status remains pending manual device QA.
- Affected files: `app/job/[jobId].tsx`, `app/services/[serviceId].tsx`, `services/conversation.service.ts`.
- User impact: A missed edge state could show an enabled CTA that later fails, or hide a valid message path.
- Recommended fix: Run the full Product UX manual checklist before more feature work.
- Risk: Low technical risk; high demo confidence value.
- Manual test: Open job/service detail as verified, unverified, owner, closed/inactive, messages-off, and sparse-trust-data users.

### P2 — Can Defer

#### Messages inbox and conversation thread virtualization

- Problem: Messages inbox and conversation thread still use `ScrollView`.
- Evidence from code/docs: `app/(tabs)/messages.tsx` and `app/conversation/[conversationId].tsx` render scroll views; Phase 3 deferred them because of realtime, grouping, keyboard, and auto-scroll risk.
- Affected files: `app/(tabs)/messages.tsx`, `app/conversation/[conversationId].tsx`.
- User impact: Large inboxes or long conversations can become slower.
- Recommended fix: Defer until after manual QA or until seeded data shows list-size pain.
- Risk: Medium because chat keyboard/scroll behavior is easy to regress.
- Manual test: Seed long threads and large inboxes; scroll while receiving messages and sending optimistic messages.

#### Search/Home database scaling

- Problem: Query limits and `ilike` filtering are in place, but deeper scaling work is not done.
- Evidence from code/docs: `searchJobs` and `searchServices` still do separate stats/profile joins and some client-side tag filtering.
- Affected files: `services/job.service.ts`, `services/service-profile.service.ts`.
- User impact: Acceptable for MVP-sized data; may slow with larger row counts.
- Recommended fix: Defer indexes/RPC/views until EXPLAIN output or production-like row counts justify it.
- Risk: Medium if schema/RPC work is done speculatively.
- Manual test: Seed larger job/service sets and compare Home/Search latency.

#### Match/relevance copy is generic

- Problem: Match cards can still repeat category/location instead of explaining a real fit.
- Evidence from docs: `docs/product-ux-detail-screen-audit.md` keeps match card logic deferred.
- Affected files: `app/(tabs)/search.tsx`, search cards, `app/services/[serviceId].tsx`.
- User impact: Lower decision quality, not a broken flow.
- Recommended fix: Defer until search/preference context is stable.
- Risk: Low.
- Manual test: Search by service and inspect whether match reasons add new information.

### P3 — Later / Cleanup

#### Save/bookmark implementation

- Problem: Save is intentionally hidden until saved-items is implemented.
- Evidence from docs/code: Product decision says hide Save; cards/detail surfaces no longer expose active fake Save.
- Affected files: Home/Search/detail cards, future saved-items service.
- User impact: Users cannot save jobs/services yet.
- Recommended fix: Implement only when the saved-items product slice is prioritized.
- Risk: Medium if added across many surfaces.
- Manual test: Confirm no active fake Save buttons remain.

#### Skeleton animation sharing

- Problem: Each `Skeleton` still owns animation work.
- Evidence from docs: Performance Issue 9 remains deferred.
- Affected files: `components/Skeleton.tsx`.
- User impact: Possible lower-end device loading jank.
- Recommended fix: Defer until profiling shows skeleton animation cost.
- Risk: Low.
- Manual test: Observe Home/Search initial loading on lower-end Android.

#### Image rendering migration

- Problem: Remote images still use React Native `Image` in feed/detail surfaces.
- Evidence from docs: Performance Issue 14 remains deferred.
- Affected files: `components/home/HomeFeedCard.tsx`, `app/job/[jobId].tsx`, `app/services/[serviceId].tsx`.
- User impact: Less efficient caching/placeholder behavior for photo-heavy feeds.
- Recommended fix: Consider `expo-image` later, after UI QA.
- Risk: Low to medium.
- Manual test: Scroll image-heavy feeds and open detail pages.

## Remaining Performance Work

- Messages inbox virtualization: safe to defer until large inboxes or manual QA show performance pain.
- Conversation thread virtualization: safe to defer; higher regression risk because keyboard, scroll-to-bottom, grouping, optimistic sends, and retry state all depend on current `ScrollView` behavior.
- Infinite pagination: safe to defer; current list queries are bounded, but no load-more UX exists.
- EXPLAIN/query-plan verification: needed only after more data or when real Supabase latency is measured.
- Database index work: needed only after EXPLAIN or row counts justify it.
- RPC/views/stats aggregation: needed only after more data; current extra stats queries are acceptable for MVP-sized datasets.
- Skeleton animation sharing: safe to defer unless lower-end device testing shows loading jank.
- `expo-image` migration: safe to defer; useful for image-heavy feeds/details later.
- Profile-adjacent query consolidation: safe to defer; shared profile state is fixed, but profile jobs/services/reviews still load separately where needed.

## Remaining Product UX Work

- Detail screen copy/CTA issues: fixed in code, needs manual QA.
- Route semantics issues: fixed for selected service detail. `/services/[serviceId]` is current; `/workers/[workerId]` is future only.
- Service detail vs worker profile separation: current service-specific route is fixed; future person-level profile is deferred.
- Job requirements structure: needs human confirmation. Current fallback copy is safer, but there is no structured requirements field.
- Save/bookmark decision: fixed for MVP by hiding Save; full saved-items implementation deferred.
- Verification language: fixed for MVP public surfaces; needs QA to confirm no repeated badges are visible.
- Payment/agreement note consistency: fixed on detail screens, needs QA.
- Empty states: fake trust metrics removed; needs sparse-data QA.
- Match/relevance copy: deferred.
- Overflow/report/share actions: deferred.

## Auth and Onboarding Stability

Duplicate-email signup guard:

- Server-side Edge Function check exists for `profiles.email`.
- Client-side fallback signs out sessions that look like existing app accounts.
- Remaining risk: the Edge Function does not detect arbitrary Supabase Auth users without profile rows. The fallback should remain.

New account creation:

- Signup uses email OTP, then password creation, then role/onboarding.
- Needs manual QA with a brand-new email.

Login/logout:

- Email/password login is active.
- Logout exists on Profile from prior stabilization work.
- Needs manual QA after force-close/reopen.

OTP behavior:

- Docs require 6-digit OTP templates using `{{ .Token }}`.
- Remaining risk: remote Supabase dashboard template/settings were not inspected in this audit.

Onboarding completion:

- Shared profile cache refresh was added after onboarding save.
- Completion waits for status confirmation before routing.
- Needs slow-network/manual device QA.

Profile cache refresh:

- Shared cache has auth listener, app foreground refresh, realtime profile subscriptions, explicit refresh, and a 30-second fallback poll.
- Remaining risk: realtime publication/dashboard configuration still needs real environment verification.

Route guards:

- Root guard now allows top-level job, service, create-job, create-service, previews, conversation, post, verification, and admin routes for onboarded users.
- Remaining risk: future top-level routes must be added explicitly or they will redirect to tabs.

Force-close/reopen behavior:

- Must be manually verified for signed-in, signed-out, onboarding-incomplete, verified, and unverified users.

## Posting Flow Stability

Job post flow:

- Form uses header `Next`.
- Meaningful edits autosave to an owner-private job draft.
- `onNext` validates, flushes the job draft, and opens `/create-job-preview`.
- Preview owns final publish.
- Unverified users save draft and see a verification gate.
- Remaining risk: manual QA needed for draft reload, missing fields, photo uploads, and publish deletion of draft.

Service post flow:

- Form uses header `Next`.
- Meaningful edits autosave to an owner-private service draft.
- `onNext` validates required fields, flushes the service draft, and opens `/create-service-preview`.
- Preview owns final `Post service`.
- Root guard now allows preview route.
- Unverified users route to verification before create service.
- Remaining risk: manual QA needed for draft reload, photo uploads, verification return, and publish deletion of draft.

Form `Next`:

- Job and Service now match the same flow pattern.

Preview/review screens:

- Job preview final label is still `Publish`; Service preview final label is `Post service`.
- This is acceptable but copy could be standardized later.

Draft preservation:

- Job and Service both have owner-private persistent drafts listed in Post.
- Both builders flush pending changes on background and route exit so drafts survive navigation changes and app restarts.

Missing required fields:

- Job uses field-level errors.
- Service uses field-level errors aligned with Job Builder.

Verification gates:

- Job publish opens a gate modal for unverified users and saves the draft.
- Service publish opens a gate modal for unverified users, saves the draft, and routes to verification.

Navigation after publish:

- Job publish replaces to the created Job Detail.
- Service publish replaces to `/(tabs)/post`.
- This difference is acceptable for now, but should be product-reviewed later.

## Route Semantics and Architecture

- `/job/[jobId]`: current singular job detail route. The docs sometimes use generic `/jobs/[jobId]` language, but the app route is singular.
- `/services/[serviceId]`: current selected service offer detail route.
- Current worker/profile route: no active `/worker/...` route remains in app code.
- Future `/workers/[workerId]`: reserved for a future person-level worker profile.
- Current `/worker/...` references: no active app-code references found. The only old route mention found in docs is explicitly describing the previous route.

Recommendation: no further service route refactor is needed right now. The route semantics refactor is complete. Future work should only add `/workers/[workerId]` when a real person-level profile screen exists.

## Manual QA Checklist

Auth:

- Sign up with a brand-new email.
- Sign up with an existing email and confirm the duplicate-account message.
- Tap `Go to Log In` and confirm email prefill.
- Tap `Forgot password?` and confirm current behavior is acceptable for demo or mark it for implementation.
- Log in with correct credentials.
- Log in with wrong password and confirm error.
- Log out and confirm return to auth.

Onboarding:

- Complete onboarding once for a new user.
- Confirm no return to the name step after completion.
- Force-close/reopen after onboarding.
- Test provider, client, and both-intent data if both is still reachable.

Home:

- Confirm default filter matches onboarding intent.
- Switch For you / Jobs / Services.
- Scroll a long feed.
- Confirm bottom tab does not cover last item.
- Confirm unverified setup/verification banner state.

Search:

- Type quickly and slowly; confirm debounce and stale results.
- Switch Jobs/Services.
- Use service chips.
- Scroll down and confirm search controls collapse while the result header remains sticky.
- Scroll back to the top and confirm search controls reappear.
- Confirm empty states.
- Confirm service results open `/services/[serviceId]`.

Messaging:

- Send messages rapidly.
- Send quick prompts.
- Receive messages while staying on conversation screen.
- Confirm inbox preview updates without leaving Messages.
- Test failed/offline send and retry.

Job Details:

- Open as verified worker.
- Open as unverified user.
- Open own job.
- Open closed/cancelled/completed/in-progress jobs.
- Open job with messages off.
- Confirm payment note and honest trust empty states.

Worker/Service Details:

- Open from Home and Search.
- Confirm URL route is `/services/[serviceId]`.
- Open as verified client.
- Open as unverified user.
- Open own service.
- Open inactive service.
- Open messages-off service.
- Open unavailable-but-active service and confirm messaging remains available if messages are allowed.
- Confirm no public verification badge and no fake Save.

Job Posting:

- Create job as verified client.
- Validate missing fields.
- Add photos.
- Open preview from header `Next`.
- Go back and confirm data remains.
- Publish and confirm created job detail opens.
- Test unverified user creates private draft and hits verification gate.

Service Posting:

- Create service as verified provider.
- Validate missing fields.
- Add photos.
- Open preview from header `Next`.
- Confirm lower duplicate forward CTA is gone.
- Go back and confirm data remains.
- Tap `Post service` and confirm publish.
- Test unverified publish routes to verification.

Verification gates:

- Try messaging unverified.
- Try job publish unverified.
- Try service publish unverified.
- Try Messages tab unverified.
- Confirm copy stays access-gate oriented and not public-badge oriented.

App restart/background behavior:

- Force-close/reopen signed out.
- Force-close/reopen signed in and onboarded.
- Force-close/reopen onboarding incomplete.
- Background/foreground after verification approval.
- Background/foreground while on service/job preview.

## Recommended Next Phase

Manual QA only.

Reason: the current highest-value work is not another feature or optimization. The code has had several stabilization fixes, but many were validated only by static review, lint, and typecheck. Manual QA should now decide whether there are true P0/P1 regressions. Database scaling, Save/bookmark implementation, and chat virtualization are all premature until core flows are manually verified.

## Final Recommendation

The app is stable enough for limited user testing only after the manual QA checklist above passes.

It is not yet demo-ready with high confidence because auth, onboarding, verification gates, messaging realtime, and posting flows still need real-device verification. No confirmed P0 blocker was found in this audit, but manual QA is the next gate.
