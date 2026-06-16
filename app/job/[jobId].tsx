import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminContextBanner } from '@/components/admin/AdminContextBanner';
import { CachedRemoteImage } from '@/components/CachedRemoteImage';
import { EmptyState } from '@/components/EmptyState';
import { useFeedback } from '@/components/FeedbackProvider';
import { ListingPhotoCarousel } from '@/components/ListingPhotoCarousel';
import { MoreActionsSheet } from '@/components/MoreActionsSheet';
import { ReportSheet, type ReportSheetSubmitValue } from '@/components/ReportSheet';
import { CompletedJobReviewCard } from '@/components/reviews/CompletedJobReviewCard';
import { Skeleton, SkeletonAvatar, SkeletonChip, SkeletonImage, SkeletonText } from '@/components/Skeleton';
import { getDisplayLabelForMvpService } from '@/constants/service-taxonomy';
import { color, radius, space, typography } from '@/constants/theme';
import { useAdminViewOnly } from '@/hooks/use-admin-view-only';
import { useProfile } from '@/hooks/use-profile';
import { useSavedPosts } from '@/hooks/use-saved-posts';
import { emitConversationPreviewUpdate } from '@/services/conversation-preview-events';
import { startJobConversation } from '@/services/conversation.service';
import { closeJob, deactivateJob, getJobDetail, reactivateJob } from '@/services/job.service';
import {
    formatClientJobsPostedText,
    formatClientRatingText,
    formatJobBudget,
    getExperienceLabel,
    getMarketplaceLocation,
} from '@/services/marketplace.helpers';
import {
    getCompletionModeForError,
    getCompletionTitleForMode,
    getProfileSetupGateMessage,
    isProfileCompletionRequiredError,
} from '@/services/profile-completion.service';
import { createReport } from '@/services/report.service';
import type { JobDetail } from '@/types/marketplace.types';
import { getAvatarDisplayUrl, getDetailImageUrl } from '@/utils/image-processing';

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function JobDetailScreen() {
  const router = useRouter();
  const { showErrorToast, showInfoToast, showSuccessToast } = useFeedback();
  const { profile } = useProfile();
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);

  const params = useLocalSearchParams<{ adminView?: string | string[]; jobId?: string | string[] }>();
  const rawJobId = getParamValue(params.jobId);
  const { adminViewOnly, adminViewRequested } = useAdminViewOnly(params.adminView);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [updatingPost, setUpdatingPost] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const { isPending, isSaved, refreshSavedPosts, toggleSaved } = useSavedPosts();

  useEffect(() => {
    setAvatarFailed(false);
  }, [job?.client?.avatarUrl]);

  useEffect(() => {
    if (!profile?.id || !rawJobId) return;
    void refreshSavedPosts();
  }, [profile?.id, rawJobId, refreshSavedPosts]);

  useEffect(() => {
    let active = true;

    if (!rawJobId) {
      setLoading(false);
      return;
    }

    getJobDetail(rawJobId).then((result) => {
      if (!active) return;

      if (result.error) {
        Alert.alert('Job details', result.error);
      } else {
        setJob(result.data);
      }

      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [rawJobId]);

  const showVerificationPrompt = () => {
    router.push('/verification');
  };

  if (loading && !job) {
    return <JobDetailSkeleton showActionBar={!adminViewRequested} />;
  }

  if (!job) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.screen}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.headerIcon}>
              <MaterialIcons color={color.text} name="arrow-back-ios" size={18} />
            </Pressable>
            <Text style={styles.headerTitle}>Job Details</Text>
            <View style={styles.headerIcon} />
          </View>

          <View style={styles.emptyWrap}>
            <EmptyState
              title="Job not found"
              description="This job is no longer available."
              icon="search-off"
              actionLabel="Go back"
              onActionPress={() => router.back()}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const jobTitle = job.title;
  const postedAt = formatDate(job.createdAt);
  const postedAgo = `Posted ${postedAt}`;

  const jobStatus = job.status;
  const workersNeeded = job.workersNeeded ?? 1;
  const acceptedCount = job.acceptedProviderId ? 1 : 0;
  const jobPhotoUrls = job.photoUrls
    .map((imageUrl) => getDetailImageUrl({ imageUrl }))
    .filter((imageUrl): imageUrl is string => Boolean(imageUrl));
  const clientAvatarUrl = getAvatarDisplayUrl({ avatarUrl: job.client?.avatarUrl });
  const location = getMarketplaceLocation(job);
  const displayServiceNeeded = getDisplayLabelForMvpService(job.serviceNeeded) || job.serviceNeeded;
  const jobTags = Array.from(
    new Set(
      [
        job.category,
        displayServiceNeeded,
        ...job.tags.map((tag) => getDisplayLabelForMvpService(tag) || tag),
      ].filter(
        (tag): tag is string => Boolean(tag),
      ),
    ),
  );
  const isOwnJob = profile?.id === job.clientId;
  const saveTarget = { postType: 'job' as const, postId: job.id };
  const messageCta = getJobMessageCta({
    allowMessages: job.allowMessages,
    isOwnJob,
    isVerified,
    status: jobStatus,
  });

  const handleMessage = () => {
    if (messageCta.disabled && messageCta.reason !== 'verification') {
      return;
    }

    if (!isVerified) {
      showVerificationPrompt();
      return;
    }

    setMessaging(true);
    startJobConversation({
      jobId: job.id,
      message: `Hi, I am interested in "${jobTitle}". Is this job still available?`,
    }).then((result) => {
      setMessaging(false);

      if (result.error || !result.data) {
        if (isProfileCompletionRequiredError(result.error)) {
          const mode = getCompletionModeForError(result.error) ?? 'work';
          Alert.alert(getCompletionTitleForMode(mode), getProfileSetupGateMessage(), [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Complete profile',
              onPress: () => router.push({ pathname: '/profile/complete' as never, params: { mode } }),
            },
          ]);
          return;
        }

        Alert.alert('Message', result.error ?? 'Could not open the conversation.');
        return;
      }

      emitConversationPreviewUpdate({
        conversationId: result.data.id,
        conversation: result.data,
        userId: profile?.id,
      });

      router.push({
        pathname: '/conversation/[conversationId]',
        params: { conversationId: result.data.id },
      });
    });
  };

  const handleSave = async () => {
    if (!isVerified) {
      showInfoToast('Complete barangay verification before saving posts.');
      router.push('/verification');
      return;
    }

    const result = await toggleSaved(saveTarget);
    if (result.error || !result.data) {
      showErrorToast(result.error ?? 'Could not update saved posts.');
      return;
    }

    showSuccessToast(result.data.saved ? 'Saved' : 'Removed from saved');
  };

  const handleReport = async ({ details, reason }: ReportSheetSubmitValue) => {
    if (!job) return;

    setReporting(true);
    const result = await createReport({
      details,
      jobId: job.id,
      reason,
      reportedUserId: job.clientId,
    });
    setReporting(false);

    if (result.error) {
      Alert.alert('Report job', result.error);
      return;
    }

    setReportVisible(false);
    showSuccessToast('Report submitted');
  };

  const runJobStatusUpdate = async ({
    action,
    successMessage,
  }: {
    action: () => Promise<Awaited<ReturnType<typeof deactivateJob>>>;
    successMessage: string;
  }) => {
    if (!job || updatingPost) return;

    setUpdatingPost(true);
    const result = await action();
    setUpdatingPost(false);

    if (result.error || !result.data) {
      Alert.alert('Manage job', result.error ?? 'Could not update this job.');
      return;
    }

    setJob({
      ...job,
      ...result.data,
      closedAt: ['closed', 'completed', 'cancelled'].includes(result.data.status)
        ? new Date().toISOString()
        : null,
    });
    setOptionsVisible(false);
    showSuccessToast(successMessage);
  };

  const confirmJobStatusUpdate = ({
    body,
    label,
    onConfirm,
    title,
  }: {
    body: string;
    label: string;
    onConfirm: () => void;
    title: string;
  }) => {
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel' },
      { text: label, style: 'destructive', onPress: onConfirm },
    ]);
  };

  const ownerActions = isOwnJob
    ? getOwnerJobActions({
        job,
        updating: updatingPost,
        onEdit: () => {
          setOptionsVisible(false);
          router.push({
            pathname: '/create-job',
            params: { jobId: job.id, returnTo: 'post' },
          });
        },
        onClose: () =>
          confirmJobStatusUpdate({
            body: 'This marks the job as closed and removes it from active job search results.',
            label: 'Close job',
            onConfirm: () =>
              runJobStatusUpdate({
                action: () => closeJob(job.id),
                successMessage: 'Job closed',
              }),
            title: 'Close this job?',
          }),
        onDeactivate: () =>
          confirmJobStatusUpdate({
            body: 'This hides the job from search. You can reactivate it later from your posts.',
            label: 'Deactivate',
            onConfirm: () =>
              runJobStatusUpdate({
                action: () => deactivateJob(job.id),
                successMessage: 'Job deactivated',
              }),
            title: 'Deactivate this job?',
          }),
        onReactivate: () =>
          runJobStatusUpdate({
            action: () => reactivateJob(job.id),
            successMessage: 'Job reactivated',
          }),
      })
    : [];
  const reportActions = [
    {
      icon: 'report' as const,
      label: 'Report job',
      onPress: () => {
        setOptionsVisible(false);
        setReportVisible(true);
      },
      tone: 'danger' as const,
    },
  ];
  const hasHeaderOptions = !isOwnJob || ownerActions.length > 0;
  const showHeaderOptions = !adminViewOnly && hasHeaderOptions;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.headerIcon}>
            <MaterialIcons color={color.text} name="arrow-back-ios" size={18} />
          </Pressable>
          <Text style={styles.headerTitle}>Job Details</Text>
          {showHeaderOptions ? (
            <Pressable
              accessibilityLabel="More options"
              accessibilityRole="button"
              onPress={() => setOptionsVisible(true)}
              style={styles.headerIcon}>
              <MaterialIcons color={color.textSubtle} name="more-vert" size={20} />
            </Pressable>
          ) : (
            <View style={styles.headerIcon} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}>
          {adminViewOnly ? (
            <View style={styles.section}>
              <AdminContextBanner />
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.jobTitleRow}>
              <Text style={styles.jobTitle}>{jobTitle}</Text>
              <StatusPill status={jobStatus} />
            </View>
            <Text style={styles.postedAgo}>{postedAgo}</Text>

            <View style={styles.metaStack}>
              <MetaRow
                icon="location-on"
                text={location}
              />
              <MetaRow
                icon="schedule"
                text={job.scheduleText ?? 'Schedule to coordinate'}
              />
              <MetaRow
                icon="local-offer"
                text={formatJobBudget(job)}
                tint="primary"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job summary</Text>
            <DetailGrid
              items={[
                { label: 'Status', value: formatStatus(jobStatus) },
                { label: 'Workers needed', value: String(workersNeeded) },
                { label: 'Worker hired', value: acceptedCount ? 'Yes' : 'No worker hired yet' },
                { label: 'Service', value: displayServiceNeeded || job.category || 'Service to coordinate' },
                { label: 'Experience', value: getExperienceLabel(job.experienceLevel) },
                { label: 'Certification', value: job.certificationRequired ? 'Preferred' : 'Not required' },
              ]}
            />
          </View>

          {jobPhotoUrls.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Photos</Text>
              <ListingPhotoCarousel
                accessibilityLabel={`${jobTitle} photos`}
                height={210}
                photoUrls={jobPhotoUrls}
                style={styles.detailPhoto}
              />
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What you will do</Text>
            <Text style={styles.bodyText}>{job.description ?? 'No description provided yet.'}</Text>
          </View>

          {jobTags.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Job tags</Text>
              <View style={styles.tagRow}>
                {jobTags.map((tag) => (
                  <BadgePill key={tag} label={tag} />
                ))}
              </View>
            </View>
          ) : null}

          {!adminViewOnly && job.status === 'completed' ? (
            <View style={styles.section}>
              <CompletedJobReviewCard jobId={job.id} status={job.status} />
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Before you message</Text>
            <Text style={styles.bodyText}>
              Ask in Messages about exact location, tools, materials, and payment before starting.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Posted by</Text>
            <View style={styles.posterCard}>
              <View style={styles.posterRow}>
                <View style={styles.posterInfo}>
                  <View style={styles.avatar}>
                    {clientAvatarUrl && !avatarFailed ? (
                      <CachedRemoteImage
                        onError={() => setAvatarFailed(true)}
                        uri={clientAvatarUrl}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Text style={styles.avatarText}>{(job.client?.fullName ?? 'R').slice(0, 1).toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={styles.posterCopy}>
                    <Text style={styles.posterName}>{job.client?.fullName ?? 'Konektado resident'}</Text>
                    <Text style={styles.posterMeta}>{job.client?.barangay ?? location}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.trustGrid}>
                <TrustMetric icon="star-border" label={formatClientRatingText(job)} tint="yellow" />
                <TrustMetric icon="work" label={formatClientJobsPostedText(job)} />
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/client/[clientId]' as never,
                    params: {
                      ...(adminViewOnly ? { adminView: '1' } : {}),
                      clientId: job.clientId,
                      sourceJobId: job.id,
                    },
                  })
                }
                style={({ pressed }) => [styles.posterProfileAction, pressed && styles.pressed]}>
                <MaterialIcons color={color.primary} name="person" size={16} />
                <Text style={styles.posterProfileActionText}>View client profile</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        {adminViewOnly ? null : (
          <View style={styles.actionBar}>
            <Text style={styles.boundaryNote}>
              Budget is for coordination. Payment and final agreement happen outside Konektado.
            </Text>
            {messageCta.helper ? <Text style={styles.actionHelper}>{messageCta.helper}</Text> : null}
            <View style={styles.actionButtons}>
              {!isOwnJob ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSaved(saveTarget) }}
                  disabled={isPending(saveTarget)}
                  onPress={handleSave}
                  style={({ pressed }) => [
                    styles.secondaryAction,
                    pressed && !isPending(saveTarget) && styles.pressed,
                  ]}>
                  <MaterialIcons
                    color={isSaved(saveTarget) ? color.primary : color.textSubtle}
                    name={isSaved(saveTarget) ? 'bookmark' : 'bookmark-border'}
                    size={16}
                  />
                  <Text style={styles.secondaryActionText}>
                    {isSaved(saveTarget) ? 'Saved' : 'Save'}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                disabled={messageCta.disabled || messaging}
                onPress={handleMessage}
                style={({ pressed }) => [
                  styles.primaryAction,
                  styles.flexAction,
                  (messageCta.disabled || messaging) && styles.disabledAction,
                  pressed && !messageCta.disabled && !messaging && styles.pressed,
                ]}>
                <MaterialIcons
                  color={messageCta.disabled ? color.textSubtle : color.primary}
                  name="chat-bubble"
                  size={16}
                />
                <Text style={[styles.primaryActionText, messageCta.disabled && styles.disabledActionText]}>
                  {messaging ? 'Opening...' : messageCta.label}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <MoreActionsSheet
        actions={isOwnJob ? ownerActions : reportActions}
        onClose={() => setOptionsVisible(false)}
        subtitle={jobTitle}
        title={isOwnJob ? 'Manage job' : 'Job options'}
        visible={optionsVisible && showHeaderOptions}
      />
      <ReportSheet
        onClose={() => setReportVisible(false)}
        onSubmit={handleReport}
        submitting={reporting}
        targetLabel={jobTitle}
        title="Report job"
        visible={reportVisible && !adminViewOnly}
      />
    </SafeAreaView>
  );
}

function JobDetailSkeleton({ showActionBar = true }: { showActionBar?: boolean }) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Skeleton height={28} width={28} borderRadius={14} />
          <Skeleton height={20} width={112} />
          <Skeleton height={28} width={28} borderRadius={14} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} style={styles.scroll}>
          <View style={styles.section}>
            <View style={styles.jobTitleRow}>
              <Skeleton height={22} width="68%" />
              <StatusPill isLoading />
            </View>
            <Skeleton height={12} width={92} style={{ marginTop: space.sm }} />

            <View style={styles.metaStack}>
              <MetaRow icon="location-on" isLoading text="" />
              <MetaRow icon="schedule" isLoading text="" />
              <MetaRow icon="local-offer" isLoading text="" tint="primary" />
            </View>
          </View>

          <View style={styles.section}>
            <Skeleton height={16} width={124} />
            <DetailGrid isLoading items={[]} />
          </View>

          <View style={styles.section}>
            <Skeleton height={16} width={76} />
            <SkeletonImage borderRadius={radius.lg} height={220} style={styles.detailPhoto} />
          </View>

          <View style={styles.section}>
            <Skeleton height={16} width={116} />
            <SkeletonText lastLineWidth="64%" lines={4} />
          </View>

          <View style={styles.section}>
            <Skeleton height={16} width={86} />
            <View style={styles.tagRow}>
              <SkeletonChip height={30} width={88} />
              <SkeletonChip height={30} width={104} />
              <SkeletonChip height={30} width={78} />
            </View>
          </View>

          <View style={styles.section}>
            <Skeleton height={16} width={132} />
            <SkeletonText lastLineWidth="72%" lineHeight={14} lines={2} />
          </View>

          <View style={styles.section}>
            <Skeleton height={16} width={76} />
            <View style={styles.posterCard}>
              <View style={styles.posterRow}>
                <View style={styles.posterInfo}>
                  <SkeletonAvatar showPresence={false} size={44} />
                  <View style={styles.posterCopy}>
                    <Skeleton height={14} width="70%" />
                    <Skeleton height={12} width="48%" />
                  </View>
                </View>
              </View>

              <View style={styles.trustGrid}>
                <TrustMetric icon="star-border" isLoading label="" tint="yellow" />
                <TrustMetric icon="work" isLoading label="" />
              </View>
            </View>
          </View>
        </ScrollView>

        {showActionBar ? (
          <View style={styles.actionBar}>
            <Skeleton height={12} width="92%" />
            <SkeletonChip height={42} width="100%" />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatStatus(status: JobDetail['status']) {
  return status
    .split('_')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function getJobMessageCta({
  allowMessages,
  isOwnJob,
  isVerified,
  status,
}: {
  allowMessages: boolean;
  isOwnJob: boolean;
  isVerified: boolean;
  status: JobDetail['status'];
}) {
  if (isOwnJob) {
    return {
      disabled: true,
      helper: 'You cannot message yourself from your own post.',
      label: 'This is your post',
      reason: 'own',
    };
  }

  if (status === 'in_progress') {
    return {
      disabled: true,
      helper: 'A worker has already been hired for this job.',
      label: 'Worker already hired',
      reason: 'status',
    };
  }

  if (!['open', 'reviewing'].includes(status)) {
    return {
      disabled: true,
      helper: 'This job is no longer accepting new messages.',
      label: 'Job closed',
      reason: 'status',
    };
  }

  if (!allowMessages) {
    return {
      disabled: true,
      helper: 'The client is not accepting new messages from this post.',
      label: 'Messages are off for this job',
      reason: 'messages_off',
    };
  }

  if (!isVerified) {
    return {
      disabled: false,
      helper: 'Complete barangay verification to message workers and clients.',
      label: 'Verify to message',
      reason: 'verification',
    };
  }

  return {
    disabled: false,
    helper: null,
    label: 'Message client',
    reason: 'available',
  };
}

function MetaRow({
  icon,
  text,
  tint = 'subtle',
  isLoading = false,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  text: string;
  tint?: 'subtle' | 'primary';
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <View style={styles.metaRow}>
        <Skeleton height={12} width={16} borderRadius={8} />
        <Skeleton height={14} width="56%" />
      </View>
    );
  }

  return (
    <View style={styles.metaRow}>
      <MaterialIcons
        color={tint === 'primary' ? color.primary : color.primary}
        name={icon}
        size={16}
      />
      <Text style={[styles.metaText, tint === 'primary' && styles.metaTextPrimary]}>{text}</Text>
    </View>
  );
}

function BadgePill({ label }: { label: string }) {
  return (
    <View style={styles.badgePill}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function getOwnerJobActions({
  job,
  onClose,
  onDeactivate,
  onEdit,
  onReactivate,
  updating,
}: {
  job: JobDetail;
  onClose: () => void;
  onDeactivate: () => void;
  onEdit: () => void;
  onReactivate: () => void;
  updating: boolean;
}) {
  const actions = [];
  const isInactive = job.status === 'cancelled';
  const isFinal = job.status === 'closed' || job.status === 'completed';

  if (['open', 'reviewing', 'cancelled'].includes(job.status)) {
    actions.push({
      disabled: updating,
      icon: 'edit' as const,
      label: 'Edit job',
      onPress: onEdit,
    });
  }

  if (isInactive) {
    actions.push({
      disabled: updating,
      icon: 'play-circle' as const,
      label: updating ? 'Updating...' : 'Reactivate job',
      onPress: onReactivate,
    });
  } else if (!isFinal) {
    actions.push({
      disabled: updating,
      icon: 'pause-circle' as const,
      label: updating ? 'Updating...' : 'Deactivate job',
      onPress: onDeactivate,
    });
  }

  if (!isFinal) {
    actions.push({
      disabled: updating,
      icon: 'task-alt' as const,
      label: updating ? 'Updating...' : 'Close job',
      onPress: onClose,
      tone: 'danger' as const,
    });
  }

  return actions;
}

function StatusPill({
  status,
  isLoading = false,
}: {
  status?: JobDetail['status'];
  isLoading?: boolean;
}) {
  if (isLoading || !status) {
    return <SkeletonChip height={24} width={64} />;
  }

  return (
    <View style={styles.statusPill}>
      <Text style={styles.statusPillText}>{formatStatus(status)}</Text>
    </View>
  );
}

function DetailGrid({
  items,
  isLoading = false,
}: {
  items: { label: string; value: string }[];
  isLoading?: boolean;
}) {
  return (
    <View style={styles.detailGrid}>
      {isLoading
        ? Array.from({ length: 4 }).map((_, index) => (
            <View key={index} style={styles.detailGridItem}>
              <Skeleton height={12} width="44%" />
              <Skeleton height={14} width="74%" />
            </View>
          ))
        : items.map((item) => (
            <View key={item.label} style={styles.detailGridItem}>
              <Text style={styles.detailGridLabel}>{item.label}</Text>
              <Text style={styles.detailGridValue}>{item.value}</Text>
            </View>
          ))}
    </View>
  );
}

function TrustMetric({
  icon,
  label,
  tint = 'default',
  isLoading = false,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  tint?: 'default' | 'yellow';
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <View style={styles.trustMetric}>
        <Skeleton height={12} width="72%" />
      </View>
    );
  }

  return (
    <View style={styles.trustMetric}>
      <MaterialIcons color={tint === 'yellow' ? color.brandYellow : color.textSubtle} name={icon} size={16} />
      <Text numberOfLines={1} style={styles.trustText}>
        {label}
      </Text>
    </View>
  );
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
    paddingHorizontal: space['2xl'],
    paddingVertical: space.md,
  },
  headerIcon: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  headerTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    lineHeight: 24,
    color: color.text,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: space['3xl'],
  },
  section: {
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    paddingHorizontal: space.lg,
    paddingVertical: space.xl,
  },
  jobTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.md,
  },
  jobTitle: {
    ...typography.sectionTitle,
    color: color.text,
    flex: 1,
  },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    flexShrink: 0,
    justifyContent: 'center',
    minHeight: 24,
    paddingHorizontal: space.md,
  },
  statusPillText: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
    lineHeight: 16,
  },
  postedAgo: {
    ...typography.caption,
    color: color.textMuted,
    marginTop: space.xs,
  },
  metaStack: {
    gap: space.sm,
    marginTop: space.lg,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
  },
  metaText: {
    ...typography.caption,
    color: color.textSubtle,
  },
  metaTextPrimary: {
    fontFamily: 'Satoshi-Bold',
    color: color.primary,
  },
  detailPhoto: {
    marginTop: space.md,
  },
  detailGrid: {
    columnGap: space.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: space.sm,
    rowGap: space.md,
  },
  detailGridItem: {
    flexBasis: '48%',
    flexGrow: 1,
    gap: space['2xs'],
    minWidth: 132,
  },
  detailGridLabel: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 18,
  },
  detailGridValue: {
    color: color.textSubtle,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  sectionTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  bodyText: {
    ...typography.body,
    color: color.textMuted,
    marginTop: space.md,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.sm,
  },
  posterCard: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: space.md,
    padding: space.md,
  },
  posterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.md,
  },
  posterInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarImage: {
    borderRadius: radius.pill,
    height: '100%',
    width: '100%',
  },
  avatarText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 20,
    color: color.text,
  },
  posterCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  posterName: {
    ...typography.bodyMedium,
    color: color.text,
  },
  posterMeta: {
    ...typography.caption,
    color: color.textMuted,
  },
  trustGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.md,
  },
  posterProfileAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: space.xs,
  },
  posterProfileActionText: {
    ...typography.bodyMedium,
    color: color.primary,
  },
  trustMetric: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
    maxWidth: '100%',
    minWidth: 104,
  },
  trustText: {
    ...typography.caption,
    color: color.textSubtle,
    flexShrink: 1,
  },
  badgePill: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
    borderRadius: 13,
    borderWidth: 1,
    height: 21,
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  badgeText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    lineHeight: 14,
    color: color.primary,
  },
  actionBar: {
    backgroundColor: color.background,
    borderTopColor: color.border,
    borderTopWidth: 1,
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.xl,
  },
  boundaryNote: {
    ...typography.caption,
    color: color.textMuted,
  },
  actionHelper: {
    ...typography.caption,
    color: color.textSubtle,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: space.sm,
    width: '100%',
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: space.lg,
  },
  disabledAction: {
    backgroundColor: color.surfaceAlt,
  },
  primaryActionText: {
    ...typography.captionMedium,
    color: color.primary,
  },
  flexAction: {
    flex: 2,
  },
  disabledActionText: {
    color: color.textSubtle,
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: space.lg,
  },
  secondaryActionText: {
    ...typography.captionMedium,
    color: color.textSubtle,
  },
  pressed: {
    opacity: 0.72,
  },
  emptyWrap: {
    flex: 1,
    padding: space.lg,
  },
});
