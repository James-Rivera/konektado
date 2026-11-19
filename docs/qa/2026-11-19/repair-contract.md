# QA repair contract — 19 November 2026

The user approved confirming and repairing the QA findings on 19 November 2026, with multiple agents. **QA-012 (reconciling conflicting older instructions) is explicitly deferred.** This document records only the repaired behavior and its release requirements; it does not silently settle the older navigation, phone-proof or Figma conflicts.

## Complaint creation, privacy and outcomes

- New resident reports start `open`, without reviewer identity, review time, internal notes or an outcome. Database grants and an INSERT guard enforce this independently of the screen.
- Reports against reviews, conversations and listings use their actual context/counterparty. Conflicting targets cannot accuse an unrelated resident. Review reporting requires barangay verification. Other existing report entry points retain their authenticated-reporting scope.
- Reporters can read their own safe report status and `resolution_message`. `admin_notes`, reviewer identity and private decision history are available only through authorized admin paths. Normal app access cannot directly PATCH report decisions.
- Admin queues filter on the server and paginate with complete queue counts. Received preserves its prior meaning: `open` with no `reviewed_at`. Older unresolved complaints must remain accessible beyond the first page.
- Admin investigation can inspect the full complaint and relevant subject, including listing or profile text, a reported review, or the latest 50 messages of a participant-reported conversation. Authorized staff can also open the reported conversation in the existing read-only view and inspect its attachments. Unrelated private conversations remain inaccessible.
- Admins record internal investigation notes separately from a reporter-facing outcome. Resolving/dismissing requires a safe outcome message. Database RPCs derive reviewer identity/time and append a private decision record.
- Only the reporter-facing outcome enters report-status notifications. The notification screen allows the complete message to wrap rather than truncating it to three lines. Staff must keep confidential evidence and personal information out of that public-to-reporter field.
- The internal demo editor links to canonical report investigation; its report service wrapper also uses the protected decision service. It cannot bypass the outcome/privacy rules through an old status-only write.

## Reviews

- Public review cards provide a verification-gated Report action. The database derives the immutable review author/job context rather than trusting supplied target identities.
- Authorized staff can hide or restore a specifically reported review, with an internal rationale and retained decision history. This does not delete/edit the original review or change the completed hiring relationship.
- Hidden reviews are excluded from public review text, average ratings and review counts. Restored reviews re-enter those summaries. Completed-job history remains distinct from review visibility.
- A submitted review remains immutable and once-only even when moderated. Reporting a negative review does not itself hide it; an authorized staff decision is required.
- Reviews remain attributed. No anonymity, delayed publication or automatic dispute arbitration was added.

## Conversation and lifecycle repairs

- Realtime thread refresh uses actual listing details. An inbox's abbreviated placeholders must not replace complete job/service context. Failed refresh preserves loaded context and offers Retry.
- Saving a conversation complaint does not mutate conversation hiring state. Accepted complaint creation produces success rather than a second prohibited status write and false retry prompt.
- Review eligibility refreshes after completion and navigation focus. Job-status/account keys and stale-response protection prevent older results from retaining the pre-completion disabled state.
- Owners see only supported job lifecycle actions. In-progress jobs do not offer direct Deactivate/Close or another hire. Backend hiring/completion protections remain unchanged. Post-hire cancellation/rematching was not added.

## Moderation and responsive forms

- A failed public-photo visibility lookup is different from a successful lookup with no restriction. On failure, only images are withheld for that load; listing/profile text remains available. The next successful load can restore allowed images.
- Report reasons/details scroll independently of reachable Submit/Cancel actions. Keyboard handling is opt-in for the affected sheets, preserving other existing sheet behavior. Long complaint evidence/admin fields are scrollable.
- Source/browser verification is separate from Android keyboard, Back, TalkBack, font scaling and physical safe-area acceptance.

## Migration and release contract

The three previously hosted-only migrations were restored from their stored statement arrays with their original versions/names:

1. `20261118054147_contain_photo_visibility_writes.sql`
2. `20261118054152_scope_conversation_moderation.sql`
3. `20261118054156_restrict_function_permissions.sql`

They are historical recovery files, not new changes to reapply to the existing hosted project. Clean local replay now includes that previously missing history.

The additive corrective migration is `20261118235200_secure_report_review_moderation.sql` (generated by the CLI; its UTC filename date differs from the Manila execution date). **It was applied only to isolated local test databases.** The final user-approved read-only comparison confirmed 46 local files, all 45 hosted version/name pairs present locally, matching recovered statement contents, and this corrective migration as the sole pending version. No remote migration, commit, push, build or deployment was performed for these repairs.

Release the reviewed client and migration together through the normal backup/preflight process. The old client asks for private report columns and performs direct report updates; those calls intentionally fail after the privacy correction. Conversely, the repaired client requires the new columns/RPCs. Applying only one side would break parts of complaint handling. Do not reset data, rewrite historical migration versions or deploy an unreviewed working tree.

See the repair record and patch notes for verification, remaining device checks, and the migration comparison. [Repair record](repair-verification.md) · [Patch notes](patch-notes.md)
