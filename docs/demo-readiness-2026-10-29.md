# San Pedro field-demo readiness audit

Date: 2026-10-29, Asia/Manila. Intended use: prepared-account demonstrations and
residents registering on their own phones. Dedicated account authorized by the
user: `client@konektado.test`.

## Assessment

Resolve the offline startup bug and complete the demo account's required profile
before presenting the full posting/messaging workflow. The Android APK signs in,
loads Home, restores its online session, and opens the native calendar. The live
website still serves the unsupported native picker implementation.

This was an audit, not a release or data-repair pass. App source, production
configuration, profile fields, and verification state were not edited. No messages
were sent, posts published, verification requests submitted, or OTP emails/SMS sent.

## Confirmed findings

### P1 — Offline cold start routes a signed-in resident into onboarding

Reproduction on the existing standalone APK, Android 14 / Pixel 5 emulator:

1. Sign in with the dedicated client demo account and reach Home.
2. Restart online: Home returns with the same account, confirming saved-session restoration.
3. Enable airplane mode and disable Wi-Fi/mobile data; force-stop and reopen the APK.
4. Observe the empty `Your details` onboarding screen and a `Not signed in` dialog:
   `Please sign in again to continue.` The log records a Supabase DNS/network failure.

The account had already completed onboarding. This result misrepresents a connection
failure as account/setup failure. It does not establish that the stored session was deleted.
After restoring connectivity and force-stopping/reopening, the same signed-in Home
returned without re-entering credentials. Reconnecting alone left the modal visible
during the observed foreground recovery attempt. Restarting with a connection is a
tested short-term recovery step, not a correction to the routing bug.

Relevant code: `hooks/use-profile.ts:191` clears profile/preferences on a profile
fetch error. `hooks/use-profile-status.ts:322` derives incomplete onboarding from
the resulting absent data. `app/(onboarding)/onboarding-context.tsx:49` labels a
draft-load failure as `Not signed in`.

Recommended correction: distinguish unavailable profile data from a confirmed
missing/incomplete profile. Retain known profile state on transient refresh failure;
show a recoverable connection/retry state on a cold start whose account data cannot
be loaded. Do not route an existing session into onboarding solely because a read failed.
Recheck online restart, offline cold start, warm connection loss, and reconnection.

Evidence: `.test-build/demo-audit/offline.png` and `offline.xml`.

### P1 — The supplied verified demo account is not ready to post/message

Read-only authenticated checks confirm:

- Identity verification and onboarding are complete.
- `is_marketplace_ready(user_id, 'client')` returns `false`.
- Required `profiles.street` and `client_profiles.coordination_style` are empty.
- Hiring introduction, needed services, contact preference, and schedule are present.
- The APK Home screen displays `Finish your Core Profile` / `Continue setup`.

This is demo-data readiness, not a request to weaken permission checks. Posting
and messaging code uses `requireVerifiedCompleteProfile`; verification by itself
does not unlock these actions. A job editor can open even when final publishing
is not yet permitted.

Before the visit, complete Core Profile and Hiring Profile through the app with
the intended demo values, then confirm the server readiness check is true. Rehearse
the client/provider interaction with a prepared worker account as well. Its complete
end-to-end send/hire state was not tested in this pass.

Evidence: `.test-build/demo-audit/home.png`; live readiness RPC and own-profile
field-presence checks. No profile field values were changed by the audit.

### P2 — The deployed web bundle still contains the unsupported picker

`https://konektado.app` and its referenced JS bundle returned HTTP 200. The downloaded
live bundle contains `DateTimePicker is not supported` and lacks the new web picker
implementation markers. The prior web fixes are present in the workspace; deployment
was explicitly excluded from the APK task.

Deploy and retest the web fallback before using browser signup/verification or job
scheduling during the visit. Native calendar opening/cancellation was tested in the APK.

## Checks completed

- Lint and TypeScript check passed.
- All 196 compiled unit tests passed across 42 suites.
- All nine actual-handler verification-email authorization checks passed with
  mocked external boundaries; these do not send mail or certify live delivery.
- The dedicated demo account signs in successfully against the live backend.
- Its own profile, role/preferences, hiring-profile, inbox/message, and notification
  reads succeeded. Duplicate-email signup protection returned `exists: true`.
- Live authenticated browse counts: 21 open jobs and 34 active services.
- The public approved-credentials RPC resolved successfully.
- The APK installed and reached authenticated Home on Android 14. An online cold
  restart restored the session without another login.
- The job editor opened and its native date picker opened and dismissed without
  selecting a value. No listing fields were intentionally edited or published.
- No Android runtime crash was observed. The offline scenario produced a network
  error and the misrouting described above.

## Registration and field checks still required

The user confirmed successful signup-code delivery to a normal non-team email
address. That is user-provided delivery evidence, not an email sent by this audit.
Public Auth settings show email and phone providers enabled, with email confirmation
required. They do not reveal SMTP transport or current hourly email-send capacity.
The APK's phone-auth feature flag remains the earlier build's email-only setting;
do not infer that enabling the backend phone provider changes an existing APK.

Rehearse these on the actual field phones before leaving:

- A fresh resident signup through email code, password, onboarding, and viewer mode.
- More than one new signup if the visit will onboard a group; measure actual
  delivery time and send limits without repeatedly resending codes.
- Verification SMS/contact-code delivery, document upload, and admin review.
  Barangay verification is manual; a fresh account should not be promised immediate
  permission to post or message.
- Camera/gallery permission denial and retry, a photo upload on mobile data, and
  keyboard visibility on the smallest phone.
- Client/worker messaging and the intended hiring demonstration, using dedicated
  prepared accounts and agreed test content.
- Install the APK ahead of time. The existing universal APK is approximately
  139 MB; do not depend on downloading it repeatedly while moving around the barangay.

Supabase's default email provider, if used, limits delivery to team members and
two emails per hour. This is a conditional provider limitation, not a finding that
this project's current delivery is broken; the user's non-team delivery test succeeded.
See [Auth SMTP](https://supabase.com/docs/guides/auth/auth-smtp) and
[Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).

## Boundaries

No physical handset or live signup/OTP delivery test was performed by the agent.
This audit does not certify SMS delivery, upload success, notification delivery,
two-party realtime messaging, or admin review end to end. The emulator uses a
temporary read-only/no-snapshot session; its connectivity is restored and it is
shut down after testing. Existing app changes from the APK task remain uncommitted
and were preserved.
