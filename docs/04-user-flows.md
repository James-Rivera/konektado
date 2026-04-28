# User Flows

## Authentication Flow

1. User opens Konektado.
2. App checks Supabase session.
3. If no session exists, show login/register screens.
4. User enters a mobile number and verifies it with an OTP-style code, or logs in with an existing account.
5. App creates or loads the user's `profiles` row.
6. If no role exists, route to role selection.
7. App collects only the minimum onboarding details needed to orient the user.
8. User enters the main app as an unverified viewer if barangay verification is not complete.
9. Verified users can access marketplace interactions based on their role.

Failure states:

- Invalid login shows a simple error.
- Network errors show retry.
- Missing profile row triggers profile creation or onboarding.

## Lightweight Onboarding / Viewer Entry Flow

1. User enters a mobile number and verifies it, or logs in.
2. User selects intended role: find work, hire someone, or both if supported later.
3. App explains that barangay verification is required before interacting with other users.
4. App lets the user enter the main tabs in viewer mode.
5. Viewer can browse limited jobs, workers, service posts, and educational prompts.
6. Viewer sees locked actions for posting, applying, messaging, reviewing, and creating public service posts.
7. When the viewer taps a locked action, app routes to verification.

Rules:

- Do not overload first-time onboarding with all profile, ID, credential, and skill details.
- The first entry experience should help users understand Konektado quickly.
- Viewer mode is read-only for user-to-user marketplace interactions.
- Viewer mode still requires a lightweight authenticated account; it is not anonymous public browsing.

## Resident Verification Flow

1. Unverified user starts verification from a locked action, profile prompt, or verification page.
2. App shows a verification intro explaining what verification unlocks.
3. App shows the requirements before starting: valid ID, clear face photo/selfie, and good lighting.
4. App shows a contact details step with onboarding/profile data prefilled.
5. User confirms or edits first name and last name so they match the ID.
6. User adds an email address if it is missing.
7. App explains that email is used for verification updates, support, account recovery, and future login support if implemented.
8. User selects ID type.
9. User uploads or captures required ID front and ID back.
10. User adds intended skills/services, work categories, or client purpose as needed.
11. User may upload supporting certificates or proof of experience.
12. User takes or uploads a selfie/photo for manual barangay comparison if required by the barangay.
13. App shows a review and submit screen so the user can check contact details, ID type, uploaded files, and selfie/photo before submission.
14. App creates a `verification_requests` row with status `pending`.
15. App stores uploaded files in Supabase Storage and links metadata in `verification_files` or `credentials`.
16. User sees a pending verification state and remains in viewer mode.
17. Barangay admin reviews the request.
18. If approved, app sets verification status to `approved` and records `barangay_verified_at`.
19. If rejected, app stores the admin reason and lets the user resubmit.

Verification unlocks:

- Posting jobs.
- Creating public skill/service profiles or service posts.
- Applying to jobs.
- Messaging other users.
- Leaving reviews after completed jobs.

Contact details rules:

- Do not make the user retype fields already captured during onboarding.
- First name and last name should be prefilled but editable.
- The name fields should clearly say they must match the uploaded ID.
- Email can be required for verification if the project needs reliable follow-up, but it must include a short privacy explanation.
- Email should not be displayed on public profiles, job cards, service cards, or worker cards.

## Skill Profile Creation Flow

1. Provider opens profile or provider setup.
2. Provider selects one or more service categories.
3. Provider adds service title, description, availability, experience, and optional rate text.
4. Provider may attach credentials related to the skill.
5. App validates required fields.
6. `SkillService.createSkill` saves the skill.
7. Skill appears on provider public profile and search results if active.

Rules:

- A provider can have multiple skills.
- A skill belongs to one provider.
- Inactive skills are hidden from public search.
- Admin verification belongs to the user/profile, while credentials can support a skill.

## Job Posting Flow

1. Client opens Post or Create Job screen.
2. Client enters title, description, category, location, budget, and schedule text.
3. App validates title, description, and location.
4. `JobService.createJob` saves the job with status `open`.
5. Job appears in provider browsing and feed results.
6. Client can edit the job while it is open.
7. Client can close or cancel the job.

Rules:

- Payments and job agreements happen outside the app.
- Jobs should be clear enough for providers to decide whether to apply.
- Closed or cancelled jobs should not accept new applications.

## Job Application Flow

1. Provider browses open jobs.
2. Provider opens a job or taps Apply.
3. App checks that provider has not already applied.
4. Provider optionally adds a short message.
5. `ApplicationService.applyToJob` creates a `job_applications` row.
6. Application status starts as `applied`.
7. Client reviews applications for their job.
8. Client marks an application as `accepted` or `rejected`.
9. Provider sees updated application status.

Rules:

- A provider can apply to the same job only once.
- A provider cannot apply to their own job.
- Applications cannot be created for closed or cancelled jobs.

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
