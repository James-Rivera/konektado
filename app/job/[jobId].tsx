import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { Skeleton, SkeletonAvatar, SkeletonChip, SkeletonImage, SkeletonText } from '@/components/Skeleton';
import { getDisplayLabelForMvpService } from '@/constants/service-taxonomy';
import { color, radius, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { startJobConversation } from '@/services/conversation.service';
import { emitConversationPreviewUpdate } from '@/services/conversation-preview-events';
import { getJobDetail } from '@/services/job.service';
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
import type { JobDetail } from '@/types/marketplace.types';

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function JobDetailScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);

  const params = useLocalSearchParams<{ jobId?: string | string[] }>();
  const rawJobId = getParamValue(params.jobId);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState(false);

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

  const showComingSoon = (label: string) => {
    Alert.alert(label, 'This will open from Job Details in a later slice.');
  };

  if (loading && !job) {
    return <JobDetailSkeleton />;
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
            <Pressable
              accessibilityLabel="More options"
              accessibilityRole="button"
              onPress={() => showComingSoon('Options')}
              style={styles.headerIcon}>
              <MaterialIcons color={color.textSubtle} name="more-vert" size={20} />
            </Pressable>
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
  const jobImageUrl = job.photoUrls?.[0] ?? null;
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
          <Pressable
            accessibilityLabel="More options"
            accessibilityRole="button"
            onPress={() => showComingSoon('Options')}
            style={styles.headerIcon}>
            <MaterialIcons color={color.textSubtle} name="more-vert" size={20} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}>
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

          {jobImageUrl ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Photos</Text>
              <Image resizeMode="cover" source={{ uri: jobImageUrl }} style={styles.detailPhoto} />
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
                    <Text style={styles.avatarText}>{(job.client?.fullName ?? 'R').slice(0, 1).toUpperCase()}</Text>
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
            </View>
          </View>
        </ScrollView>

        <View style={styles.actionBar}>
          <Text style={styles.boundaryNote}>
            Budget is for coordination. Payment and final agreement happen outside Konektado.
          </Text>
          {messageCta.helper ? <Text style={styles.actionHelper}>{messageCta.helper}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={messageCta.disabled || messaging}
            onPress={handleMessage}
            style={({ pressed }) => [
              styles.primaryAction,
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
    </SafeAreaView>
  );
}

function JobDetailSkeleton() {
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

        <View style={styles.actionBar}>
          <Skeleton height={12} width="92%" />
          <SkeletonChip height={42} width="100%" />
        </View>
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
    backgroundColor: color.cardTint,
    borderRadius: radius.lg,
    height: 210,
    marginTop: space.md,
    width: '100%',
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
