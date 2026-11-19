# Panel follow-up for the San Pedro pilot

## Job requests

- Before hiring, the client can pause the job and resume it later. Permanent cancellation offers three reasons: no longer needed, found someone else, or no worker found. It keeps a closed record and removes the job from discovery. Workers who had messaged about the job receive a generic in-app notice.
- After hiring, either participant can send a cancellation request with a reason. The other can accept or decline, and the requester can withdraw. Completion waits until the request has been answered or withdrawn. Accepted cancellations preserve the chat, accepted worker and decision history. The job stays closed and does not qualify for a completed-job review.
- A cancellation disagreement or an unanswered request can be reported through the existing complaint flow for San Pedro staff. There is no automatic acceptance, payment adjustment or staff override.
- Your Posts and Job Detail distinguish no worker message from waiting for a reply and receiving a worker message. Empty chats do not count as interest. Manual closure covers a client who gives up looking for a worker. A reminder or automatic expiry interval still needs staff agreement before implementation.

## Local verification

- The application suite passed 328 tests, including a search with 42 matching offers where the two top performers were outside the first 40 results. All 16 release checks passed.
- A clean replay of 47 migrations passed the existing suites and the new cancellation checks. Concurrent hire and cancellation produced a single winner. The same held for job completion and opening a cancellation request. Tests exercised participant permissions, retries, private reasons, empty chats, and exclusion of cancelled jobs from reputation counts.
- The cancellation form and service sort controls passed browser checks at 360×800, 390×844 and 430×932. The cancellation form also passed at 360×440 with long input and a simulated retry. Native keyboard and device behavior still need acceptance.
- The local client needs `20261119140725_panel_job_cancellation.sql` for the new fields and actions. The hosted demo uses the previous QA release.

## Other panel decisions

- San Pedro staff have agreed to operate verification and complaints. The live QA release already provides complaint intake, staff investigation and private notes, reporter outcomes, and review hide/restore. Staff still need to rehearse this process and agree how to handle escalations. Technical custody, support coverage and funding remain to be assigned. [Operating guide](25-san-pedro-operations.md)
- Keep the current San Pedro eligibility for the pilot. Wider provider eligibility depends on a separate verification and jurisdiction decision.
- Existing complaint and moderation controls support reporting abusive reviews. Service cards use permission-checked counts for completed hires and visible reviews, and exclude cancelled work. Find Services can sort all matching offers by highest rating or most completed hires, with deterministic ties and unrated offers still available. Any new review identity policy needs a separate scoped decision.
- Payment disputes and possible refunds, commissions and subscriptions belong in the paper's future recommendations. Current complaint handling can record an off-platform payment concern without processing a refund.
