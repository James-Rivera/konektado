# User Flows

## Authentication Flow

1. User opens Konektado.
2. App checks Supabase session.
3. If no session exists, show login/register screens.
4. User registers by entering an email, verifying the email OTP code, and creating a password, or logs in with email/password.
5. App creates or loads the user's `profiles` row.
6. If no role exists, route to role selection (2 options: Provider or Client).
7. App collects only the minimum onboarding details needed to orient the user.
8. User reviews the lightweight onboarding details and completes onboarding.
9. User enters Home as an unverified viewer if barangay verification is not complete.
10. Verified users must complete the relevant public role profile before posting or messaging.

Forgot password flow:

1. User taps Forgot Password from Log In or from the duplicate-account signup alert.
2. App asks for the account email and requests Supabase password recovery.
3. User enters the 6-digit recovery code from the Supabase Password Recovery email.
4. App verifies the code with Supabase recovery OTP, which creates a temporary recovery session.
5. User creates and confirms a new password.
6. App saves the new password, signs out the temporary session, and returns the user to Log In with their email prefilled.

Failure states:

- Invalid login shows a simple error.
- Network errors show retry.
- Missing profile row triggers profile creation or onboarding.
- Invalid or expired recovery code clears the code and lets the user request a new one.

## Lightweight Onboarding / Viewer Entry Flow

1. User registers with email OTP plus password, or logs in with email/password.
2. User selects intended role: find work or hire someone (2 options only).
3. App collects basic profile identity.
4. App collects current area as a separate selector step: fixed supported area `Brgy. San Pedro, Santo Tomas, Batangas`.
5. App collects specific address details separately: public street/road or subdivision/area, and optional private block/lot, house number/building name, and landmark/note.
6. App collects lightweight taste setup data: offered services for workers or needed services for clients (not both). Provider and client service setup both use one clean screen with selector rows for setup, categories, services, and optional custom text; detailed choices happen in bottom sheets. Provider work setup is stored separately. Client help setup only filters the temporary selection UI and does not store a separate needed delivery mode.
7. App shows review.
8. App saves onboarding and shows complete.
9. App lets the user enter Home in viewer mode.
10. Viewer can browse jobs, workers, service posts, and educational prompts.
11. Viewer sees locked actions for posting, messaging, saving, reviewing, and creating public service posts.
12. When the viewer taps a locked action, app shows a verification prompt or routes to verification.

Rules:

- Do not overload first-time onboarding with all profile, ID, credential, and service details.
- Do not collect certificates, ID documents, selfie/photo uploads, or verification files during first onboarding.
- First onboarding is complete when `user_preferences.onboarding_completed_at` is set and the profile has basic identity: first name, last name or full name, city, and barangay.
- Exact address fields are collected for verification/admin review or private coordination. Public surfaces show only approximate location such as `Brgy. San Pedro, Santo Tomas`, street/road plus barangay, or subdivision/area plus barangay. House number, block/lot, landmark/address notes, private contact data, and verification document URLs are never shown publicly.
- The first entry experience should help users understand Konektado quickly.
- Service preference choices personalize browsing; they are not verification proof.
- Provider work setup is stored separately as `on_site`, `online`, or `both`. Official service choices stay in taxonomy service arrays, while custom service text stays in custom service arrays for admin review.
- Viewer mode is read-only for user-to-user marketplace interactions.
- Viewer mode still requires a lightweight authenticated account; it is not anonymous public browsing.
- Provider intent opens Home on Jobs, client intent opens Home on Workers.
- Users can add a second profile (Work Profile or Hiring Profile) later from Profile tab without re-entering full onboarding.

## Barangay Verification Flow

1. Unverified user starts verification from a locked action, profile prompt, or verification page.
2. App shows the Figma verification intro explaining what verification unlocks.
3. App shows the Figma "Before you continue" requirements: valid ID, clear face photo, and good lighting.
4. App shows account details with onboarding/profile data prefilled.
5. User confirms or edits first name, last name, date of birth, and contact number so they match the document.
6. App shows the contact-code UI from Figma for contact confirmation. MVP does not add SMS OTP; this is a visual/contact-confirmation step until provider-backed OTP is added.
7. User selects ID type: Barangay Certificate, National ID, Driver's License, or Passport.
8. If Barangay Certificate is selected, user uploads the certificate. Otherwise, user uploads ID front and ID back. Camera capture can be added as a verification-polish task, but file/image picker upload is the current MVP path.
9. App shows face-photo guidance, then user uploads a clear face photo for manual barangay comparison. Camera selfie capture is planned but should not block the verified Post slice.
10. App shows the Figma review and submit screen so the user can check personal details, ID type, uploaded files, face photo, and barangay before submission.
11. App uploads selected files to Supabase Storage, creates a pending row in the current live `verifications` table, and links metadata in `verification_files`.
12. Face photo currently uses `file_type = other` because the live table only accepts the initial file-type values.
13. User sees a pending verification state and remains in viewer mode.
14. Barangay admin reviews the request in the verification dashboard, including profile snapshot, notes, and attached files.
15. If approved, app sets verification status to `approved`, records reviewer metadata, and sets `barangay_verified_at` and `verified_at` on the profile.
16. If rejected, app stores the admin reason and lets the user resubmit a corrected request.

