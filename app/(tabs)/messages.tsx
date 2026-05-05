import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { color, radius, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { listMyConversations } from '@/services/conversation.service';
import type { ConversationSummary } from '@/types/marketplace.types';

type InboxFilter = 'all' | 'jobs' | 'services' | 'unread';

const FILTERS: { label: string; value: InboxFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Jobs', value: 'jobs' },
  { label: 'Services', value: 'services' },
  { label: 'Unread', value: 'unread' },
];

export default function MessagesScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);

  useEffect(() => {
    let active = true;

    setLoading(true);
    listMyConversations().then((result) => {
      if (!active) return;

      if (result.error || !result.data) {
        Alert.alert('Messages', result.error ?? 'Could not load conversations.');
      } else {
        setConversations(result.data);
      }

      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const visibleConversations = conversations.filter((conversation) => {
    const other = getOtherParticipant(conversation, profile?.id);
    const context = getConversationContext(conversation);
    const latest = conversation.lastMessage?.body ?? '';
    const unread = Boolean(conversation.lastMessage) && conversation.lastMessage?.senderId !== profile?.id;
    const haystack = [other?.fullName, context, latest].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = !query.trim() || haystack.includes(query.trim().toLowerCase());

    if (!matchesSearch) return false;
    if (filter === 'jobs') return Boolean(conversation.jobId);
    if (filter === 'services') return Boolean(conversation.serviceId);
    if (filter === 'unread') return unread;
    return true;
  });

  const messageRequests = visibleConversations.filter(
    (conversation) => filter === 'all' && conversation.startedBy !== profile?.id && conversation.status === 'active',
  );
  const regularMessages = visibleConversations.filter(
    (conversation) => filter !== 'all' || !messageRequests.some((request) => request.id === conversation.id),
  );

  const openConversation = (conversationId: string) => {
    router.push({
      pathname: '/conversation/[conversationId]',
      params: { conversationId },
    });
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        actionIcon="notifications"
        actionLabel="Notifications"
        actionTone="notification"
        onActionPress={() => Alert.alert('Notifications', 'Notifications will open in a later slice.')}
        title="Messages"
      />

      <ScrollView
        contentContainerStyle={[styles.content, !isVerified && styles.lockedContent]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {!isVerified ? (
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

          {loading ? (
            <View style={styles.listStack}>
              <MessageRowSkeleton />
              <MessageRowSkeleton />
              <MessageRowSkeleton />
            </View>
          ) : null}

          {!loading && isVerified && messageRequests.length ? (
            <InboxSection
              conversations={messageRequests}
              currentUserId={profile?.id}
              onOpen={openConversation}
              title="Message Requests"
            />
          ) : null}

          {!loading && isVerified && regularMessages.length ? (
            <InboxSection
              conversations={regularMessages}
              currentUserId={profile?.id}
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

function InboxSection({
  conversations,
  currentUserId,
  onOpen,
  title,
}: {
  conversations: ConversationSummary[];
  currentUserId?: string;
  onOpen: (conversationId: string) => void;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.editText}>Edit</Text>
      </View>
      <View style={styles.listStack}>
        {conversations.map((conversation) => (
          <MessageRow
            conversation={conversation}
            currentUserId={currentUserId}
            key={conversation.id}
            onPress={() => onOpen(conversation.id)}
          />
        ))}
      </View>
    </View>
  );
}

function MessageRow({
  conversation,
  currentUserId,
  onPress,
}: {
  conversation: ConversationSummary;
  currentUserId?: string;
  onPress: () => void;
}) {
  const other = getOtherParticipant(conversation, currentUserId);
  const unread = Boolean(conversation.lastMessage) && conversation.lastMessage?.senderId !== currentUserId;
  const context = getConversationContext(conversation);
  const preview = unread
    ? `${getUnreadCount(conversation.id)} + new messages`
    : conversation.lastMessage?.body ?? 'No messages yet';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.messageRow, pressed && styles.pressed]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(other?.fullName ?? 'Resident')}</Text>
        <View style={styles.onlineDot} />
      </View>
      <View style={styles.messageInfo}>
        <View style={styles.messageTitleRow}>
          <Text numberOfLines={1} style={styles.senderName}>
            {other?.fullName ?? 'Konektado resident'}
          </Text>
          <Text style={styles.timeText}>{formatTime(conversation.updatedAt)}</Text>
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
}

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

function MessageRowSkeleton() {
  return (
    <View style={styles.messageRow}>
      <Skeleton height={52} width={52} borderRadius={26} />
      <View style={styles.messageInfo}>
        <Skeleton height={12} width="48%" />
        <Skeleton height={10} width="38%" />
        <Skeleton height={12} width="76%" />
      </View>
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

function getUnreadCount(seed: string) {
  return 1 + (Array.from(seed).reduce((total, character) => total + character.charCodeAt(0), 0) % 3);
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
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
    width: 52,
  },
  avatarText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 20,
  },
  onlineDot: {
    backgroundColor: color.brandYellow,
    borderColor: color.background,
    borderRadius: 6,
    borderWidth: 1,
    bottom: 0,
    height: 12,
    position: 'absolute',
    right: 0,
    width: 12,
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
