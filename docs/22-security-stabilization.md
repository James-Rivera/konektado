# Security stabilization (2026-11-18)

This is a prepared implementation and local validation record. None of these migrations has been applied to the hosted project as part of this work. Pushes, remote migration application, builds and deployment require separate approval.

## Scope and order

1. `20261118054147_contain_photo_visibility_writes.sql`: remove effective anonymous/resident table and column write privileges on the public visibility view. Retain the six-column legacy SELECT contract so installed clients continue receiving hidden-photo markers. Abort on residual inherited write access rather than accept partial containment.
2. `20261118054152_scope_conversation_moderation.sql`: make the ordinary inbox participant-only; restrict admin conversation, message, read-marker and attachment reads to a conversation reported by a real participant. Residents cannot file a report against an unrelated conversation. Protected-role authorization is enforced in the database; route parameters do not grant access.
3. `20261118054156_restrict_function_permissions.sql`: revoke unnecessary PUBLIC/direct anonymous execution on eight signed-in/admin RPCs, remove direct client execution on eight trigger functions, pin two invoker helper search paths, and narrow postgres-created function defaults. Preserve intentional public summaries, RLS helper calls, authenticated admin use and server-only OTP operations.

Client changes suppress photos when moderation lookup fails or returns malformed data, but retain textual content. A successful lookup with no moderation record still means the photo is not hidden. Failure feedback tells the resident to refresh; the existing reload path performs a fresh lookup. Repeated notifications are throttled. Admin report cards open the reported conversation in a read-only moderation view; participants, including admin participants, retain their normal conversation workflow.

## Verification

The complete 45-migration history replayed successfully on a new isolated loopback PostgreSQL 18 cluster. The runner `node scripts/test-posting-database.cjs` executes the existing security, posting/profile and durable-edit SQL fixtures plus:

- `supabase/tests/photo-visibility.sql`: anonymous/resident writes denied; hidden markers remain readable; intended admin moderation still works.
- `supabase/tests/conversation-privacy.sql`: participant inbox; reported versus unreported admin access; invalid historical report exclusion; report insertion authorization; read-only moderation; attachment object policies.
- `supabase/tests/function-permissions.sql`: effective grants and PUBLIC inheritance; guarded operations; forged role metadata; public summaries; new function defaults; timestamp, notification and archive triggers; OTP isolation.

All 34 canonical services also passed the SQL publication contract. Concurrent publication and concurrent edit still produce exactly one consistent result. The local platform fixture models Supabase's explicit function grants so revoking only PUBLIC would not pass the tests. Test assertion helpers receive explicit execution grants after default hardening.

The test database and fresh cluster are retained under ignored local test artifacts, with the cluster stopped after the rehearsal. No hosted data, Auth users or Storage objects were changed. Runtime service tests replace only external I/O; component handler tests do not certify native rendering.

## Release checks still required

- Take and verify a fresh private backup before approved remote application; the November 15 backup is historical, not a replacement for current recovery data.
- Review a linked CLI dry-run against the committed files. Apply only the three files above, in order, after explicit approval. Inspect the exact target and migration history first.
- Recheck effective table/column/function privileges, RLS and hosted security advisors afterward. No advisor-clean claim is made by the local rehearsal.
- Confirm old clients can still read hidden-photo markers, admin Hide/Clear works, and photo lookup failure shows placeholders with refresh feedback.
- Check real Data API denial and authorized success using isolated test accounts, without attempting unauthorized mutations of actual residents' records.
- Validate report drilldown, read-only moderator behavior, signed attachment access and Realtime delivery. Local object-policy SQL does not certify the hosted Storage or Realtime services. Already issued signed URLs remain usable until expiry; this does not revoke existing URLs.
- Complete browser/responsive acceptance, then the separately approved Android build/device matrix. No Expo server or application build was started for this work.

## Compatibility and remaining accepted scope

- The public visibility reader intentionally retains owner-based SELECT for old-client compatibility. Its security-definer-view advisor may remain; write permissions are contained. Replacing the read contract is a separate expand/contract change, not a reason to grant residents base-table admin metadata.
- Managed `supabase_admin` creation defaults are unchanged. The migration hardens the application's postgres migration role and the listed existing functions; future functions must explicitly declare intended callers.
- The contact OTP fallback remains as accepted in DEC-134. Leaked-password protection remains deferred for the Free-plan capstone. Neither was silently changed.
- Sequential onboarding save recovery is a separate concern; these fixes do not make that multi-table save atomic.

## Rollback

Keep the checkpoint and each focused commit for review. Before database application, local changes can be undone through a normal follow-up commit. After application, retain the committed migration history and effective security restrictions. A client rollback must preserve compatible visibility reads and must not undo photo failure handling without assessing that regression.

Prefer a narrow forward repair if a permission is missing: restore only a demonstrated required grant or safe read contract, with positive/negative role tests. Never restore public view writes, broad anonymous RPC access, unrestricted admin inbox reads or permissive OTP policies. Do not drop data, reset the database, rewrite history or force-push as a rollback shortcut.
