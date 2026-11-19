# Panel follow-up for the San Pedro pilot

## Job requests

- Before hiring, the client can pause the job and resume it later. Permanent cancellation offers three reasons: no longer needed, found someone else, or no worker found. It keeps a closed record and removes the job from discovery. Workers who had messaged about the job receive a generic in-app notice.
- After hiring, either participant can send a cancellation request with a reason. The other can accept or decline, and the requester can withdraw. Completion waits until the request has been answered or withdrawn. Accepted cancellations preserve the chat, accepted worker and decision history. The job stays closed and does not qualify for a completed-job review.
- A cancellation disagreement or an unanswered request can be reported through the existing complaint flow for San Pedro staff. There is no automatic acceptance, payment adjustment or staff override.
- Your Posts and Job Detail distinguish no worker message from waiting for a reply and receiving a worker message. Empty chats do not count as interest. An open job with a scheduled date and no worker message becomes eligible to expire at midnight after that date in Philippine time. The client gets one in-app notice. The request remains in history, and the client can create a new one. A job that received a worker message, a paused or hired job, and a legacy job without a scheduled date stay outside automatic closure.

## Review privacy

- Profile reviews show the rating, comment, and the author's role. The response does not include the author's account ID, name, job link, or exact review date. Authors can still check their own submitted review. Authorized staff retain the original record for complaint investigation.
- Review reports keep the review reference and the reporter-facing outcome. The report confirmation and resident report history do not disclose the underlying job or the review author. Staff can still inspect the evidence and hide or restore the review.
- People in a work relationship may infer who wrote the review. Keep names, addresses and contact details out of review comments.

## Expiry activation

The local database migration installs the deadline rules and the expiry function. In an approved hosted environment, run the deployment checklist and register the [scheduled job](../supabase/operations/enable-unanswered-job-expiry.sql) as the database owner. It runs every five minutes, so the visible status and notice may arrive a few minutes after midnight. Before activation, inspect the read-only count of matching past jobs. The scheduler will close eligible past requests as it catches up. Repeated runs leave already-expired jobs and their notices alone.

The read-only count, after migration and before scheduler registration, is:

```sql
select count(*) from public.jobs j
where app_private.job_is_due_to_expire(j, statement_timestamp());
```

Review privacy introduces a replacement review-report action. Deploy the matching client with all three panel migrations and register the scheduler. Legacy clients can still submit other types of complaints. The live demo continues to serve the QA release during local testing.

## Local verification

- The application suite passed 329 tests, including ranking offers beyond the first page, reducing older review payloads to the allowed fields, and keeping the Hire action hidden for an expired job. All 16 release checks passed.
- A clean replay of 49 migrations passed the existing suites and the panel checks. The database tests covered cancellation, raw review access, review complaint privacy, staff hide and restore, the Manila midnight boundary and one expiration notice per job. The race tests covered cancellation versus hiring or completion, and the first worker message versus expiration.
- The cancellation form, service sort controls, public review display, and expiry guidance passed synthetic browser checks at 360×800, 390×844, and 430×932. The cancellation form also passed at 360×440 with long input and a simulated retry. Native keyboard and device behavior still need acceptance.
- The first panel candidate confirmed 46 migrations on the live QA database. The combined local candidate adds `20261119140725_panel_job_cancellation.sql`, `20261119144410_panel_review_privacy.sql`, and `20261119144413_panel_unanswered_job_expiry.sql`. Testing exercised the sweeper directly on a local database. Hosted scheduler registration and monitoring remain rollout steps.

## Other panel decisions

- San Pedro staff have agreed to operate verification and complaints. The live QA release already provides complaint intake, staff investigation and private notes, reporter outcomes, and review hide/restore. Staff still need to rehearse this process and agree how to handle escalations. Technical custody, support coverage and funding remain to be assigned. [Operating guide](25-san-pedro-operations.md)
- Keep the current San Pedro eligibility for the pilot. Wider provider eligibility depends on a separate verification and jurisdiction decision.
- Existing complaint and moderation controls support reporting abusive reviews. Service cards use permission-checked counts for completed hires and visible reviews, and exclude cancelled work. Find Services can sort all matching offers by highest rating or most completed hires, with deterministic ties and unrated offers still available.
- Payment disputes and possible refunds, commissions and subscriptions belong in the paper's future recommendations. Current complaint handling can record an off-platform payment concern without processing a refund.
