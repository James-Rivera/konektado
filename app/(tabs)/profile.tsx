import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppHeader } from '@/components/AppHeader';
import { NoticeBanner } from '@/components/NoticeBanner';
import { Pill } from '@/components/Pill';
import { PresenceDot } from '@/components/PresenceDot';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Skeleton } from '@/components/Skeleton';
import { color, radius, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { listMyJobs } from '@/services/job.service';
import {
  formatJobBudget,
  formatServiceRate,
  isPresenceActive,
} from '@/services/marketplace.helpers';
import {
  getMyProfileCompletion,
} from '@/services/profile-completion.service';
import { listProfileReviews } from '@/services/review.service';
import { listMyServices } from '@/services/service-profile.service';
import type { JobSummary, ProviderService, Review } from '@/types/marketplace.types';
import type { ProfileCompletionMode, ProfileCompletionStatus } from '@/types/profile.types';
import { supabase } from '@/utils/supabase';

type ProfileMode = 'work' | 'hiring';
type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

export default function ProfileScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<ProfileMode>('work');
  const { profile, loading: profileLoading, version } = useProfile();
  const [completion, setCompletion] = useState<ProfileCompletionStatus | null>(null);
  const [completionLoading, setCompletionLoading] = useState(true);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [services, setServices] = useState<ProviderService[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const displayName =
    profile?.full_name ||
    `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() ||
    'Konektado resident';
  const isVerified = Boolean(
    completion?.isVerified || profile?.barangay_verified_at || profile?.verified_at,
  );
  const isSetupIncomplete = Boolean(isVerified && completion?.marketplaceSetupState === 'verified_setup_incomplete');
  const completedCount = [
    completion?.coreComplete,
    completion?.workComplete,
    completion?.hiringComplete,
  ].filter(Boolean).length;

  useEffect(() => {
    let active = true;

    setCompletionLoading(true);
    Promise.all([
      getMyProfileCompletion(),
      listMyJobs(),
      listMyServices(),
      profile?.id ? listProfileReviews(profile.id) : Promise.resolve({ data: [], error: null } as const),
    ]).then(([completionResult, jobResult, serviceResult, reviewResult]) => {
      if (!active) return;

      if (!completionResult.error && completionResult.data) setCompletion(completionResult.data);
      if (!jobResult.error && jobResult.data) setJobs(jobResult.data);
      if (!serviceResult.error && serviceResult.data) setServices(serviceResult.data);
      if (!reviewResult.error && reviewResult.data) setReviews([...reviewResult.data]);
      setCompletionLoading(false);
    });

    return () => {
      active = false;
    };
  }, [profile?.id, version]);

  const openCompletion = (nextMode: ProfileCompletionMode) => {
    router.push({
      pathname: '/profile/complete' as never,
      params: { mode: nextMode },
    });
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'End this session on this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            Alert.alert('Log out', error.message);
            return;
          }
          router.replace('/(auth)');
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        actionIcon="settings"
        actionLabel="Profile settings"
        eyebrow="Trust center"
        title="Profile"
        subtitle="Verification proves identity. Profile completion builds trust."
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {profileLoading || completionLoading ? (
          <ProfileSkeleton />
        ) : (
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
                <PresenceDot active={isPresenceActive(profile?.availability)} size={13} style={styles.avatarDot} />
              </View>
              <View style={styles.profileCopy}>
                <Text style={styles.name}>{displayName}</Text>
                <Text style={styles.location}>
                  {[profile?.barangay, profile?.city].filter(Boolean).join(', ') || 'Location not set'}
                </Text>
                <View style={styles.profilePills}>
                  <Pill
                    icon={isVerified ? 'verified' : 'warning-amber'}
                    label={
                      isSetupIncomplete
                        ? 'Verified · Setup incomplete'
                        : isVerified
                          ? 'Barangay verified'
                          : 'Verification needed'
                    }
                    tone={isVerified && !isSetupIncomplete ? 'success' : 'warning'}
                  />
                  <Pill label={`${completedCount}/3 profile steps`} tone={completedCount === 3 ? 'success' : 'primary'} />
                </View>
              </View>
            </View>

            <NoticeBanner
              message={getTrustMessage({ completion, isVerified })}
              title={getTrustTitle({ completion, isVerified })}
              variant={isVerified && completedCount === 3 && !isSetupIncomplete ? 'info' : 'warning'}
            />

            <View style={styles.completionGrid}>
              <CompletionCard
                body="Your name, location, intro, and availability. Shared by Work and Hiring."
                complete={Boolean(completion?.coreComplete)}
                icon="badge"
                missing={completion?.missingCore ?? []}
                title="Core Profile"
                onPress={() => openCompletion('core')}
              />
              <CompletionCard
                body="What clients see before messaging you or viewing your service posts."
                complete={Boolean(completion?.workComplete)}
                icon="handyman"
                missing={completion?.missingWork ?? []}
                title="Work Profile"
                onPress={() => openCompletion('work')}
              />
              <CompletionCard
                body="What workers see before responding to your job posts."
                complete={Boolean(completion?.hiringComplete)}
                icon="assignment-ind"
                missing={completion?.missingHiring ?? []}
                title="Hiring Profile"
                onPress={() => openCompletion('hiring')}
              />
            </View>
          </>
        )}

        <View style={styles.segmented}>
          <PrimaryButton
            label="Work Profile"
            onPress={() => setMode('work')}
            variant={mode === 'work' ? 'primary' : 'ghost'}
          />
          <PrimaryButton
            label="Hiring Profile"
            onPress={() => setMode('hiring')}
            variant={mode === 'hiring' ? 'primary' : 'ghost'}
          />
        </View>

        {mode === 'work' ? (
          <WorkProfile
            completion={completion}
            reviews={reviews}
            services={services}
            onComplete={() => openCompletion('work')}
          />
        ) : (
          <HiringProfile
            completion={completion}
            jobs={jobs}
            reviews={reviews}
            onComplete={() => openCompletion('hiring')}
          />
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log out"
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}>
          <MaterialIcons color={color.danger} name="logout" size={18} />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function CompletionCard({
  body,
  complete,
  icon,
  missing,
  onPress,
  title,
}: {
  body: string;
  complete: boolean;
  icon: MaterialIconName;
  missing: string[];
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.completionCard, pressed && styles.pressed]}>
      <View style={styles.completionHeader}>
        <View style={[styles.completionIcon, complete && styles.completionIconDone]}>
          <MaterialIcons color={complete ? color.success : color.primary} name={icon} size={19} />
        </View>
        <View style={styles.completionCopy}>
          <Text style={styles.completionTitle}>{title}</Text>
          <Text style={styles.completionBody}>{body}</Text>
        </View>
        <MaterialIcons color={color.textSubtle} name="chevron-right" size={22} />
      </View>
      <View style={styles.completionFooter}>
        <Pill
          icon={complete ? 'check-circle' : 'error-outline'}
          label={complete ? 'Complete' : 'Needs info'}
          tone={complete ? 'success' : 'warning'}
        />
        {!complete && missing.length ? (
          <Text style={styles.missingText}>Missing: {missing.slice(0, 3).join(', ')}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function WorkProfile({
  completion,
  onComplete,
  reviews,
  services,
}: {
  completion: ProfileCompletionStatus | null;
  onComplete: () => void;
  reviews: Review[];
  services: ProviderService[];
}) {
  const rating = reviews.length
    ? (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1)
    : '-';
  const profileServices = [
    ...(completion?.work.offeredServices ?? []),
    ...(completion?.work.customOfferedServices ?? []),
  ];

  return (
    <View style={styles.stack}>
      <View style={styles.metricRow}>
        <Metric icon="star" label="Worker rating" value={rating} />
        <Metric icon="check-circle" label="Reviews" value={String(reviews.length)} />
        <Metric icon="handyman" label="Services" value={String(services.length)} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Work trust profile</Text>
          <PrimaryButton compact label={completion?.workComplete ? 'Edit' : 'Complete'} onPress={onComplete} variant="secondary" />
        </View>
        <Text style={styles.profileHeadline}>
          {completion?.work.headline || 'Add a headline for clients.'}
        </Text>
        <Text style={styles.body}>
          {completion?.work.bio || 'Tell clients what you can help with before they message.'}
        </Text>
        <View style={styles.detailRows}>
          <DetailRow icon="location-on" label="Service area" value={completion?.work.serviceArea || 'Not set'} />
          <DetailRow icon="schedule" label="Availability" value={completion?.work.availability || 'Not set'} />
          <DetailRow icon="payments" label="Rate note" value={completion?.work.rateText || 'Optional'} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Services offered</Text>
        <View style={styles.pillWrap}>
          {profileServices.map((service) => (
            <Pill key={service} label={service} />
          ))}
          {!profileServices.length ? <Text style={styles.body}>Add services so clients know what to ask about.</Text> : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Posted services</Text>
        {services.slice(0, 4).map((service) => (
          <HistoryRow
            key={service.id}
            icon="design-services"
            meta={formatServiceRate(service)}
            subtitle={service.locationText ?? service.barangay ?? 'Nearby'}
            title={service.title}
          />
        ))}
        {!services.length ? <Text style={styles.body}>Service posts appear here after publishing.</Text> : null}
      </View>
    </View>
  );
}

function HiringProfile({
  completion,
  jobs,
  onComplete,
  reviews,
}: {
  completion: ProfileCompletionStatus | null;
  jobs: JobSummary[];
  onComplete: () => void;
  reviews: Review[];
}) {
  const openJobs = jobs.filter((job) => ['open', 'reviewing', 'in_progress'].includes(job.status));
  const neededServices = completion?.hiring.neededServices ?? [];

  return (
    <View style={styles.stack}>
      <View style={styles.metricRow}>
        <Metric icon="star" label="Client reviews" value={String(reviews.length)} />
        <Metric icon="person-add-alt" label="Workers hired" value={String(jobs.filter((job) => job.acceptedProviderId).length)} />
        <Metric icon="assignment" label="Jobs posted" value={String(jobs.length)} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hiring trust profile</Text>
          <PrimaryButton compact label={completion?.hiringComplete ? 'Edit' : 'Complete'} onPress={onComplete} variant="secondary" />
        </View>
        <Text style={styles.profileHeadline}>
          {completion?.hiring.headline || 'Add a headline for workers.'}
        </Text>
        <Text style={styles.body}>
          {completion?.hiring.bio || 'Tell workers what kind of help you usually need.'}
        </Text>
        <View style={styles.detailRows}>
          <DetailRow icon="schedule" label="Preferred schedule" value={completion?.hiring.preferredSchedule || 'Not set'} />
          <DetailRow icon="payments" label="Budget preference" value={completion?.hiring.budgetPreference || 'Optional'} />
          <DetailRow icon="assignment" label="Open jobs" value={`${openJobs.length} active`} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Services needed</Text>
        <View style={styles.pillWrap}>
          {neededServices.map((service) => (
            <Pill key={service} label={service} />
          ))}
          {!neededServices.length ? <Text style={styles.body}>Add needed services so workers understand your usual requests.</Text> : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Job history</Text>
        {jobs.slice(0, 4).map((item) => (
          <HistoryRow
            key={item.id}
            icon="history"
            meta={formatJobBudget(item)}
            subtitle={item.locationText ?? item.barangay ?? 'Nearby'}
            title={item.title}
          />
        ))}
        {!jobs.length ? <Text style={styles.body}>No jobs posted yet.</Text> : null}
      </View>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: MaterialIconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <MaterialIcons color={color.primary} name={icon} size={17} />
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function getTrustTitle({
  completion,
  isVerified,
}: {
  completion: ProfileCompletionStatus | null;
  isVerified: boolean;
}) {
  if (!isVerified) return 'Verification required';
  if (completion?.marketplaceSetupState === 'verified_setup_incomplete') {
    return 'Verified · Setup incomplete';
  }
  if (!completion?.coreComplete) return 'Complete your public basics';
  if (!completion.workComplete || !completion.hiringComplete) return 'Finish role profiles';
  return 'Trust profile ready';
}

function getTrustMessage({
  completion,
  isVerified,
}: {
  completion: ProfileCompletionStatus | null;
  isVerified: boolean;
}) {
  if (!isVerified) {
    return 'Complete barangay verification first. After approval, finish Work or Hiring details before posting or messaging.';
  }

  if (!completion?.coreComplete) {
    return 'Add your public intro, location, and availability so neighbors have context before conversations begin.';
  }

  if (completion.marketplaceSetupState === 'verified_setup_incomplete') {
    return 'You are verified and can browse public content. Complete your Work or Hiring Profile before messaging, hiring, posting, or reviewing.';
  }

  if (!completion.workComplete || !completion.hiringComplete) {
    return 'You are verified. Finish the role profile you want to use before publishing or messaging.';
  }

  return 'You can publish, message, and manage marketplace activity with a complete public trust profile.';
}

function getInitials(name: string) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return initials || 'K';
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: MaterialIconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <MaterialIcons color={color.primary} name={icon} size={18} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ProfileSkeleton() {
  return (
    <>
      <View style={styles.profileCard}>
        <Skeleton height={60} width={60} borderRadius={radius.pill} />
        <View style={styles.profileCopy}>
          <Skeleton height={20} width="62%" />
          <Skeleton height={14} width="48%" />
          <View style={styles.profilePills}>
            <Skeleton height={26} width={134} borderRadius={radius.pill} />
            <Skeleton height={26} width={118} borderRadius={radius.pill} />
          </View>
        </View>
      </View>
      <View style={styles.noticeSkeleton}>
        <Skeleton height={16} width="48%" />
        <Skeleton height={13} width="92%" />
        <Skeleton height={13} width="70%" />
      </View>
    </>
  );
}

function HistoryRow({
  icon,
  title,
  subtitle,
  meta,
}: {
  icon: MaterialIconName;
  title: string;
  subtitle: string;
  meta: string;
}) {
  return (
    <View style={styles.historyRow}>
      <View style={styles.historyIcon}>
        <MaterialIcons color={color.textMuted} name={icon} size={18} />
      </View>
      <View style={styles.historyCopy}>
        <Text style={styles.historyTitle}>{title}</Text>
        <Text style={styles.historySubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.historyMeta}>{meta}</Text>
    </View>
  );
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
  profileCard: {
    alignItems: 'center',
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
    height: 60,
    justifyContent: 'center',
    position: 'relative',
    width: 60,
  },
  avatarDot: {
    bottom: 1,
    right: 1,
  },
  avatarText: {
    ...typography.sectionTitle,
    color: color.primary,
  },
  profileCopy: {
    flex: 1,
    gap: space.xs,
  },
  name: {
    ...typography.screenTitle,
    color: color.text,
  },
  location: {
    ...typography.body,
    color: color.textMuted,
  },
  profilePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  noticeSkeleton: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: space.sm,
    padding: space.lg,
  },
  completionGrid: {
    gap: space.md,
  },
  completionCard: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.md,
    padding: space.lg,
  },
  completionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
  },
  completionIcon: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  completionIconDone: {
    backgroundColor: color.successSoft,
  },
  completionCopy: {
    flex: 1,
    gap: space.xs,
  },
  completionTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  completionBody: {
    ...typography.caption,
    color: color.textMuted,
  },
  completionFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  missingText: {
    ...typography.caption,
    color: color.textMuted,
    flexShrink: 1,
  },
  segmented: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    padding: space.xs,
  },
  stack: {
    gap: space.lg,
  },
  metricRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  metricCard: {
    alignItems: 'flex-start',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: space['2xs'],
    padding: space.md,
  },
  metricValue: {
    ...typography.sectionTitle,
    color: color.text,
  },
  metricLabel: {
    ...typography.caption,
    color: color.textMuted,
  },
  section: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: space.md,
    padding: space.lg,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: color.text,
    flex: 1,
  },
  profileHeadline: {
    ...typography.bodyMedium,
    color: color.text,
  },
  body: {
    ...typography.body,
    color: color.textMuted,
  },
  detailRows: {
    gap: space.sm,
  },
  detailRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.sm,
  },
  detailCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  detailLabel: {
    ...typography.captionMedium,
    color: color.text,
  },
  detailValue: {
    ...typography.caption,
    color: color.textMuted,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  historyRow: {
    alignItems: 'flex-start',
    borderTopColor: color.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    paddingTop: space.md,
  },
  historyIcon: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  historyCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  historyTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  historySubtitle: {
    ...typography.caption,
    color: color.textMuted,
  },
  historyMeta: {
    ...typography.captionMedium,
    color: color.primary,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.danger,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'center',
    marginTop: space.sm,
    minHeight: 46,
  },
  pressed: {
    opacity: 0.72,
  },
  logoutText: {
    ...typography.bodyMedium,
    color: color.danger,
  },
});
