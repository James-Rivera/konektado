# API Contracts

Frontend screens must call service functions instead of using Supabase queries directly inside UI components. Services can use Supabase now and can later be replaced with a self-hosted API without rewriting every screen.

Recommended service folder:

```text
/services
  auth.service.ts
  profile.service.ts
  skill.service.ts
  verification.service.ts
  job.service.ts
  application.service.ts
  review.service.ts
  admin.service.ts
```

Recommended shared result type:

```ts
export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };
```

## AuthService

Purpose: Own authentication and current session logic.

| Function | Input | Output | Behavior |
| --- | --- | --- | --- |
| `signUp(input)` | `{ email: string; password: string }` | `ServiceResult<AuthUser>` | Creates Supabase Auth user and starts profile bootstrap if needed. |
| `signIn(input)` | `{ email: string; password: string }` | `ServiceResult<AuthSession>` | Logs user in and returns session. |
| `signOut()` | none | `ServiceResult<void>` | Logs out current user and clears session state. |
| `getSession()` | none | `ServiceResult<AuthSession | null>` | Returns current session. |
| `getCurrentUser()` | none | `ServiceResult<AuthUser | null>` | Returns currently authenticated user. |
| `resetPassword(email)` | `string` | `ServiceResult<void>` | Optional; sends password reset email if enabled. |

Rules:

- Do not expose Supabase session internals to screens unless needed.
- Do not store passwords in app tables.

## ProfileService

Purpose: Own profile, roles, and public provider profile reads.

| Function | Input | Output | Behavior |
| --- | --- | --- | --- |
| `getMyProfile()` | none | `ServiceResult<Profile>` | Loads current user's profile and role details. |
| `createOrUpdateMyProfile(input)` | `ProfileUpdateInput` | `ServiceResult<Profile>` | Updates safe editable profile fields. |
| `getPublicProfile(userId)` | `{ userId: string }` | `ServiceResult<PublicProfile>` | Returns public-safe fields only. |
| `setActiveRole(role)` | `{ role: AppRole }` | `ServiceResult<UserRole>` | Switches current active role if user owns that role. |
| `addRole(role)` | `{ role: AppRole }` | `ServiceResult<UserRole>` | Adds client/provider role for current user. Admin role is excluded. |
| `listProviders(filters)` | `ProviderSearchFilters` | `ServiceResult<PublicProvider[]>` | Searches public provider profiles. |

Rules:

- Birthdate, street address, and verification files are not public profile fields.
- `barangay_verified_at` is admin-controlled only.

## SkillService

Purpose: Own provider skill/service profiles.

| Function | Input | Output | Behavior |
| --- | --- | --- | --- |
| `listMySkills()` | none | `ServiceResult<Skill[]>` | Lists current provider's skills, active and inactive. |
| `createSkill(input)` | `CreateSkillInput` | `ServiceResult<Skill>` | Creates a skill for current provider. |
| `updateSkill(id, input)` | `{ id: string; input: UpdateSkillInput }` | `ServiceResult<Skill>` | Updates owned skill. |
| `setSkillActive(id, isActive)` | `{ id: string; isActive: boolean }` | `ServiceResult<Skill>` | Shows or hides a skill from public search. |
| `deleteSkill(id)` | `{ id: string }` | `ServiceResult<void>` | Deletes owned skill if allowed. |
| `searchSkills(filters)` | `SkillSearchFilters` | `ServiceResult<SkillSearchResult[]>` | Searches active public skills. |

Rules:

- Only providers can create skills.
- Screens should not know the table structure for `skills`.

## VerificationService

Purpose: Own verification requests, file upload metadata, and current user's verification status.

| Function | Input | Output | Behavior |
| --- | --- | --- | --- |
| `getMyVerificationStatus()` | none | `ServiceResult<VerificationSummary>` | Returns latest request and public verification state. |
| `createVerificationRequest(input)` | `CreateVerificationRequestInput` | `ServiceResult<VerificationRequest>` | Creates pending request for current user. |
| `uploadVerificationFile(input)` | `VerificationFileInput` | `ServiceResult<VerificationFile>` | Uploads file to Storage and saves metadata. |
| `listMyVerificationRequests()` | none | `ServiceResult<VerificationRequest[]>` | Lists user's request history. |
| `cancelPendingRequest(id)` | `{ id: string }` | `ServiceResult<void>` | Cancels owned pending request. |

