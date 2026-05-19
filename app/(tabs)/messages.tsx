import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { PresenceDot } from '@/components/PresenceDot';
import { Skeleton, SkeletonAvatar } from '@/components/Skeleton';
import { color, radius, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import {
    type ConversationPreviewEvent,
    getConversationPreviewCache,
    setConversationPreviewCache,
    subscribeConversationPreviewUpdates,
    updateConversationPreviewCache,
} from '@/services/conversation-preview-events';
import {
    getConversationSummary,
    listMyConversations,
    mapRealtimeMessage,
} from '@/services/conversation.service';
import { isPresenceActive } from '@/services/marketplace.helpers';
import { getUnreadNotificationCount } from '@/services/notification.service';
import type { ConversationSummary } from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

type InboxFilter = 'all' | 'jobs' | 'services' | 'unread';

const FILTERS: { label: string; value: InboxFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Jobs', value: 'jobs' },
  { label: 'Services', value: 'services' },
  { label: 'Unread', value: 'unread' },
];

export default function MessagesScreen() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useProfile();
  const profileId = profile?.id ?? null;
  const cachedConversations = getConversationPreviewCache(profileId);
  const hasCachedConversations = cachedConversations !== null;
  const [conversations, setConversations] = useState<ConversationSummary[]>(cachedConversations ?? []);
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(!hasCachedConversations);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const hasLoadedOnceRef = useRef(hasCachedConversations);
  const conversationsRef = useRef(conversations);
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!profileId) return undefined;

      const cached = getConversationPreviewCache(profileId);
      const showSkeleton = !cached && !hasLoadedOnceRef.current;

      if (cached) {
        setConversations(cached);
        setLoading(false);
        hasLoadedOnceRef.current = true;
      }

      if (showSkeleton) {
        setLoading(true);
      }

      listMyConversations().then((result) => {
        if (!active) return;

        if (result.error || !result.data) {
          Alert.alert('Messages', result.error ?? 'Could not load conversations.');
        } else {
          setConversationPreviewCache(result.data, profileId);
          setConversations(result.data);
        }

        hasLoadedOnceRef.current = true;
        setLoading(false);
      });

      return () => {
        active = false;
      };
    }, [profileId]),
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      getUnreadNotificationCount().then((result) => {
        if (!active || result.error) return;
        setUnreadNotificationCount(result.data ?? 0);
      });

      return () => {
        active = false;
      };
    }, []),
  );

  useEffect(
    () =>
      subscribeConversationPreviewUpdates((event) => {
        const nextCache = updateConversationPreviewCache(event);
        setConversations((current) => {
          if (nextCache) return nextCache;
          return reconcilePreviewEvent(current, event);
        });
      }),
    [],
  );

  useFocusEffect(
    useCallback(() => {
      if (!profileId || !isVerified) return undefined;

      let active = true;
      const hydrateConversation = (nextConversationId: string) => {
        getConversationSummary(nextConversationId).then((result) => {
          if (!active || !result.data) return;
          setConversationPreviewCache(
            upsertConversation(conversationsRef.current, result.data),
            profileId,
          );
          setConversations((current) => upsertConversation(current, result.data));
        });
      };

      const channel = supabase
        .channel(`messages-preview-${profileId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            const message = mapRealtimeMessage(payload.new);
            if (message) hydrateConversation(message.conversationId);
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversations',
          },
          (payload) => {
            const conversationIdFromPayload = getRealtimeConversationId(payload.new);
            if (conversationIdFromPayload) hydrateConversation(conversationIdFromPayload);
          },
        )
        .subscribe();

      return () => {
        active = false;
        supabase.removeChannel(channel);
      };
    }, [isVerified, profileId]),
  );

  const showInboxSkeleton = loading && !conversations.length;

  const visibleConversations = useMemo(() => conversations.filter((conversation) => {
    const other = getOtherParticipant(conversation, profileId ?? undefined);
    const context = getConversationContext(conversation);
    const latest = conversation.lastMessage?.body ?? '';
    const unread = Boolean(conversation.lastMessage) && conversation.lastMessage?.senderId !== profileId;
    const haystack = [other?.fullName, context, latest].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = !query.trim() || haystack.includes(query.trim().toLowerCase());

    if (!matchesSearch) return false;
    if (filter === 'jobs') return Boolean(conversation.jobId);
    if (filter === 'services') return Boolean(conversation.serviceId);
    if (filter === 'unread') return unread;
    return true;
  }), [conversations, filter, profileId, query]);

  const messageRequests = useMemo(
    () =>
      visibleConversations.filter(
        (conversation) => filter === 'all' && conversation.startedBy !== profileId && conversation.status === 'active',
      ),
    [filter, profileId, visibleConversations],
  );
  const regularMessages = useMemo(() => {
    const requestIds = new Set(messageRequests.map((request) => request.id));
    return visibleConversations.filter(
      (conversation) => filter !== 'all' || !requestIds.has(conversation.id),
    );
  }, [filter, messageRequests, visibleConversations]);

  const openConversation = useCallback((conversationId: string) => {
    router.push({
      pathname: '/conversation/[conversationId]',
      params: { conversationId },
    });
  }, [router]);

  return (
    <View style={styles.screen}>
      <AppHeader
        actionBadgeCount={unreadNotificationCount}
        actionIcon="notifications"
        actionLabel="Notifications"
        actionTone="notification"
        onActionPress={() => router.push('/notifications' as never)}
        title="Messages"
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          !profileLoading && !isVerified && styles.lockedContent,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {profileLoading ? (
          <View style={styles.listStack}>
            <MessageRow isLoading />
            <MessageRow isLoading />
            <MessageRow isLoading />
          </View>
        ) : !isVerified ? (
          <LockedMessagesCard onVerify={() => router.push('/verification')} />
        ) : (
          <>
          <View style={styles.searchBox}>
            <TextInput
              onChangeText={setQuery}
              placeholder="Search clients or workers"
              placeholderTextColor={color.textSubtle}
              style={styles.searchInput}
              value={query}
            />
            <MaterialIcons color={color.primary} name="search" size={24} />
          </View>

          <View style={styles.filterRow}>
            {FILTERS.map((item) => {
              const selected = item.value === filter;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={item.value}
                  onPress={() => setFilter(item.value)}
                  style={({ pressed }) => [
                    styles.filterPill,
                    selected && styles.filterPillActive,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.filterText, selected && styles.filterTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {showInboxSkeleton ? (
            <InboxSection isLoading loadingCount={3} title="Messages" />
          ) : null}

          {isVerified && messageRequests.length ? (
            <InboxSection
              conversations={messageRequests}
              currentUserId={profileId ?? undefined}
              onOpen={openConversation}
              title="Message Requests"
            />
          ) : null}

          {isVerified && regularMessages.length ? (
            <InboxSection
              conversations={regularMessages}
              currentUserId={profileId ?? undefined}
              onOpen={openConversation}
              title="Messages"
            />
          ) : null}

          {!loading && isVerified && !visibleConversations.length ? (
            <EmptyState
              description="Conversations start when a verified resident messages from a job or service profile."
              icon="chat-bubble-outline"
              title={query ? 'No matching conversations' : 'No conversations yet'}
            />
          ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const InboxSection = memo(function InboxSection({
  conversations = [],
  currentUserId,
  onOpen,
  title,
  isLoading = false,
  loadingCount = 3,
}: {
  conversations?: ConversationSummary[];
  currentUserId?: string;
  onOpen?: (conversationId: string) => void;
  title: string;
  isLoading?: boolean;
  loadingCount?: number;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {isLoading ? <Skeleton height={14} width={82} /> : <Text style={styles.sectionTitle}>{title}</Text>}
        {isLoading ? <Skeleton height={14} width={28} /> : <Text style={styles.editText}>Edit</Text>}
      </View>
      <View style={styles.listStack}>
        {isLoading
          ? Array.from({ length: loadingCount }).map((_, index) => <MessageRow isLoading key={index} />)
          : conversations.map((conversation) => (
              <MessageRow
                conversation={conversation}
                currentUserId={currentUserId}
                key={conversation.id}
                onPress={() => onOpen?.(conversation.id)}
              />
            ))}
      </View>
    </View>
  );
});

const MessageRow = memo(function MessageRow({
  conversation,
  currentUserId,
  onPress,
  isLoading = false,
}: {
  conversation?: ConversationSummary;
  currentUserId?: string;
  onPress?: () => void;
  isLoading?: boolean;
}) {
  const other = conversation ? getOtherParticipant(conversation, currentUserId) : null;
  const avatarUrl = other?.avatarUrl ?? null;
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

  if (isLoading) {
    return (
      <View style={styles.messageRow}>
        <SkeletonAvatar dotSize={12} size={52} />
        <View style={styles.messageInfo}>
          <View style={styles.messageTitleRow}>
            <Skeleton height={13} width="48%" />
            <Skeleton height={12} width={42} />
          </View>
          <Skeleton height={12} width="34%" />
          <Skeleton height={12} width="76%" />
        </View>
      </View>
    );
  }

  if (!conversation || !onPress) return null;

  const unread = Boolean(conversation.lastMessage) && conversation.lastMessage?.senderId !== currentUserId;
  const context = getConversationContext(conversation);
  const sentByCurrentUser = Boolean(conversation.lastMessage) && conversation.lastMessage?.senderId === currentUserId;
  const preview = conversation.lastMessage
    ? `${sentByCurrentUser ? 'You: ' : ''}${conversation.lastMessage.body}`
    : 'No messages yet';
  const timestamp = conversation.lastMessage?.createdAt ?? conversation.updatedAt;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.messageRow, pressed && styles.pressed]}>
      <View style={styles.avatar}>
        {avatarUrl && !avatarFailed ? (
          <Image
            onError={() => setAvatarFailed(true)}
            resizeMode="cover"
            source={{ uri: avatarUrl }}
            style={styles.avatarImage}
          />
        ) : (
          <Text style={styles.avatarText}>{getInitials(other?.fullName ?? 'Resident')}</Text>
        )}
        <PresenceDot active={isPresenceActive(other?.availability)} size={12} style={styles.onlineDot} />
      </View>
      <View style={styles.messageInfo}>
        <View style={styles.messageTitleRow}>
          <Text numberOfLines={1} style={styles.senderName}>
            {other?.fullName ?? 'Konektado resident'}
          </Text>
          <Text style={styles.timeText}>{formatTime(timestamp)}</Text>
        </View>
        <Text numberOfLines={1} style={styles.contextText}>
          {context}
        </Text>
        <Text numberOfLines={1} style={[styles.previewText, unread && styles.previewUnread]}>
          {preview}
        </Text>
      </View>
    </Pressable>
  );
});

function LockedMessagesCard({ onVerify }: { onVerify: () => void }) {
  return (
    <View style={styles.lockedCard}>
      <MaterialIcons color={color.textSubtle} name="speaker-notes-off" size={42} />
      <Text style={styles.lockedTitle}>Messaging unlocks after verification</Text>
      <Text style={styles.lockedBody}>
        You can browse the marketplace now. Barangay approval is required before sending or
        receiving messages.
      </Text>
      <Pressable accessibilityRole="button" onPress={onVerify} style={styles.verifyButton}>
        <Text style={styles.verifyButtonText}>Start verification</Text>
      </Pressable>
      <Text style={styles.lockedLink}>Maybe later</Text>
    </View>
  );
}

function getOtherParticipant(conversation: ConversationSummary, currentUserId?: string) {
  return conversation.clientId === currentUserId ? conversation.provider : conversation.client;
}

function getConversationContext(conversation: ConversationSummary) {
  return conversation.job?.title ?? conversation.service?.title ?? 'Marketplace chat';
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
}

function sortConversationsByUpdatedAt(conversations: ConversationSummary[]) {
  return [...conversations].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

function reconcilePreviewEvent(
  conversations: ConversationSummary[],
  event: ConversationPreviewEvent,
) {
  if (event.conversation) {
    return upsertConversation(conversations, event.conversation);
  }

  if (!event.message) return conversations;

  let found = false;
  const updated = conversations.map((conversation) => {
    if (conversation.id !== event.conversationId) return conversation;
    found = true;
    return {
      ...conversation,
      lastMessage: event.message ?? conversation.lastMessage,
      updatedAt: event.message?.createdAt ?? conversation.updatedAt,
    };
  });

  return found ? sortConversationsByUpdatedAt(updated) : conversations;
}

function upsertConversation(
  conversations: ConversationSummary[],
  incoming: ConversationSummary,
) {
  let found = false;
  const updated = conversations.map((conversation) => {
    if (conversation.id !== incoming.id) return conversation;
    found = true;
    return mergeConversation(conversation, incoming);
  });

  if (!found) updated.push(incoming);
  return sortConversationsByUpdatedAt(updated);
}

function mergeConversation(
  current: ConversationSummary,
  incoming: ConversationSummary,
) {
  const currentLastTime = current.lastMessage?.createdAt
    ? new Date(current.lastMessage.createdAt).getTime()
    : 0;
  const incomingLastTime = incoming.lastMessage?.createdAt
    ? new Date(incoming.lastMessage.createdAt).getTime()
    : 0;
  const lastMessage =
    incomingLastTime >= currentLastTime
      ? incoming.lastMessage
      : current.lastMessage;

  return {
    ...current,
    ...incoming,
    lastMessage,
    updatedAt: latestTimestamp(current.updatedAt, incoming.updatedAt, lastMessage?.createdAt),
  };
}

function getRealtimeConversationId(row: unknown) {
  if (!row || typeof row !== 'object') return null;
  const value = row as { id?: unknown };
  return typeof value.id === 'string' ? value.id : null;
}

function latestTimestamp(...values: (string | null | undefined)[]) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? new Date().toISOString();
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.background,
    flex: 1,
  },
  content: {
    gap: 20,
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 120,
  },
  lockedContent: {
    justifyContent: 'center',
    paddingBottom: 160,
    paddingTop: 32,
  },
  searchBox: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  searchInput: {
    ...typography.body,
    color: color.text,
    flex: 1,
    minHeight: 42,
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 75,
    paddingHorizontal: 12,
  },
  filterPillActive: {
    backgroundColor: color.cardTint,
    borderColor: color.primary,
  },
  filterText: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  filterTextActive: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    lineHeight: 22,
  },
  editText: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 22,
  },
  listStack: {
    gap: 8,
  },
  messageRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 14,
    minHeight: 76,
    paddingVertical: 12,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: 26,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    position: 'relative',
    width: 52,
  },
  avatarImage: {
    borderRadius: 26,
    height: '100%',
    width: '100%',
  },
  avatarText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 20,
  },
  onlineDot: {
    bottom: 0,
    right: 0,
  },
  messageInfo: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
    minWidth: 0,
  },
  messageTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  senderName: {
    color: '#050505',
    flex: 1,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 16,
  },
  timeText: {
    color: color.textSubtle,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
    maxWidth: 52,
    textAlign: 'right',
  },
  contextText: {
    color: color.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  previewText: {
    color: color.textSubtle,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  previewUnread: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
  },
  lockedCard: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 22,
    width: '100%',
  },
  lockedTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
  },
  lockedBody: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  verifyButton: {
    alignItems: 'center',
    backgroundColor: color.primary,
    borderRadius: radius.md,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 43,
    width: '100%',
  },
  verifyButtonText: {
    color: color.background,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  lockedLink: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  pressed: {
    opacity: 0.72,
  },
});
