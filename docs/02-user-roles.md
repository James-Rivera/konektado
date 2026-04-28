# User Roles

## Role Model

Konektado has three primary roles:

- Resident / Service Provider
- Client / Employer
- Barangay Admin

All app users are residents or local users by context, but not all users are verified service providers. A user may be both a client and a provider. The app should use an `active_role` so screens can show the correct actions for the current mode.

## Resident / Service Provider

Service providers are users who offer skills or services to others in Barangay San Pedro.

### Can Do

| Permission | Description |
| --- | --- |
| Manage own profile | Add and update name, location, contact, about, and availability. |
| Manage own skills | Create, update, hide, or delete own skill/service profiles. |
| Upload credentials | Add certificates, ID documents, or proof of experience for verification. |
| Request verification | Submit a barangay verification request. |
| Browse jobs | View open jobs that clients posted. |
| Apply to jobs | Submit an application to an open job. |
| Withdraw own applications | Withdraw before acceptance or closure. |
| Receive reviews | Receive ratings and feedback after completed work. |
| Report issues | Report suspicious jobs, users, or reviews. |

### Cannot Do

- Approve their own verification.
- Edit other users' profiles, skills, jobs, applications, or reviews.
- Apply to closed or cancelled jobs.
- Apply to the same job more than once.
- Delete reviews written by other users.
- Access admin queues unless assigned as barangay admin.

## Client / Employer

Clients are users who need services or want to post jobs.

### Can Do

| Permission | Description |
| --- | --- |
| Manage own profile | Add and update basic profile and contact details. |
| Browse providers | Search providers by service category, location, verification status, and availability. |
| View provider profiles | See public provider details, skills, badges, and ratings. |
| Post jobs | Create simple job posts with title, description, location, budget, and category. |
| Manage own jobs | Edit, close, cancel, or archive own jobs. |
| Review applications | View applications for own jobs. |
| Accept or reject applications | Mark one or more applications based on MVP rules. |
| Leave reviews | Rate providers after a completed job. |
| Report issues | Report users, jobs, applications, or reviews. |

### Cannot Do

- Verify providers.
- Edit provider profiles or credentials.
- View private verification documents.
- Apply to their own job as a provider using the same active session.
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

