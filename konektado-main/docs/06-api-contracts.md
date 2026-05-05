# API Contracts

Frontend screens must call service functions instead of using Supabase queries directly inside UI components. Services can use Supabase now and can later be replaced with a self-hosted API without rewriting every screen.

Recommended service folder:

```text
/services
  auth.service.ts
  profile.service.ts
  service-profile.service.ts
  verification.service.ts
  job.service.ts
  conversation.service.ts
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
| `listProviders(filters)` | `ProviderSearchFilters` | `ServiceResult<PublicProvider[]>` | Searches public provider/service profiles. |

Rules:

- Birthdate, street address, and verification files are not public profile fields.
- `barangay_verified_at` is admin-controlled only.

## ServiceProfileService

Purpose: Own provider service profiles.

| Function | Input | Output | Behavior |
| --- | --- | --- | --- |
| `listMyServices()` | none | `ServiceResult<ServiceProfile[]>` | Lists current provider's services, active and inactive. |
| `createService(input)` | `CreateServiceInput` | `ServiceResult<ServiceProfile>` | Creates a service for current provider. |
| `updateService(id, input)` | `{ id: string; input: UpdateServiceInput }` | `ServiceResult<ServiceProfile>` | Updates owned service. |
| `setServiceActive(id, isActive)` | `{ id: string; isActive: boolean }` | `ServiceResult<ServiceProfile>` | Shows or hides a service from public search. |
| `deleteService(id)` | `{ id: string }` | `ServiceResult<void>` | Deletes owned service if allowed. |
| `searchServices(filters)` | `ServiceSearchFilters` | `ServiceResult<ServiceSearchResult[]>` | Searches active public services. |

Rules:

- Only verified providers can create public services.
- Screens should not know whether services are backed by `services` or the temporary `provider_profiles.service_type` field.

## VerificationService

Purpose: Own verification requests, file upload metadata, and current user's verification status.

| Function | Input | Output | Behavior |
| --- | --- | --- | --- |
| `getMyVerificationStatus()` | none | `ServiceResult<VerificationSummary>` | Returns latest request and public verification state. |
| `createVerificationRequest(input)` | `CreateVerificationRequestInput` | `ServiceResult<VerificationRequest>` | Uploads selected files, creates a pending request for the current user, and links file metadata. |
| `uploadVerificationFile(input)` | `VerificationFileInput` | `ServiceResult<VerificationFile>` | Uploads file to Storage and saves metadata. |
| `listMyVerificationRequests()` | none | `ServiceResult<VerificationRequest[]>` | Lists user's request history. |
| `cancelPendingRequest(id)` | `{ id: string }` | `ServiceResult<void>` | Cancels owned pending request. |

Rules:

- ID front and ID back are required for barangay identity verification.
- Uploaded documents are private.
- Only admins can approve or reject requests.
- Camera capture is allowed as a UI input source later, but the service contract should continue to receive normalized local file metadata/URIs and should not depend on a specific camera library.

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

## ConversationService

Purpose: Own message-based job interest and basic chat.

| Function | Input | Output | Behavior |
| --- | --- | --- | --- |
| `listMyConversations(filters)` | optional filters | `ServiceResult<ConversationSummary[]>` | Lists inbox rows for Messages tab. |
| `getConversation(id)` | `{ id: string }` | `ServiceResult<ConversationDetail>` | Gets job/service context and messages. |
| `startJobConversation(input)` | `{ jobId: string; message?: string }` | `ServiceResult<ConversationDetail>` | Creates or reuses a job conversation to show interest. |
| `startServiceConversation(input)` | `{ providerId: string; serviceId?: string; message?: string }` | `ServiceResult<ConversationDetail>` | Creates or reuses a service request conversation. |
| `sendMessage(input)` | `{ conversationId: string; body: string }` | `ServiceResult<Message>` | Sends a text message. |
| `markWorkerHired(input)` | `{ conversationId: string }` | `ServiceResult<ConversationDetail>` | Client marks the provider hired for the job. |
| `declineConversation(input)` | `{ conversationId: string; reason?: string }` | `ServiceResult<ConversationDetail>` | Declines a request/interest without deleting history. |
| `archiveConversation(input)` | `{ conversationId: string }` | `ServiceResult<void>` | Removes conversation from current user's active list if supported. |

Rules:

- Only verified users can start or send messages.
- A provider cannot start a job conversation on their own job.
- One active job conversation per provider per job.
- "Mark hired" is client-only for jobs owned by that client.
- Keep MVP messaging text-only.

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
| `listPendingVerificationRequests()` | optional filters | `ServiceResult<VerificationRequestDetail[]>` | Backward-compatible pending-only admin queue with request fields, submitted note, public-safe profile snapshot, file metadata, reviewer note, and dates. |
| `listVerificationRequests(input)` | `{ statuses?: VerificationStatus[]; limit?: number }` | `ServiceResult<VerificationRequestDetail[]>` | Admin dashboard queue for pending, reviewed, or all verification requests with only review-needed profile/file fields. |
| `reviewVerificationRequest(input)` | `{ requestId: string; decision: "approved" | "rejected"; note?: string }` | `ServiceResult<VerificationRequestDetail>` | Approves/rejects and records reviewer metadata. Rejection requires `note`; approval also sets `profiles.barangay_verified_at` and `profiles.verified_at`. |
| `listReports(filters)` | `ReportFilters` | `ServiceResult<Report[]>` | Lists moderation reports. |
| `updateReportStatus(input)` | `{ reportId: string; status: ReportStatus; note?: string }` | `ServiceResult<Report>` | Updates report review state. |
| `listUsers(filters)` | `AdminUserFilters` | `ServiceResult<AdminUserSummary[]>` | Searches user summaries for admin use. |
| `moderateJob(input)` | `{ jobId: string; action: "hide" | "close" | "restore"; note?: string }` | `ServiceResult<Job>` | Admin moderation for unsafe jobs. |

Rules:

- Every function must verify the current user has `barangay_admin` role.
- Admin writes should record `reviewer_id`, timestamps, and notes where applicable.
- Admin verification review uses the current MVP `verifications` table and `verification_files.verification_id`; do not rename the tables in this slice.
- Approval must return an error if either the `verifications` update or the profile verification timestamp update fails.
- Admin request details may expose only review-needed profile fields and verification file metadata/URLs.
- Admin service must not expose password or raw auth secrets.
- Admin UI may preview image file URLs in app for faster review, but service responses should remain metadata-oriented and should not fetch raw file bytes.

