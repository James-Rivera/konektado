import { manilaDate } from '@/services/job-schedule';
import type { ConversationSummary, JobClosureReason, JobStatus, JobSummary } from '@/types/marketplace.types';

export function getJobClosureLabel(reason?: JobClosureReason | null) {
  if (reason === 'no_worker_found') return 'Closed without a worker';
  return reason ? 'Cancelled' : null;
}

export function getUnfilledJobInterestLabel(job: JobSummary) {
  if (!['open', 'reviewing'].includes(job.status) || job.acceptedProviderId) return null;
  if (job.unfilledInterest === 'worker_messaged') return 'A worker has messaged';
  if (job.unfilledInterest === 'awaiting_reply') return 'Waiting for a worker’s reply';
  if (job.unfilledInterest === 'no_worker_message') return 'No worker has messaged yet';
  return null;
}

export function isUnfilledJobSchedulePast(job: JobSummary) {
  return Boolean(job.schedule?.date && ['open', 'reviewing'].includes(job.status) &&
    !job.acceptedProviderId && job.schedule.date < manilaDate());
}

/** Mirrors the supported resident actions; the database remains authoritative. */
export function getJobOwnerActionPolicy(status: JobStatus) {
  const editable = ['open', 'reviewing', 'cancelled'].includes(status);
  return {
    edit: editable,
    deactivate: status === 'open' || status === 'reviewing',
    reactivate: status === 'cancelled',
    close: editable,
  };
}

export function canHireFromConversation(
  conversation: ConversationSummary | null,
  userId?: string | null,
) {
  return Boolean(
    userId && conversation?.clientId === userId && conversation.jobId &&
    conversation.status === 'active' && !conversation.hiredAt &&
    conversation.job && ['open', 'reviewing'].includes(conversation.job.status) &&
    !conversation.job.acceptedProviderId,
  );
}

export function getConversationReviewKey({
  jobId,
  userId,
  jobStatus,
  refresh,
}: {
  jobId: string | null;
  userId?: string | null;
  jobStatus?: JobStatus;
  refresh: number;
}) {
  return jobId && userId ? `${jobId}:${userId}:${jobStatus ?? 'unknown'}:${refresh}` : null;
}
