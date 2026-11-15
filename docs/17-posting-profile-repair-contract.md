> Follow-up authority: [DEC-141](18-posting-recovery-and-schedules.md) supersedes the initial slider, schedule storage, and ephemeral edit-review rules below.

# Posting and profile repair contract (2026-11-13)

The user authorized implementation and regression tests for A01–A24 after reviewing the audits. This contract supersedes conflicting older descriptions in the flow/profile documentation for this repair.

- Both price editors use one price-basis picker, a range slider, live feedback, and exact peso/centavo input. Equal bounds are a fixed price. The slider starts with a 1,000-peso visual scale and consistent 50-peso steps. Exact entry preserves centavos and larger amounts; moving one thumb preserves the other thumb’s exact value. No arbitrary price is saved merely from displaying the slider. Negotiable means the displayed estimate may change by mutual agreement; there are no in-app payments.
- Profiles need one public introduction per role, selected services, area/availability for Work and coordination/schedule for Hiring. Legacy headline/bio values remain readable. Verification and shared identity requirements remain enforced. Photos and credentials stay optional.
- An explicit role-profile save makes its service selections authoritative, including deliberate removal of every selection. Onboarding values remain defaults until that save, not permanent unions. Private discovery preferences remain separate.
- Partial saves report saved progress; readiness comes from actual fields and verification. Essential query failures do not become empty editable profiles. Unsaved changes require a discard decision, and saving one section preserves other edits.
- New jobs hire one provider. Existing multi-worker descriptions are not silently rewritten; multi-worker hiring remains out of scope. Hide unsupported auto-reply/auto-close/auto-pause controls. Private address instructions remain owner/admin-only and are coordinated through Messages.
- Drafts start after resident edits. Review routes carry a durable private draft ID and exact reviewed revision, never serialized content. Existing listing edits use private drafts and an atomic source-version check. Publishing consumes the owned draft atomically and records a durable idempotency identity. Migrations must be applied before using the updated publishing/profile services.
- Preview includes full descriptions, price notes, units, dates/availability and location visibility. Existing listing edits use the same explicit review/save pattern.
- Publishing accepts the date/time picker’s canonical dated schedule, validates the calendar date and rejects past days using Asia/Manila. Existing legacy listings are not rewritten; correction may be required on edit/reactivation.
- Service search uses deterministic canonical/alias matching on both roles. Numeric range and unit filters apply before pagination. Existing backend ownership, verification, public-profile privacy, and hiring/review checks stay strict.
- Source changes and regression checks do not constitute deployment or native-device production sign-off. Apply migrations and validate web/Android artifacts separately; do not start Expo automatically.