Verification unlocks:

- Eligibility to complete the final interaction gate for posting jobs.
- Eligibility to complete the final interaction gate for creating public service posts.
- Eligibility to complete the final interaction gate for messaging about jobs or services.
- Eligibility to complete the final interaction gate for messaging other users.
- Leaving reviews after completed jobs.

Verification proves identity. Public profile completion gives other residents enough context before interaction.

Contact details rules:

- Do not make the user retype fields already captured during onboarding.
- First name and last name should be prefilled but editable.
- The name fields should clearly say they must match the uploaded ID.
- Email is required for MVP login and can be reused for verification follow-up, but the verification screen must include a short privacy explanation.
- Email should not be displayed on public profiles, job cards, service cards, or worker cards.
- SMS/mobile OTP is not required for MVP. Add it only when an SMS provider and Android/device testing path are available.

## Public Profile Completion Flow

1. Verified user opens Profile and sees a trust checklist for Core Profile, Work Profile, and Hiring Profile.
2. Core Profile collects public name, preferred contact method, approximate location, private block/lot or house-number details, short intro, and availability.
3. Work Profile collects worker-facing headline, bio, taxonomy services, custom "Others / Specify" text, service area, availability, rate range, and optional rate note.
4. Hiring Profile collects client-facing headline, bio, taxonomy services needed, custom "Others / Specify" text, preferred schedule, and optional budget preference.
5. App saves role-profile rows without changing the user's active role.
6. When a verified user tries to publish or message without the relevant role profile, the app routes them to `/profile/complete`.

Rules:

- Keep first onboarding lightweight; do not force full Work/Hiring completion before Home.
- Barangay verification and public profile completion are separate trust layers.
- A verified user with missing Work/Hiring setup stays visibly verified but sees `Verified · Setup incomplete`; they may browse public content but cannot message, hire, apply/post, or review until setup is complete.
- Verification selfie, ID files, certificate files, and admin notes are private and must never become public profile photos or profile content.
- A public profile photo is strongly recommended for recognition and trust, but remains optional and must not block completion or marketplace access.
- Publishing jobs and messaging workers require a completed Hiring Profile.
- Publishing services and messaging clients about jobs require a completed Work Profile.

## Service Profile Creation Flow

1. Provider opens Work Profile, Post, or provider setup.
2. Provider selects work type/service group/specific service from the controlled taxonomy, or uses "Others / Specify" stored as separate custom text for admin review.
3. Provider adds service title, description, availability, experience level, optional certification metadata, and rate range or negotiable rate text.
4. Provider may attach credentials related to the service.
5. App validates required fields.
6. App checks barangay verification and completed Work Profile.
7. `ServiceProfileService.createService` saves the service.
8. Service appears on provider public profile, Home feed, and search results if active.

Rules:

- A provider can have multiple services.
- A service belongs to one provider.
- Inactive services are hidden from public search.
- Admin verification belongs to the user/profile, while credentials can support a service.
- Service posting is blocked until the provider has a completed Work Profile.

## Job Posting Flow

1. Client opens Post.
2. Client taps Create a post and chooses "I need help" from the Figma post-type sheet.
3. Client chooses a Job Category and then a category-specific Service Needed, enters title, description, public approximate location, optional private location notes, optional context tags, budget minimum/maximum or negotiable rate, rate type, workers needed, preferred schedule, experience level, certification requirement, and listing options.
4. App validates Job Category, Service Needed, title, description, public location, numeric optional fields, and `budget_min <= budget_max`.
5. App saves a private `job_drafts` row before showing Preview.
6. App shows the Figma Preview screen with safety reminders.
7. If the client is not barangay-verified and taps Publish, the app shows the Figma barangay verification gate with Start Verification and Keep Editing Draft actions.
8. If the client is barangay-verified but missing Hiring Profile details, the app routes to `/profile/complete?mode=hiring`.
9. If the client is barangay-verified and Hiring Profile complete, `JobService.createJob` saves the job with status `open` and deletes the draft.
10. Job appears in Home, job search, post dashboard, active posts, and provider browsing.
11. Client can open the created job detail after publishing.

