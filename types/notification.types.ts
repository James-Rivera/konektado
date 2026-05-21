export type NotificationType =
  | 'message_received'
  | 'verification_approved'
  | 'verification_rejected'
  | 'verification_needs_more_info'
  | 'job_completed'
  | 'report_status_updated';

export type NotificationSummary = {
  id: string;
  userId: string;
  type: NotificationType | string;
  title: string;
  body: string | null;
  route: string | null;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};
