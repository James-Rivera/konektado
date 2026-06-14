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
  saved-posts.service.ts
  notification.service.ts
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
| `updateJob(id, input)` | `{ id: string; input: UpdateJobInput }` | `ServiceResult<Job>` | Edits an owned `open`, `reviewing`, or deactivated (`cancelled`) job without changing its lifecycle status. |
| `updateJobStatus(id, status)` | `{ id: string; status: JobStatus }` | `ServiceResult<Job>` | Closes, cancels, completes, or reopens if allowed. |

Rules:

- Only job owner can update their job.
- Providers can read open jobs.
- Budget is informational, not a payment transaction.

## ConversationService

Purpose: Own message-based job interest and basic chat.

| Function | Input | Output | Behavior |
| --- | --- | --- | --- |
| `listMyConversations(filters)` | `{ kind?: "all" | "jobs" | "services" | "unread"; includeArchived?: boolean }` | `ServiceResult<ConversationSummary[]>` | Lists inbox rows for Messages tab and hides archived conversations by default. |
| `getConversation(id)` | `{ id: string }` | `ServiceResult<ConversationDetail>` | Gets job/service context and messages. |
| `startJobConversation(input)` | `{ jobId: string; message?: string }` | `ServiceResult<ConversationDetail>` | Creates or reuses a job conversation to show interest. |
| `startServiceConversation(input)` | `{ serviceId: string; message?: string }` | `ServiceResult<ConversationDetail>` | Creates or reuses a service request conversation for the current client and service provider. |
| `sendMessage(input)` | `{ conversationId: string; body: string }` | `ServiceResult<Message>` | Sends a text message. |
| `markConversationRead(id)` | `{ conversationId: string }` | `ServiceResult<string>` | Advances only the current participant's read watermark. |
| `markWorkerHired(input)` | `{ conversationId: string }` | `ServiceResult<ConversationDetail>` | Client marks the provider hired for the job. |
| `declineConversation(input)` | `{ conversationId: string; reason?: string }` | `ServiceResult<ConversationDetail>` | Declines a request/interest without deleting history. |
| `archiveConversation(input)` | `{ conversationId: string }` | `ServiceResult<boolean>` | Hides the conversation only from the current participant's inbox. |
| `reportConversation(input)` | `{ conversationId: string }` | `ServiceResult<ConversationDetail>` | Marks the conversation reported for MVP moderation visibility. |

Rules:

- Only verified users can start or send messages.
- A provider cannot start a job conversation on their own job.
- One active job conversation per provider per job.
- One service conversation per client, provider, and service.
- Conversation creation treats unique conflicts as an existing thread and refetches the canonical row.
- Inbox, thread, and Details participant identity must use the same public-safe profile resolver.
- Unread counts exclude the current user's messages and clear immediately when the thread opens.
- New message activity restores participant-archived conversations.
- "Mark hired" is client-only for jobs owned by that client.
- MVP messages may contain text, one private image, or both.

## SavedPostService

Purpose: Own private post-scoped bookmarks and Saved Posts hydration.

| Function | Input | Output | Behavior |
| --- | --- | --- | --- |
| `listSavedPostReferences()` | none | `ServiceResult<SavedPostReference[]>` | Lists the current user's private saved post keys newest first. |
| `listSavedPosts()` | none | `ServiceResult<SavedPost[]>` | Hydrates saved jobs/services and preserves unavailable rows. |
| `isPostSaved(target)` | `{ postType: "job" \| "service"; postId: string }` | `ServiceResult<boolean>` | Checks one current-user bookmark. |
| `savePost(target)` | `{ postType: "job" \| "service"; postId: string }` | `ServiceResult<SavedPostReference>` | Idempotently saves one post for a verified user. |
| `unsavePost(target)` | `{ postType: "job" \| "service"; postId: string }` | `ServiceResult<boolean>` | Removes only the current user's bookmark. |

Rules:

- Screens use `useSavedPosts` for optimistic UI and rollback.
- Worker/provider identity IDs are not valid saved-post targets.
- RLS keeps saved rows private to their owner.

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

## NotificationService

Purpose: Own current-user in-app notification reads and read-state updates.

| Function | Input | Output | Behavior |
| --- | --- | --- | --- |
| `getMyNotifications(input?)` | `{ limit?: number }` | `ServiceResult<Notification[]>` | Lists current user's notifications newest first. |
| `getUnreadNotificationCount()` | none | `ServiceResult<number>` | Returns unread count for badge display. |
| `markNotificationRead(id)` | `{ id: string }` | `ServiceResult<void>` | Marks one owned unread notification as read. |
| `markAllNotificationsRead()` | none | `ServiceResult<void>` | Marks all owned unread notifications as read. |

Rules:

- Screens read only the current user's notifications through the service.
- The client app does not expose arbitrary notification creation.
- Event creation is server-side in the MVP migration; push delivery is still deferred.

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

