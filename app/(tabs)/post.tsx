import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { NoticeBanner } from '@/components/NoticeBanner';
import { Pill } from '@/components/Pill';
import { PrimaryButton } from '@/components/PrimaryButton';
import { color, radius, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { listMyJobs } from '@/services/job.service';
import { listMyServices } from '@/services/service-profile.service';
import type { JobSummary, ProviderService } from '@/types/marketplace.types';

export default function PostScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [services, setServices] = useState<ProviderService[]>([]);
  const [loading, setLoading] = useState(true);
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);

  useEffect(() => {
    let active = true;

    Promise.all([listMyJobs(), listMyServices()]).then(([jobResult, serviceResult]) => {
      if (!active) return;

      if (jobResult.error || !jobResult.data) {
        Alert.alert('Posts', jobResult.error ?? 'Could not load jobs.');
      } else {
        setJobs(jobResult.data);
      }

      if (serviceResult.error || !serviceResult.data) {
        Alert.alert('Services', serviceResult.error ?? 'Could not load services.');
      } else {
        setServices(serviceResult.data);
      }

      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const showVerificationPrompt = () => {
    router.push('/verification');
  };

  const handlePostJob = () => {
    if (!isVerified) {
      showVerificationPrompt();
      return;
    }

    router.push('/create-job');
  };

  const handleOfferService = () => {
    if (!isVerified) {
      showVerificationPrompt();
      return;
    }

    router.push('/create-service');
  };

  const activePosts = jobs.filter((job) => ['open', 'reviewing', 'in_progress'].includes(job.status)).length;
  const completedJobs = jobs.filter((job) => job.status === 'completed').length;

  return (
    <View style={styles.screen}>
      <AppHeader
        actionIcon="pending-actions"
        actionLabel="Drafts"
        eyebrow="Manage posts"
        title="Post"
        subtitle="Create jobs or show the services you offer."
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <NoticeBanner
          message="Only verified residents can post jobs, create public service posts, and message workers."
          title="Posting is verification-gated"
          variant="warning"
        />

        <View style={styles.statsRow}>
          <StatCard label="Active jobs" value={String(activePosts)} />
          <StatCard label="Services" value={String(services.length)} />
          <StatCard label="Completed" value={String(completedJobs)} />
        </View>

        <View style={styles.actionGrid}>
          <PostAction
            description="Describe the task, location, budget, and schedule."
            icon="work-outline"
            label="Post a job"
            onPress={handlePostJob}
          />
          <PostAction
            description="Make your services visible to nearby residents."
            icon="handyman"
            label="Offer service"
            onPress={handleOfferService}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your posts</Text>
          <Pill label={loading ? 'Loading' : `${jobs.length + services.length} posts`} tone="primary" />
        </View>

        <View style={styles.stack}>
          {jobs.map((job) => (
            <View key={job.id} style={styles.postCard}>
              <View style={styles.postIcon}>
                <MaterialIcons color={color.primary} name="article" size={20} />
              </View>
              <View style={styles.postCopy}>
                <View style={styles.postTitleRow}>
                  <Text style={styles.postTitle}>{job.title}</Text>
                  <Pill label={job.status} tone={job.status === 'open' ? 'success' : 'neutral'} />
                </View>
                <Text style={styles.postDetail}>
                  {job.locationText ?? job.barangay ?? 'Nearby'} · {job.scheduleText ?? 'Schedule to coordinate'}
                </Text>
              </View>
            </View>
          ))}

          {services.map((service) => (
            <View key={service.id} style={styles.postCard}>
              <View style={styles.postIcon}>
                <MaterialIcons color={color.primary} name="handyman" size={20} />
              </View>
              <View style={styles.postCopy}>
                <View style={styles.postTitleRow}>
                  <Text style={styles.postTitle}>{service.title}</Text>
                  <Pill label={service.isActive ? 'active' : 'hidden'} tone={service.isActive ? 'success' : 'neutral'} />
                </View>
                <Text style={styles.postDetail}>
                  {service.category} · {service.availabilityText ?? 'Availability to coordinate'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {!loading && !jobs.length && !services.length ? (
          <EmptyState
            description="Post a job or offer a service after barangay verification."
            icon="inventory-2"
            title="No posts yet"
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PostAction({
  label,
  description,
  icon,
  onPress,
}: {
  label: string;
  description: string;
  icon: ComponentProps<typeof MaterialIcons>['name'];
  onPress: () => void;
}) {
  return (
    <View style={styles.actionCard}>
      <View style={styles.actionIcon}>
        <MaterialIcons color={color.primary} name={icon} size={24} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{label}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      <PrimaryButton label={label} onPress={onPress} variant="secondary" />
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
  statsRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  statCard: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: space['2xs'],
    padding: space.md,
  },
  statValue: {
    ...typography.screenTitle,
    color: color.text,
  },
  statLabel: {
    ...typography.caption,
    color: color.textMuted,
  },
  actionGrid: {
    gap: space.md,
  },
  actionCard: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: space.md,
    padding: space.lg,
  },
  actionIcon: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  actionCopy: {
    gap: space.xs,
  },
  actionTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  actionDescription: {
    ...typography.body,
    color: color.textMuted,
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
  postCard: {
    alignItems: 'flex-start',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
  },
  postIcon: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  postCopy: {
    flex: 1,
    gap: space.xs,
  },
  postTitleRow: {
    alignItems: 'flex-start',
    gap: space.sm,
  },
  postTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  postDetail: {
    ...typography.caption,
    color: color.textMuted,
  },
});
