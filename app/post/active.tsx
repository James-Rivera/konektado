import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFeedback } from '@/components/FeedbackProvider';
import { MoreActionsSheet, type MoreSheetAction } from '@/components/MoreActionsSheet';
import { Skeleton } from '@/components/Skeleton';
import { color, radius, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { closeJob, deactivateJob, listMyJobs, reactivateJob } from '@/services/job.service';
import { formatJobPostTitle, formatServicePostTitle } from '@/services/marketplace.helpers';
import { getMyJobReviewState } from '@/services/review.service';
import { listMyServices, updateServiceAvailability } from '@/services/service-profile.service';
import type { JobReviewState, JobSummary, ProviderService } from '@/types/marketplace.types';

type ManageTarget =
  | { job: JobSummary; type: 'job' }
  | { service: ProviderService; type: 'service' };

export default function ActivePostsScreen() {
  const router = useRouter();
  const { showSuccessToast } = useFeedback();
  const { profile, loading: profileLoading } = useProfile();
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [services, setServices] = useState<ProviderService[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [query, setQuery] = useState('');
  const [manageTarget, setManageTarget] = useState<ManageTarget | null>(null);
  const [reviewStates, setReviewStates] = useState<Record<string, JobReviewState>>({});
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (!profileLoading && !isVerified) {
        router.replace('/verification');
        return () => {
          active = false;
        };
      }

      if (profileLoading) {
        return () => {
          active = false;
        };
      }

      if (!hasLoadedOnce) {
        setLoading(true);
      }

      void (async () => {
        try {
          const [jobResult, serviceResult] = await Promise.all([
            listMyJobs(),
            listMyServices(),
          ]);
          if (!active) return;

          if (jobResult.error || !jobResult.data) {
            Alert.alert('Active posts', jobResult.error ?? 'Could not load your posts.');
          } else {
            setJobs(jobResult.data);
            const completedJobs = jobResult.data.filter((job) => job.status === 'completed');
            const stateResults = await Promise.all(
              completedJobs.map(async (job) => [job.id, await getMyJobReviewState(job.id)] as const),
            );
            if (!active) return;
            setReviewStates(
              Object.fromEntries(
                stateResults.flatMap(([jobId, result]) =>
                  result.data ? [[jobId, result.data] as const] : [],
                ),
              ),
            );
          }

          if (serviceResult.error || !serviceResult.data) {
            setServices([]);
          } else {
            setServices(serviceResult.data);
          }
        } catch {
          if (active) {
            Alert.alert('Active posts', 'Could not refresh your active posts right now.');
          }
        } finally {
          if (active) {
            setHasLoadedOnce(true);
            setLoading(false);
          }
        }
      })();

      return () => {
        active = false;
      };
    }, [hasLoadedOnce, isVerified, profileLoading, router]),
  );

  const filteredJobs = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return jobs;
    return jobs.filter((job) =>
      [job.title, job.description, job.category, job.serviceNeeded, job.locationText]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(text)),
    );
  }, [jobs, query]);
  const filteredServices = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return services;
    return services.filter((service) =>
      [service.title, service.description, service.category, service.availabilityText, service.locationText, service.barangay]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(text)),
    );
  }, [query, services]);

  const updatingSelected = manageTarget ? updatingKey === getTargetKey(manageTarget) : false;

  const viewTarget = (target: ManageTarget) => {
    setManageTarget(null);
    if (target.type === 'job') {
      router.push({ pathname: '/job/[jobId]', params: { jobId: target.job.id } });
      return;
    }

    router.push({ pathname: '/services/[serviceId]', params: { serviceId: target.service.id } });
  };

  const editService = (service: ProviderService) => {
    setManageTarget(null);
    router.push({ pathname: '/create-service' as never, params: { serviceId: service.id } } as never);
  };

  const editJob = (job: JobSummary) => {
    setManageTarget(null);
    router.push({
      pathname: '/create-job' as never,
      params: { jobId: job.id, returnTo: 'post' },
    } as never);
  };

  const updateJob = async ({
    job,
    run,
    successMessage,
  }: {
    job: JobSummary;
    run: () => ReturnType<typeof deactivateJob>;
    successMessage: string;
  }) => {
    const key = `job-${job.id}`;
    setUpdatingKey(key);
    const result = await run();
    setUpdatingKey(null);

    if (result.error || !result.data) {
      Alert.alert('Manage post', result.error ?? 'Could not update this job.');
      return;
    }

    setJobs((current) => current.map((item) => (item.id === result.data?.id ? result.data : item)));
    setManageTarget(null);
    showSuccessToast(successMessage);
  };

  const updateService = async (service: ProviderService, isActive: boolean) => {
    const key = `service-${service.id}`;
    setUpdatingKey(key);
    const result = await updateServiceAvailability({ isActive, serviceId: service.id });
    setUpdatingKey(null);

    if (result.error || !result.data) {
      Alert.alert('Manage service', result.error ?? 'Could not update this service.');
      return;
    }

    setServices((current) => current.map((item) => (item.id === result.data?.id ? result.data : item)));
    setManageTarget(null);
    showSuccessToast(isActive ? 'Service reactivated' : 'Service deactivated');
  };

  const confirmJobAction = ({
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

  const manageActions: MoreSheetAction[] = !manageTarget
    ? []
    : manageTarget.type === 'job'
      ? getJobManagementActions({
        job: manageTarget.job,
        onEdit: () => editJob(manageTarget.job),
        onReview: () => viewTarget(manageTarget),
        reviewState: reviewStates[manageTarget.job.id] ?? null,
        onClose: () =>
          confirmJobAction({
            body: 'This marks the job as closed and removes it from active search results.',
            label: 'Close job',
            onConfirm: () =>
              updateJob({
                job: manageTarget.job,
                run: () => closeJob(manageTarget.job.id),
                successMessage: 'Job closed',
              }),
            title: 'Close this job?',
          }),
        onDeactivate: () =>
          confirmJobAction({
            body: 'This hides the job from search. You can reactivate it later from your posts.',
            label: 'Deactivate',
            onConfirm: () =>
              updateJob({
                job: manageTarget.job,
                run: () => deactivateJob(manageTarget.job.id),
                successMessage: 'Job deactivated',
              }),
            title: 'Deactivate this job?',
          }),
        onReactivate: () =>
          updateJob({
            job: manageTarget.job,
            run: () => reactivateJob(manageTarget.job.id),
            successMessage: 'Job reactivated',
          }),
        onView: () => viewTarget(manageTarget),
        updating: updatingSelected,
      })
      : getServiceManagementActions({
          isActive: manageTarget.service.isActive,
          onDeactivate: () =>
            Alert.alert(
              'Deactivate this service?',
              'This hides the service from search. You can reactivate it later from your posts.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Deactivate',
                  style: 'destructive',
                  onPress: () => updateService(manageTarget.service, false),
                },
              ],
            ),
          onEdit: () => editService(manageTarget.service),
          onReactivate: () => updateService(manageTarget.service, true),
          onView: () => viewTarget(manageTarget),
          updating: updatingSelected,
        });

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()} style={styles.headerIcon}>
            <MaterialIcons color={color.text} name="chevron-left" size={28} />
          </Pressable>
          <Text style={styles.headerTitle}>Your Posts</Text>
          <View style={styles.headerIcon} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/create-job')}
            style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}>
            <MaterialIcons color={color.white} name="edit-square" size={18} />
            <Text style={styles.createButtonText}>Create a post</Text>
          </Pressable>

          <View style={styles.searchBar}>
            <TextInput
              onChangeText={setQuery}
              placeholder="Search your posts"
              placeholderTextColor={color.textSubtle}
              style={styles.searchInput}
              value={query}
            />
            <MaterialIcons color={color.primary} name="search" size={24} />
          </View>

          <Text style={styles.sectionTitle}>Your Posts</Text>

          {loading ? (
            <View style={styles.skeletonStack}>
              <ActivePostSkeleton />
              <ActivePostSkeleton />
            </View>
          ) : null}

          {!loading && filteredJobs.length === 0 && filteredServices.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptyText}>Your job and service posts will appear here.</Text>
            </View>
          ) : null}

          {filteredJobs.map((job) => (
            <ActivePostCard
              job={job}
              key={job.id}
              onManage={() => viewTarget({ job, type: 'job' })}
              onMore={() => setManageTarget({ job, type: 'job' })}
            />
          ))}

          {filteredServices.map((service) => (
            <ActiveServicePostCard
              key={service.id}
              onManage={() => viewTarget({ service, type: 'service' })}
              onMore={() => setManageTarget({ service, type: 'service' })}
              service={service}
            />
          ))}
        </ScrollView>

        <MoreActionsSheet
          actions={manageActions}
          onClose={() => setManageTarget(null)}
          subtitle={getManageTargetSubtitle(manageTarget)}
          title={manageTarget?.type === 'service' ? 'Manage service' : 'Manage job'}
          visible={Boolean(manageTarget)}
        />
      </View>
    </SafeAreaView>
  );
}

