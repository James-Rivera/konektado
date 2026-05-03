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
10. Verified users can access marketplace interactions based on their role.

Failure states:

- Invalid login shows a simple error.
- Network errors show retry.
- Missing profile row triggers profile creation or onboarding.

## Lightweight Onboarding / Viewer Entry Flow

1. User registers with email OTP plus password, or logs in with email/password.
2. User selects intended role: find work or hire someone (2 options only).
3. App collects basic profile identity and location.
4. App collects lightweight taste setup data: offered services for workers or needed services for clients (not both).
5. App shows review.
6. App saves onboarding and shows complete.
7. App lets the user enter Home in viewer mode.
8. Viewer can browse jobs, workers, service posts, and educational prompts.
9. Viewer sees locked actions for posting, messaging, saving, reviewing, and creating public service posts.
10. When the viewer taps a locked action, app shows a verification prompt or routes to verification.

Rules:

- Do not overload first-time onboarding with all profile, ID, credential, and service details.
- Do not collect certificates, ID documents, selfie/photo uploads, or verification files during first onboarding.
- First onboarding is complete when `user_preferences.onboarding_completed_at` is set and the profile has basic identity: first name, last name or full name, city, and barangay.
- The first entry experience should help users understand Konektado quickly.
- Service preference choices personalize browsing; they are not verification proof.
- Viewer mode is read-only for user-to-user marketplace interactions.
- Viewer mode still requires a lightweight authenticated account; it is not anonymous public browsing.
- Provider intent opens Home on Jobs, client intent opens Home on Workers.
- Users can add a second profile (Work Profile or Hiring Profile) later from Profile tab without re-entering full onboarding.

1. Unverified user starts verification from a locked action, profile prompt, or verification page.
2. App shows the Figma verification intro explaining what verification unlocks.
3. App shows the Figma "Before you continue" requirements: valid ID, clear face photo, and good lighting.
4. App shows account details with onboarding/profile data prefilled.
5. User confirms or edits first name, last name, date of birth, and contact number so they match the document.
6. App shows the contact-code UI from Figma for contact confirmation. MVP does not add SMS OTP; this is a visual/contact-confirmation step until provider-backed OTP is added.
7. User selects ID type: Barangay Certificate, National ID, Driver's License, or Passport.
8. If Barangay Certificate is selected, user uploads or captures the certificate. Otherwise, user uploads or captures ID front and ID back.
9. App shows face-photo guidance, then user uploads or captures a clear face photo for manual barangay comparison.
10. App shows the Figma review and submit screen so the user can check personal details, ID type, uploaded files, face photo, and barangay before submission.
11. App creates a pending row in the current live `verifications` table.
12. App stores uploaded files in Supabase Storage and links metadata in `verification_files`. Face photo currently uses `file_type = other` because the live table only accepts the initial file-type values.
13. User sees a pending verification state and remains in viewer mode.
14. Barangay admin reviews the request.
15. If approved, app sets verification status to `approved` and records `barangay_verified_at`.
16. If rejected, app stores the admin reason and lets the user resubmit.

Verification unlocks:

- Posting jobs.
- Creating public service profiles or service posts.
- Messaging about jobs or services.
- Messaging other users.
- Leaving reviews after completed jobs.

Contact details rules:

- Do not make the user retype fields already captured during onboarding.
- First name and last name should be prefilled but editable.
- The name fields should clearly say they must match the uploaded ID.
- Email is required for MVP login and can be reused for verification follow-up, but the verification screen must include a short privacy explanation.
- Email should not be displayed on public profiles, job cards, service cards, or worker cards.
- SMS/mobile OTP is not required for MVP. Add it only when an SMS provider and Android/device testing path are available.

## Service Profile Creation Flow

1. Provider opens Work Profile, Post, or provider setup.
2. Provider selects one or more service categories.
3. Provider adds service title, description, availability, experience, and optional rate text.
4. Provider may attach credentials related to the service.
5. App validates required fields.
6. `ServiceProfileService.createService` saves the service.
7. Service appears on provider public profile, Home feed, and search results if active.

Rules:

- A provider can have multiple services.
- A service belongs to one provider.
- Inactive services are hidden from public search.
- Admin verification belongs to the user/profile, while credentials can support a service.

## Job Posting Flow

1. Client opens Post or Create Job screen.
2. Client enters title, description, category, location, budget, and schedule text.
3. App validates title, description, and location.
4. `JobService.createJob` saves the job with status `open`.
5. Job appears in Home, job search, post dashboard, and provider browsing.
6. Client can edit the job while it is open.
7. Client can close or cancel the job.

Rules:

- Payments and job agreements happen outside the app.
- Jobs should be clear enough for providers to decide whether to message.
- Closed or cancelled jobs should not accept new interested workers.

## Job Interest and Messaging Flow

1. Provider browses open jobs.
2. Provider opens a job or taps Message.
3. App checks barangay verification.
4. App checks that the provider is not messaging their own job.
5. `ConversationService.startJobConversation` creates or reuses a job-related conversation.
6. Provider sends the first message or uses a suggested quick message.
7. Client sees the worker in Messages as an interested worker.
8. Client can reply, view the worker profile, mark hired, decline through a menu, or report.
9. Provider sees the conversation and job context in Messages.

Rules:

- A provider should have only one active job conversation per job.
- A provider cannot show interest in their own job.
- Conversations cannot be started for closed or cancelled jobs.
- "Apply" should not be used in the UI for the MVP unless a formal application feature is added later.

## Message-Based Hiring Flow

1. Client receives one or more interested workers in Messages.
2. Client opens the job conversation.
3. Client can use quick prompts to confirm time, location, payment, and what to bring.
4. Client taps Mark Hired when a worker is chosen.
5. App updates the job or conversation with hired worker status.
6. Job History shows the job as active, worker hired, in progress, or completed.
7. After completion, both sides can leave feedback if the review flow is enabled.

## Admin Verification Flow

1. Barangay admin logs in.
2. Admin opens the verification queue.
3. Admin views pending requests sorted by creation date.
4. Admin opens a request and reviews profile details, uploaded ID, credentials, and notes.
5. Admin approves or rejects with an optional note.
6. App updates `verification_requests.status`, reviewer fields, and timestamps.
7. On approval, app updates the user's public verification badge state.
8. On rejection, the provider can see the reason and submit again.

Admin safety rules:

- Admin actions must be logged with reviewer ID and timestamp.
- Admins should only access documents for valid verification or moderation work.
- Admin UI should not expose passwords or Supabase Auth internals.

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
