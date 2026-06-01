# Konektado Performance Audit

## Summary

Current status note: the root-cause sections below are the original audit baseline. Phases 1-4 and post-Phase-4 stabilization have since addressed messaging freshness, Search/Home query behavior, Home/Search virtualization, shared profile state, and onboarding routing. Treat the later Implementation Status, phase notes, P1 reconciliation, and `docs/stabilization-audit.md` as the current status source.

## 2026-05-31 Progressive Slowdown Audit Update

### Findings

| File / area | Symptom | Root cause | User impact | Risk | Proposed fix |
| --- | --- | --- | --- | --- | --- |
| `components/home/HomeFeedCard.tsx`, `components/search/SearchWorkerResultCard.tsx`, `components/WorkerCard.tsx`, detail/message/profile avatars | Remote avatars and feed photos can take a long time to appear and may reload across navigation. | Stable Supabase/public URLs were rendered with React Native `Image`, which gives less predictable disk caching/fade behavior than `expo-image`. | Image-heavy feeds can feel stuck even when text data has loaded. | High | Use a shared `expo-image` wrapper with disk cache, stable recycling keys, fade-in transitions, and initials/fallback UI for avatars. |
| `app/(tabs)/index.tsx` | Returning to Home can look like a full refresh. | Home always reloaded jobs/services on focus and set feed loading, even when prior content was still valid. | Repeated tab switching feels slower and causes unnecessary skeleton work. | High | Add short-lived Home feed cache, stale-while-refresh behavior, and in-flight request deduping. |
| `app/(tabs)/index.tsx`, `app/(tabs)/search.tsx` | Long result lists can feel heavy on lower-end Android. | `FlatList` virtualization existed, but render/window props were not tuned for image-heavy cards. | More JS/render work than needed during scrolling. | Medium | Tune `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, and clipped subview removal. |
| `services/profile-photo.service.ts`, `services/job-photo.service.ts`, `services/service-photo.service.ts` | Small avatars/cards may download original phone-sized uploads. | Upload helpers stored the selected file as-is and only saved one public URL. | Slow image downloads and excess bandwidth, especially on mobile data. | Medium | Completed: normalize new public image uploads before storage; defer separate thumbnail/detail schema columns until a measured need exists. |
| `services/job.service.ts`, `services/service-profile.service.ts` | Home/Search list loads still wait on base rows, visibility checks, profile summaries, avatar visibility, and stats. | Privacy-safe discovery is implemented as several dependent service calls rather than a list-ready RPC/view. | Acceptable for MVP data, but latency grows with row count/history. | Medium | Cache public profile summaries briefly and consider list-ready RPCs/denormalized stats only after real query profiling. |
| `app/(tabs)/messages.tsx`, `app/conversation/[conversationId].tsx` | Very large inboxes or long threads can still degrade. | These screens still use `ScrollView`; realtime subscription cleanup is present, but list virtualization remains deferred. | Progressive slowdown in large chat histories. | Medium | Defer chat virtualization until keyboard/realtime behavior can be manually QA'd. |

### Completed Fixes In This Pass

- Added `components/CachedRemoteImage.tsx`, a shared `expo-image` wrapper using disk cache, stable `recyclingKey`, and a short fade transition.
- Migrated high-traffic remote images to cached rendering:
  - Home feed avatars and feed photos.
  - Search worker avatars.
  - Legacy worker/job card photos.
  - Job detail photo and poster avatar.
  - Messages inbox and conversation header avatars.
  - Current profile, public profile, and profile setup avatars.
- Job/service photo thumbnails shown after upload.
- Added public upload optimization for new profile avatars, job photos, and service photos using `expo-image-manipulator`.
- New public avatar uploads are resized to a 640px maximum side and JPEG-compressed before saving to `profiles.avatar_url`.
- New public job/service uploads are resized to a 1400px maximum side and JPEG-compressed before saving to `photo_urls`.
- Internal demo editor local public image uploads now use the same public optimization helper before storing profile avatars, job photos, and service photos.
- Internal demo editor pasted external image URLs remain supported as a demo shortcut, but they are saved as-is and are not compressed.
- Private verification files, credential documents, and signed verification URLs remain outside the public image optimization path.
- Added display URL selection helpers so avatar/card/detail paths can prefer future thumbnail/detail variants while falling back to today's URL fields.
- Home feed now keeps cached content visible during a background refresh for a short TTL instead of showing feed skeletons every focus.
- Home feed refreshes are deduped while an equivalent request is already in flight.
- Home and Search `FlatList` render windows are tuned for smoother Android scrolling.
- The previous Home setup prompt fix remains in place: conditional setup/profile/verification prompts render nothing while eligibility is unknown.

### Remaining Risks

- Existing uploaded images may still be large original files. `expo-image` caching helps repeat loads, and new uploads are now resized/compressed, but old records will stay large until manually replaced or migrated.
- Pasted external URLs, including those entered through the internal demo editor, can still point to large remote images because the app does not download and re-upload them.
- Separate thumbnail/detail URL columns were not added in this pass because the current schema exposes only `avatar_url` and `photo_urls`; adding parallel arrays would widen service/RPC/admin/moderation contracts without a measured need.
- Public discovery still performs multiple privacy-safe service-layer steps. This should be optimized with measured Supabase query plans or list-ready RPCs, not by weakening visibility/privacy rules.
- Messages inbox and conversation thread virtualization are still deferred because chat keyboard behavior, optimistic sends, realtime inserts, and scroll-to-bottom behavior need careful manual QA.
- No real-device timing profile was captured during this pass.

### Manual Android QA

- Open Home cold and confirm text/card content appears before slow images finish.
- Switch Home -> Search -> Messages -> Home repeatedly; Home should keep existing feed content instead of flashing a full feed reload within the cache window.
- Scroll an image-heavy Home feed on 360x800, 390x844, and 430x932.
- Open Search Services with profile photos, scroll quickly, and confirm avatars fade in or fall back without blocking card text.
- Open Job Detail with a photo and poster avatar, then return and reopen; cached images should be faster.
- Open Messages and a conversation with avatars; switch away and back repeatedly and confirm no duplicate realtime behavior or visual slowdown.
- Test a broken/slow avatar URL and confirm initials/fallbacks remain visible.

The main performance problems are not caused by one single slow screen. They come from a few repeated patterns:

- Messaging uses optimistic local sends, but message fetching and conversation preview reconciliation are incomplete. There is no realtime subscription for `messages` or `conversations`, incoming messages do not update while a screen stays mounted, and preview updates only cover conversations already in local memory.
- Home tab switching does not refetch from Supabase, so the slow "For you", "Jobs", and "Services" feeling is more likely render work: unbounded loaded arrays, repeated sorting/scoring, `ScrollView` rendering, image-heavy cards, and broad re-renders.
- Search does refetch too often. It runs both job and service searches on every query/chip change, with no debounce, no server-side text filtering, no limits, and a full skeleton replacement.
- The data layer overfetches and then filters/transforms in JavaScript. The services load all open jobs or active services, then fetch profiles and stats with extra queries.
- Profile state is polled independently by the root guard and by every screen that calls `useProfile`, creating recurring background Supabase work.
- Several loading states are broad full-screen or full-list replacements where stale-while-revalidate behavior would feel faster.

This report is documentation only. It does not change app behavior.

## Confirmed Symptoms

- Some skeleton/loading states look different from final UI: confirmed. Home feed skeletons do not include the optional 222px feed photo area used by final `HomeFeedCard` records with `imageUrl`, which can cause a visible layout jump.
- Some screens show skeletons when they could instead feel instant: confirmed. Starting a job/service conversation already returns a full conversation detail, but the app navigates with only the id and the conversation screen immediately refetches and shows a full skeleton. Search also replaces existing results with skeletons during each query refresh.
- Sending a message may not immediately appear in the UI: partially confirmed. The conversation screen does optimistically append outgoing messages before the network request, so optimistic UI is present. However, overlapping sends can be overwritten by the post-send full refetch, and the initial message sent by `startJobConversation` or `startServiceConversation` is not emitted into the preview cache before navigation.
- The conversation/message preview may not immediately show the latest sent message: confirmed. The preview event system is local-only, only updates existing cached conversations, does not subscribe to Supabase changes, and can leave failed local sends as the preview until a refetch.
- Switching between "For You", "Jobs", and "Services" feels slow: confirmed as a rendering/data-size issue, not a tab-refetch issue. The Home filter switch only changes local state and recomputes the feed; it does not call Supabase.
- Some parts of the app feel slower than expected: confirmed. Search overfetches and refetches too often, marketplace services do client-side filtering/stat joins, lists use `ScrollView` instead of virtualized lists, and profile hooks poll repeatedly.

## Root Cause Ranking

### P0 - Critical

#### Issue 1: Message and conversation state can become stale

- Problem: Inbox previews and open conversation threads do not reliably update when messages arrive or when conversation state changes outside the current screen.
- Confirmed root cause: There are profile realtime subscriptions, but no realtime subscriptions for `messages` or `conversations`. Conversation preview updates are a local event bus, not a Supabase-backed subscription.
- Evidence from code: `app/conversation/[conversationId].tsx:65-90` fetches once on mount, `app/(tabs)/messages.tsx:52-88` refetches on focus, and `services/conversation-preview-events.ts:14-38` updates an in-memory cache only when local code emits an event. Searches for `supabase.channel` only found profile/status hooks.
- Affected files: `app/conversation/[conversationId].tsx`, `app/(tabs)/messages.tsx`, `services/conversation-preview-events.ts`, `services/conversation.service.ts`.
- User impact: Users can miss incoming messages until they leave and re-enter a screen. Inbox previews can lag behind the real latest message.
- Recommended fix: Add scoped realtime subscriptions for the current conversation's `messages` and `conversations` row, plus an inbox-level subscription for participant conversations/messages. Reconcile events by id, ignore duplicates, and update the preview cache from both local sends and remote events.
- Risk level: Medium. Realtime can duplicate local optimistic messages unless reconciliation is idempotent.
- Estimated implementation difficulty: Medium.

#### Issue 2: Post-send refetch can race with optimistic local state

- Problem: The app appends an optimistic message, then refetches the entire conversation after the insert result returns.
- Confirmed root cause: `onSend` appends a `local-*` message, replaces it with Supabase's returned message, emits a preview update, then calls `load({ showSkeleton: false })`. If multiple sends overlap, an earlier refetch can overwrite a later optimistic message until the later request finishes.
- Evidence from code: `app/conversation/[conversationId].tsx:141-168` creates and appends the temp message, `app/conversation/[conversationId].tsx:170-183` sends, replaces, emits, and refetches. `services/conversation.service.ts:528-545` inserts a message and separately updates `conversations.updated_at`.
- Affected files: `app/conversation/[conversationId].tsx`, `services/conversation.service.ts`.
- User impact: Fast consecutive sends or quick-prompt taps can briefly disappear, reorder, or flicker before the final refetch settles.
- Recommended fix: Treat send as a mutation. Replace the temp message with the returned row and update conversation metadata locally. Use a background reconciliation fetch only when needed, with request sequencing so older fetches cannot overwrite newer local state.
- Risk level: Medium.
- Estimated implementation difficulty: Medium.

### P1 - High Priority

#### Issue 3: Initial job/service conversation messages do not update preview cache

- Problem: Starting a conversation from Job Detail or Worker Detail waits for the service call, then navigates to the conversation. The first message is persisted, but no preview event is emitted before navigation.
- Confirmed root cause: `startJobConversation` and `startServiceConversation` call `sendMessage` inside the service and return `getConversation`, but only `app/conversation/[conversationId].tsx` emits `emitConversationPreviewUpdate`.
- Evidence from code: `services/conversation.service.ts:442-447` and `services/conversation.service.ts:504-509` send the initial message and return `getConversation`. `app/job/[jobId].tsx:182-198` and `app/services/[serviceId].tsx` navigate using only `conversationId`.
- Affected files: `services/conversation.service.ts`, `app/job/[jobId].tsx`, `app/services/[serviceId].tsx`, `services/conversation-preview-events.ts`.
- User impact: The new or reused conversation may not appear instantly in Messages, especially if the inbox cache does not already include that conversation.
- Recommended fix: Return enough metadata from start-conversation calls to insert/update the preview cache, or centralize conversation mutations in a hook that updates both thread and inbox caches.
- Risk level: Low to medium.
- Estimated implementation difficulty: Medium.

#### Issue 4: Search overfetches and refetches on every text/chip change

- Problem: Search can feel slow while typing or switching service chips.
- Confirmed root cause: Search runs both job and service queries whenever `query` or `selectedService` changes, with no debounce and regardless of active mode.
- Evidence from code: `app/(tabs)/search.tsx:71-97` calls `Promise.all([searchOpenJobs({ text }), searchServices({ text })])` on every query/chip change. `SearchHeaderRow` passes `TextInput.onChangeText` directly to state at `components/search/SearchHeaderRow.tsx:31-41`.
- Affected files: `app/(tabs)/search.tsx`, `components/search/SearchHeaderRow.tsx`, `services/job.service.ts`, `services/service-profile.service.ts`.
- User impact: Each keystroke can trigger multiple Supabase queries and replace results with skeletons.
- Recommended fix: Debounce text input, keep previous results visible while refreshing, query only the active mode first, and optionally prefetch the inactive mode after the active result is ready.
- Risk level: Low.
- Estimated implementation difficulty: Low to medium.

#### Issue 5: Marketplace search loads too much data and filters in JavaScript

- Problem: Home and Search do more network and JavaScript work than needed.
- Confirmed root cause: `searchJobs` and `searchServices` fetch all matching status/activity rows, then apply text filtering in JavaScript. They also load profiles and stats after filtering.
- Evidence from code: `services/job.service.ts:212-244` selects open/reviewing jobs, orders by created date, and filters `filters.text` locally. `services/service-profile.service.ts:165-199` selects all active services and filters text locally. Neither query has `.limit()` or `.range()`.
- Affected files: `services/job.service.ts`, `services/service-profile.service.ts`, `app/(tabs)/index.tsx`, `app/(tabs)/search.tsx`.
- User impact: Initial Home load, Search load, and query changes get slower as rows grow.
- Recommended fix: Add limits/pagination first. Move text/category/location filtering into Supabase queries or RPCs. Return list-ready fields and stats in a single view/RPC when possible.
- Current status: Partially implemented in Phase 2. Search and Home now use bounded query limits, and obvious scalar text filtering moved into Supabase `ilike` filters. Some tag matching remains client-side. RPCs/views, EXPLAIN/query-plan verification, infinite pagination, and index work were not added.
- Remaining work: Deferred database-scaling work, not current app-blocking work.
- Risk level: Medium.
- Estimated implementation difficulty: Medium to high if database views/RPCs are added.

#### Issue 6: Home filter switching re-renders non-virtualized feed content

- Problem: Switching "For you", "Jobs", and "Services" feels slow even though it does not refetch.
- Confirmed root cause: The tab switch recomputes a sorted/mixed feed and renders all cards through a `ScrollView`. Home has no `FlatList`, pagination, or virtualization for feed results.
- Evidence from code: `app/(tabs)/index.tsx:372-382` recomputes `feed`; `app/(tabs)/index.tsx:457-497` renders a `ScrollView` and maps every `feed` item; `app/(tabs)/index.tsx:121-158` repeatedly scores/sorts and uses array shifting for For You mixing.
- Affected files: `app/(tabs)/index.tsx`, `components/home/HomeFeedCard.tsx`.
- User impact: More rows means more JS work and more card/image rendering on every filter change.
- Recommended fix: Convert Home feed to `FlatList`, cap initial query size, precompute score fields when loading, and keep a memoized feed per filter/preference set.
- Risk level: Medium.
- Estimated implementation difficulty: Medium.

#### Issue 7: Profile state polling is duplicated across screens

- Problem: The app performs recurring background profile queries even when the visible user task is unrelated.
- Confirmed root cause: `useProfileStatus` polls every 2 seconds in the root layout, and every `useProfile` instance polls every 5 seconds. Many tabs and detail screens call `useProfile` separately.
- Evidence from code: `hooks/use-profile-status.ts:244-247` starts a 2s polling fallback. `hooks/use-profile.ts:140-144` starts a 5s polling fallback. `app/_layout.tsx:28-29` uses `useProfileStatus`, and many screens call `useProfile`.
- Affected files: `hooks/use-profile.ts`, `hooks/use-profile-status.ts`, `app/_layout.tsx`, all screens using `useProfile`.
- User impact: Avoidable network traffic and rerenders can make the app feel heavier, especially on slower devices or connections.
- Recommended fix: Move profile/session state into one provider or cached external store. Keep realtime/app-state refresh, but avoid per-screen polling. Use a single fallback poll with longer interval/backoff only when realtime is unavailable.
- Risk level: Medium.
- Estimated implementation difficulty: Medium.

### P2 - Medium Priority

#### Issue 8: Loading flags are too broad in Search and some detail flows

- Problem: Existing useful content is replaced with skeletons during refreshes.
- Confirmed root cause: Search sets `loading=true` for every request and renders skeletons instead of previous results. Detail screens often show full-screen skeletons on navigation even when the previous screen had enough summary data to render a shell.
- Evidence from code: `app/(tabs)/search.tsx:80-90` sets loading around each search request, and `app/(tabs)/search.tsx:142-176` replaces results with skeletons. Conversation start routes pass only ids at `app/job/[jobId].tsx:194-197` and `app/services/[serviceId].tsx`, then `app/conversation/[conversationId].tsx:210-214` renders a full skeleton while refetching.
- Affected files: `app/(tabs)/search.tsx`, `app/conversation/[conversationId].tsx`, `app/job/[jobId].tsx`, `app/services/[serviceId].tsx`.
- User impact: The app appears slower than the data path requires.
- Recommended fix: Add stale-while-revalidate behavior: keep previous content visible with small inline loading affordances. Cache detail results by id when navigation already fetched the target.
- Risk level: Low.
- Estimated implementation difficulty: Low to medium.

#### Issue 9: Skeleton animation work scales with the number of placeholders

- Problem: Loading states can add JS/UI work at the exact moment data is loading.
- Confirmed root cause: Every `Skeleton` instance creates its own `Animated.Value` and `Animated.loop`.
- Evidence from code: `components/Skeleton.tsx:32-55` starts a loop per skeleton. Home and Search skeleton cards render many skeleton instances per card at `app/(tabs)/index.tsx:556-582` and `app/(tabs)/search.tsx:274-336`.
- Affected files: `components/Skeleton.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/search.tsx`, other skeleton-heavy screens.
- User impact: Skeleton-heavy screens can feel less smooth on lower-end phones.
- Recommended fix: Use one shared shimmer/opacity driver per skeleton group, disable animation for fast cached refreshes, or simplify placeholder counts.
- Risk level: Low.
- Estimated implementation difficulty: Low.

#### Issue 10: Inbox and chat lists are not virtualized

- Problem: Large inboxes or long conversations will render every row.
- Confirmed root cause: Messages inbox and conversation threads use `ScrollView` with `.map()`, not `FlatList`.
- Evidence from code: `app/(tabs)/messages.tsx:161-241` uses `ScrollView`, `app/(tabs)/messages.tsx:264-270` maps rows, `app/conversation/[conversationId].tsx:279-322` uses `ScrollView` and maps every message.
- Affected files: `app/(tabs)/messages.tsx`, `app/conversation/[conversationId].tsx`.
- User impact: Performance degrades as chat history grows.
- Recommended fix: Use `FlatList` for inbox rows and chat messages. Memoize row components with stable handlers and ids.
- Risk level: Medium.
- Estimated implementation difficulty: Medium.

#### Issue 11: Stats are recalculated through extra table queries

- Problem: Each marketplace list load does several dependent queries and local reductions for ratings/counts.
- Confirmed root cause: `loadClientStats` queries reviews plus owned/client jobs, then aggregates in JS. `loadProviderStats` queries reviews and completed jobs separately.
- Evidence from code: `services/job.service.ts:36-108` and `services/service-profile.service.ts:28-81`.
- Affected files: `services/job.service.ts`, `services/service-profile.service.ts`.
- User impact: Marketplace lists get slower as review/job history grows.
- Recommended fix: Use denormalized counters, database views, or RPCs for list-ready stats. Keep exact recalculation for admin/backfill jobs, not every list render.
- Risk level: Medium.
- Estimated implementation difficulty: Medium to high.

### P3 - Low Priority / Cleanup

#### Issue 12: Some visible marketplace metrics still use deterministic demo fallbacks

- Problem: Cards can show plausible but non-real ratings or job counts when real stats are absent.
- Confirmed root cause: Formatting helpers return generated demo values when real counts are zero/missing.
- Evidence from code: `services/marketplace.helpers.ts:323-340` and `services/marketplace.helpers.ts:355-368`.
- Affected files: `services/marketplace.helpers.ts`, Home/Search/detail cards that consume these helpers.
- User impact: UI can look stale or misleading even if performance is fine.
- Recommended fix: Replace demo fallbacks with honest empty states like "No ratings yet" or hide the metric until real data exists.
- Risk level: Low.
- Estimated implementation difficulty: Low.

#### Issue 13: Some memoization is weakened by inline row handlers

- Problem: Memoized row components still receive new function props on parent render.
- Confirmed root cause: `MessageRow` is memoized, but `InboxSection` passes `onPress={() => onOpen(conversation.id)}` for each row.
- Evidence from code: `app/(tabs)/messages.tsx:246-320`.
- Affected files: `app/(tabs)/messages.tsx`.
- User impact: Minor rerender overhead in small inboxes, larger overhead as the inbox grows.
- Recommended fix: Pass `conversationId` to the row and let the row call a stable `onOpen(id)` handler, or use a virtualized list render item.
- Risk level: Low.
- Estimated implementation difficulty: Low.

#### Issue 14: Image rendering could be optimized without changing UI

- Problem: Feed/detail cards use React Native `Image` for remote images while `expo-image` is already installed.
- Confirmed root cause: `HomeFeedCard`, Job Detail, and Worker Detail import `Image` from `react-native`.
- Evidence from code: `components/home/HomeFeedCard.tsx:3`, `app/job/[jobId].tsx:4`, `app/services/[serviceId].tsx`; `package.json` includes `expo-image`.
- Affected files: `components/home/HomeFeedCard.tsx`, `app/job/[jobId].tsx`, `app/services/[serviceId].tsx`, other image-heavy screens.
- User impact: Less efficient caching/placeholder behavior for photo-heavy feeds.
- Recommended fix: Consider `expo-image` for remote feed/detail photos with stable dimensions and transition disabled or tuned to match Figma.
- Risk level: Low.
- Estimated implementation difficulty: Low.

## File-by-File Findings

### `app/conversation/[conversationId].tsx`

- What it controls: Conversation detail thread, optimistic sending, composer, quick replies, mark hired.
- Findings: Optimistic sending exists. After a send, the screen refetches the full conversation. There is no realtime subscription for incoming messages. Loading is full-screen on initial load. Rapid sends can race with the post-send refetch.
- Whether it needs changes: Yes.
- Suggested fix: Add message/conversation realtime reconciliation, remove routine post-send full refetch, keep a sequenced background reconciliation path, and use `FlatList` for messages.

### `services/conversation.service.ts`

- What it controls: Conversation listing, conversation detail fetching, starting job/service conversations, sending messages, hiring/status updates.
- Findings: `sendMessage` inserts a row and separately updates `conversations.updated_at`; update errors are ignored. Start-conversation methods send initial messages but do not emit preview cache updates. `getConversation` loads all messages with no pagination.
- Whether it needs changes: Yes.
- Suggested fix: Return richer mutation results, make updated conversation metadata explicit, add paginated message loading, and consider an RPC for atomic send plus conversation timestamp update.

### `services/conversation-preview-events.ts`

- What it controls: In-memory inbox preview cache and local event bus.
- Findings: Cache only reconciles conversations already present. It cannot insert a new conversation. It does not distinguish pending/failed/confirmed messages. `getConversationPreviewCache(null)` can return cached conversations without a user id.
- Whether it needs changes: Yes.
- Suggested fix: Scope cache strictly by user id, support insert/update/remove, carry pending/failed state or avoid caching failed messages, and wire it to realtime events.

### `app/(tabs)/messages.tsx`

- What it controls: Inbox, filters, message requests, inbox search.
- Findings: It uses cached previews to avoid skeletons after first load, which is good. It refetches on focus, but not while focused. It uses `ScrollView` and maps every row. Memoized rows receive inline handlers.
- Whether it needs changes: Yes.
- Suggested fix: Add inbox realtime subscription, move list to `FlatList`, keep cached data visible while refreshing, and stabilize row handlers.

### `app/job/[jobId].tsx`

- What it controls: Job detail and starting job conversation.
- Findings: Job details refetch by id on mount. Starting a conversation waits for the service result, then passes only the id to the conversation route.
- Whether it needs changes: Yes for responsiveness.
- Suggested fix: Cache the returned conversation detail or update preview cache before navigation. Consider passing/loading route data from a detail cache instead of showing a full skeleton.

### `app/services/[serviceId].tsx`

- What it controls: Worker/service detail and starting service conversation.
- Findings: Same start-conversation behavior as Job Detail. Worker detail fetches provider services and stats every mount.
- Whether it needs changes: Yes for responsiveness.
- Suggested fix: Cache service detail by id and update conversation preview cache after start-service conversation.

### `app/(tabs)/index.tsx`

- What it controls: Home feed, Home filter tabs, verification banner.
- Findings: Home loads jobs/services once per mount/session, not on filter switch. Filter switching recomputes sorted/mixed feeds locally and renders all results in a `ScrollView`. Home never refreshes after `feedLoaded` becomes true, so newly created jobs/services can be stale until remount.
- Whether it needs changes: Yes.
- Suggested fix: Add a marketplace feed cache with invalidation after post/service creation, convert feed to `FlatList`, cap initial rows, precompute ranking fields, and expose manual/background refresh.

### `components/home/HomeFeedCard.tsx`

- What it controls: Unified Home job/service feed card.
- Findings: Supports optional feed photos, but Home skeleton does not reserve that photo space. Uses React Native `Image`.
- Whether it needs changes: Yes for skeleton/photo performance.
- Suggested fix: Align skeleton with photo-capable cards and consider `expo-image` for remote media.

### `app/(tabs)/search.tsx`

- What it controls: Search tab, text query, service chips, job/worker mode.
- Findings: Mode switching itself does not refetch. Query/chip changes refetch both jobs and services with no debounce. Existing results are hidden behind skeletons during each refresh. Results render through `ScrollView`.
- Whether it needs changes: Yes.
- Suggested fix: Debounce text, fetch active mode first, keep stale results visible during refresh, add pagination/limits, and switch results to `FlatList`.

### `services/job.service.ts`

- What it controls: Job creation, listing, search, detail, status updates.
- Findings: Search loads all open/reviewing jobs, filters text locally, has no limit/range, then fetches profiles and client stats. Client stats require extra reviews/jobs queries.
- Whether it needs changes: Yes.
- Suggested fix: Add query limits and server-side text/category/location filtering. Use list-ready RPC/view for stats.

### `services/service-profile.service.ts`

- What it controls: Service creation, listing, search, detail.
- Findings: Search loads all active services, filters text locally, has no limit/range, then fetches profiles and provider stats. Detail also fetches all active services for the provider.
- Whether it needs changes: Yes.
- Suggested fix: Add query limits, server-side filtering, service detail caching, and a stats view/RPC.

### `hooks/use-profile.ts`

- What it controls: Current profile data for screens.
- Findings: Each hook instance subscribes and polls every 5 seconds. Many screens instantiate it independently.
- Whether it needs changes: Yes.
- Suggested fix: Centralize profile state in one provider/cache and remove per-screen polling.

### `hooks/use-profile-status.ts`

- What it controls: Root auth/profile/onboarding routing guard.
- Findings: Polls every 2 seconds as realtime fallback and performs multiple profile/role/preference queries.
- Whether it needs changes: Yes.
- Suggested fix: Share cached auth/profile data with `useProfile`, use event/app-state refresh first, and slow or disable fallback polling when realtime is healthy.

### `components/Skeleton.tsx`

- What it controls: Animated placeholder primitive.
- Findings: Every skeleton instance owns its own animation loop.
- Whether it needs changes: Optional but useful.
- Suggested fix: Support grouped/shared animation or a static mode for cached refreshes.

### `supabase/migrations/20260506100000_conversation_inbox_rpc.sql`

- What it controls: Inbox RPC and latest-message query.
- Findings: Good improvement over fallback mapping. It adds `messages(conversation_id, created_at desc)` and returns latest message fields in one call.
- Whether it needs changes: Not immediately.
- Suggested fix: Keep it, then verify query plans before adding more conversation indexes.

## Data Flow Findings

### Message Sending

1. Conversation screen builds a temp `local-*` message and appends it to `conversation.messages`.
2. It clears the input and emits a local preview event immediately.
3. `sendMessage` verifies the user, inserts into `messages`, selects the inserted row, and then updates `conversations.updated_at`.
4. The screen replaces the temp message with the returned row and emits a confirmed preview event.
5. The screen then refetches the full conversation without showing a skeleton.

Finding: Optimistic UI exists, but the final refetch can race with later optimistic sends. Failed sends also emit the temp message to the preview cache, so the inbox can show a message that did not persist until the next refetch.

### Message Fetching

1. Conversation detail fetches `conversations` by id.
2. `mapConversationRows` fetches profiles, job/service details, and latest message summary.
3. `getConversation` separately fetches all messages for that conversation ordered ascending.

Finding: There is no pagination and no realtime message subscription.

### Conversation Preview Update

1. Messages tab initializes from `getConversationPreviewCache(profileId)`.
2. On focus, it calls `listMyConversations`.
3. If the inbox RPC exists, it returns conversation, participants, context title, and latest message in one call.
4. Local sends call `emitConversationPreviewUpdate`.
5. The event bus updates matching cached conversations only.

Finding: Preview updates do not insert missing conversations, do not handle remote messages, and are not strict enough about user scoping when called without a profile id.

### Feed Tab Switching

1. Home loads preferences once and sets the initial filter.
2. Home loads jobs and services once while focused and before `feedLoaded` is true.
3. "Jobs" sorts `feedSources.jobs`.
4. "Services" sorts `feedSources.workers`.
5. "For you" sorts both arrays and alternates item types.

Finding: Filter switching is local and does not refetch. The likely slowness is sorting/scoring plus rendering all cards in a `ScrollView`, amplified by unbounded query result sizes.

### Search/Filter Behavior

1. Search mode defaults from route params.
2. Search text and selected service are combined into a single text string.
3. Every query or selected service change runs both `searchJobs` and `searchServices`.
4. Both services fetch broad result sets and filter text locally.
5. Results are mapped into specialized card props and rendered in a `ScrollView`.

Finding: Search is the clearest confirmed refetch problem.

### Loading/Skeleton Behavior

1. Home shows feed skeletons only while initial feed data is loading.
2. Search replaces the current result list with skeletons during every query refresh.
3. Messages uses cache to avoid inbox skeletons after first load, but profile loading still shows row skeletons.
4. Conversation detail shows a full skeleton on first route load, even if a previous service call already loaded conversation detail.

Finding: Loading flags are broad in places where stale content plus small refresh indicators would feel faster.

## Recommended Optimization Plan

### 1. Harden messaging freshness first

- Goal: Make sent and received messages reliable and previews current.
- Files to modify: `app/conversation/[conversationId].tsx`, `app/(tabs)/messages.tsx`, `services/conversation.service.ts`, `services/conversation-preview-events.ts`.
- Expected improvement: Incoming messages appear without leaving the screen; previews update immediately and correctly.
- Risk: Medium.
- How to test manually: Open two seeded verified users on separate devices/sessions, send messages both ways while staying on the chat and inbox screens, test failed/offline send, and test rapid quick-prompt sends.
- Phase 1 status: Implemented app-side Supabase Realtime subscriptions for current conversation threads and focused inbox previews. Message reconciliation is idempotent by message id and optimistic local replacement.

### 2. Remove routine full refetch after send

- Goal: Keep optimistic messages stable and prevent send/refetch races.
- Files to modify: `app/conversation/[conversationId].tsx`, `services/conversation.service.ts`.
- Expected improvement: Faster perceived send behavior and less flicker.
- Risk: Medium.
- How to test manually: Send several messages quickly, use quick prompts, background/foreground the app, and confirm message order and inbox preview stay correct.
- Phase 1 status: Implemented. Sends keep local optimistic messages, replace the matching `local-*` message with the confirmed Supabase row, and no longer routinely refetch the full conversation after every send.

### 3. Fix start-conversation preview/cache behavior

- Goal: Make first job/service messages appear instantly in conversation previews.
- Files to modify: `services/conversation.service.ts`, `services/conversation-preview-events.ts`, `app/job/[jobId].tsx`, `app/services/[serviceId].tsx`.
- Expected improvement: Messages tab feels current after starting a conversation from detail screens.
- Risk: Low to medium.
- How to test manually: Start a new job conversation, go back to Messages, and confirm the latest preview appears without waiting for a focus refetch.
- Phase 1 status: Implemented. Job Detail and Worker Profile emit the returned conversation detail into the preview cache before navigating to the thread.

### 4. Add marketplace query limits and server-side filtering

- Goal: Reduce Supabase payloads and JS filtering work.
- Files to modify: `services/job.service.ts`, `services/service-profile.service.ts`, possibly a new Supabase migration/RPC.
- Expected improvement: Faster Home/Search loads and less slow growth as data increases.
- Risk: Medium.
- How to test manually: Seed more jobs/services, compare Search typing and Home initial load before/after, verify category/location/text results.

### 5. Convert feed/search/inbox lists to virtualized lists

- Goal: Avoid rendering every row/card at once.
- Files to modify: `app/(tabs)/index.tsx`, `app/(tabs)/search.tsx`, `app/(tabs)/messages.tsx`, possibly row/card components.
- Expected improvement: Faster tab switches, smoother scrolling, better memory behavior.
- Risk: Medium.
- How to test manually: Test on 360x800, 390x844, and 430x932. Verify bottom nav padding, sticky search header behavior, empty states, and long text.

### 6. Narrow loading states and align skeletons

- Goal: Keep existing content visible during refresh and reduce layout jumps.
- Files to modify: `app/(tabs)/search.tsx`, `app/(tabs)/index.tsx`, `components/Skeleton.tsx`, detail screens as needed.
- Expected improvement: Faster perceived performance.
- Risk: Low.
- How to test manually: Search while typing, change service chips, open photo and non-photo Home cards, and verify skeletons match final layout.

### 7. Consolidate profile loading

- Goal: Remove duplicated polling and reduce background query load.
- Files to modify: `hooks/use-profile.ts`, `hooks/use-profile-status.ts`, `app/_layout.tsx`, possibly a new profile provider/store.
- Expected improvement: Lower network chatter and fewer background rerenders.
- Risk: Medium.
- How to test manually: Login/logout, onboarding routing, admin routing, verification approval refresh, and profile updates.

### 8. Review indexes after query changes

- Goal: Match database indexes to real query patterns.
- Files to modify: Supabase migrations only if EXPLAIN confirms benefit.
- Expected improvement: Faster large-table queries.
- Risk: Low to medium.
- How to test manually: Run Supabase query plans for Home/Search/inbox RPCs before and after indexes.

Likely index candidates based on current code, to verify before adding:

- `jobs(status, created_at desc)` for `searchJobs`.
- `services(is_active, created_at desc)` for `searchServices`.
- `conversations(client_id, status, updated_at desc)` and `conversations(provider_id, status, updated_at desc)` if inbox RPC plans show scans.
- Text-search indexes or RPC-backed `to_tsvector` search for job/service title, description, category, barangay, service needed, and tags if search needs to scale.

## Things Not to Change

- Do not redesign Home, Search, Messages, or detail screens as part of performance work.
- Preserve the Figma visual direction and current card hierarchy.
- Preserve verification gates for posting, messaging, saving if enabled, and reviews.
- Preserve the message-based hiring model and "Mark Hired" flow.
- Preserve "Services" user-facing language.
- Preserve the service-layer architecture; do not move Supabase queries into reusable UI components.
- Keep the inbox RPC improvement unless query plans prove it is harmful.
- Do not add advanced chat features such as attachments, read receipts, calls, push notifications, or group chat while fixing performance.
- Do not change Supabase schema/RLS without a migration and a specific implementation need.

## Open Questions or Unverified Areas

- Actual device timings were not measured. This audit is code-trace based.
- Supabase row counts and query plans were not available, so index recommendations are based on query patterns and need `EXPLAIN` verification.
- Supabase Realtime publication is now expected to include `public.messages` and `public.conversations` through migration `supabase/migrations/20260506110000_enable_messaging_realtime.sql`; remote dashboard settings were not manually inspected from this audit.
- No Expo manual test was run during this audit.
- Figma was not inspected because this task did not implement or redesign UI.
- The current working tree already had many modified/untracked files before this audit. Those changes were treated as existing work and were not reverted.

## Implementation Checklist

## Implementation Status

- Current phase: Post-Phase-4 stabilization
- Status: Awaiting manual device QA

- [x] Create audit report
- [x] Fix P0 messaging freshness, optimistic-send race, and preview-cache issues
- [x] P1 Issue 3 — Start-conversation preview cache behavior
- [x] P1 Issue 4 — Search debounce and active-mode fetching
- [ ] P1 Issue 5 — Partially implemented; deeper database optimization deferred
- [x] P1 Issue 6 — Home feed recomputation and virtualization
- [x] P1 Issue 7 — Profile polling consolidation
- [ ] Review P2 issues
- [x] Run typecheck/lint for Phase 1 messaging changes
- [x] Run typecheck/lint for Phase 2 Search/Home changes
- [x] Run typecheck/lint for Phase 3 list virtualization and skeleton changes
- [x] Run typecheck/lint for Phase 4 profile polling cleanup
- [ ] Manually test messaging
- [ ] Manually test conversation previews
- [ ] Manually test tab switching
- [x] Update this report after implementation

## Phase 1 Messaging Implementation Notes

- Conversation Detail now subscribes to `public.messages` inserts scoped to the current `conversation_id` and to `public.conversations` updates scoped to the current conversation id.
- Messages tab now subscribes while focused to `public.messages` inserts and `public.conversations` updates, then hydrates the affected conversation summary through the service layer.
- Conversation preview cache can now upsert a full conversation summary, not only update an existing conversation by latest message.
- Optimistic sends no longer emit failed/pending messages into confirmed preview state. Failed sends stay marked in the open thread and can be retried.
- The routine full-conversation refetch after send was removed. Realtime or the returned insert row reconciles the thread instead.

## Phase 2 Search and Home Implementation Notes

Implemented changes:

- Search text input now debounces network searches before calling Supabase.
- Search now fetches only the active mode: Jobs mode calls `searchJobs`, Services mode calls `searchServices`.
- Search keeps previous results visible while the active mode refreshes. Broad result-list skeletons are used only for the initial load of a mode.
- Search shows a lightweight "Updating results..." indicator during stale-while-revalidate refreshes.
- Job and service search calls now accept a bounded `limit`, with Search using 30 rows and Home using 30 rows per source.
- Job search moved obvious scalar text filtering into Supabase `ilike` filters for title, description, category, service needed, barangay, and location fields, while preserving client-side tag filtering on returned rows.
- Service search moved obvious scalar text filtering into Supabase `ilike` filters for title, description, category, availability, rate, barangay, and location fields, while preserving client-side tag filtering on returned rows.
- Home feed now precomputes Jobs, Services, and For you feed variants when source data or preferences change. Switching Home filters no longer reruns the main scoring/sorting work.
- Home feed scoring now decorates items with computed scores before sorting, avoiding repeated score recalculation inside the sort comparator.

Validation results:

- `npm.cmd run lint` passed.
- `npx.cmd tsc --noEmit` passed.
- No Expo/manual device test was run during this implementation pass.

Manual testing checklist:

- Type slowly and quickly in Search; confirm network refresh waits briefly and old results remain visible while updating.
- Switch Search between Find Jobs and Find Services; confirm only the active mode refreshes and the inactive mode keeps its cached results until opened.
- Select and clear popular service chips; confirm results update after debounce without full-list skeleton replacement when prior results exist.
- Switch Home between For you, Jobs, and Services; confirm tab switching feels instant and visual design/spacing is unchanged.
- Test long Home and Search result lists; confirm scrolling, bottom padding, empty states, and save/message verification gating still behave correctly.

Deferred items:

- Home and Search still used `ScrollView` at the end of Phase 2; this was resolved in Phase 3 with virtualized `FlatList` rendering.
- Advanced database indexes and query-plan verification remain recommendations only.
- Profile polling cleanup remains outside this phase.
- Pagination UI and infinite loading were not added; this phase only applies bounded initial query limits.

## Phase 3 List Virtualization and Skeleton Implementation Notes

Implemented changes:

- Home feed now renders through `FlatList` instead of mapping every feed item inside a `ScrollView`.
- Home keeps the existing animated top header, verification/setup banner, section header, feed cards, empty state, and bottom content padding.
- Home uses a stable `keyExtractor`, memoized `renderItem`, `ListHeaderComponent`, `ListFooterComponent`, and an item separator matching the previous 2px feed gap.
- Home initial feed skeletons now reserve the same 222px photo area used by photo-capable `HomeFeedCard` records to reduce layout shift when image cards load.
- Search results now render through `FlatList` instead of mapping every result inside a `ScrollView`.
- Search keeps the search module, popular service chips, sticky result header, existing empty state, verification helper text, and stale-while-refresh behavior.
- Search uses stable row keys and memoized row/header renderers for result rows, skeleton rows, refresh text, empty state, and helper text.
- Search job and worker skeletons were kept visually close to their final specialized card layouts, including header/icons, metadata rows, chips, and CTA area.
- Messages inbox and Conversation thread rendering were inspected but left unchanged in this pass because they carry more realtime, grouping, keyboard, and auto-scroll regression risk.

Validation results:

- `npm.cmd run lint` passed.
- `npx.cmd tsc --noEmit` passed.
- No Expo/manual device test was run during this implementation pass.

Manual testing checklist:

- Home initial loading skeleton matches final card layout closely, including photo-capable cards.
- Home For you / Jobs / Services switching still feels immediate.
- Home long feed scrolls smoothly.
- Search initial loading skeleton matches final result layout closely.
- Search refresh keeps old results visible and shows only the small updating indicator.
- Search Jobs/Services mode switching preserves layout and empty states.
- Bottom nav does not cover the last item.
- Small-screen layout still works on 360x800, 390x844, and 430x932.

Deferred items:

- Messages inbox virtualization remains deferred until it can be tested with message request grouping, cached previews, realtime inserts, and search/filter combinations.
- Conversation thread virtualization remains deferred because `ScrollView` currently owns keyboard resize behavior, scroll-to-bottom behavior, grouped bubble spacing, optimistic sends, and retry state.
- Infinite pagination remains out of scope for this phase.
- Skeleton animation sharing remains deferred; this pass only improves layout matching.

## Phase 4 Profile Polling and Background Query Cleanup Notes

Implemented changes:

- `useProfile` now reads from one shared `ProfileProvider` cache instead of every screen owning its own Supabase auth/profile lifecycle.
- The shared profile cache preserves the existing `useProfile()` API shape (`profile`, `loading`, `error`, `refresh`) and adds shared `authenticated`, `user`, and `version` fields for route-guard consumers.
- The shared profile cache owns one auth listener, one app-foreground refresh listener, one profile/provider-profile realtime subscription for the active user, explicit `refresh()`, and one 30-second fallback poll.
- The previous per-screen 5-second `useProfile` polling loop was removed.
- `useProfileStatus` now derives authenticated user/profile state from the shared profile cache, keeps only route-guard-specific `user_roles` and `user_preferences` queries, and subscribes to those two tables for routing updates.
- The previous root-level 2-second `useProfileStatus` polling loop was removed.
- `app/_layout.tsx` now mounts `ProfileProvider` once around the root navigator so tabs, detail screens, post flows, messaging, and the route guard share the same profile/session cache.
- Existing login/logout, onboarding, admin, verification, and main-app route guard logic was preserved in the root navigator.

Validation results:

- `npm.cmd run lint` passed.
- `npx.cmd tsc --noEmit` passed.
- No Expo/manual device test was run during this implementation pass.

Manual testing checklist:

- Fresh login redirects correctly.
- Logout returns to the auth screen.
- Onboarding incomplete user routes correctly.
- Verified user routes correctly.
- Verification status update appears after realtime/profile refresh/app foreground.
- Profile edit/update still appears in screens using profile data.
- Switching tabs no longer causes repeated profile polling from each mounted `useProfile` caller.
- App background/foreground refresh still works.

Deferred items:

- The shared fallback poll remains enabled at 30 seconds for environments where realtime events are unavailable or delayed.
- Route status still performs separate `user_roles` and `user_preferences` queries because those tables are route-guard-specific and not part of the public `useProfile` screen contract.
- Broader query consolidation for profile-adjacent screen data, such as profile jobs/services/reviews, remains outside this phase.

## Post-Phase-4 Stabilization Notes

Implemented changes:

- Fixed an onboarding routing regression where a newly onboarded user could briefly reach the completion screen, be routed back to the onboarding name step from stale route-guard state, and then later jump to the dashboard after the shared profile cache caught up.
- Onboarding profile save now explicitly refreshes the shared `ProfileProvider` cache after `profiles`, `user_preferences`, and role/profile-adjacent rows are written.
- `ProfileProvider.refresh()` now queues overlapping loads and lets callers await the active refresh instead of dropping refresh requests while an auth/profile load is already in flight.
- The onboarding completion CTA now waits for `useProfileStatus` to confirm that the user is authenticated and no longer needs role/profile setup before routing into tabs.

Validation results:

- `npm.cmd run lint` passed.
- `npx.cmd tsc --noEmit` passed.

Manual testing checklist:

- Create a brand-new account.
- Complete onboarding once.
- Confirm the app routes to the dashboard/main app without returning to the onboarding name step.
- Confirm the welcome/completion screen does not reappear after entering the app.
- Force-close and reopen the app; confirm the user remains in the correct app state.
- Logout and login again; confirm there is no onboarding loop.

Deferred items:

- No additional polling was added. Route status still depends on the shared profile cache plus route-specific `user_roles` and `user_preferences` queries.
- Manual device QA is still required to verify timing on real devices and slower networks.

## P1 Status Reconciliation

Implemented P1 work:

- Issue 3 — Start-conversation preview cache behavior: Implemented in Phase 1. Job Detail and Worker Profile emit returned conversation details into the preview cache before navigation.
- Issue 4 — Search debounce and active-mode fetching: Implemented in Phase 2. Search input is debounced, only the active mode fetches first, and stale results remain visible during refresh.
- Issue 6 — Home feed recomputation and virtualization: Implemented across Phases 2 and 3. Home precomputes feed variants, avoids repeated scoring during filter switches, and renders the feed through `FlatList`.
- Issue 7 — Profile polling consolidation: Implemented in Phase 4. Profile/session state is shared through one provider/cache, per-screen polling was removed, and the root status poll was removed.

Partially implemented P1 work:

- Issue 5 — Marketplace search overfetch reduction: Partially implemented in Phase 2. Home and Search now use bounded query limits, obvious scalar text filtering moved into Supabase `ilike` filters, and active-mode Search fetches reduce duplicate work. Some tag matching remains client-side.

Deferred P1 work:

- Issue 5 still needs deeper database-scaling work if production-sized row counts prove it necessary: list-ready RPCs/views, EXPLAIN/query-plan verification, database index work, and infinite pagination.
- These deferred parts are not blocking right now because the current implementation has bounded payloads, active-mode fetching, debounced Search, and virtualized list rendering. The remaining work should be driven by real row counts, query plans, or measured device/server profiling rather than done speculatively.

## Skeleton Strategy Improvement

Audit all skeleton/loading states and convert them to layout-matched skeletons where practical.

The preferred skeleton pattern is to reuse the real UI component structure and replace content fields with skeleton placeholders while data is loading.

Do not create separate skeleton layouts that approximate the UI manually unless necessary.

Goal:
- The skeleton should occupy the same space as the final UI.
- The skeleton should preserve the same spacing, card structure, image area, chip rows, metadata rows, and CTA area.
- Loading should not cause layout shift when real data arrives.
- If the final component has variants, the skeleton should support the same variants.

Examples:
- If `HomeFeedCard` can show an image, the skeleton should reserve the same image area when the expected item has an image.
- If `SearchWorkerResultCard` shows rating, location, availability, and service chips, the skeleton should show placeholders in those exact positions.
- If `Worker Profile` has header, match card, services/rate, details, and bottom CTA, the loading version should preserve that same layout.
- If `Job Details` has title, client info, budget, schedule, description, requirements, and CTA, the skeleton should preserve that same layout.

Recommended implementation pattern:
- Prefer `<Component isLoading />` over separate `<ComponentSkeleton />` when this keeps the layout more accurate.
- Use shared small primitives like `<SkeletonText />`, `<SkeletonAvatar />`, `<SkeletonChip />`, and `<SkeletonImage />`.
- Keep the same parent layout, spacing, border radius, and section dividers.
- Avoid full-screen skeleton replacement when stale existing data is available.
- Use skeleton only for initial loading. For refreshes, keep existing UI visible and show a small refresh/loading indicator.

Also document which skeletons should remain separate if the real component cannot safely render without data.

## Recommended Next Step

- Run end-to-end manual QA for the completed performance, Product UX, auth, and post-flow stabilization work before starting more optimization.
- Use `docs/stabilization-audit.md` as the current cross-area status source.
- Do not start database index, RPC, or view work unless real row counts, EXPLAIN output, or profiling show a need.