function ActivePostCard({
  job,
  onManage,
  onMore,
}: {
  job: JobSummary;
  onManage: () => void;
  onMore: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.thumb}>
          <MaterialIcons color={color.verificationBlue} name="assignment" size={28} />
        </View>
        <View style={styles.cardCopy}>
          <Text numberOfLines={1} style={styles.cardTitle}>
            {formatJobPostTitle({
              title: job.title,
              serviceNeeded: job.serviceNeeded,
              category: job.category,
            })}
          </Text>
          <Text style={styles.cardDate}>{formatDate(job.createdAt)}</Text>
          <View style={styles.cardMetaRow}>
            <TinyMeta icon="person" text={`${job.workersNeeded ?? 0} workers`} />
          </View>
        </View>
        <Pressable
          accessibilityLabel="Manage job"
          accessibilityRole="button"
          onPress={onMore}
          style={({ pressed }) => [styles.cardIconButton, pressed && styles.pressed]}>
          <MaterialIcons color={color.verificationBlue} name="more-vert" size={24} />
        </Pressable>
      </View>
      <StatusRow label={formatJobStatus(job.status)} tone={getJobStatusTone(job.status)} />
      <Pressable accessibilityRole="button" onPress={onManage} style={({ pressed }) => [styles.manageButton, pressed && styles.pressed]}>
        <Text style={styles.manageButtonText}>View</Text>
      </Pressable>
    </View>
  );
}

