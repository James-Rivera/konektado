# Marketplace Workflow Audit - 2026-06-14

## Scope

This audit covered conversation creation, unread state, archive behavior, participant identity, published job editing, and saved posts.

## Root Causes And Fixes

### Duplicate-looking conversations

- The database already had the correct context uniqueness rules, but the client used select-then-insert without recovering from a concurrent unique conflict.
- Legacy duplicate rows could also make `.maybeSingle()` fail.
- Conversation creation now selects the oldest canonical context row and refetches it after a `23505` race.
- Migration `20260614120000_marketplace_identity_inbox_saved_posts.sql` merges legacy duplicate rows, moves messages/read markers/reports to the canonical conversation, and reasserts both unique indexes.

### Unread state did not clear reliably

- Thread open called the read RPC but did not update the Messages preview cache.
- Realtime preview hydration used `getConversationSummary`, whose fallback summary always reported `unreadCount: 0`; this could also erase valid incoming unread state.
- Conversation summary now comes from the inbox RPC, read events set cached unread state to zero immediately, and Messages listens for participant read-row changes.

### Archive affected both participants

- The previous action set shared `conversations.status = 'archived'`, and the inbox RPC filtered that shared status.
- `conversation_reads.archived_at` now stores archive state per participant.
- Archive copy explicitly states that only the current inbox is affected.
- New message activity clears participant archive state and restores the thread.

### Conversation identity drift

- Inbox RPC fields and thread/profile screens used different profile read paths.
- Conversation Details generated initials from the listing title instead of the other participant and did not render the profile avatar.
- Inbox summaries now rehydrate both participants through `loadPublicProfiles`.
- Details uses the same counterparty record for full name, avatar, fallback initials, profile route, and presence.

### Published job editing

- The requested edit workflow was already implemented.
- Owner job detail and Post Dashboard expose Edit before lifecycle actions.
- Existing jobs load into the builder, preview calls `updateJob`, and the service preserves `open`, `reviewing`, or deactivated (`cancelled`) status.
- Completed, closed, and in-progress jobs remain blocked from editing.

### Saved posts

- The old contract saved `provider` IDs, so different services from one provider collapsed into one bookmark.
- Saved state existed on discovery cards but had no dedicated destination and was updated only after the server response.
- Saves now target `job` or `service` post IDs, use optimistic rollback, appear on detail screens, and are listed in `/saved` with All/Jobs/Services filters and unavailable-post handling.
- RLS remains owner-private and verified-user insert gating remains intact.

## Verification Targets

- Same job/provider or service/client/provider context returns one conversation.
- Opening a thread clears only the current participant's unread state.
- Archiving removes the thread only from the current participant's inbox.
- Counterparty identity matches Messages, thread, Details, and public profile.
- Editing an allowed published job preserves its lifecycle status.
- Saves persist after refresh, remain private, and distinguish separate services from one provider.
