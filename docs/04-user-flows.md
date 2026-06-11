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
5. App collects specific address details separately for profile completion, admin review, and private coordination; public resident/profile summaries show only a safe approximate location label.
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
- Exact address fields are collected for verification/admin review or private coordination. Public resident/profile summaries show only a safe approximate label such as `Brgy. San Pedro, Santo Tomas`. Raw street/road, subdivision/area, purok/sitio, house number, block/lot, landmark/address notes, private contact data, and verification document URLs are never shown publicly through profile summaries.
- The first entry experience should help users understand Konektado quickly.
- Service preference choices personalize browsing; they are not verification proof.
- Provider work setup is stored separately as `on_site`, `online`, or `both`. Official service choices stay in taxonomy service arrays, while custom service text stays in custom service arrays for admin review.
- Viewer mode is read-only for user-to-user marketplace interactions.
- Viewer mode still requires a lightweight authenticated account; it is not anonymous public browsing.
- Provider intent opens Home on Jobs, client intent opens Home on Services.
- Users can add a second profile (Work Profile or Hiring Profile) later from Profile tab without re-entering full onboarding.

## Home Discovery Flow

1. User opens Home and sees the existing `For you`, `Jobs`, and `Services` quick tabs.
2. User can tap the feed filter action beside `Latest in your barangay`.
3. App opens a lightweight Home-only feed filter sheet for feed type, work/service mode, category, location preference, and sort.
4. User applies filters and Home updates the already-bounded discovery feed locally.
5. If no cards match, Home shows `No posts match these filters yet.` and suggests adjusting feed filters.
6. User can reset filters or jump to `Advanced search`, which opens the fuller Search filter experience.

Rules:

- Home filters are discovery preferences, not a duplicate of Search.
- Search remains the intentional lookup surface with advanced filters.
- `Nearby areas` and `Relevant nearby` use known barangay/city text in MVP; they are not true geodistance.
- Setup and profile-completion nudges stay outside feed filtering.

## Barangay Verification Flow

1. Unverified user starts verification from a locked action, profile prompt, or verification page.
2. App shows the Figma verification intro explaining what verification unlocks.
3. App shows the Figma "Before you continue" requirements: Barangay Certificate recommended, another valid ID allowed as fallback, clear face photo, and good lighting.
4. App shows account details with onboarding/profile data prefilled.
5. User confirms or edits first name, last name, date of birth, and contact number so they match the document.
6. App sends a six-digit contact OTP to the normalized Philippine mobile number through the server-side contact OTP function. The user must verify the current code before continuing.
7. User selects document to submit: Barangay Certificate is recommended; National ID, Driver's License, or Passport remain allowed fallback valid IDs for barangay staff review.
8. If Barangay Certificate is selected, user uploads the certificate. Otherwise, user uploads ID front and ID back. Camera capture can be added as a verification-polish task, but file/image picker upload is the current MVP path.
9. App shows face-photo guidance, then user uploads a clear face photo for manual barangay comparison. Camera selfie capture is planned but should not block the verified Post slice.
10. App shows the Figma review and submit screen so the user can check personal details, document type, uploaded files, face photo, and barangay before submission.
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
- Contact OTP is required for barangay verification submission, but it is not an authentication method. PhilSMS credentials remain server-only. Restricted simulation may be enabled only for explicitly allowlisted local test users or numbers.

## Public Profile Completion Flow

1. Verified user opens Profile and sees a trust checklist for Core Profile, Work Profile, and Hiring Profile.
2. Core Profile collects public name, preferred contact method, approximate location, private block/lot or house-number details, short resident intro, and verification summary.
3. Work Profile collects About My Work, skills, custom "Others / Specify" skill text, usual service area, usual availability, credentials, worker reviews, and work-history context.
4. Hiring Profile collects Hiring Introduction, Usually Hires For / Common Needs, custom "Others / Specify" need text, coordination style, preferred coordination time, client reviews, and hiring-history context.
5. App saves role-profile rows without changing the user's active role.
6. When a verified user tries to publish or message without the relevant role profile, the app routes them to `/profile/complete`.