function ActiveServicePostCard({
  service,
  onManage,
  onMore,
}: {
  service: ProviderService;
  onManage: () => void;
  onMore: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.thumb}>
          <MaterialIcons color={color.verificationBlue} name="build" size={28} />
        </View>
        <View style={styles.cardCopy}>
          <Text numberOfLines={1} style={styles.cardTitle}>
            {formatServicePostTitle({
              title: service.title,
              category: service.category,
            })}
          </Text>
          <Text style={styles.cardDate}>{formatDate(service.createdAt)}</Text>
          <View style={styles.cardMetaRow}>
            <TinyMeta icon="category" text={service.category} />
            <TinyMeta icon="place" text={service.locationText ?? service.barangay ?? 'Location to coordinate'} />
          </View>
        </View>
        <Pressable
          accessibilityLabel="Manage service"
          accessibilityRole="button"
          onPress={onMore}
          style={({ pressed }) => [styles.cardIconButton, pressed && styles.pressed]}>
          <MaterialIcons color={color.verificationBlue} name="more-vert" size={24} />
        </Pressable>
      </View>
      <StatusRow label={service.isActive ? 'Active service' : 'Inactive service'} tone={service.isActive ? 'active' : 'inactive'} />
      <Pressable accessibilityRole="button" onPress={onManage} style={({ pressed }) => [styles.manageButton, pressed && styles.pressed]}>
        <Text style={styles.manageButtonText}>Manage</Text>
      </Pressable>
    </View>
  );
}

function ActivePostSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Skeleton height={60} width={60} borderRadius={radius.sm} />
        <View style={styles.cardCopy}>
          <Skeleton height={14} width="78%" />
          <Skeleton height={12} width={72} />
          <View style={styles.cardMetaRow}>
            <Skeleton height={14} width={72} />
            <Skeleton height={14} width={112} />
          </View>
        </View>
        <Skeleton height={24} width={24} borderRadius={radius.sm} />
      </View>
      <Skeleton height={36} width="100%" borderRadius={radius.lg} />
    </View>
  );
}

function TinyMeta({ icon, text }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; text: string }) {
  return (
    <View style={styles.tinyMeta}>
      <MaterialIcons color={color.verificationBlue} name={icon} size={14} />
      <Text numberOfLines={1} style={styles.tinyMetaText}>
        {text}
      </Text>
    </View>
  );
}

function StatusRow({
  label,
  tone,
}: {
  label: string;
  tone: 'active' | 'inactive' | 'final';
}) {
  return (
    <View style={styles.statusRow}>
      <View
        style={[
          styles.statusDot,
          tone === 'active' && styles.statusDotActive,
          tone === 'inactive' && styles.statusDotInactive,
          tone === 'final' && styles.statusDotFinal,
        ]}
      />
      <Text style={styles.statusText}>{label}</Text>
    </View>
  );
}

function getJobManagementActions({
  job,
  onClose,
  onDeactivate,
  onEdit,
  onReactivate,
  onReview,
  onView,
  reviewState,
  updating,
}: {
  job: JobSummary;
  onClose: () => void;
  onDeactivate: () => void;
  onEdit: () => void;
  onReactivate: () => void;
  onReview: () => void;
  onView: () => void;
  reviewState: JobReviewState | null;
  updating: boolean;
}): MoreSheetAction[] {
  const actions: MoreSheetAction[] = [
    {
      disabled: updating,
      icon: 'visibility',
      label: 'View',
      onPress: onView,
    },
  ];
  const isInactive = job.status === 'cancelled';
  const isFinal = job.status === 'closed' || job.status === 'completed';

  if (['open', 'reviewing', 'cancelled'].includes(job.status)) {
    actions.push({
      disabled: updating,
      icon: 'edit',
      label: 'Edit job',
      onPress: onEdit,
    });
  }

  if (
    job.status === 'completed' &&
    (reviewState?.eligible || reviewState?.reason === 'already_reviewed')
  ) {
    actions.push({
      disabled: updating,
      icon: 'rate-review',
      label: reviewState.reason === 'already_reviewed' ? 'View submitted review' : 'Review worker',
      onPress: onReview,
    });
  }

  if (isInactive) {
    actions.push({
      disabled: updating,
      icon: 'play-circle',
      label: updating ? 'Updating...' : 'Reactivate job',
      onPress: onReactivate,
    });
  } else if (!isFinal) {
    actions.push({
      disabled: updating,
      icon: 'pause-circle',
      label: updating ? 'Updating...' : 'Deactivate job',
      onPress: onDeactivate,
    });
  }

  if (!isFinal) {
    actions.push({
      disabled: updating,
      icon: 'task-alt',
      label: updating ? 'Updating...' : 'Close job',
      onPress: onClose,
      tone: 'danger',
    });
  }

  return actions;
}

