import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { HomeTopHeader } from '@/components/home/HomeDashboardUI';
import { PopularServicesSection } from '@/components/search/PopularServicesSection';
import { SearchHeaderRow } from '@/components/search/SearchHeaderRow';
import { SearchJobResultCard } from '@/components/search/SearchJobResultCard';
import { SearchResultHeader } from '@/components/search/SearchResultHeader';
import { SearchSegmentedControl } from '@/components/search/SearchSegmentedControl';
import { SearchWorkerResultCard } from '@/components/search/SearchWorkerResultCard';
import { Skeleton, SkeletonCircle } from '@/components/Skeleton';
import {
  getWorkerResultsHeading,
  popularServices,
  type SearchJobItem,
  type SearchWorkerItem,
  type SearchMode,
} from '@/constants/search-demo-data';
import { color, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { useSafeTopInset } from '@/hooks/use-safe-top-inset';
import {
  formatJobSubtitle,
  formatRelativeMarketplaceDate,
  formatServiceJobsDoneText,
  formatServiceRatingText,
  getMarketplaceLocation,
} from '@/services/marketplace.helpers';
import { searchJobs as searchOpenJobs } from '@/services/job.service';
import { searchServices } from '@/services/service-profile.service';
import type { JobSummary, ServiceSearchResult } from '@/types/marketplace.types';

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function getInitialMode(filterParam: string | undefined): SearchMode {
  if (filterParam === 'Workers') return 'workers';
  return 'jobs';
}

export default function SearchScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const topInset = useSafeTopInset();
  const { profile } = useProfile();
  const params = useLocalSearchParams<{ filter?: string | string[] }>();
  const filterParam = getParamValue(params.filter);
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);
  const [mode, setMode] = useState<SearchMode>(() => getInitialMode(filterParam));
  const [query, setQuery] = useState('');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [jobs, setJobs] = useState<SearchJobItem[]>([]);
  const [workers, setWorkers] = useState<SearchWorkerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMode(getInitialMode(filterParam));
  }, [filterParam]);

  useEffect(() => {
    let active = true;

    if (!isFocused) {
      return () => {
        active = false;
      };
    }

    setLoading(true);

    const text = Array.from(new Set([query.trim(), selectedService?.trim()].filter(Boolean))).join(' ');

    Promise.all([searchOpenJobs({ text }), searchServices({ text })]).then(
      ([jobsResult, servicesResult]) => {
        if (!active) return;

        setJobs((jobsResult.data ?? []).map(mapJobToSearchItem));
        setWorkers((servicesResult.data ?? []).map(mapServiceToSearchItem));
        setLoading(false);
      },
    );

    return () => {
      active = false;
    };
  }, [isFocused, query, selectedService]);

  const resultHeading =
    mode === 'jobs' ? 'Jobs near you' : getWorkerResultsHeading(query, selectedService);

  const showVerification = () => {
    router.push('/verification');
  };

  const showPlaceholder = (label: string) => {
    Alert.alert(label, 'This part of Search will be connected in a later slice.');
  };

  const handleModeChange = (nextMode: SearchMode) => {
    setMode(nextMode);
  };

  const handleChipPress = (serviceLabel: string) => {
    const nextSelected = selectedService === serviceLabel ? null : serviceLabel;
    setSelectedService(nextSelected);
    setQuery(nextSelected ?? '');
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={[]} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[4]}>
          <HomeTopHeader onNotifications={() => showPlaceholder('Notifications')} topInset={topInset} />
          <SearchHeaderRow
            onBack={() => {
              if (router.canGoBack()) {
                router.back();
                return;
              }

              router.replace('/(tabs)');
            }}
            onChangeText={setQuery}
            value={query}
          />
          <View style={styles.segmentBand}>
            <SearchSegmentedControl mode={mode} onChange={handleModeChange} />
          </View>
          <PopularServicesSection
            onPressService={handleChipPress}
            selectedService={selectedService}
            services={popularServices}
          />
          <SearchResultHeader title={resultHeading} onFilterPress={() => showPlaceholder('Filters')} />

          <View style={styles.resultsWrap}>
            {loading ? (
              mode === 'jobs' ? (
                <>
                  <SearchJobResultSkeleton />
                  <SearchJobResultSkeleton />
                </>
              ) : (
                <>
                  <SearchWorkerResultSkeleton />
                  <SearchWorkerResultSkeleton />
                </>
              )
            ) : mode === 'jobs'
              ? jobs.map((job) => (
                  <SearchJobResultCard
                    job={job}
                    key={job.id}
                    onOpenJob={() => router.push({ pathname: '/job/[jobId]', params: { jobId: job.id } })}
                    onSave={isVerified ? () => showPlaceholder('Save') : showVerification}
                  />
                ))
                : workers.map((worker) => (
                  <SearchWorkerResultCard
                    key={worker.id}
                    onOpenWorker={() =>
                      router.push({
                        pathname: '/worker/[workerId]',
                        params: { workerId: worker.id, variant: 'match' },
                      })
                    }
                    onSave={isVerified ? () => showPlaceholder('Save') : showVerification}
                    worker={worker}
                  />
                ))}

            {(mode === 'jobs' ? jobs.length : workers.length) ? null : loading ? null : (
              <View style={styles.emptyCard}>
                <EmptyState
                  actionLabel="Clear search"
                  description="Try a different service or remove the current search terms."
                  icon="search-off"
                  onActionPress={() => {
                    setQuery('');
                    setSelectedService(null);
                  }}
                  title="No matching results yet"
                />
              </View>
            )}

            {!isVerified ? (
              <Text style={styles.helperText}>
                Save and message actions stay locked until your barangay verification is approved.
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function mapJobToSearchItem(job: JobSummary): SearchJobItem {
  const category = job.category || 'Job';
  const location = getMarketplaceLocation(job);

  return {
    id: job.id,
    postedAt: formatRelativeMarketplaceDate(job.createdAt),
    title: job.title,
    subtitle: formatJobSubtitle(job),
    description: job.description || 'No description provided yet.',
    tags: Array.from(new Set([category, ...job.tags, 'Open job'].filter(Boolean))),
    clientRatingText: 'Verified client',
    jobsPostedText: 'Posted in Konektado',
    location,
    matchReason: `Open ${category.toLowerCase()} job near ${location}.`,
  };
}

function mapServiceToSearchItem(service: ServiceSearchResult): SearchWorkerItem {
  const category = service.category || 'Service';
  const location = getMarketplaceLocation(service);

  return {
    id: service.id,
    name: service.provider?.fullName || 'Konektado resident',
    statusLine: service.availabilityText
      ? `${service.availabilityText} near your barangay`
      : 'Available near your barangay',
    rateLine: service.rateText || 'Rate to coordinate',
    headline: service.description || service.title,
    tags: Array.from(new Set([category, ...service.tags].filter(Boolean))),
    ratingText: formatServiceRatingText(service),
    jobsDoneText: formatServiceJobsDoneText(service, service.completedJobsCount),
    location,
    matchReason: `Offers ${category.toLowerCase()} help near ${location}.`,
  };
}

function SearchJobResultSkeleton() {
  return (
    <View style={styles.skeletonCard}>
      <Skeleton height={12} width="24%" />
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonCopy}>
          <Skeleton height={16} width="72%" />
          <Skeleton height={12} width="58%" />
        </View>
        <View style={styles.skeletonIconRow}>
          <Skeleton height={20} width={20} borderRadius={10} />
          <Skeleton height={20} width={20} borderRadius={10} />
        </View>
      </View>
      <View style={styles.skeletonMetaRow}>
        <Skeleton height={12} width={72} />
        <Skeleton height={12} width={80} />
        <Skeleton height={12} width={96} />
      </View>
      <Skeleton height={14} width="92%" />
      <Skeleton height={12} width="74%" />
      <View style={styles.skeletonTagRow}>
        <Skeleton height={27} width={70} borderRadius={13} />
        <Skeleton height={27} width={84} borderRadius={13} />
        <Skeleton height={27} width={62} borderRadius={13} />
      </View>
      <Skeleton height={34} width="100%" borderRadius={999} />
    </View>
  );
}

function SearchWorkerResultSkeleton() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeader}>
        <View style={styles.workerSkeletonIdentity}>
          <SkeletonCircle size={44} />
          <View style={styles.skeletonCopy}>
            <Skeleton height={16} width="56%" />
            <Skeleton height={12} width="76%" />
          </View>
        </View>
        <View style={styles.skeletonIconRow}>
          <Skeleton height={20} width={20} borderRadius={10} />
          <Skeleton height={20} width={20} borderRadius={10} />
        </View>
      </View>
      <View style={styles.skeletonMetaRow}>
        <Skeleton height={12} width={72} />
        <Skeleton height={12} width={82} />
        <Skeleton height={12} width={94} />
      </View>
      <Skeleton height={12} width="46%" />
      <Skeleton height={16} width="88%" />
      <Skeleton height={12} width="70%" />
      <View style={styles.skeletonTagRow}>
        <Skeleton height={27} width={76} borderRadius={13} />
        <Skeleton height={27} width={90} borderRadius={13} />
        <Skeleton height={27} width={68} borderRadius={13} />
      </View>
      <Skeleton height={34} width="100%" borderRadius={999} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.screenBackground,
    flex: 1,
  },
  safeArea: {
    backgroundColor: color.screenBackground,
    flex: 1,
  },
  content: {
    paddingBottom: space['3xl'],
  },
  segmentBand: {
    backgroundColor: color.background,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  resultsWrap: {
    backgroundColor: color.background,
    gap: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  skeletonCard: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  skeletonHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  workerSkeletonIdentity: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  skeletonCopy: {
    flex: 1,
    gap: 6,
  },
  skeletonIconRow: {
    flexDirection: 'row',
    gap: 9,
  },
  skeletonMetaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonTagRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyCard: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  helperText: {
    ...typography.caption,
    color: color.textMuted,
    paddingHorizontal: 4,
  },
});