Rules:

- ID front and ID back are required for barangay identity verification.
- Uploaded documents are private.
- Only admins can approve or reject requests.

## JobService

Purpose: Own job creation, search, and status changes.

| Function | Input | Output | Behavior |
| --- | --- | --- | --- |
| `createJob(input)` | `CreateJobInput` | `ServiceResult<Job>` | Creates an open job for current client. |
| `getJob(id)` | `{ id: string }` | `ServiceResult<JobDetail>` | Gets job details with public client info. |
| `searchJobs(filters)` | `JobSearchFilters` | `ServiceResult<JobSummary[]>` | Lists open jobs by category, location, text, budget, or date. |
| `listMyJobs()` | none | `ServiceResult<Job[]>` | Lists jobs owned by current client. |
| `updateJob(id, input)` | `{ id: string; input: UpdateJobInput }` | `ServiceResult<Job>` | Edits owned open job. |
| `updateJobStatus(id, status)` | `{ id: string; status: JobStatus }` | `ServiceResult<Job>` | Closes, cancels, completes, or reopens if allowed. |

Rules:

- Only job owner can update their job.
- Providers can read open jobs.
- Budget is informational, not a payment transaction.

## ApplicationService

Purpose: Own provider applications and client application review.

| Function | Input | Output | Behavior |
| --- | --- | --- | --- |
| `applyToJob(input)` | `{ jobId: string; message?: string }` | `ServiceResult<JobApplication>` | Creates provider application if job is open. |
| `withdrawApplication(id)` | `{ id: string }` | `ServiceResult<JobApplication>` | Marks owned application as withdrawn if allowed. |
| `listMyApplications()` | none | `ServiceResult<JobApplication[]>` | Lists applications submitted by current provider. |
| `listApplicationsForJob(jobId)` | `{ jobId: string }` | `ServiceResult<JobApplicationDetail[]>` | Client lists applications for own job. |
| `updateApplicationStatus(id, status)` | `{ id: string; status: ApplicationStatus }` | `ServiceResult<JobApplication>` | Client accepts/rejects/shortlists for own job. |

Rules:

- Unique application per provider per job.
- Provider cannot apply to own job.
- Accepting an application can optionally set `jobs.accepted_provider_id`.

## ReviewService

Purpose: Own ratings and feedback after completed jobs.

| Function | Input | Output | Behavior |
| --- | --- | --- | --- |
| `createReview(input)` | `CreateReviewInput` | `ServiceResult<Review>` | Creates review for a completed job relationship. |
| `updateMyReview(id, input)` | `{ id: string; input: UpdateReviewInput }` | `ServiceResult<Review>` | Edits own review if allowed. |
| `getReviewsForUser(userId)` | `{ userId: string }` | `ServiceResult<Review[]>` | Lists public reviews for profile. |
| `getRatingSummary(userId)` | `{ userId: string }` | `ServiceResult<RatingSummary>` | Returns average rating and count. |

Rules:

- Rating must be 1 to 5.
- Reviewer and reviewee must be connected through the job.

## AdminService

Purpose: Own barangay admin verification and moderation operations.

| Function | Input | Output | Behavior |
| --- | --- | --- | --- |
| `listPendingVerificationRequests()` | optional filters | `ServiceResult<VerificationRequestDetail[]>` | Admin queue for pending requests. |
| `reviewVerificationRequest(input)` | `{ requestId: string; decision: "approved" | "rejected"; note?: string }` | `ServiceResult<VerificationRequest>` | Approves/rejects and records reviewer metadata. |
| `listReports(filters)` | `ReportFilters` | `ServiceResult<Report[]>` | Lists moderation reports. |
| `updateReportStatus(input)` | `{ reportId: string; status: ReportStatus; note?: string }` | `ServiceResult<Report>` | Updates report review state. |
| `listUsers(filters)` | `AdminUserFilters` | `ServiceResult<AdminUserSummary[]>` | Searches user summaries for admin use. |
| `moderateJob(input)` | `{ jobId: string; action: "hide" | "close" | "restore"; note?: string }` | `ServiceResult<Job>` | Admin moderation for unsafe jobs. |

Rules:

- Every function must verify the current user has `barangay_admin` role.
- Admin writes should record `reviewer_id`, timestamps, and notes where applicable.
- Admin service must not expose password or raw auth secrets.