Rules:

- Keep first onboarding lightweight; do not force full Work/Hiring completion before Home.
- Barangay verification and public profile completion are separate trust layers.
- A verified user with missing Work/Hiring setup stays visibly verified but sees `Verified · Setup incomplete`; they may browse public content but cannot message, hire, apply/post, or review until setup is complete.
- Verification selfie, ID files, certificate files, and admin notes are private and must never become public profile photos or profile content.
- A public profile photo is strongly recommended for recognition and trust, but remains optional and must not block completion or marketplace access.
- Profile completion must not depend on active services, active jobs, budgets, rates, or marketplace inventory. A user with zero listings can still complete Core, Work, and Hiring profiles.
- Profile may summarize active Services Offered, active Job Posts, Work History, and Hiring History, but drafts, inactive posts, archived/final post management, edit/delete/deactivate/republish controls, saved items, and private states belong in Post Dashboard or other owner/private surfaces.
- Profile remains focused on identity, skills, trust, history, and public profile preview. Primary job/service management and edit actions must remain in Post.
- Publishing jobs and messaging workers require a completed Hiring Profile.
- Publishing services and messaging clients about jobs require a completed Work Profile.

## Service Profile Creation Flow

1. Provider opens Work Profile, Post, or provider setup.
2. Provider selects work type/service group/specific service from the controlled taxonomy, or uses "Others / Specify" stored as separate custom text for admin review. Brand-new blank drafts may prefill category, service area, and availability from Work Profile defaults, but existing drafts and listings stay authoritative.
3. Provider adds service title, description, availability, experience level, optional certification metadata, a minimum/maximum rate range, rate type, and optional negotiable flag.
4. Provider may attach credentials related to the service.
5. After the first meaningful edit, the app creates or updates an owner-private `service_drafts` row through the shared debounced autosave path.
6. App validates required fields and flushes any pending autosave before showing Preview.
7. App shows the service Preview screen while preserving the draft ID and form state.
8. App flushes the current draft before verification routing or publish.
9. App checks barangay verification and completed Work Profile.
10. `ServiceProfileService.createService` saves the public service and deletes the private draft after successful publication.
11. Service appears on provider public profile, Home feed, and search results if active.

Rules:

- A provider can have multiple services.
- A service belongs to one provider.
- Inactive services are hidden from public search.
- Drafts are stored separately from inactive services and remain owner-private.
- Verified and unverified authenticated users can leave and resume service drafts from Post.
- Admin verification belongs to the user/profile, while credentials can support a service.
- Service posting is blocked until the provider has a completed Work Profile.

## Job Posting Flow

1. Client opens Post.
2. Client taps Create a post and chooses "I need help" from the Figma post-type sheet.
3. Client chooses a Job Category and then a category-specific Service Needed, enters title, description, public approximate location, optional private location notes, optional context tags, budget minimum/maximum, rate type, optional negotiable flag, workers needed, preferred schedule, experience level, certification requirement, and listing options. Brand-new blank drafts may prefill common need and general scheduling preference from Hiring Profile defaults, but existing drafts and jobs stay authoritative.
4. App validates Job Category, Service Needed, title, description, public location, numeric optional fields, and a valid required range where `budget_min > 0` and `budget_min <= budget_max`.
5. After the first meaningful edit, the app creates or updates an owner-private `job_drafts` row through the shared debounced autosave path. It flushes any pending save before showing Preview.
6. App shows the Figma Preview screen with safety reminders.
7. If the client is not barangay-verified and taps Publish, the app shows the Figma barangay verification gate with Start Verification and Keep Editing Draft actions.
8. If the client is barangay-verified but missing Hiring Profile details, the app routes to `/profile/complete?mode=hiring`.
9. If the client is barangay-verified and Hiring Profile complete, `JobService.createJob` saves the job with status `open` and deletes the draft.
10. Job appears in Home, job search, post dashboard, active posts, and provider browsing.
11. Client can open the created job detail after publishing.
12. From Post management, the owner can edit an eligible open/reviewing/cancelled job through the same builder and preview flow. Owner job detail may link to that flow, but Profile does not.