Rules:

- This is the next vertical implementation slice after verification completion.
- Unverified users can create and edit private drafts, but they cannot publish public jobs.
- Unverified users are routed to verification only when they try to publish or choose Start Verification from the gate.
- Approved users must be able to create a real job without relogging if profile refresh has received the approval state.
- Approved users must complete Hiring Profile before publishing public jobs.
- Payments and job agreements happen outside the app.
- Jobs should be clear enough for providers to decide whether to message.
- Closed or cancelled jobs should not accept new interested workers.
- Service-post builder and preview designs are reference-only for the verified job posting slice.
- Job photos can be selected, uploaded to storage, and shown in preview and job detail. Renewal rules, auto-reply behavior, ranking, hiring, reviews, and advanced search remain out of this slice.
- Post UI should avoid Apply/Application wording; workers show interest through Messages.
- Service Needed is structured data saved separately from category. Tags remain short context/condition descriptors, not service names.
- Public job cards/details must not show house number, block/lot, private location notes, ID files, private contact data, or sensitive verification details.
- A user's own jobs are hidden from general Home/Search/browsing, but remain visible in My Posts, Manage Posts, and Profile activity.

## Job Interest and Messaging Flow

1. Provider browses open jobs.
2. Provider opens a job or taps Message.
3. App checks barangay verification.
4. App checks completed Work Profile.
5. App checks that the provider is not messaging their own job.
6. `ConversationService.startJobConversation` creates or reuses a job-related conversation.
7. Provider sends the first message or uses a suggested quick message.
8. Client sees the worker in Messages as an interested worker.
9. Client can reply, view the worker profile, mark hired, decline through a menu, or report.
10. Provider sees the conversation and job context in Messages.

Rules:

- A provider should have only one active job conversation per job.
- A provider cannot show interest in their own job.
- Conversations cannot be started for closed or cancelled jobs.
- Providers must complete Work Profile before messaging clients about jobs.
- Clients must complete Hiring Profile before messaging workers about service posts.
- "Apply" should not be used in the UI for the MVP unless a formal application feature is added later.

## Message-Based Hiring Flow

1. Client receives one or more interested workers in Messages.
2. Client opens the job conversation.
3. Client can use quick prompts to confirm time, location, payment, and what to bring.
4. Client taps Mark Hired when a worker is chosen.
5. App checks that the client has completed Hiring Profile setup, then updates the job or conversation with hired worker status.
6. Job History shows the job as active, worker hired, in progress, or completed.
7. After completion, both sides can leave feedback if the review flow is enabled.

## Admin Verification Flow

1. Barangay admin logs in.
2. Admin is routed to the verification dashboard instead of resident onboarding or normal Home.
3. Admin views pending, reviewed, or all requests sorted by creation date.
4. Admin opens a request and reviews profile details, uploaded ID files, face photo/work proof if present, and notes. Image files can be previewed in app; non-image files can open externally.
5. Admin approves or rejects. A rejection requires a reviewer note.
6. App updates the current MVP `verifications.status`, reviewer fields, and timestamps.
7. On approval, app updates the user's profile verification timestamps and public verification badge state.
8. On rejection, the provider can see the reason and submit again.

Admin safety rules:

- Admin actions must be logged with reviewer ID and timestamp.
- Admins should only access documents for valid verification or moderation work.
- Admin UI should not expose passwords or Supabase Auth internals.
- The MVP implementation continues to use `verifications` and `verification_files.verification_id`; renaming to `verification_requests` is deferred until after the demo-critical flow is stable.
- Barangay/admin is the current handler for profile verification, uploaded credential review, custom "Others" service review, and reported marketplace content where report infrastructure exists. Direct barangay/LGU system integration remains future scope.

## Ratings/Review Flow

1. Job reaches completed or closed state.
2. Client can review the accepted provider.
3. Provider may also review the client if MVP time allows.
4. Reviewer selects a rating from 1 to 5.
5. Reviewer adds optional feedback text.
6. `ReviewService.createReview` saves the review.
7. Profile rating summary updates from review data.
8. Admin can review reported or abusive feedback.

Rules:

- Reviews require a real job relationship.
- One reviewer can review the same reviewee for the same job only once.
- Reviews should not expose private contact or ID document information.
- Review comments are shown only as controlled completed-interaction feedback. Do not add open public comment threads to job/service posts.
