import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { useFeedback } from '@/components/FeedbackProvider';
import { PresenceDot } from '@/components/PresenceDot';
import { ReportSheet, type ReportSheetSubmitValue } from '@/components/ReportSheet';
import { Skeleton } from '@/components/Skeleton';
import { color } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import {
  archiveConversation,
  getConversation,
  markHiredJobCompleted,
  markWorkerHired,
  reportConversation,
} from '@/services/conversation.service';
import {
  formatJobBudget,
  formatJobPostTitle,
  formatServiceRate,
  formatServicePostTitle,
  getMarketplaceLocation,
  isPresenceActive,
} from '@/services/marketplace.helpers';
import { createReview, getMyReviewForJob } from '@/services/review.service';
import type { ConversationDetail, Review } from '@/types/marketplace.types';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function ConversationDetailsScreen() {
  const router = useRouter();
  const { showSuccessToast } = useFeedback();
  const { profile } = useProfile();
  const params = useLocalSearchParams<{ conversationId?: string | string[] }>();
  const conversationId = getParamValue(params.conversationId);
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportVisible, setReportVisible] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittedReview, setSubmittedReview] = useState<Review | null>(null);

  const load = () => {
    if (!conversationId) return;

    getConversation(conversationId).then((result) => {
      if (result.error) {
        Alert.alert('Details', result.error);
      } else {
        setConversation(result.data);
      }

      setLoading(false);
    });
  };

  useEffect(load, [conversationId]);

  const isClient = conversation?.clientId === profile?.id;
  const canMarkHired = Boolean(conversation?.jobId) && isClient && conversation?.status !== 'hired';
  const canMarkCompleted =
    Boolean(conversation?.jobId) &&
    isClient &&
    conversation?.status === 'hired' &&
    conversation?.job?.status === 'in_progress';
  const context = conversation ? getContextSummary(conversation) : null;
  const other = conversation?.clientId === profile?.id ? conversation?.provider : conversation?.client;
  const reviewState = getReviewState({
    conversation,
    isClient,
    loading: reviewLoading,
    submittedReview,
  });

  useEffect(() => {
    let active = true;

    if (
      !conversation?.jobId ||
      !conversation.providerId ||
      !isClient ||
      conversation.job?.acceptedProviderId !== conversation.providerId
    ) {
      setSubmittedReview(null);
      setReviewLoading(false);
      return;
    }

    setReviewLoading(true);
    getMyReviewForJob({
      jobId: conversation.jobId,
      revieweeId: conversation.providerId,
    }).then((result) => {
      if (!active) return;
      if (result.error) {
        setSubmittedReview(null);
      } else {
        setSubmittedReview(result.data);
      }
      setReviewLoading(false);
    });

    return () => {
      active = false;
    };
  }, [
    conversation?.job?.acceptedProviderId,
    conversation?.jobId,
    conversation?.providerId,
    isClient,
  ]);

  const openPost = () => {
    if (conversation?.jobId) {
      router.push({ pathname: '/job/[jobId]', params: { jobId: conversation.jobId } });
      return;
    }

    if (conversation?.serviceId) {
      router.push({ pathname: '/services/[serviceId]', params: { serviceId: conversation.serviceId } });
    }
  };

  const canOpenProfile = Boolean(
    conversation &&
      (conversation.clientId !== profile?.id || conversation.serviceId),
  );

  const openProfile = () => {
    if (!conversation) return;

    if (conversation.clientId !== profile?.id) {
      router.push({ pathname: '/client/[clientId]' as never, params: { clientId: conversation.clientId } });
      return;
    }

    if (conversation.serviceId) {
      router.push({ pathname: '/services/[serviceId]', params: { serviceId: conversation.serviceId } });
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

  const onMarkCompleted = async () => {
    if (!conversationId) return;

    setCompleting(true);
    const result = await markHiredJobCompleted({ conversationId });
    setCompleting(false);

    if (result.error) {
      Alert.alert('Mark completed', result.error);
      return;
    }

    setConversation(result.data);
    showSuccessToast('Job marked completed');
  };

  const onSubmitReview = async () => {
    if (!conversation?.jobId) return;

    setReviewError(null);
    setReviewSubmitting(true);
    const result = await createReview({
      jobId: conversation.jobId,
      revieweeId: conversation.providerId,
      rating: reviewRating,
      comment: reviewComment,
    });
    setReviewSubmitting(false);

    if (result.error) {
      setReviewError(result.error);
      return;
    }

    setSubmittedReview(result.data);
    setReviewVisible(false);
    setReviewComment('');
    setReviewRating(0);
    showSuccessToast('Review submitted');
  };

  const onReport = async ({ details, reason }: ReportSheetSubmitValue) => {
    if (!conversationId || !conversation) return;

    setReporting(true);
    const result = await reportConversation({
      conversationId,
      details,
      jobId: conversation.jobId,
      reason,
      reportedUserId:
        conversation.clientId === profile?.id ? conversation.providerId : conversation.clientId,
      serviceId: conversation.serviceId,
    });
    setReporting(false);

    if (result.error) {
      Alert.alert('Report user', result.error);
      return;
    }

    setConversation(result.data);
    setReportVisible(false);
    showSuccessToast('Report submitted');
  };

  const onDelete = async () => {
    if (!conversationId) return;

    const result = await archiveConversation({ conversationId });
    if (result.error) {
      Alert.alert('Delete chat', result.error);
      return;
    }

    setDeleteVisible(false);
    router.replace('/(tabs)/messages');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.headerIcon}>
            <MaterialIcons color={color.text} name="arrow-back-ios" size={18} />
          </Pressable>
          <Text style={styles.headerTitle}>Details</Text>
          <View style={styles.headerIcon} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          {loading ? <DetailsSkeleton /> : null}

          {context ? (
            <View style={styles.hero}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(context.title)}</Text>
                <PresenceDot active={isPresenceActive(other?.availability)} size={13} style={styles.onlineDot} />
              </View>
              <Text numberOfLines={2} style={styles.title}>{context.title}</Text>
              <Text numberOfLines={2} style={styles.subtitle}>{context.subtitle}</Text>
              <View style={styles.heroActions}>
                <IconAction
                  icon="article"
                  label={conversation?.jobId ? 'View Post' : 'View Service'}
                  onPress={openPost}
                />
                {canOpenProfile ? (
                  <IconAction icon="person" label="View Profile" onPress={openProfile} />
                ) : null}
              </View>
            </View>
          ) : null}

          {conversation ? (
            <View style={styles.detailsCard}>
              <Text style={styles.sectionTitle}>{conversation.jobId ? 'Job Details' : 'Service Details'}</Text>
              <View style={styles.detailsGrid}>
                {getDetailMetrics(conversation).map((metric) => (
                  <View key={metric.label} style={styles.metric}>
                    <Text style={styles.metricLabel}>{metric.label}</Text>
                    <Text style={styles.metricValue}>{metric.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {conversation ? (
            <>
              <ActionList title="Actions">
                {canMarkHired ? (
                  <ActionRow icon="check-circle" label="Mark worker hired" onPress={onMarkHired} />
                ) : null}
                {canMarkCompleted ? (
                  <ActionRow
                    description="Completing the job unlocks client feedback"
                    disabled={completing}
                    icon="task-alt"
                    label={completing ? 'Marking completed...' : 'Mark job completed'}
                    onPress={onMarkCompleted}
                  />
                ) : null}
                {reviewState.kind === 'submitted' ? (
                  <ActionRow
                    description={`${reviewState.review.rating}/5 submitted`}
                    disabled
                    icon="rate-review"
                    label="Review submitted"
                    onPress={() => {}}
                  />
                ) : (
                  <ActionRow
                    description={reviewState.description}
                    disabled={!reviewState.enabled}
                    icon="rate-review"
                    label="Leave review"
                    onPress={() => {
                      setReviewError(null);
                      setReviewVisible(true);
                    }}
                  />
                )}
                <ActionRow
                  description="Find chats from your inbox"
                  icon="search"
                  label="Search Messages"
                  onPress={() => router.push('/(tabs)/messages')}
                />
              </ActionList>

              <ActionList title="Privacy and support">
                <ActionRow
                  description="Give feedback and report conversation"
                  icon="report"
                  label="Report"
                  onPress={() => setReportVisible(true)}
                />
                <ActionRow
                  danger
                  description="Remove this conversation from your inbox"
                  icon="logout"
                  label="Delete chat"
                  onPress={() => setDeleteVisible(true)}
                />
              </ActionList>
            </>
          ) : null}
        </ScrollView>
      </View>

      <ReportSheet
        description="Tell us what happened in this conversation. The other person will not see your report."
        onClose={() => setReportVisible(false)}
        onSubmit={onReport}
        submitting={reporting}
        targetLabel={other?.fullName ?? 'this conversation'}
        title="Report conversation"
        visible={reportVisible}
      />

      <DeleteChatDialog
        onCancel={() => setDeleteVisible(false)}
        onDelete={onDelete}
        visible={deleteVisible}
      />
      <ReviewDialog
        comment={reviewComment}
        error={reviewError}
        onCancel={() => {
          if (!reviewSubmitting) {
            setReviewVisible(false);
            setReviewError(null);
          }
        }}
        onChangeComment={setReviewComment}
        onChangeRating={setReviewRating}
        onSubmit={onSubmitReview}
        rating={reviewRating}
        submitting={reviewSubmitting}
        visible={reviewVisible}
      />
    </SafeAreaView>
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
      <MaterialIcons color={color.textMuted} name={icon} size={22} />
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
        danger && styles.actionRowDangerSurface,
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

function DeleteChatDialog({
  onCancel,
  onDelete,
  visible,
}: {
  onCancel: () => void;
  onDelete: () => void;
  visible: boolean;
}) {
  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.dialogBackdrop}>
        <View style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>Delete chat?</Text>
          <Text style={styles.dialogBody}>This removes the conversation from your active inbox.</Text>
          <PrimaryButton label="Delete" onPress={onDelete} />
          <Pressable onPress={onCancel} style={styles.dialogCancel}>
            <Text style={styles.dialogCancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ReviewDialog({
  comment,
  error,
  onCancel,
  onChangeComment,
  onChangeRating,
  onSubmit,
  rating,
  submitting,
  visible,
}: {
  comment: string;
  error: string | null;
  onCancel: () => void;
  onChangeComment: (value: string) => void;
  onChangeRating: (value: number) => void;
  onSubmit: () => void;
  rating: number;
  submitting: boolean;
  visible: boolean;
}) {
  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.dialogBackdrop}>
        <View style={styles.reviewDialogCard}>
          <Text style={styles.dialogTitle}>Leave review</Text>
          <Text style={styles.dialogBody}>Rate the hired worker after this completed job.</Text>

          <View style={styles.ratingRow}>
            {Array.from({ length: 5 }).map((_, index) => {
              const value = index + 1;
              return (
                <Pressable
                  accessibilityLabel={`${value} star${value === 1 ? '' : 's'}`}
                  accessibilityRole="button"
                  key={value}
                  onPress={() => onChangeRating(value)}
                  style={({ pressed }) => [styles.ratingButton, pressed && styles.pressed]}>
                  <MaterialIcons
                    color={value <= rating ? color.brandYellow : color.textSubtle}
                    name={value <= rating ? 'star' : 'star-border'}
                    size={28}
                  />
                </Pressable>
              );
            })}
          </View>

          <TextInput
            multiline
            onChangeText={onChangeComment}
            placeholder="Optional comment"
            placeholderTextColor={color.textSubtle}
            style={styles.reviewInput}
            textAlignVertical="top"
            value={comment}
          />

          {error ? <Text style={styles.reviewError}>{error}</Text> : null}

          <PrimaryButton
            disabled={rating < 1}
            label="Submit review"
            loading={submitting}
            onPress={onSubmit}
          />
          <Pressable disabled={submitting} onPress={onCancel} style={styles.dialogCancel}>
            <Text style={styles.dialogCancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function DetailsSkeleton() {
  return (
    <>
      <View style={styles.hero}>
        <Skeleton height={52} width={52} borderRadius={26} />
        <Skeleton height={18} width="46%" />
        <Skeleton height={14} width="60%" />
      </View>
      <View style={styles.detailsCard}>
        <Skeleton height={16} width="32%" />
        <View style={styles.detailsGrid}>
          <Skeleton height={42} width="46%" />
          <Skeleton height={42} width="46%" />
          <Skeleton height={42} width="46%" />
          <Skeleton height={42} width="46%" />
        </View>
      </View>
    </>
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
      subtitle: `Job by ${conversation.client?.fullName ?? 'Konektado resident'} - ${getMarketplaceLocation(conversation.job)} - ${conversation.job.scheduleText ?? 'Schedule to coordinate'} - ${budget}`,
    };
  }

  if (conversation.service) {
    return {
      title: formatServicePostTitle({
        title: conversation.service.title,
        category: conversation.service.category,
        cue: conversation.service.isActive ? 'availableFor' : 'offers',
      }),
      subtitle: `Service by ${conversation.provider?.fullName ?? 'Konektado resident'} - ${getMarketplaceLocation(conversation.service)} - ${formatServiceRate(conversation.service)}`,
    };
  }

  return {
    title: 'Marketplace chat',
    subtitle: 'Konektado conversation',
  };
}

function getDetailMetrics(conversation: ConversationDetail) {
  if (conversation.job) {
    return [
      { label: 'Budget', value: formatJobBudget(conversation.job) },
      { label: 'Location', value: getMarketplaceLocation(conversation.job) },
      { label: 'Schedule', value: conversation.job.scheduleText ?? 'Not yet agreed' },
      { label: 'Job Status', value: formatStatus(conversation.job.status) },
    ];
  }

  if (conversation.service) {
    return [
      { label: 'Rate', value: formatServiceRate(conversation.service) },
      { label: 'Location', value: getMarketplaceLocation(conversation.service) },
      { label: 'Availability', value: conversation.service.availabilityText ?? 'To coordinate' },
      { label: 'Status', value: formatStatus(conversation.status) },
    ];
  }

  return [{ label: 'Status', value: formatStatus(conversation.status) }];
}

function getReviewState({
  conversation,
  isClient,
  loading,
  submittedReview,
}: {
  conversation: ConversationDetail | null;
  isClient: boolean;
  loading: boolean;
  submittedReview: Review | null;
}):
  | { kind: 'submitted'; review: Review }
  | { description: string; enabled: boolean; kind: 'available' | 'disabled' } {
  if (submittedReview) {
    return { kind: 'submitted', review: submittedReview };
  }

  if (loading) {
    return { description: 'Checking review status...', enabled: false, kind: 'disabled' };
  }

  if (!conversation?.jobId || !isClient) {
    return {
      description: 'Only the client who posted the job can leave this review.',
      enabled: false,
      kind: 'disabled',
    };
  }

  if (
    conversation.status !== 'hired' ||
    conversation.job?.acceptedProviderId !== conversation.providerId ||
    conversation.job?.status !== 'completed'
  ) {
    return {
      description: 'Available after job is completed.',
      enabled: false,
      kind: 'disabled',
    };
  }

  return {
    description: 'Share a 1-5 star rating and optional feedback.',
    enabled: true,
    kind: 'available',
  };
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
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: 20,
  },
  headerIcon: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 17,
    lineHeight: 23,
  },
  content: {
    backgroundColor: color.background,
    gap: 18,
    paddingBottom: 48,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  hero: {
    alignItems: 'center',
    gap: 7,
    paddingVertical: 2,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    position: 'relative',
    width: 52,
  },
  avatarText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 22,
  },
  onlineDot: {
    bottom: 0,
    right: 0,
  },
  title: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    lineHeight: 23,
    textAlign: 'center',
  },
  subtitle: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    width: '100%',
  },
  iconAction: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  iconActionText: {
    color: color.text,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 18,
  },
  detailsCard: {
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  sectionTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  detailsGrid: {
    columnGap: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 14,
  },
  metric: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  metricLabel: {
    color: color.textSubtle,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  metricValue: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
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
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 6,
  },
  actionRow: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 12,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionRowDangerSurface: {
    backgroundColor: color.dangerSoft,
  },
  actionRowDisabled: {
    opacity: 0.58,
  },
  actionRowCopy: {
    flex: 1,
    gap: 3,
  },
  actionRowLabel: {
    color: color.text,
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  actionRowDanger: {
    color: color.danger,
  },
  actionRowDescription: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 11,
    lineHeight: 15,
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
  reviewDialogCard: {
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
    justifyContent: 'center',
    minHeight: 38,
  },
  dialogCancelText: {
    color: color.text,
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  ratingButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  reviewInput: {
    borderColor: color.border,
    borderRadius: 12,
    borderWidth: 1,
    color: color.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
    minHeight: 96,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reviewError: {
    color: color.danger,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.72,
  },
});