Rules:

- This is the next vertical implementation slice after verification completion.
- Unverified users can create and edit private drafts, but they cannot publish public jobs.
- Unverified users are routed to verification only when they try to publish or choose Start Verification from the gate.
- Approved users must be able to create a real job without relogging if profile refresh has received the approval state.
- Approved users must complete Hiring Profile before publishing public jobs.
- Payments and job agreements happen outside the app.
- Jobs should be clear enough for providers to decide whether to message.
- Closed or cancelled jobs should not accept new interested workers.
- Job photos can be selected, uploaded to storage, and shown in preview and job detail. Renewal rules, auto-reply behavior, ranking, and advanced search remain separate slices.
- Post UI should avoid Apply/Application wording; workers show interest through Messages.
- Service Needed is structured data saved separately from category. Tags remain short context/condition descriptors, not service names.
- Public job cards/details must not show house number, block/lot, private location notes, ID files, private contact data, or sensitive verification details.
- A user's own jobs are hidden from general Home/Search/browsing, but remain visible in My Posts, Manage Posts, and Profile activity.
- Job and service builders do not create empty draft rows. They debounce meaningful edits, skip writes during initial hydration, save only changed serialized content, and flush before Preview, backgrounding, or leaving the builder.

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
- Conversation messages may contain text, one private image attachment, or both. Only participants can read the attachment.
- Inbox and bottom navigation use participant-scoped unread counts. Opening a conversation marks it read.

## Message-Based Hiring Flow

1. Client receives one or more interested workers in Messages.
2. Client opens the job conversation.
3. Client can use quick prompts to confirm time, location, payment, and what to bring.
4. Client taps Mark Hired when a worker is chosen.
5. App checks that the client has completed Hiring Profile setup, then updates the job or conversation with hired worker status.
6. Job History shows the job as active, worker hired, in progress, or completed.
7. After completion, both sides can leave feedback.
8. Client sees Review worker; the accepted worker sees Review client. A submitted review replaces the action with the immutable submitted state.

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

## In-app Notification Flow

1. User taps the bell from Home or Messages.
2. App opens the shared Notifications screen.
3. User sees server-created notification rows for new messages, verification decisions, completed hired jobs, and report status changes.
4. Unread rows are visually distinct.
5. Tapping a row marks it read and opens its linked in-app route when one exists.
6. User can mark all unread notifications as read.

Rules:

- MVP notifications are in-app only.
- Do not add push notification tokens, background jobs, or notification preferences in this slice.
- Users can read and update only their own notification rows.

## Ratings/Review Flow

1. A hired job reaches `completed`.
2. The client can review only the accepted worker.
3. The accepted worker can review only the client.
4. Reviewer selects a rating from 1 to 5 and may add feedback.
5. A database RPC derives the correct reviewee from the completed job and hired conversation.
6. The RPC saves one immutable review for that reviewer/reviewee/job direction.
7. Job detail, conversation details, and Post management show the submitted state instead of another action.
8. Worker and client public profiles update their real average, review count, recent reciprocal reviews, and safe completed-job context.
9. Admin can review reported or abusive feedback through moderation paths.

Rules:

- Reviews require a completed job, an accepted provider, and a matching conversation with `hired_at`.
- A reviewer must be the job client or accepted worker, and the database derives the correct other party.
- Self-reviews, random-user reviews, pre-completion reviews, and duplicate directional reviews are rejected.
- Reviews are immutable after creation. Job, reviewer, reviewee, rating, and comment cannot be edited through normal app access.
- Reviews should not expose private contact or ID document information.
- Review comments are shown only as controlled completed-interaction feedback. Do not add open public comment threads to job/service posts.
- Empty profile state: `No reviews yet. Reviews will appear after completed jobs.`
