import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Skeleton } from '@/components/Skeleton';
import { color, radius } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import {
  archiveConversation,
  getConversation,
  markWorkerHired,
  reportConversation,
  sendMessage,
} from '@/services/conversation.service';
import { getMarketplaceLocation } from '@/services/marketplace.helpers';
import type { ConversationDetail, ConversationMessage } from '@/types/marketplace.types';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

const JOB_PROMPTS = ['Where is the exact location?', 'What should I bring?', 'Send me your location'];
const SERVICE_PROMPTS = ['Are you available?', 'Can we discuss the schedule?', 'How much is your rate?'];
const REPORT_REASONS = [
  'Fake Profile / Impersonation',
  'Spam / Unwanted Messages',
  'Scam / Fraudulent Activity',
  'Inappropriate Content',
  'Harassment / Bullying',
  'Job Listing Violation',
  'Off-platform Transaction Request',
  'Other Violations',
];

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function ConversationDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const params = useLocalSearchParams<{ conversationId?: string | string[] }>();
  const conversationId = getParamValue(params.conversationId);
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [leaveVisible, setLeaveVisible] = useState(false);

  const load = () => {
    if (!conversationId) return;

    getConversation(conversationId).then((result) => {
      if (result.error) {
        Alert.alert('Conversation', result.error);
      } else {
        setConversation(result.data);
      }

      setLoading(false);
    });
  };

  useEffect(load, [conversationId]);

  const other =
    conversation?.clientId === profile?.id ? conversation?.provider : conversation?.client;
  const isClient = conversation?.clientId === profile?.id;
  const isJobConversation = Boolean(conversation?.jobId);
  const canMarkHired =
    Boolean(conversation?.jobId) && isClient && conversation?.status !== 'hired';
  const prompts = isJobConversation ? JOB_PROMPTS : SERVICE_PROMPTS;

  const onSend = async (overrideBody?: string) => {
    if (!conversationId) return;

    const messageBody = overrideBody ?? body;
    setSending(true);
    const result = await sendMessage({ conversationId, body: messageBody });
    setSending(false);

    if (result.error) {
      Alert.alert('Message', result.error);
      return;
    }

    if (!overrideBody) setBody('');
    load();
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

  const onArchive = async () => {
    if (!conversationId) return;

    const result = await archiveConversation({ conversationId });
    if (result.error) {
      Alert.alert('Delete chat', result.error);
      return;
    }

    setLeaveVisible(false);
    router.back();
  };

  const onReport = async (reason: string) => {
    if (!conversationId) return;

    const result = await reportConversation({ conversationId });
    if (result.error) {
      Alert.alert('Report user', result.error);
      return;
    }

    setConversation(result.data);
    setReportVisible(false);
    Alert.alert('Report submitted', `Thanks for the report. Reason: ${reason}`);
  };

  const openPost = () => {
    if (conversation?.jobId) {
      router.push({ pathname: '/job/[jobId]', params: { jobId: conversation.jobId } });
      return;
    }

    if (conversation?.serviceId) {
      router.push({ pathname: '/worker/[workerId]', params: { workerId: conversation.serviceId } });
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.headerIcon}>
            <MaterialIcons color={color.text} name="arrow-back-ios" size={18} />
          </Pressable>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{getInitials(other?.fullName ?? 'Resident')}</Text>
            <View style={styles.onlineDot} />
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
            onPress={() => setDetailsVisible(true)}
            style={styles.headerIcon}>
            <MaterialIcons color={color.verificationBlue} name="more-vert" size={22} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.messages, { paddingBottom: 18 + Math.max(insets.bottom, 10) }]}
          showsVerticalScrollIndicator={false}>
          {loading ? <ConversationSkeleton /> : null}

          {conversation ? (
            <ConversationContextCard
              canMarkHired={canMarkHired}
              conversation={conversation}
              onMarkHired={onMarkHired}
              onOpenPost={openPost}
              onOpenProfile={() => {
                if (conversation.serviceId) {
                  router.push({
                    pathname: '/worker/[workerId]',
                    params: { workerId: conversation.serviceId },
                  });
                  return;
                }
                Alert.alert('Profile', 'Public client profiles are not a separate route yet.');
              }}
            />
          ) : null}

          {conversation ? (
            <Text style={styles.threadStatus}>{getThreadStatusText(conversation, profile?.id)}</Text>
          ) : null}

          {!loading && !conversation?.messages.length ? (
            <View style={styles.emptyThread}>
              <MaterialIcons color={color.textSubtle} name="speaker-notes-off" size={24} />
              <View>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptyBody}>Start with a short, clear question.</Text>
              </View>
            </View>
          ) : null}

          {conversation?.messages.map((message) => (
            <MessageBubble
              currentUserId={profile?.id}
              key={message.id}
              message={message}
            />
          ))}
        </ScrollView>

        <View style={styles.composerWrap}>
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
              placeholder="Type a message..."
              placeholderTextColor={color.textSubtle}
              style={styles.input}
              value={body}
            />
            <Pressable
              accessibilityLabel="Send message"
              disabled={sending}
              onPress={() => onSend()}
              style={({ pressed }) => [styles.sendButton, pressed && styles.pressed, sending && styles.disabled]}>
              <MaterialIcons color={color.verificationBlue} name="send" size={24} />
            </Pressable>
          </View>
        </View>

        <ConversationDetailsModal
          canMarkHired={canMarkHired}
          conversation={conversation}
          onClose={() => setDetailsVisible(false)}
          onLeave={() => setLeaveVisible(true)}
          onMarkHired={onMarkHired}
          onOpenPost={openPost}
          onReport={() => setReportVisible(true)}
          visible={detailsVisible}
        />

        <ReportSheet
          onClose={() => setReportVisible(false)}
          onReport={onReport}
          visible={reportVisible}
        />

        <LeaveChatDialog
          onCancel={() => setLeaveVisible(false)}
          onLeave={onArchive}
          visible={leaveVisible}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ConversationContextCard({
  canMarkHired,
  conversation,
  onMarkHired,
  onOpenPost,
  onOpenProfile,
}: {
  canMarkHired: boolean;
  conversation: ConversationDetail;
  onMarkHired: () => void;
  onOpenPost: () => void;
  onOpenProfile: () => void;
}) {
  const context = getContextSummary(conversation);

  return (
    <View style={styles.contextBlock}>
      <View style={styles.contextHeader}>
        <MaterialIcons color={color.verificationBlue} name="business-center" size={16} />
        <View style={styles.contextCopy}>
          <Text style={styles.contextTitle}>{context.title}</Text>
          <Text style={styles.contextMeta}>{context.meta}</Text>
        </View>
      </View>
      <View style={styles.contextActions}>
        <SmallActionButton label={conversation.jobId ? 'View Job' : 'View Service'} onPress={onOpenPost} />
        <SmallActionButton label={conversation.jobId ? 'View Client' : 'View Profile'} onPress={onOpenProfile} />
        {canMarkHired ? <SmallActionButton label="Mark Hired" onPress={onMarkHired} /> : null}
      </View>
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
}: {
  currentUserId?: string;
  message: ConversationMessage;
}) {
  const mine = message.senderId === currentUserId;
  return (
    <View style={[styles.messageLine, mine && styles.messageLineMine]}>
      {!mine ? <View style={styles.bubbleAvatar}><Text style={styles.bubbleAvatarText}>K</Text></View> : null}
      <View style={[styles.messageStack, mine && styles.messageStackMine]}>
        <View style={[styles.messageBubble, mine ? styles.myMessage : styles.theirMessage]}>
          <Text style={[styles.messageText, mine && styles.myMessageText]}>{message.body}</Text>
        </View>
        <Text style={[styles.messageTime, mine && styles.myMessageTime]}>
          {formatTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

function ConversationDetailsModal({
  canMarkHired,
  conversation,
  onClose,
  onLeave,
  onMarkHired,
  onOpenPost,
  onReport,
  visible,
}: {
  canMarkHired: boolean;
  conversation: ConversationDetail | null;
  onClose: () => void;
  onLeave: () => void;
  onMarkHired: () => void;
  onOpenPost: () => void;
  onReport: () => void;
  visible: boolean;
}) {
  const context = conversation ? getContextSummary(conversation) : null;

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.detailsSafeArea}>
        <View style={styles.detailsHeader}>
          <Pressable onPress={onClose} style={styles.headerIcon}>
            <MaterialIcons color={color.text} name="arrow-back-ios" size={18} />
          </Pressable>
          <Text style={styles.detailsHeaderTitle}>Details</Text>
          <View style={styles.headerIcon} />
        </View>

        <ScrollView contentContainerStyle={styles.detailsContent} showsVerticalScrollIndicator={false}>
          {context ? (
            <View style={styles.detailsHero}>
              <View style={styles.detailsAvatar}>
                <Text style={styles.detailsAvatarText}>{getInitials(context.title)}</Text>
                <View style={styles.detailsDot} />
              </View>
              <Text style={styles.detailsTitle}>{context.title}</Text>
              <Text style={styles.detailsSubtitle}>{context.subtitle}</Text>
              <View style={styles.detailsHeroActions}>
                <IconAction label={conversation?.jobId ? 'View Post' : 'View Service'} icon="article" onPress={onOpenPost} />
                <IconAction
                  label="View Profile"
                  icon="person"
                  onPress={() => Alert.alert('Profile', 'Public profile route can be added in a later slice.')}
                />
              </View>
            </View>
          ) : null}

          {conversation ? (
            <View style={styles.detailsCard}>
              <Text style={styles.detailsSectionTitle}>{conversation.jobId ? 'Job Details' : 'Service Details'}</Text>
              <View style={styles.detailsGrid}>
                {getDetailMetrics(conversation).map((metric) => (
                  <View key={metric.label} style={styles.detailsMetric}>
                    <Text style={styles.detailsMetricLabel}>{metric.label}</Text>
                    <Text style={styles.detailsMetricValue}>{metric.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <ActionList title="Actions">
            {canMarkHired ? (
              <ActionRow icon="check-circle" label="Mark worker hired" onPress={onMarkHired} />
            ) : null}
            <ActionRow disabled icon="rate-review" label="Leave review" onPress={() => {}} />
            <ActionRow icon="search" label="Search a conversation" onPress={() => Alert.alert('Search', 'Use the Messages search field from the inbox.')} />
          </ActionList>

          <ActionList title="Privacy and support">
            <ActionRow
              description="Give feedback and report conversation"
              icon="report"
              label="Report"
              onPress={onReport}
            />
            <ActionRow danger icon="logout" label="Delete chat" onPress={onLeave} />
          </ActionList>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function IconAction({
  icon,
  label,
  onPress,
}: {
  icon: MaterialIconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}>
      <MaterialIcons color={color.textMuted} name={icon} size={24} />
      <Text style={styles.iconActionText}>{label}</Text>
    </Pressable>
  );
}

function ActionList({ children, title }: { children: ReactNode; title: string }) {
  return (
    <View style={styles.actionListWrap}>
      <Text style={styles.actionListTitle}>{title}</Text>
      <View style={styles.actionList}>{children}</View>
    </View>
  );
}

function ActionRow({
  danger,
  description,
  disabled,
  icon,
  label,
  onPress,
}: {
  danger?: boolean;
  description?: string;
  disabled?: boolean;
  icon: MaterialIconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        pressed && styles.pressed,
        disabled && styles.actionRowDisabled,
      ]}>
      <MaterialIcons color={danger ? color.danger : color.text} name={icon} size={22} />
      <View style={styles.actionRowCopy}>
        <Text style={[styles.actionRowLabel, danger && styles.actionRowDanger]}>{label}</Text>
        {description ? <Text style={styles.actionRowDescription}>{description}</Text> : null}
      </View>
    </Pressable>
  );
}

function ReportSheet({
  onClose,
  onReport,
  visible,
}: {
  onClose: () => void;
  onReport: (reason: string) => void;
  visible: boolean;
}) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.sheetBackdrop}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.reportSheet}>
          <Text style={styles.reportTitle}>Report user</Text>
          <Text style={styles.reportBody}>
            We will not let the person know who reported them. If someone is in immediate danger,
            call local emergency services. Do not wait.
          </Text>
          {REPORT_REASONS.map((reason) => (
            <Pressable key={reason} onPress={() => onReport(reason)} style={styles.reportReason}>
              <Text style={styles.reportReasonText}>{reason}</Text>
              <MaterialIcons color={color.verificationBlue} name="chevron-right" size={24} />
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

function LeaveChatDialog({
  onCancel,
  onLeave,
  visible,
}: {
  onCancel: () => void;
  onLeave: () => void;
  visible: boolean;
}) {
  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.dialogBackdrop}>
        <View style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>Delete chat?</Text>
          <Text style={styles.dialogBody}>This removes the conversation from your active inbox.</Text>
          <PrimaryButton label="Delete" onPress={onLeave} />
          <Pressable onPress={onCancel} style={styles.dialogCancel}>
            <Text style={styles.dialogCancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ConversationSkeleton() {
  return (
    <>
      <View style={styles.contextBlock}>
        <Skeleton height={14} width="52%" />
        <Skeleton height={12} width="74%" />
        <View style={styles.contextActions}>
          <Skeleton height={28} width="48%" borderRadius={8} />
          <Skeleton height={28} width="48%" borderRadius={8} />
        </View>
      </View>
      <Skeleton height={32} width="70%" borderRadius={12} />
      <Skeleton height={48} width="68%" borderRadius={12} style={{ alignSelf: 'flex-end' }} />
    </>
  );
}

function getContextSummary(conversation: ConversationDetail) {
  if (conversation.job) {
    const budget = conversation.job.budgetAmount ? `PHP ${conversation.job.budgetAmount}` : 'Budget to coordinate';
    return {
      title: conversation.job.title,
      subtitle: `Job by ${conversation.client?.fullName ?? 'Konektado resident'}`,
      meta: `${getMarketplaceLocation(conversation.job)} · ${conversation.job.scheduleText ?? 'Schedule to coordinate'} · ${budget}`,
    };
  }

  if (conversation.service) {
    return {
      title: conversation.service.title,
      subtitle: `Service by ${conversation.provider?.fullName ?? 'Konektado resident'}`,
      meta: `${getMarketplaceLocation(conversation.service)} · ${conversation.service.rateText ?? 'Rate to coordinate'}`,
    };
  }

  return {
    title: 'Marketplace chat',
    subtitle: 'Konektado conversation',
    meta: 'Details to coordinate',
  };
}

function getDetailMetrics(conversation: ConversationDetail) {
  if (conversation.job) {
    return [
      { label: 'Budget', value: conversation.job.budgetAmount ? `PHP ${conversation.job.budgetAmount}` : 'To coordinate' },
      { label: 'Location', value: getMarketplaceLocation(conversation.job) },
      { label: 'Schedule', value: conversation.job.scheduleText ?? 'Not yet agreed' },
      { label: 'Job Status', value: formatStatus(conversation.status) },
    ];
  }

  if (conversation.service) {
    return [
      { label: 'Rate', value: conversation.service.rateText ?? 'To coordinate' },
      { label: 'Location', value: getMarketplaceLocation(conversation.service) },
      { label: 'Availability', value: conversation.service.availabilityText ?? 'To coordinate' },
      { label: 'Status', value: formatStatus(conversation.status) },
    ];
  }

  return [{ label: 'Status', value: formatStatus(conversation.status) }];
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

function formatStatus(value: string) {
  return value
    .split('_')
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
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
    flexDirection: 'row',
    gap: 12,
    minHeight: 70,
    paddingHorizontal: 19,
    paddingVertical: 13,
  },
  headerIcon: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  headerAvatar: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerAvatarText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  onlineDot: {
    backgroundColor: color.brandYellow,
    borderColor: color.background,
    borderRadius: 5,
    borderWidth: 1,
    bottom: 1,
    height: 10,
    position: 'absolute',
    right: 1,
    width: 10,
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
    gap: 9,
    paddingHorizontal: 17,
    paddingTop: 0,
  },
  contextBlock: {
    backgroundColor: color.cardTint,
    gap: 10,
    marginHorizontal: -17,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  contextHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  contextCopy: {
    flex: 1,
    gap: 2,
  },
  contextTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    lineHeight: 18,
  },
  contextMeta: {
    color: color.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  contextActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  smallAction: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderRadius: 8,
    flex: 1,
    minHeight: 28,
    minWidth: 100,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  smallActionText: {
    color: color.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
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
  messageLineMine: {
    justifyContent: 'flex-end',
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
    maxWidth: '78%',
  },
  messageStackMine: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  myMessage: {
    backgroundColor: color.verificationBlue,
  },
  theirMessage: {
    backgroundColor: '#FBFBFB',
  },
  messageText: {
    color: color.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  myMessageText: {
    color: color.background,
  },
  messageTime: {
    color: color.textSubtle,
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  myMessageTime: {
    color: color.textSubtle,
  },
  composerWrap: {
    backgroundColor: color.background,
    gap: 10,
    paddingHorizontal: 21,
    paddingTop: 10,
  },
  promptRow: {
    alignItems: 'center',
    gap: 6,
  },
  promptPill: {
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 26,
    paddingHorizontal: 12,
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
    paddingBottom: 8,
  },
  attachmentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    height: 38,
  },
  input: {
    backgroundColor: '#F2F2F2',
    borderRadius: 14,
    color: color.text,
    flex: 1,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
    maxHeight: 110,
    minHeight: 37,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sendButton: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 26,
  },
  detailsSafeArea: {
    backgroundColor: color.background,
    flex: 1,
  },
  detailsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 50,
    paddingHorizontal: 19,
  },
  detailsHeaderTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 22,
  },
  detailsContent: {
    gap: 17,
    paddingHorizontal: 21,
    paddingBottom: 40,
  },
  detailsHero: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 84,
    paddingVertical: 8,
  },
  detailsAvatar: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: 28,
    height: 55,
    justifyContent: 'center',
    width: 55,
  },
  detailsAvatarText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 22,
  },
  detailsDot: {
    backgroundColor: color.border,
    borderRadius: 7,
    bottom: 0,
    height: 13,
    position: 'absolute',
    right: 0,
    width: 13,
  },
  detailsTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    lineHeight: 23,
    textAlign: 'center',
  },
  detailsSubtitle: {
    color: color.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
  },
  detailsHeroActions: {
    flexDirection: 'row',
    gap: 11,
    marginTop: 8,
  },
  iconAction: {
    alignItems: 'center',
    gap: 4,
  },
  iconActionText: {
    color: color.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
    lineHeight: 18,
  },
  detailsCard: {
    backgroundColor: '#F2F2F2',
    borderRadius: 14,
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  detailsSectionTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  detailsGrid: {
    columnGap: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
  },
  detailsMetric: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  detailsMetricLabel: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 18,
  },
  detailsMetricValue: {
    color: color.primary,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  actionListWrap: {
    gap: 8,
  },
  actionListTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 18,
  },
  actionList: {
    backgroundColor: '#F2F2F2',
    borderRadius: 8,
    gap: 5,
    padding: 4,
  },
  actionRow: {
    alignItems: 'center',
    backgroundColor: '#EAEAEA',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionRowDisabled: {
    opacity: 0.41,
  },
  actionRowCopy: {
    flex: 1,
    gap: 3,
  },
  actionRowLabel: {
    color: color.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  actionRowDanger: {
    color: color.danger,
  },
  actionRowDescription: {
    color: color.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
    lineHeight: 13,
  },
  sheetBackdrop: {
    backgroundColor: 'rgba(58,58,58,0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  reportSheet: {
    backgroundColor: color.cardTint,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 10,
    minHeight: '88%',
    padding: 24,
  },
  reportTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 22,
  },
  reportBody: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  reportReason: {
    alignItems: 'center',
    borderBottomColor: '#C0C0C0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 36,
    paddingVertical: 6,
  },
  reportReasonText: {
    color: color.text,
    flex: 1,
    fontFamily: 'Satoshi-Regular',
    fontSize: 16,
    lineHeight: 22,
  },
  dialogBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(58,58,58,0.35)',
    flex: 1,
    justifyContent: 'center',
    padding: 27,
  },
  dialogCard: {
    backgroundColor: color.background,
    borderRadius: 16,
    gap: 12,
    padding: 24,
    width: '100%',
  },
  dialogTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  dialogBody: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  dialogCancel: {
    alignItems: 'center',
    backgroundColor: color.cardTint,
    borderRadius: 8,
    minHeight: 38,
    justifyContent: 'center',
  },
  dialogCancelText: {
    color: color.text,
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.55,
  },
});