function getServiceManagementActions({
  isActive,
  onDeactivate,
  onEdit,
  onReactivate,
  onView,
  updating,
}: {
  isActive: boolean;
  onDeactivate: () => void;
  onEdit: () => void;
  onReactivate: () => void;
  onView: () => void;
  updating: boolean;
}): MoreSheetAction[] {
  return [
    {
      disabled: updating,
      icon: 'visibility',
      label: 'Manage service',
      onPress: onView,
    },
    {
      disabled: updating,
      icon: 'edit',
      label: 'Edit service',
      onPress: onEdit,
    },
    isActive
      ? {
          disabled: updating,
          icon: 'pause-circle',
          label: updating ? 'Updating...' : 'Deactivate service',
          onPress: onDeactivate,
          tone: 'danger',
        }
      : {
          disabled: updating,
          icon: 'play-circle',
          label: updating ? 'Updating...' : 'Reactivate service',
          onPress: onReactivate,
        },
  ];
}

function getManageTargetSubtitle(target: ManageTarget | null) {
  if (!target) return null;
  if (target.type === 'job') {
    return formatJobPostTitle({
      title: target.job.title,
      serviceNeeded: target.job.serviceNeeded,
      category: target.job.category,
    });
  }

  return formatServicePostTitle({
    title: target.service.title,
    category: target.service.category,
  });
}

function getTargetKey(target: ManageTarget) {
  return target.type === 'job' ? `job-${target.job.id}` : `service-${target.service.id}`;
}

function formatJobStatus(status: JobSummary['status']) {
  if (status === 'cancelled') return 'Inactive job';
  if (status === 'closed') return 'Closed job';
  if (status === 'completed') return 'Completed job';
  return `Active job - ${status.replace(/_/g, ' ')}`;
}

function getJobStatusTone(status: JobSummary['status']) {
  if (status === 'cancelled') return 'inactive';
  if (status === 'closed' || status === 'completed') return 'final';
  return 'active';
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Posted Today';
  return `Posted ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
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
    flexDirection: 'row',
    gap: space.md,
    minHeight: 55,
    paddingHorizontal: space.xl,
  },
  headerIcon: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  headerTitle: {
    ...typography.sectionTitle,
    color: color.text,
    flex: 1,
  },
  content: {
    gap: space.md,
    padding: space.xl,
    paddingBottom: space['3xl'],
  },
  createButton: {
    alignItems: 'center',
    backgroundColor: color.verificationBlue,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: space.sm,
    height: 38,
    justifyContent: 'center',
  },
  createButtonText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    color: color.white,
  },
  searchBar: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 44,
    paddingHorizontal: space.md,
  },
  searchInput: {
    ...typography.body,
    color: color.text,
    flex: 1,
  },
  sectionTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    color: color.text,
  },
  skeletonStack: {
    gap: space.sm,
  },
  emptyCard: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.sm,
    padding: space.xl,
  },
  emptyTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  emptyText: {
    ...typography.body,
    color: color.textMuted,
    textAlign: 'center',
  },
  card: {
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.sm,
    padding: space.md,
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  thumb: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.sm,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  cardCopy: {
    flex: 1,
    gap: space.xs,
  },
  cardTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    color: color.text,
  },
  cardDate: {
    ...typography.caption,
    color: color.textMuted,
  },
  cardMetaRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  cardIconButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  tinyMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space['2xs'],
  },
  tinyMetaText: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 11,
    color: color.textMuted,
    maxWidth: 120,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
  },
  statusDot: {
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  statusDotActive: {
    backgroundColor: color.success,
  },
  statusDotInactive: {
    backgroundColor: color.warning,
  },
  statusDotFinal: {
    backgroundColor: color.textSubtle,
  },
  statusText: {
    ...typography.captionMedium,
    color: color.textMuted,
    textTransform: 'capitalize',
  },
  manageButton: {
    alignItems: 'center',
    backgroundColor: color.verificationBlue,
    borderRadius: radius.lg,
    minHeight: 36,
    justifyContent: 'center',
  },
  manageButtonText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    color: color.white,
  },
  pressed: {
    opacity: 0.72,
  },
});
