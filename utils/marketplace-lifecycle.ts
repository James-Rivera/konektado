import type { ConversationSummary, JobStatus } from '@/types/marketplace.types';

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
