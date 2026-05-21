import type { ServiceResult } from '@/services/auth.service';
import { getCurrentUserId } from '@/services/marketplace.helpers';
import type { NotificationSummary } from '@/types/notification.types';
import { supabase } from '@/utils/supabase';

const NOTIFICATION_COLUMNS =
  'id, user_id, type, title, body, route, metadata, read_at, created_at';

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  route: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

function mapNotification(row: NotificationRow): NotificationSummary {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    route: row.route,
    metadata: row.metadata ?? {},
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

function normalizeLimit(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.max(1, Math.min(100, Math.floor(value)));
}

export async function getMyNotifications({
  limit = 50,
}: {
  limit?: number;
} = {}): Promise<ServiceResult<NotificationSummary[]>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_COLUMNS)
    .eq('user_id', user.data)
    .order('created_at', { ascending: false })
    .limit(normalizeLimit(limit));

  if (error) return { data: null, error: error.message };

  return {
    data: ((data as NotificationRow[] | null) ?? []).map(mapNotification),
    error: null,
  };
}

export async function getUnreadNotificationCount(): Promise<ServiceResult<number>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.data)
    .is('read_at', null);

  if (error) return { data: null, error: error.message };

  return { data: count ?? 0, error: null };
}

export async function markNotificationRead(
  notificationId: string,
): Promise<ServiceResult<void>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', user.data)
    .is('read_at', null);

  if (error) return { data: null, error: error.message };
  return { data: undefined, error: null };
}

export async function markAllNotificationsRead(): Promise<ServiceResult<void>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.data)
    .is('read_at', null);

  if (error) return { data: null, error: error.message };
  return { data: undefined, error: null };
}
