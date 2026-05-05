import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { Skeleton, SkeletonCircle, SkeletonText } from '@/components/Skeleton';
import { color, radius, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { startJobConversation } from '@/services/conversation.service';
import { getJobDetail } from '@/services/job.service';
import {
  formatClientJobsPostedText,
  formatClientRatingText,
  getMarketplaceLocation,
} from '@/services/marketplace.helpers';
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
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.screen}>
          <View style={styles.header}>
            <Skeleton height={28} width={28} borderRadius={14} />
            <Skeleton height={20} width={112} />
            <Skeleton height={28} width={28} borderRadius={14} />
          </View>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <View style={styles.jobTitleRow}>
                <Skeleton height={22} width="68%" />
                <Skeleton height={14} width={52} />
              </View>
              <Skeleton height={12} width={92} style={{ marginTop: space.sm }} />
              <View style={styles.metaStack}>
                <Skeleton height={14} width="70%" />
                <Skeleton height={14} width="56%" />
                <Skeleton height={14} width="42%" />
              </View>
            </View>
            <View style={styles.section}>
              <Skeleton height={16} width={124} />
              <View style={styles.detailGrid}>
                <Skeleton height={28} width={88} borderRadius={radius.pill} />
                <Skeleton height={20} width={132} />
              </View>
            </View>
            <View style={styles.section}>
              <Skeleton height={16} width={116} />
              <SkeletonText lines={4} lastLineWidth="64%" />
            </View>
            <View style={styles.section}>
              <Skeleton height={16} width={76} />
              <View style={styles.posterCard}>
                <View style={styles.posterRow}>
                  <View style={styles.posterInfo}>
                    <SkeletonCircle size={44} />
                    <View style={styles.posterCopy}>
                      <Skeleton height={14} width="70%" />
                      <Skeleton height={12} width="48%" />
                    </View>
                  </View>
                  <Skeleton height={25} width={82} borderRadius={radius.pill} />
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
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
  const jobTags = Array.from(
    new Set(
      [job.category, job.serviceNeeded, ...job.tags].filter(
        (tag): tag is string => Boolean(tag),
      ),
    ),
  );

  const handleMessage = () => {
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
        Alert.alert('Message', result.error ?? 'Could not open the conversation.');
        return;
      }

      router.push({
        pathname: '/conversation/[conversationId]',
        params: { conversationId: result.data.id },
      });
    });
  };

  const handleSave = () => {
    if (!isVerified) {
      showVerificationPrompt();
      return;
    }

    showComingSoon('Save');
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
              {job.budgetAmount ? (
                <MetaRow icon="local-offer" text={formatBudget(job.budgetAmount)} tint="primary" />
              ) : null}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job summary</Text>
            <DetailGrid
              items={[
                { label: 'Status', value: formatStatus(jobStatus) },
                { label: 'Workers needed', value: String(workersNeeded) },
                { label: 'Accepted', value: String(acceptedCount) },
                { label: 'Service', value: job.serviceNeeded || job.category || 'Service to coordinate' },
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
            <Text style={styles.sectionTitle}>What to bring</Text>
            <Text style={styles.bodyText}>
              Bring a valid ID and confirm any tools or materials in Messages before the job starts.
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
                <TrustMetric icon="location-on" label={job.client?.barangay ?? location} />
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.actionBar}>
          <Pressable
            accessibilityRole="button"
            onPress={handleMessage}
            style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}>
            <MaterialIcons color={color.primary} name="chat-bubble" size={16} />
            <Text style={styles.primaryActionText}>{messaging ? 'Opening...' : 'Message'}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={handleSave}
            style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}>
            <MaterialIcons color={color.textSubtle} name="bookmark-border" size={18} />
            <Text style={styles.secondaryActionText}>Save</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function formatBudget(value: number) {
  return `PHP ${value.toLocaleString('en-PH')}`;
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

function MetaRow({
  icon,
  text,
  tint = 'subtle',
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  text: string;
  tint?: 'subtle' | 'primary';
}) {
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

function StatusPill({ status }: { status: JobDetail['status'] }) {
  return (
    <View style={styles.statusPill}>
      <Text style={styles.statusPillText}>{formatStatus(status)}</Text>
    </View>
  );
}

function DetailGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <View style={styles.detailGrid}>
      {items.map((item) => (
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
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  tint?: 'default' | 'yellow';
}) {
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
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.xl,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    flex: 1,
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: space.lg,
  },
  primaryActionText: {
    ...typography.captionMedium,
    color: color.primary,
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
