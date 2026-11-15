# Posting recovery and structured schedules (DEC-141)

The user approved all six follow-up repairs on 2026-11-15. This supersedes DEC-140's ephemeral edit previews, text-parsed schedules, and variable slider increments.

- Editing creates or resumes one owner-private draft per listing. Autosave never changes the public listing. Review uses the durable draft ID and exact revision; Save atomically updates the listing only if its source version still matches. A failed save retains the draft; retries of a committed save return the same result. Conflicts never overwrite another session silently.
- Saved edits survive reopening and refresh. Unsaved or failed saves require a leave/discard decision. Discard reverts local changes to the last saved draft, without deleting published content. Existing verification and ownership rules remain unchanged.
- Errors have tappable field links, inline accessible descriptions, and focus/scroll navigation. Opening a picker from an error uses the same control and preserves all other entries.
- Jobs store date, time preference, optional exact time, flexibility and Asia/Manila timezone as structured fields. Readable summaries are presentation only. Only unambiguous historical summaries are backfilled. Invalid or undated legacy data stays intact and gets a clear correction list before edit/reactivation; existing content is never guessed or silently removed.
- Slider dragging uses predictable 50-peso increments. Exact entry preserves centavos and amounts above the scale. An untouched thumb's exact amount remains unchanged. Start with a 1,000-peso scale; expand after exact-entry confirmation, not during a drag. Existing values determine a suitable initial scale.
- Test actual editor/review/recovery/error journeys at 360×800, 390×844 and 430×932, plus the available native surfaces. Record any unavailable phone keyboard/TalkBack/VoiceOver checks explicitly; do not claim them from browser tests. Do not start Expo automatically or deploy implicitly.

Implementation and verification: [2026-11-15 follow-up report](posting-followup-implementation-2026-11-15.md).
