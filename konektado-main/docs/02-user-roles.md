# User Roles

## Role Model

Konektado has three primary roles:

- Resident / Service Provider
- Client / Employer
- Barangay Admin

All app users are residents or local users by context, but not all users are verified service providers. A user may be both a client and a provider in one account.

The user-facing profile model is:

- Work Profile: services offered, rate, availability, completed work, worker reviews.
- Hiring Profile: jobs posted, workers hired, open jobs, client reviews.

The app may still use an `active_role` internally for queries and permissions, but the UI should not feel like two separate accounts.

## Resident / Service Provider

Service providers are users who offer services to others in Barangay San Pedro.

### Can Do

| Permission | Description |
| --- | --- |
| Manage own profile | Add and update name, location, contact, about, and availability. |
| Manage own services | Create, update, hide, or delete own service profiles. |
| Upload credentials | Add certificates, ID documents, or proof of experience for verification. |
| Request verification | Submit a barangay verification request. |
| Browse jobs | View open jobs that clients posted. |
| Message about jobs | Start or continue a job-related conversation to show interest. |
| Withdraw interest | Stop pursuing a job before being marked hired. |
| Receive reviews | Receive ratings and feedback after completed work. |
| Report issues | Report suspicious jobs, users, or reviews. |

### Cannot Do

- Approve their own verification.
- Edit other users' profiles, services, jobs, conversations, or reviews.
- Message closed or cancelled jobs as a new interested worker.
- Create duplicate active interest for the same job.
- Delete reviews written by other users.
- Access admin queues unless assigned as barangay admin.

## Client / Employer

Clients are users who need services or want to post jobs.

### Can Do

| Permission | Description |
| --- | --- |
| Manage own profile | Add and update basic profile and contact details. |
| Browse providers | Search providers by service category, location, and availability. |
| View provider profiles | See public provider details, services, badges, and ratings. |
| Post jobs | Create simple job posts with title, description, location, budget, and category. |
| Manage own jobs | Edit, close, cancel, or archive own jobs. |
| Review interested workers | View workers who messaged or showed interest in own jobs. |
| Mark worker hired | Mark one worker or the needed number of workers as hired based on MVP rules. |
| Leave reviews | Rate providers after a completed job. |
| Report issues | Report users, jobs, conversations, or reviews. |

### Cannot Do

- Verify providers.
- Edit provider profiles or credentials.
- View private verification documents.
- Message or mark themselves hired on their own job.
- Leave reviews for jobs they did not participate in.
- Manage jobs posted by other clients.

## Barangay Admin

Barangay admins are authorized personnel who support trust and moderation.

### Can Do

| Permission | Description |
| --- | --- |
| View verification queue | See pending verification requests and submitted documents. |
| Approve/reject verification | Update verification status and record review notes. |
| View user records | View user profile summaries needed for verification and moderation. |
| Moderate jobs | Review, hide, close, or flag jobs that violate rules. |
| Moderate reviews | Review reported ratings or feedback. |
| Review reports | Mark reports as open, under review, resolved, or dismissed. |
| Audit platform activity | View key activity needed for a thesis/admin demo. |

### Cannot Do

- Change user passwords.
- Log in as another user.
- Create fake verification records without a request.
- View unnecessary private files outside verification/moderation workflows.
- Process payments or enforce job agreements.
- Integrate with external government databases in MVP.

## Role Safety Rules

- Admin role assignment must be manual or controlled by a protected admin-only process.
- Public provider listings should only show safe public fields.
- Verification documents must never appear in public user profiles.
- Role changes should be recorded in `user_roles`.
- Screens must check permissions through service functions, not only UI visibility.
- Messaging, posting, saving, and review actions must check barangay verification status before writing data.

