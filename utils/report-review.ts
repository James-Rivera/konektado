import type { ReportStatus } from '@/types/report.types';

export type ReportFilter = ReportStatus | 'received';
export const REPORT_PAGE_SIZE = 30;
export type ReportReviewDraft = {
  status: ReportStatus;
  adminNotes: string;
  resolutionMessage: string;
  reviewAction: 'hide' | 'restore' | null;
};

export function getReportPageRequest(filter: ReportFilter, page: number) {
  return {
    limit: REPORT_PAGE_SIZE,
    offset: Math.max(0, Math.floor(page)) * REPORT_PAGE_SIZE,
    ...(filter === 'received' ? { receivedOnly: true } : { statuses: [filter] }),
  };
}

/** Validate the operator's draft before saving; the server repeats invariants. */
export function prepareReportReview(draft: ReportReviewDraft) {
  const adminNotes = draft.adminNotes.trim();
  const resolutionMessage = draft.resolutionMessage.trim();
  if ((draft.status === 'resolved' || draft.status === 'dismissed') && !resolutionMessage) {
    return { error: 'Enter an outcome for the reporter before resolving or dismissing this complaint.', data: null };
  }
  if (draft.reviewAction && !adminNotes) {
    return { error: 'Explain the review visibility decision in the internal notes.', data: null };
  }
  return { error: null, data: { status: draft.status, adminNotes: adminNotes || null, resolutionMessage: resolutionMessage || null, reviewAction: draft.reviewAction } };
}
