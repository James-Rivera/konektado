import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { color, radius, space, typography } from '@/constants/theme';
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/notification.service';
import type { NotificationSummary } from '@/types/notification.types';

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(null);

      getMyNotifications().then((result) => {
        if (!active) return;

        if (result.error || !result.data) {
          setError(result.error ?? 'Could not load notifications.');
          setNotifications([]);
        } else {
          setNotifications(result.data);
        }

        setLoading(false);
      });

      return () => {
        active = false;
      };
    }, []),
  );

  const handleNotificationPress = useCallback(
    async (notification: NotificationSummary) => {
      if (pendingIds.includes(notification.id)) return;

      if (!notification.readAt) {
        setPendingIds((current) => [...current, notification.id]);
        const result = await markNotificationRead(notification.id);

        if (result.error) {
          setError(result.error);
          setPendingIds((current) => current.filter((id) => id !== notification.id));
          return;
        }

        const readAt = new Date().toISOString();
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, readAt } : item,
          ),
        );
        setPendingIds((current) => current.filter((id) => id !== notification.id));
      }

      if (isSafeRoute(notification.route)) {
        router.push(notification.route as never);
      }
    },
    [pendingIds, router],
  );

  const handleMarkAllRead = useCallback(async () => {
    if (!unreadCount || markingAllRead) return;

    setMarkingAllRead(true);
    const result = await markAllNotificationsRead();

    if (result.error) {
      setError(result.error);
      setMarkingAllRead(false);
      return;
    }

    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((notification) =>
        notification.readAt ? notification : { ...notification, readAt },
      ),
    );
    setMarkingAllRead(false);
  }, [markingAllRead, unreadCount]);

  return (
    <View style={styles.screen}>
      <AppHeader
        actionIcon={unreadCount ? 'done-all' : undefined}
        actionLabel="Mark all as read"
        onActionPress={handleMarkAllRead}
        title="Notifications"
      />

      <FlatList
        contentContainerStyle={styles.content}
        data={loading ? [] : notifications}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          loading ? (
            <NotificationListSkeleton />
          ) : error ? (
            <ErrorState message={error} />
          ) : (
            <EmptyState
              description="Updates about messages, verification, jobs, and reports will appear here."
              icon="notifications-none"
              title="No notifications yet."
            />
          )
        }
        renderItem={({ item }) => (
          <NotificationRow
            notification={item}
            onPress={() => void handleNotificationPress(item)}
            pending={pendingIds.includes(item.id)}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function NotificationRow({
  notification,
  onPress,
  pending,
}: {
  notification: NotificationSummary;
  onPress: () => void;
  pending: boolean;
}) {
  const unread = !notification.readAt;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        unread && styles.rowUnread,
        pressed && styles.pressed,
      ]}>
      <View style={[styles.iconWrap, unread && styles.iconWrapUnread]}>
        <MaterialIcons
          color={unread ? color.verificationBlue : color.textSubtle}
          name={getNotificationIcon(notification.type)}
          size={20}
        />
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text numberOfLines={2} style={[styles.title, unread && styles.titleUnread]}>
            {notification.title}
          </Text>
          {unread ? <View style={styles.unreadDot} /> : null}
        </View>
        {notification.body ? (
          <Text numberOfLines={3} style={styles.body}>
            {notification.body}
          </Text>
        ) : null}
        <Text style={styles.time}>
          {pending ? 'Marking as read...' : formatNotificationTime(notification.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}

function NotificationListSkeleton() {
  return (
    <View style={styles.skeletonStack}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={styles.row}>
          <Skeleton borderRadius={20} height={40} width={40} />
          <View style={styles.copy}>
            <Skeleton height={14} width="58%" />
            <Skeleton height={12} width="84%" />
            <Skeleton height={12} width={72} />
          </View>
        </View>
      ))}
    </View>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <View style={styles.errorCard}>
      <Text style={styles.errorTitle}>Could not load notifications</Text>
      <Text style={styles.errorBody}>{message}</Text>
    </View>
  );
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'message_received':
      return 'chat-bubble-outline';
    case 'verification_approved':
      return 'verified';
    case 'verification_rejected':
    case 'verification_needs_more_info':
      return 'fact-check';
    case 'job_completed':
      return 'task-alt';
    case 'report_status_updated':
      return 'report';
    default:
      return 'notifications-none';
  }
}

function isSafeRoute(route: string | null) {
  return Boolean(route && route.startsWith('/'));
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.background,
    flex: 1,
  },
  content: {
    gap: space.md,
    paddingBottom: 120,
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
  },
  row: {
    alignItems: 'flex-start',
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
  },
  rowUnread: {
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  iconWrapUnread: {
    backgroundColor: color.background,
  },
  copy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  title: {
    ...typography.bodyMedium,
    color: color.text,
    flex: 1,
  },
  titleUnread: {
    fontFamily: 'Satoshi-Bold',
  },
  unreadDot: {
    backgroundColor: color.verificationBlue,
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  body: {
    ...typography.body,
    color: color.textMuted,
  },
  time: {
    ...typography.caption,
    color: color.textSubtle,
  },
  skeletonStack: {
    gap: space.md,
  },
  errorCard: {
    backgroundColor: color.dangerSoft,
    borderColor: color.danger,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: space.xs,
    padding: space.lg,
  },
  errorTitle: {
    ...typography.bodyMedium,
    color: color.danger,
  },
  errorBody: {
    ...typography.body,
    color: color.textMuted,
  },
  pressed: {
    opacity: 0.72,
  },
});
