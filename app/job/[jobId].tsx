import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { color, radius, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { startJobConversation } from '@/services/conversation.service';
import { getJobDetail } from '@/services/job.service';
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
              title={loading ? 'Loading job' : 'Job not found'}
              description={loading ? 'Loading current job details.' : 'This job is no longer available.'}
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
  const workersNeeded = 2;
  const acceptedCount = job.acceptedProviderId ? 1 : 0;

  const handleMessage = () => {
    if (!isVerified) {
      showVerificationPrompt();
      return;
    }

    setMessaging(true);
    startJobConversation({
      jobId: job.id,
      message: `Hi, I am interested in "${job.title}". Is this job still available?`,
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

  const handleConnect = () => {
    if (!isVerified) {
      showVerificationPrompt();
      return;
    }

    showComingSoon('Connect');
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
              <Text style={styles.jobDate}>{postedAt}</Text>
            </View>
            <Text style={styles.postedAgo}>{postedAgo}</Text>

            <View style={styles.metaStack}>
              <MetaRow icon="location-on" text={job.locationText ?? job.barangay ?? 'Nearby'} />
              <MetaRow icon="schedule" text={job.scheduleText ?? 'Schedule to coordinate'} />
              {job.budgetAmount ? <MetaRow icon="local-offer" text={formatBudget(job.budgetAmount)} tint="primary" /> : null}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status of the Job</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusPill}>
                <MaterialIcons color={color.warning} name="hourglass-empty" size={14} />
                <Text style={styles.statusPillText}>{jobStatus}</Text>
              </View>

              <View style={styles.statusInline}>
                <MaterialIcons color={color.primary} name="groups" size={16} />
                <Text style={styles.statusInlineText}>{workersNeeded} Workers Needed</Text>
              </View>

              <Text style={styles.acceptedText}>{acceptedCount} Accepted</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What you will do</Text>
            <Text style={styles.bodyText}>{job.description ?? 'No description provided yet.'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What to bring</Text>
            <Text style={styles.bodyText}>Bring a valid ID and water. No special tools needed.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Posted by</Text>
            <View style={styles.posterCard}>
              <View style={styles.posterRow}>
                <View style={styles.posterInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(job.client?.fullName ?? 'R').slice(0, 1).toUpperCase()}</Text>
                    <View style={styles.avatarBadge} />
                  </View>
                  <View style={styles.posterCopy}>
                    <Text style={styles.posterName}>{job.client?.fullName ?? 'Konektado resident'}</Text>
                    <Text style={styles.posterMeta}>Verified resident</Text>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={handleConnect}
                  style={({ pressed }) => [styles.connectButton, pressed && styles.pressed]}>
                  <Text style={styles.connectText}>Connect</Text>
                </Pressable>
              </View>

              <ScrollView
                horizontal
                contentContainerStyle={styles.posterBadges}
                showsHorizontalScrollIndicator={false}>
                <View style={styles.verifiedBadge}>
                  <MaterialIcons color={color.success} name="check-circle" size={14} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
                <BadgePill label="4.8 Reviews" />
                <BadgePill label="Usually replies" />
                <BadgePill label="2 Jobs Posted" />
                {job.category ? <BadgePill label={job.category} /> : null}
                <View style={styles.badgeChevron}>
                  <MaterialIcons color={color.textSubtle} name="chevron-right" size={20} />
                </View>
              </ScrollView>
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
  jobDate: {
    ...typography.captionMedium,
    color: color.textSubtle,
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
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.lg,
    marginTop: space.md,
  },
  statusPill: {
    alignItems: 'center',
    backgroundColor: color.warningSoft,
    borderColor: color.warning,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  statusPillText: {
    ...typography.caption,
    color: color.warning,
  },
  statusInline: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
  },
  statusInlineText: {
    ...typography.caption,
    color: color.textSubtle,
  },
  acceptedText: {
    ...typography.captionMedium,
    color: color.primary,
  },
  sectionTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  bodyText: {
    ...typography.body,
    color: color.textMuted,
    marginTop: space.md,
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
  avatarBadge: {
    backgroundColor: color.success,
    borderColor: color.background,
    borderRadius: radius.pill,
    borderWidth: 2,
    bottom: 1,
    height: 10,
    position: 'absolute',
    right: 1,
    width: 10,
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
  connectButton: {
    alignItems: 'center',
    backgroundColor: color.primary,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 25,
    paddingHorizontal: space.md,
  },
  connectText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
    lineHeight: 16,
    color: color.white,
  },
  posterBadges: {
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.md,
  },
  verifiedBadge: {
    alignItems: 'center',
    backgroundColor: color.successSoft,
    borderColor: color.success,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.xs,
    height: 21,
    paddingHorizontal: space.sm,
  },
  verifiedText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    lineHeight: 14,
    color: color.text,
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
  badgeChevron: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    paddingLeft: space.xs,
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
