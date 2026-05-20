import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PresenceDot } from '@/components/PresenceDot';
import { Skeleton, SkeletonCircle } from '@/components/Skeleton';
import { color, radius } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import {
  getConversation,
  getConversationSummary,
  mapRealtimeMessage,
  markWorkerHired,
  sendMessage,
} from '@/services/conversation.service';
import { emitConversationPreviewUpdate } from '@/services/conversation-preview-events';
import {
  formatJobBudget,
  formatJobPostTitle,
  formatServiceRate,
  formatServicePostTitle,
  getMarketplaceLocation,
  isPresenceActive,
} from '@/services/marketplace.helpers';
import {
  getCompletionModeForError,
  getCompletionTitleForMode,
  isProfileCompletionRequiredError,
} from '@/services/profile-completion.service';
import type { ConversationDetail, ConversationMessage } from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

const JOB_PROMPTS = ['Where is the exact location?', 'What should I bring?', 'Send me your location'];
const SERVICE_PROMPTS = ['Are you available?', 'Can we discuss the schedule?', 'How much is your rate?'];

type LocalMessageStatus = 'sending' | 'failed';
type ThreadMessage = ConversationMessage & {
  localStatus?: LocalMessageStatus;
};

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function ConversationDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, loading: profileLoading } = useProfile();
  const params = useLocalSearchParams<{ conversationId?: string | string[] }>();
  const conversationId = getParamValue(params.conversationId);
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversationReady, setConversationReady] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [contextExpanded, setContextExpanded] = useState(false);
  const [visibleTimestampId, setVisibleTimestampId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const loadRequestRef = useRef(0);

  const load = useCallback((options: { showSkeleton?: boolean } = {}) => {
    if (!conversationId) return;

    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    const showSkeleton = options.showSkeleton ?? true;
    if (showSkeleton) {
      setConversationReady(false);
      setLoading(true);
    }
    setConversationError(null);

    getConversation(conversationId).then((result) => {
      if (requestId !== loadRequestRef.current) return;

      if (result.error) {
        setConversationError(result.error);
        Alert.alert('Conversation', result.error);
      } else {
        setConversation(result.data);
      }

      setLoading(false);
      setConversationReady(true);
    });
  }, [conversationId]);

  useEffect(() => {
    load({ showSkeleton: true });
  }, [load]);

  useEffect(() => {
    if (!conversationId) return undefined;

    const channel = supabase
      .channel(`conversation-thread-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = mapRealtimeMessage(payload.new);
          if (!message) return;
          setConversation((current) => reconcileConversationMessage(current, message));
          emitConversationPreviewUpdate({ conversationId, message, userId: profile?.id });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`,
        },
        () => {
          getConversationSummary(conversationId).then((result) => {
            if (!result.data) return;
            setConversation((current) => current ? { ...current, ...result.data } : current);
            emitConversationPreviewUpdate({
              conversationId,
              conversation: result.data,
              userId: profile?.id,
            });
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, profile?.id]);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated });
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated });
      }, 80);
    });
  }, []);

  const messageCount = conversation?.messages.length ?? 0;

  useEffect(() => {
    const eventName = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const keyboardSub = Keyboard.addListener(eventName, () => scrollToBottom());

    return () => keyboardSub.remove();
  }, [scrollToBottom]);

  useEffect(() => {
    if (loading || profileLoading || !conversation) return;
    scrollToBottom(false);
  }, [conversation, loading, messageCount, profileLoading, scrollToBottom]);

  const other =
    conversation?.clientId === profile?.id ? conversation?.provider : conversation?.client;
  const isClient = conversation?.clientId === profile?.id;
  const isJobConversation = Boolean(conversation?.jobId);
  const canMarkHired =
    Boolean(conversation?.jobId) && isClient && conversation?.status !== 'hired';
  const canOpenProfile = Boolean(
    conversation && profile?.id && [conversation.clientId, conversation.providerId].includes(profile.id),
  );
  const prompts = isJobConversation ? JOB_PROMPTS : SERVICE_PROMPTS;

  const replaceMessage = (messageId: string, nextMessage: ThreadMessage | null) => {
    setConversation((current) => {
      if (!current) return current;
      const messages = (current.messages as ThreadMessage[]).flatMap((message) => {
        if (message.id !== messageId) return [message];
        return nextMessage ? [nextMessage] : [];
      });

      return { ...current, messages };
    });
  };

  const onSend = async (overrideBody?: string, retryMessageId?: string) => {
    if (!conversationId) return;

    const messageBody = (overrideBody ?? body).trim();
    if (!messageBody) return;

    setSendError(null);
    const tempMessage: ThreadMessage = {
      id: retryMessageId ?? `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      conversationId,
      senderId: profile?.id ?? '',
      body: messageBody,
      createdAt: new Date().toISOString(),
      localStatus: 'sending',
    };

    if (retryMessageId) {
      replaceMessage(retryMessageId, tempMessage);
    } else {
      setConversation((current) =>
        current
          ? {
              ...current,
              lastMessage: tempMessage,
              messages: [...current.messages, tempMessage],
              updatedAt: tempMessage.createdAt,
            }
          : current,
      );
    }

    if (!overrideBody) setBody('');
    scrollToBottom();

    const result = await sendMessage({ conversationId, body: messageBody });

    if (result.error) {
      setSendError(result.error);
      if (isProfileCompletionRequiredError(result.error)) {
        const mode =
          getCompletionModeForError(result.error) ??
          (conversation?.clientId === profile?.id ? 'hiring' : 'work');
        replaceMessage(tempMessage.id, null);
        Alert.alert(getCompletionTitleForMode(mode), result.error, [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Complete profile',
            onPress: () => router.push({ pathname: '/profile/complete' as never, params: { mode } }),
          },
        ]);
        return;
      }

      replaceMessage(tempMessage.id, { ...tempMessage, localStatus: 'failed' });
      return;
    }

    if (result.data) {
      setConversation((current) => reconcileConversationMessage(current, result.data, tempMessage.id));
      emitConversationPreviewUpdate({ conversationId, message: result.data, userId: profile?.id });
    }
  };

  const onMarkHired = async () => {
    if (!conversationId) return;

    const result = await markWorkerHired({ conversationId });

    if (result.error) {
      Alert.alert('Mark hired', result.error);
      return;
    }

    setConversation(result.data);
  };

  const openPost = () => {
    if (conversation?.jobId) {
      router.push({ pathname: '/job/[jobId]', params: { jobId: conversation.jobId } });
      return;
    }

    if (conversation?.serviceId) {
      router.push({ pathname: '/services/[serviceId]', params: { serviceId: conversation.serviceId } });
    }
  };

  const isScreenLoading = profileLoading || !conversationReady;

  if (isScreenLoading) {
    return <ConversationScreenSkeleton />;
  }

  if (!conversation) {
    return <ConversationUnavailableScreen message={conversationError ?? 'Conversation not found.'} onBack={() => router.back()} />;
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.screen}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.headerIcon}>
            <MaterialIcons color={color.text} name="arrow-back-ios" size={18} />
          </Pressable>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{getInitials(other?.fullName ?? 'Resident')}</Text>
            <PresenceDot active={isPresenceActive(other?.availability)} borderColor={color.background} size={8} style={styles.onlineDot} />
          </View>
          <View style={styles.headerCopy}>
            <Text numberOfLines={1} style={styles.headerTitle}>
              {other?.fullName ?? 'Conversation'}
            </Text>
            <Text numberOfLines={1} style={styles.headerSubtitle}>
              {getParticipantSubtitle(conversation, profile?.id)}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Conversation details"
            onPress={() => {
              if (!conversationId) return;
              router.push({
                pathname: '/conversation/[conversationId]/details',
                params: { conversationId },
              });
            }}
            style={styles.headerIcon}>
            <MaterialIcons color={color.verificationBlue} name="more-vert" size={22} />
          </Pressable>
        </View>

        {conversation ? (
          <ConversationContextCard
            canMarkHired={canMarkHired}
            canOpenProfile={canOpenProfile}
            conversation={conversation}
            expanded={contextExpanded}
            onMarkHired={onMarkHired}
            onOpenPost={openPost}
            onOpenProfile={() => {
              if (conversation.providerId === profile?.id) {
                router.push({
                  pathname: '/client/[clientId]' as never,
                  params: {
                    clientId: conversation.clientId,
                    ...(conversation.jobId ? { sourceJobId: conversation.jobId } : {}),
                  },
                });
                return;
              }

              router.push({
                pathname: '/worker/[workerId]' as never,
                params: {
                  workerId: conversation.providerId,
                  ...(conversation.serviceId ? { sourceServiceId: conversation.serviceId } : {}),
                },
              });
            }}
            onToggleExpanded={() => {
              setContextExpanded((value) => !value);
              scrollToBottom(false);
            }}
          />
        ) : null}

        <ScrollView
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ref={scrollRef}
          contentContainerStyle={[styles.messages, { paddingBottom: 18 + Math.max(insets.bottom, 10) }]}
          showsVerticalScrollIndicator={false}>
          {conversation ? (
            <Text style={styles.threadStatus}>{getThreadStatusText(conversation, profile?.id)}</Text>
          ) : null}

          {conversation && !conversation.messages.length ? (
            <View style={styles.emptyThread}>
              <MaterialIcons color={color.textSubtle} name="speaker-notes-off" size={24} />
              <View>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptyBody}>Start with a short, clear question.</Text>
              </View>
            </View>
          ) : null}

          {(conversation.messages as ThreadMessage[]).map((message, index, messages) => {
            const previousMessage = messages[index - 1];
            const nextMessage = messages[index + 1];

            return (
              <MessageBubble
                currentUserId={profile?.id}
                key={message.id}
                message={message}
                nextMessage={nextMessage}
                onRetryFailed={
                  message.localStatus === 'failed'
                    ? () => onSend(message.body, message.id)
                    : undefined
                }
                onToggleTime={() =>
                  setVisibleTimestampId((current) => (current === message.id ? null : message.id))
                }
                previousMessage={previousMessage}
                showTime={visibleTimestampId === message.id}
              />
            );
          })}
        </ScrollView>

        <View style={styles.composerWrap}>
          {sendError ? <Text style={styles.sendError}>{sendError}</Text> : null}
          <ScrollView
            contentContainerStyle={styles.promptRow}
            horizontal
            showsHorizontalScrollIndicator={false}>
            {prompts.map((prompt) => (
              <Pressable
                accessibilityRole="button"
                key={prompt}
                onPress={() => onSend(prompt)}
                style={({ pressed }) => [styles.promptPill, pressed && styles.pressed]}>
                <Text style={styles.promptText}>{prompt}</Text>
              </Pressable>
            ))}
            <MaterialIcons color={color.verificationBlue} name="chevron-right" size={24} />
          </ScrollView>

          <View style={styles.composer}>
            <View style={styles.attachmentRow}>
              <MaterialIcons color={color.verificationBlue} name="image" size={22} />
              <MaterialIcons color={color.verificationBlue} name="post-add" size={22} />
            </View>
            <TextInput
              multiline
              onChangeText={setBody}
              onFocus={() => scrollToBottom()}
              placeholder="Type a message..."
              placeholderTextColor={color.textSubtle}
              style={styles.input}
              value={body}
            />
            <Pressable
              accessibilityLabel="Send message"
              onPress={() => onSend()}
              style={({ pressed }) => [styles.sendButton, pressed && styles.pressed]}>
              <MaterialIcons color={color.verificationBlue} name="send" size={24} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function reconcileConversationMessage(
  conversation: ConversationDetail | null,
  incoming: ConversationMessage,
  replaceMessageId?: string,
) {
  if (!conversation) return conversation;

  const messages = [...(conversation.messages as ThreadMessage[])];
  const exactIndex = messages.findIndex((message) => message.id === incoming.id);

  if (exactIndex >= 0) {
    messages[exactIndex] = { ...messages[exactIndex], ...incoming, localStatus: undefined };
  } else {
    const replacementIndex = replaceMessageId
      ? messages.findIndex((message) => message.id === replaceMessageId)
      : findMatchingOptimisticMessage(messages, incoming);

    if (replacementIndex >= 0) {
      messages[replacementIndex] = incoming;
    } else {
      messages.push(incoming);
    }
  }

  const sortedMessages = sortMessagesByCreatedAt(messages);

  return {
    ...conversation,
    lastMessage: getLatestConfirmedMessage(sortedMessages) ?? conversation.lastMessage,
    messages: sortedMessages,
    updatedAt: latestTimestamp(conversation.updatedAt, incoming.createdAt),
  };
}

function findMatchingOptimisticMessage(messages: ThreadMessage[], incoming: ConversationMessage) {
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  const incomingTime = new Date(incoming.createdAt).getTime();

  messages.forEach((message, index) => {
    if (
      !message.id.startsWith('local-') ||
      message.localStatus !== 'sending' ||
      message.senderId !== incoming.senderId ||
      message.body !== incoming.body
    ) {
      return;
    }

    const distance = Math.abs(new Date(message.createdAt).getTime() - incomingTime);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function sortMessagesByCreatedAt(messages: ThreadMessage[]) {
  return [...messages].sort((left, right) => {
    const timeDiff = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return left.id.localeCompare(right.id);
  });
}

function getLatestConfirmedMessage(messages: ThreadMessage[]) {
  return [...messages].reverse().find((message) => !message.localStatus) ?? null;
}

function latestTimestamp(left: string, right: string) {
  return new Date(right).getTime() > new Date(left).getTime() ? right : left;
}

function ConversationScreenSkeleton() {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Skeleton height={36} width={36} borderRadius={18} />
          <View style={styles.loadingHeaderAvatarWrap}>
            <Skeleton height={36} width={36} borderRadius={18} />
            <Skeleton height={8} width={8} borderRadius={4} style={styles.loadingOnlineDot} />
          </View>
          <View style={styles.headerCopy}>
            <Skeleton height={16} width="64%" />
            <Skeleton height={12} width="42%" />
          </View>
          <Skeleton height={36} width={36} borderRadius={18} />
        </View>

        <View style={styles.contextBlock}>
          <View style={styles.contextHeader}>
            <Skeleton height={22} width={22} borderRadius={6} />
            <View style={styles.contextCopy}>
              <Skeleton height={13} width="66%" />
              <Skeleton height={11} width="86%" />
            </View>
            <Skeleton height={22} width={22} borderRadius={11} />
          </View>
        </View>

        <View style={styles.loadingThread}>
          <Skeleton height={12} width={104} style={styles.loadingThreadStatus} />

          <View style={styles.loadingMessageRowSeparated}>
            <View style={styles.avatarSlot} />
            <View style={styles.loadingMessageStack}>
              <Skeleton height={38} width="72%" borderRadius={18} style={styles.loadingBubbleTheirTop} />
              <Skeleton height={34} width="58%" borderRadius={18} style={styles.loadingBubbleTheirBottom} />
            </View>
          </View>

          <View style={styles.loadingMessageRow}>
            <SkeletonCircle size={27} />
            <View style={styles.loadingMessageStack}>
              <Skeleton height={42} width="64%" borderRadius={18} />
            </View>
          </View>

          <View style={styles.loadingMessageRowMineSeparated}>
            <View style={styles.loadingMessageStackMine}>
              <Skeleton height={38} width="68%" borderRadius={18} style={styles.loadingBubbleMineTop} />
              <Skeleton height={50} width="76%" borderRadius={18} style={styles.loadingBubbleMineBottom} />
            </View>
          </View>

          <View style={styles.loadingMessageRowSeparated}>
            <View style={styles.avatarSlot} />
            <View style={styles.loadingMessageStack}>
              <Skeleton height={34} width="46%" borderRadius={18} />
            </View>
          </View>

          <View style={styles.loadingMessageRowMine}>
            <View style={styles.loadingMessageStackMine}>
              <Skeleton height={36} width="42%" borderRadius={18} />
            </View>
          </View>
        </View>

        <View style={styles.composerWrap}>
          <View style={styles.loadingPromptRow}>
            <Skeleton height={32} width={152} borderRadius={16} />
            <Skeleton height={32} width={184} borderRadius={16} />
            <Skeleton height={32} width={132} borderRadius={16} />
            <Skeleton height={24} width={24} borderRadius={12} />
          </View>
          <View style={styles.loadingComposerRow}>
            <View style={styles.attachmentRow}>
              <Skeleton height={22} width={22} borderRadius={6} />
              <Skeleton height={22} width={22} borderRadius={6} />
            </View>
            <Skeleton height={42} width="100%" borderRadius={20} style={styles.loadingComposerInput} />
            <Skeleton height={24} width={24} borderRadius={12} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function ConversationContextCard({
  canMarkHired,
  canOpenProfile,
  conversation,
  expanded,
  onMarkHired,
  onOpenPost,
  onOpenProfile,
  onToggleExpanded,
}: {
  canMarkHired: boolean;
  canOpenProfile: boolean;
  conversation: ConversationDetail;
  expanded: boolean;
  onMarkHired: () => void;
  onOpenPost: () => void;
  onOpenProfile: () => void;
  onToggleExpanded: () => void;
}) {
  const context = getContextSummary(conversation);

  return (
    <View style={styles.contextBlock}>
      <Pressable accessibilityRole="button" onPress={onToggleExpanded} style={styles.contextHeader}>
        <MaterialIcons color={color.verificationBlue} name="business-center" size={17} />
        <View style={styles.contextCopy}>
          <Text numberOfLines={1} style={styles.contextTitle}>{context.title}</Text>
          <Text numberOfLines={1} style={styles.contextMeta}>{context.meta}</Text>
        </View>
        <MaterialIcons
          color={color.textSubtle}
          name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={22}
        />
      </Pressable>
      {expanded ? (
        <View style={styles.contextActions}>
          <SmallActionButton label={conversation.jobId ? 'View Job' : 'View Service'} onPress={onOpenPost} />
          {canOpenProfile ? (
            <SmallActionButton label="View Profile" onPress={onOpenProfile} />
          ) : null}
          {canMarkHired ? <SmallActionButton label="Mark Hired" onPress={onMarkHired} /> : null}
        </View>
      ) : null}
    </View>
  );
}

function SmallActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}>
      <Text style={styles.smallActionText}>{label}</Text>
    </Pressable>
  );
}

function MessageBubble({
  currentUserId,
  message,
  nextMessage,
  onRetryFailed,
  onToggleTime,
  previousMessage,
  showTime,
}: {
  currentUserId?: string;
  message: ThreadMessage;
  nextMessage?: ThreadMessage;
  onRetryFailed?: () => void;
  onToggleTime: () => void;
  previousMessage?: ThreadMessage;
  showTime: boolean;
}) {
  const mine = message.senderId === currentUserId;
  const previousSameSender = previousMessage?.senderId === message.senderId;
  const nextSameSender = nextMessage?.senderId === message.senderId;
  const showAvatar = !mine && !nextSameSender;

  return (
    <View
      style={[
        styles.messageLine,
        previousSameSender ? styles.messageLineGrouped : styles.messageLineSeparated,
        mine && styles.messageLineMine,
      ]}>
      {!mine ? (
        <View style={styles.avatarSlot}>
          {showAvatar ? <View style={styles.bubbleAvatar}><Text style={styles.bubbleAvatarText}>K</Text></View> : null}
        </View>
      ) : null}
      <View style={[styles.messageStack, mine && styles.messageStackMine]}>
        <Pressable
          accessibilityRole="button"
          onPress={onToggleTime}
          style={[
            styles.messageBubble,
            previousSameSender && (mine ? styles.myMessageGroupedTop : styles.theirMessageGroupedTop),
            nextSameSender && (mine ? styles.myMessageGroupedBottom : styles.theirMessageGroupedBottom),
            mine ? styles.myMessage : styles.theirMessage,
          ]}>
          <Text style={[styles.messageText, mine && styles.myMessageText]}>{message.body}</Text>
        </Pressable>
        {showTime ? (
          <Text style={[styles.messageTime, mine && styles.myMessageTime]}>
            {formatTime(message.createdAt)}
          </Text>
        ) : null}
        {message.localStatus === 'sending' ? (
          <Text style={[styles.messageStatus, mine && styles.myMessageTime]}>Sending</Text>
        ) : null}
        {message.localStatus === 'failed' ? (
          <Pressable accessibilityRole="button" onPress={onRetryFailed}>
            <Text style={[styles.messageStatus, styles.failedMessageStatus]}>Failed to send. Tap to retry.</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function ConversationUnavailableScreen({
  message,
  onBack,
}: {
  message: string;
  onBack: () => void;
}) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" onPress={onBack} style={styles.headerIcon}>
            <MaterialIcons color={color.text} name="arrow-back-ios" size={18} />
          </Pressable>
          <Text style={styles.headerTitle}>Conversation</Text>
          <View style={styles.headerIcon} />
        </View>
        <View style={styles.unavailableState}>
          <MaterialIcons color={color.textSubtle} name="chat-bubble-outline" size={40} />
          <Text style={styles.unavailableTitle}>Conversation unavailable</Text>
          <Text style={styles.unavailableBody}>{message}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function getContextSummary(conversation: ConversationDetail) {
  if (conversation.job) {
    const budget = formatJobBudget(conversation.job);
    return {
      title: formatJobPostTitle({
        title: conversation.job.title,
        serviceNeeded: conversation.job.serviceNeeded,
        category: conversation.job.category,
      }),
      subtitle: `Job by ${conversation.client?.fullName ?? 'Konektado resident'}`,
      meta: `${getMarketplaceLocation(conversation.job)} - ${conversation.job.scheduleText ?? 'Schedule to coordinate'} - ${budget}`,
    };
  }

  if (conversation.service) {
    return {
      title: formatServicePostTitle({
        title: conversation.service.title,
        category: conversation.service.category,
        cue: conversation.service.isActive ? 'availableFor' : 'offers',
      }),
      subtitle: `Service by ${conversation.provider?.fullName ?? 'Konektado resident'}`,
      meta: `${getMarketplaceLocation(conversation.service)} - ${formatServiceRate(conversation.service)}`,
    };
  }

  return {
    title: 'Marketplace chat',
    subtitle: 'Konektado conversation',
    meta: 'Details to coordinate',
  };
}

function getParticipantSubtitle(conversation: ConversationDetail | null, currentUserId?: string) {
  if (!conversation) return 'Loading conversation';
  if (conversation.jobId) return conversation.clientId === currentUserId ? 'Interested worker' : 'Posted this job';
  return conversation.clientId === currentUserId ? 'Service provider' : 'Service inquiry';
}

function getThreadStatusText(conversation: ConversationDetail, currentUserId?: string) {
  if (conversation.status === 'hired') return 'Worker marked as hired';
  if (conversation.status === 'reported') return 'This conversation has been reported';
  if (conversation.startedBy === currentUserId) return 'You started this chat';
  return 'They started this chat';
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
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: color.background,
    flex: 1,
  },
  screen: {
    backgroundColor: color.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerIcon: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerAvatar: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    position: 'relative',
    width: 36,
  },
  headerAvatarText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  onlineDot: {
    bottom: 1,
    right: 1,
  },
  headerCopy: {
    flex: 1,
    gap: 3,
  },
  headerTitle: {
    color: '#050505',
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 22,
  },
  headerSubtitle: {
    color: color.textSubtle,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 15,
  },
  messages: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  loadingHeaderAvatarWrap: {
    height: 36,
    width: 36,
  },
  loadingOnlineDot: {
    borderColor: color.background,
    borderWidth: 2,
    bottom: 0,
    position: 'absolute',
    right: 0,
  },
  loadingThread: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  loadingThreadStatus: {
    alignSelf: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  loadingMessageRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  loadingMessageRowSeparated: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    marginTop: 9,
  },
  loadingMessageRowMine: {
    alignItems: 'flex-end',
    marginTop: 2,
  },
  loadingMessageRowMineSeparated: {
    alignItems: 'flex-end',
    marginTop: 9,
  },
  loadingMessageStack: {
    alignItems: 'flex-start',
    flex: 1,
    gap: 2,
    maxWidth: '76%',
  },
  loadingMessageStackMine: {
    alignItems: 'flex-end',
    gap: 2,
    maxWidth: '76%',
    width: '100%',
  },
  loadingBubbleTheirTop: {
    borderBottomLeftRadius: 6,
  },
  loadingBubbleTheirBottom: {
    borderTopLeftRadius: 6,
  },
  loadingBubbleMineTop: {
    borderBottomRightRadius: 6,
  },
  loadingBubbleMineBottom: {
    borderTopRightRadius: 6,
  },
  contextBlock: {
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  contextHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  contextCopy: {
    flex: 1,
    gap: 2,
  },
  contextTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 17,
  },
  contextMeta: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 11,
    lineHeight: 15,
  },
  contextActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  smallAction: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: 8,
    flex: 1,
    minHeight: 30,
    minWidth: 100,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  smallActionText: {
    color: color.text,
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
    lineHeight: 18,
  },
  threadStatus: {
    color: color.textSubtle,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
    paddingVertical: 4,
    textAlign: 'center',
  },
  emptyThread: {
    alignItems: 'center',
    backgroundColor: color.cardTint,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  emptyTitle: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 16,
  },
  emptyBody: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  messageLine: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 6,
  },
  messageLineGrouped: {
    marginTop: 2,
  },
  messageLineSeparated: {
    marginTop: 9,
  },
  messageLineMine: {
    justifyContent: 'flex-end',
  },
  avatarSlot: {
    width: 27,
  },
  bubbleAvatar: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: 14,
    height: 27,
    justifyContent: 'center',
    width: 27,
  },
  bubbleAvatarText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    lineHeight: 14,
  },
  messageStack: {
    alignItems: 'flex-start',
    maxWidth: '76%',
  },
  messageStackMine: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  myMessageGroupedTop: {
    borderTopRightRadius: 6,
  },
  myMessageGroupedBottom: {
    borderBottomRightRadius: 6,
  },
  theirMessageGroupedTop: {
    borderTopLeftRadius: 6,
  },
  theirMessageGroupedBottom: {
    borderBottomLeftRadius: 6,
  },
  myMessage: {
    backgroundColor: color.verificationBlue,
  },
  theirMessage: {
    backgroundColor: color.surfaceAlt,
  },
  messageText: {
    color: color.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: color.background,
  },
  messageTime: {
    color: color.textSubtle,
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
  },
  myMessageTime: {
    color: color.textSubtle,
  },
  messageStatus: {
    color: color.textSubtle,
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
  },
  failedMessageStatus: {
    color: color.danger,
  },
  composerWrap: {
    backgroundColor: color.background,
    borderTopColor: color.border,
    borderTopWidth: 1,
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  loadingPromptRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 2,
  },
  loadingComposerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 8,
  },
  loadingComposerInput: {
    flex: 1,
  },
  promptRow: {
    alignItems: 'center',
    gap: 8,
  },
  sendError: {
    color: color.danger,
    fontFamily: 'Satoshi-Regular',
    fontSize: 11,
    lineHeight: 15,
  },
  promptPill: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 14,
  },
  promptText: {
    color: color.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  composer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 10,
  },
  attachmentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    height: 42,
  },
  input: {
    backgroundColor: color.surfaceAlt,
    borderRadius: 20,
    color: color.text,
    flex: 1,
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    lineHeight: 20,
    maxHeight: 110,
    minHeight: 42,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  sendButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 34,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.55,
  },
  unavailableState: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 64,
  },
  unavailableTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  unavailableBody: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});


