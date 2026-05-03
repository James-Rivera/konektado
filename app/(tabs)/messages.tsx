import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { NoticeBanner } from '@/components/NoticeBanner';
import { Pill } from '@/components/Pill';
import { SearchBar } from '@/components/SearchBar';
import { color, radius, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { listMyConversations } from '@/services/conversation.service';
import type { ConversationSummary } from '@/types/marketplace.types';

export default function MessagesScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);

  useEffect(() => {
    let active = true;

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

  return (
    <View style={styles.screen}>
      <AppHeader
        actionIcon="more-horiz"
        actionLabel="Message options"
        eyebrow="Coordination"
        title="Messages"
        subtitle="Message workers and clients after verification.">
        <SearchBar compact editable={false} placeholder="Search contacts or messages" />
      </AppHeader>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!isVerified ? (
          <NoticeBanner
            message="Unverified users can preview the inbox, but sending messages unlocks after barangay approval."
            title="Messaging is locked until verified"
            variant="warning"
          />
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Inbox</Text>
          <Pill label={loading ? 'Loading' : `${conversations.length} conversations`} />
        </View>

        <View style={styles.stack}>
          {conversations.map((conversation) => {
            const other =
              conversation.clientId === profile?.id ? conversation.provider : conversation.client;
            const context = conversation.job?.title ?? conversation.service?.title ?? 'Marketplace chat';

            return (
              <Pressable
                accessibilityRole="button"
                key={conversation.id}
                onPress={() =>
                  router.push({
                    pathname: '/conversation/[conversationId]',
                    params: { conversationId: conversation.id },
                  })
                }
                style={({ pressed }) => [styles.messageCard, pressed && styles.pressed]}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(other?.fullName ?? 'Resident')}</Text>
                </View>
                <View style={styles.messageBody}>
                  <View style={styles.messageTop}>
                    <Text style={styles.name}>{other?.fullName ?? 'Konektado resident'}</Text>
                    <Text style={styles.time}>{formatDate(conversation.updatedAt)}</Text>
                  </View>
                  <Text style={styles.context}>{context}</Text>
                  <Text numberOfLines={2} style={styles.preview}>
                    {conversation.lastMessage?.body ?? 'No messages yet.'}
                  </Text>
                  <View style={styles.messageFooter}>
                    <Pill
                      icon={conversation.status === 'hired' ? 'check-circle' : 'drafts'}
                      label={conversation.status}
                      tone={conversation.status === 'hired' ? 'success' : 'neutral'}
                    />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {!loading && !conversations.length ? (
          <EmptyState
            description="Conversations start from a job detail page when a verified worker messages a client."
            icon="chat-bubble-outline"
            title="No conversations yet"
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.screenBackground,
    flex: 1,
  },
  content: {
    gap: space.lg,
    padding: space.xl,
    paddingBottom: space['3xl'],
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  stack: {
    gap: space.md,
  },
  messageCard: {
    alignItems: 'flex-start',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: {
    ...typography.captionMedium,
    color: color.primary,
  },
  messageBody: {
    flex: 1,
    gap: space.xs,
  },
  messageTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'space-between',
  },
  name: {
    ...typography.bodyMedium,
    color: color.text,
    flex: 1,
  },
  time: {
    ...typography.caption,
    color: color.textSubtle,
  },
  context: {
    ...typography.captionMedium,
    color: color.primary,
  },
  preview: {
    ...typography.body,
    color: color.textMuted,
  },
  messageFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.72,
  },
});
