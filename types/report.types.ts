export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';
export type ReportTargetType = 'job' | 'service' | 'conversation' | 'user' | 'review';
export type CreateReportInput = {
  reportedUserId?: string | null; jobId?: string | null; serviceId?: string | null;
  conversationId?: string | null; reviewId?: string | null; reason: string; details?: string | null;
};
export type ReportTargetDetails = {
  title: string; body: string | null; rating?: number;
  messages?: { id: string; senderId: string; body: string; createdAt: string }[];
};
export type ReportSummary = {
  id: string; reporterId: string; reportedUserId: string | null; jobId: string | null;
  serviceId: string | null; conversationId: string | null; reviewId: string | null;
  reason: string; details: string | null; status: ReportStatus; createdAt: string; updatedAt: string;
  reviewedBy: string | null; reviewedAt: string | null;
  /** Only populated by checked admin RPCs. */
  adminNotes: string | null; resolutionMessage: string | null; reviewHidden: boolean;
  reporterName: string | null; reportedUserName: string | null; targetType: ReportTargetType;
  targetLabel: string; targetDetails?: ReportTargetDetails;
};
export type ListReportsInput = { limit?: number; statuses?: ReportStatus[] };
export type AdminReportPageInput = ListReportsInput & { offset?: number; receivedOnly?: boolean };
export type AdminReportCounts = Record<ReportStatus, number> & { received: number };
export type AdminReportPage = { reports: ReportSummary[]; total: number; counts: AdminReportCounts };
export type ReviewReportInput = {
  reportId: string; status: ReportStatus; adminNotes?: string | null;
  resolutionMessage?: string | null; reviewAction?: 'hide' | 'restore' | null;
};
