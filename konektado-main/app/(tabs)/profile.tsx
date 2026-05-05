import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { NoticeBanner } from '@/components/NoticeBanner';
import { Pill } from '@/components/Pill';
import { PrimaryButton } from '@/components/PrimaryButton';
import { color, radius, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { listMyJobs } from '@/services/job.service';
import { listProfileReviews } from '@/services/review.service';
import { listMyServices } from '@/services/service-profile.service';
import type { JobSummary, ProviderService, Review } from '@/types/marketplace.types';

type ProfileMode = 'work' | 'hiring';

export default function ProfileScreen() {
  const [mode, setMode] = useState<ProfileMode>('work');
  const { profile } = useProfile();
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [services, setServices] = useState<ProviderService[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const displayName =
    profile?.full_name ||
    `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() ||
    'Konektado resident';
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);

  useEffect(() => {
    let active = true;

    Promise.all([
      listMyJobs(),
      listMyServices(),
      profile?.id ? listProfileReviews(profile.id) : Promise.resolve({ data: [], error: null } as const),
    ]).then(([jobResult, serviceResult, reviewResult]) => {
      if (!active) return;
      if (!jobResult.error && jobResult.data) setJobs(jobResult.data);
      if (!serviceResult.error && serviceResult.data) setServices(serviceResult.data);
      if (!reviewResult.error && reviewResult.data) setReviews([...reviewResult.data]);
    });

    return () => {
      active = false;
    };
  }, [profile?.id]);

  return (
    <View style={styles.screen}>
      <AppHeader
        actionIcon="settings"
        actionLabel="Profile settings"
        eyebrow="One account"
        title="Profile"
        subtitle="Manage your Work Profile and Hiring Profile."
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.location}>
              {[profile?.barangay, profile?.city].filter(Boolean).join(', ') || 'Barangay San Pedro'}
            </Text>
            <View style={styles.profilePills}>
              <Pill
                icon={isVerified ? 'verified' : 'warning-amber'}
                label={isVerified ? 'Barangay verified' : 'Verification needed'}
                tone={isVerified ? 'success' : 'warning'}
              />
              <Pill label={`${services.length} Services`} tone="primary" />
            </View>
          </View>
        </View>

        <NoticeBanner
          message={
            isVerified
              ? 'Posting, messaging, saving, and reviews are unlocked for this account.'
              : 'Complete barangay verification to unlock posting, messaging, saving, and reviews.'
          }
          title={isVerified ? 'Verification approved' : 'Verification required'}
          variant={isVerified ? 'info' : 'warning'}
        />

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
          <WorkProfile reviews={reviews} services={services} />
        ) : (
          <HiringProfile jobs={jobs} reviews={reviews} />
        )}
      </ScrollView>
    </View>
  );
}

function WorkProfile({ reviews, services }: { reviews: Review[]; services: ProviderService[] }) {
  const completedJobs = reviews.length;
  const rating = reviews.length
    ? (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1)
    : '-';

  return (
    <View style={styles.stack}>
      <View style={styles.metricRow}>
        <Metric icon="star" label="Worker rating" value={rating} />
        <Metric icon="check-circle" label="Reviews" value={String(completedJobs)} />
        <Metric icon="handyman" label="Services" value={String(services.length)} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Availability</Text>
        <Text style={styles.body}>{services[0]?.availabilityText ?? 'Availability has not been set yet.'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Services</Text>
        <View style={styles.pillWrap}>
          {services.map((service) => (
            <Pill key={service.id} label={service.title} />
          ))}
          {!services.length ? <Text style={styles.body}>No services posted yet.</Text> : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reviews</Text>
        {reviews.map((item) => (
          <HistoryRow
            key={item.id}
            icon="work-outline"
            meta={`${item.rating} rating`}
            subtitle={item.comment ?? 'Completed job review'}
            title={item.reviewer?.fullName ?? 'Konektado resident'}
          />
        ))}
        {!reviews.length ? <Text style={styles.body}>Reviews appear after completed jobs.</Text> : null}
      </View>
    </View>
  );
}

function HiringProfile({ jobs, reviews }: { jobs: JobSummary[]; reviews: Review[] }) {
  const openJobs = jobs.filter((job) => ['open', 'reviewing', 'in_progress'].includes(job.status));

  return (
    <View style={styles.stack}>
      <View style={styles.metricRow}>
        <Metric icon="star" label="Client reviews" value={String(reviews.length)} />
        <Metric icon="person-add-alt" label="Workers hired" value={String(jobs.filter((job) => job.acceptedProviderId).length)} />
        <Metric icon="assignment" label="Jobs posted" value={String(jobs.length)} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Open jobs</Text>
        <Text style={styles.body}>{openJobs.length} jobs are open or in progress.</Text>
        <PrimaryButton disabled icon="list-alt" label="Manage job posts" variant="secondary" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Job history</Text>
        {jobs.map((item) => (
          <HistoryRow
            key={item.id}
            icon="history"
            meta={item.status}
            subtitle={item.locationText ?? item.barangay ?? 'Nearby'}
            title={item.title}
          />
        ))}
        {!jobs.length ? <Text style={styles.body}>No jobs posted yet.</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reviews from workers</Text>
        <Text style={styles.body}>
          Workers can review this Hiring Profile after completed jobs in a later slice.
        </Text>
      </View>
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

function Metric({
  icon,
  label,
  value,
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
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

function HistoryRow({
  icon,
  title,
  subtitle,
  meta,
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
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
    width: 60,
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
  sectionTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  body: {
    ...typography.body,
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
});
