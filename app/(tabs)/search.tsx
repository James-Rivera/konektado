import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
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
import { color, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { useSafeTopInset } from '@/hooks/use-safe-top-inset';
import {
  formatJobSubtitle,
  formatClientJobsPostedText,
  formatClientRatingText,
  formatJobPostTitle,
  formatRelativeMarketplaceDate,
  formatServiceJobsDoneText,
  formatServicePostTitle,
  formatServiceRatingText,
  getMarketplaceLocation,
  getPublicProfileAvatarUrl,
  isPresenceActive,
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

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debouncedValue;
}

type SearchListRow =
  | { key: 'result-header'; type: 'resultHeader' }
  | { key: 'refresh'; type: 'refresh' }
  | { key: string; type: 'jobSkeleton' }
  | { key: string; type: 'workerSkeleton' }
  | { key: string; type: 'job'; job: SearchJobItem }
  | { key: string; type: 'worker'; worker: SearchWorkerItem }
  | { key: 'empty'; type: 'empty' }
  | { key: 'helper'; type: 'helper' };

export default function SearchScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const listRef = useRef<FlatList<SearchListRow>>(null);
  const topInset = useSafeTopInset();
  const { profile, loading: profileLoading } = useProfile();
  const params = useLocalSearchParams<{ filter?: string | string[] }>();
  const filterParam = getParamValue(params.filter);
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);
  const verificationKnown = !profileLoading;
  const [mode, setMode] = useState<SearchMode>(() => getInitialMode(filterParam));
  const [query, setQuery] = useState('');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [jobs, setJobs] = useState<SearchJobItem[]>([]);
  const [workers, setWorkers] = useState<SearchWorkerItem[]>([]);
  const [loadedModes, setLoadedModes] = useState<Record<SearchMode, boolean>>({
    jobs: false,
    workers: false,
  });
  const [refreshingModes, setRefreshingModes] = useState<Record<SearchMode, boolean>>({
    jobs: false,
    workers: false,
  });
  const searchRequestRef = useRef(0);
  const controlsTranslateY = useRef(new Animated.Value(0)).current;
  const controlsHeightRef = useRef(0);
  const controlsVisibleRef = useRef(true);
  const lastScrollOffset = useRef(0);
  const [controlsHeight, setControlsHeight] = useState(0);
  const debouncedQuery = useDebouncedValue(query, 300);
  const searchText = useMemo(
    () => Array.from(new Set([debouncedQuery.trim(), selectedService?.trim()].filter(Boolean))).join(' '),
    [debouncedQuery, selectedService],
  );

  useEffect(() => {
    let active = true;
    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;

    if (!isFocused) {
      return () => {
        active = false;
      };
    }

    setRefreshingModes((current) => ({ ...current, [mode]: true }));

    const searchPromise =
      mode === 'jobs'
        ? searchOpenJobs({ text: searchText, limit: 30 }).then((result) => {
            if (!active || requestId !== searchRequestRef.current) return;

            if (result.data) {
              setJobs(result.data.map(mapJobToSearchItem));
            }
          })
        : searchServices({ text: searchText, limit: 30 }).then((result) => {
            if (!active || requestId !== searchRequestRef.current) return;

            if (result.data) {
              setWorkers(result.data.map(mapServiceToSearchItem));
            }
          });

    searchPromise
      .catch(() => undefined)
      .finally(() => {
        if (!active || requestId !== searchRequestRef.current) return;
        setLoadedModes((current) => ({ ...current, [mode]: true }));
        setRefreshingModes((current) => ({ ...current, [mode]: false }));
      });

    return () => {
      active = false;
    };
  }, [isFocused, mode, searchText]);

  const resultHeading =
    mode === 'jobs' ? 'Showing jobs near you' : getWorkerResultsHeading(query, selectedService);
  const activeResultCount = mode === 'jobs' ? jobs.length : workers.length;
  const activeModeLoaded = loadedModes[mode];
  const activeModeRefreshing = refreshingModes[mode];
  const showInitialSkeleton = activeModeRefreshing && !activeModeLoaded && activeResultCount === 0;
  const showRefreshIndicator = activeModeRefreshing && activeModeLoaded && activeResultCount > 0;

  const showPlaceholder = useCallback((label: string) => {
    Alert.alert(label, 'This part of Search will be connected in a later slice.');
  }, []);

  const setControlsVisible = useCallback((visible: boolean) => {
    if (!controlsHeightRef.current) return;
    if (controlsVisibleRef.current === visible) return;
    controlsVisibleRef.current = visible;

    Animated.timing(controlsTranslateY, {
      toValue: visible ? 0 : -controlsHeightRef.current,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [controlsTranslateY]);

  const handleControlsLayout = useCallback((event: { nativeEvent: { layout: { height: number } } }) => {
    const height = Math.round(event.nativeEvent.layout.height);
    if (!height || height === controlsHeightRef.current) return;
    controlsHeightRef.current = height;
    setControlsHeight(height);
  }, []);

  const revealControlsAtTop = useCallback(() => {
    lastScrollOffset.current = 0;
    setControlsVisible(true);
    listRef.current?.scrollToOffset({ animated: false, offset: 0 });
  }, [setControlsVisible]);

  useEffect(() => {
    revealControlsAtTop();
    setMode(getInitialMode(filterParam));
  }, [filterParam, revealControlsAtTop]);

  const handleScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number } } }) => {
    const offset = event.nativeEvent.contentOffset.y;
    const delta = offset - lastScrollOffset.current;

    if (offset <= 0 || offset < 24) {
      setControlsVisible(true);
      lastScrollOffset.current = offset;
      return;
    }

    if (Math.abs(delta) < 6) {
      lastScrollOffset.current = offset;
      return;
    }

    setControlsVisible(delta < 0);
    lastScrollOffset.current = offset;
  }, [setControlsVisible]);

  const handleModeChange = useCallback((nextMode: SearchMode) => {
    revealControlsAtTop();
    setMode(nextMode);
  }, [revealControlsAtTop]);

  const handleChipPress = useCallback((serviceLabel: string) => {
    const nextSelected = selectedService === serviceLabel ? null : serviceLabel;
    revealControlsAtTop();
    setSelectedService(nextSelected);
    setQuery(nextSelected ?? '');
  }, [revealControlsAtTop, selectedService]);

  const clearSearch = useCallback(() => {
    revealControlsAtTop();
    setQuery('');
    setSelectedService(null);
  }, [revealControlsAtTop]);

  const openJob = useCallback((jobId: string) => {
    router.push({ pathname: '/job/[jobId]', params: { jobId } });
  }, [router]);

  const openService = useCallback((serviceId: string) => {
    router.push({
      pathname: '/services/[serviceId]',
      params: { serviceId, variant: 'match' },
    });
  }, [router]);

  const listRows = useMemo<SearchListRow[]>(() => {
    const rows: SearchListRow[] = [{ key: 'result-header', type: 'resultHeader' }];

    if (showRefreshIndicator) {
      rows.push({ key: 'refresh', type: 'refresh' });
    }

    if (showInitialSkeleton) {
      rows.push(
        { key: `${mode}-skeleton-1`, type: mode === 'jobs' ? 'jobSkeleton' : 'workerSkeleton' },
        { key: `${mode}-skeleton-2`, type: mode === 'jobs' ? 'jobSkeleton' : 'workerSkeleton' },
      );
    } else if (mode === 'jobs') {
      rows.push(...jobs.map((job) => ({ key: `job-${job.id}`, type: 'job' as const, job })));
    } else {
      rows.push(...workers.map((worker) => ({ key: `worker-${worker.id}`, type: 'worker' as const, worker })));
    }

    if (!activeResultCount && !showInitialSkeleton && !activeModeRefreshing) {
      rows.push({ key: 'empty', type: 'empty' });
    }

    if (verificationKnown && !isVerified) {
      rows.push({ key: 'helper', type: 'helper' });
    }

    return rows;
  }, [
    activeModeRefreshing,
    activeResultCount,
    isVerified,
    jobs,
    mode,
    showInitialSkeleton,
    showRefreshIndicator,
    verificationKnown,
    workers,
  ]);

  const keyExtractor = useCallback((item: SearchListRow) => item.key, []);

  const renderSearchControls = useCallback(
    () => (
      <>
        <View style={[styles.searchModule, { paddingTop: topInset + 12 }]}>
          <SearchHeaderRow flush onChangeText={setQuery} value={query} />
          <SearchSegmentedControl flush mode={mode} onChange={handleModeChange} />
        </View>
        <PopularServicesSection
          onPressService={handleChipPress}
          selectedService={selectedService}
          services={popularServices}
        />
      </>
    ),
    [handleChipPress, handleModeChange, mode, query, selectedService, topInset],
  );

  const renderSearchRow = useCallback(
    ({ index, item }: { index: number; item: SearchListRow }) => {
      if (item.type === 'resultHeader') {
        return <SearchResultHeader title={resultHeading} onFilterPress={() => showPlaceholder('Filters')} />;
      }

      const rowStyle = [styles.resultRow, index === 1 && styles.firstResultRow];

      if (item.type === 'refresh') {
        return (
          <View style={rowStyle}>
            <Text style={styles.refreshText}>Updating results...</Text>
          </View>
        );
      }

      if (item.type === 'jobSkeleton') {
        return (
          <View style={rowStyle}>
            <SearchJobResultSkeleton />
          </View>
        );
      }

      if (item.type === 'workerSkeleton') {
        return (
          <View style={rowStyle}>
            <SearchWorkerResultSkeleton />
          </View>
        );
      }

      if (item.type === 'job') {
        return (
          <View style={rowStyle}>
            <SearchJobResultCard
              job={item.job}
              onOpenJob={() => openJob(item.job.id)}
            />
          </View>
        );
      }

      if (item.type === 'worker') {
        return (
          <View style={rowStyle}>
            <SearchWorkerResultCard
              onOpenWorker={() => openService(item.worker.id)}
              worker={item.worker}
            />
          </View>
        );
      }

      if (item.type === 'empty') {
        return (
          <View style={[rowStyle, styles.emptyCard]}>
            <EmptyState
              actionLabel="Clear search"
              description="Try a different service or remove the current search terms."
              icon="search-off"
              onActionPress={clearSearch}
              title="No matching results yet"
            />
          </View>
        );
      }

      return (
        <View style={rowStyle}>
          <Text style={styles.helperText}>
            Messaging stays locked until your barangay verification is approved.
          </Text>
        </View>
      );
    },
    [
      clearSearch,
      openJob,
      openService,
      resultHeading,
      showPlaceholder,
    ],
  );

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={[]} style={styles.safeArea}>
        <Animated.View
          onLayout={handleControlsLayout}
          style={[styles.controlsStack, { transform: [{ translateY: controlsTranslateY }] }]}>
          {renderSearchControls()}
        </Animated.View>
        <FlatList
          ref={listRef}
          contentContainerStyle={[styles.content, { paddingTop: controlsHeight }]}
          data={listRows}
          keyExtractor={keyExtractor}
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          renderItem={renderSearchRow}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[0]}
        />
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
    title: formatJobPostTitle({
      title: job.title,
      serviceNeeded: job.serviceNeeded,
      category: job.category,
      cue: job.serviceNeeded ? 'needHelpWith' : 'lookingFor',
    }),
    subtitle: formatJobSubtitle(job),
    description: job.description || 'No description provided yet.',
    tags: Array.from(new Set([category, ...job.tags, 'Open job'].filter(Boolean))),
    clientRatingText: formatClientRatingText(job),
    jobsPostedText: formatClientJobsPostedText(job),
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
    avatarUrl: getPublicProfileAvatarUrl(service.provider),
    statusLine: formatWorkerAvailability(service.availabilityText),
    rateLine: service.rateText || 'Rate to coordinate',
    headline: formatServicePostTitle({
      title: service.title,
      category: service.category,
      cue: service.isActive ? 'availableFor' : 'offers',
    }),
    tags: Array.from(new Set([category, ...service.tags].filter(Boolean))),
    ratingText: formatServiceRatingText(service),
    jobsDoneText: formatServiceJobsDoneText(service, service.completedJobsCount),
    location,
    matchReason: `Offers ${category.toLowerCase()} help near ${location}.`,
    isActive: isPresenceActive(service.isActive && (service.availabilityText || service.provider?.availability || true)),
  };
}

function formatWorkerAvailability(value: string | null) {
  const source = value?.trim();
  if (!source) return 'Available near you';

  const shortened = source
    .replace(/\s+near your barangay\b/i, '')
    .replace(/\bSaturday\b/gi, 'Sat')
    .replace(/\bSunday\b/gi, 'Sun')
    .replace(/\bMonday\b/gi, 'Mon')
    .replace(/\bTuesday\b/gi, 'Tue')
    .replace(/\bWednesday\b/gi, 'Wed')
    .replace(/\bThursday\b/gi, 'Thu')
    .replace(/\bFriday\b/gi, 'Fri')
    .replace(/:00\s*(AM|PM)\b/gi, ' $1')
    .replace(/\s+and\s+/gi, ' - ')
    .replace(/\s+/g, ' ')
    .trim();

  const withPrefix = /^available\b/i.test(shortened) ? shortened : `Available ${shortened.charAt(0).toLowerCase()}${shortened.slice(1)}`;

  return withPrefix.length <= 40 ? withPrefix : shortened.length <= 40 ? shortened : `${shortened.slice(0, 37).trim()}...`;
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
      <Skeleton height={16} width="88%" />
      <Skeleton height={12} width="46%" />
      <View style={styles.skeletonMetaRow}>
        <Skeleton height={12} width={72} />
        <Skeleton height={12} width={82} />
        <Skeleton height={12} width={94} />
      </View>
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
    backgroundColor: color.background,
    flex: 1,
  },
  safeArea: {
    backgroundColor: color.background,
    flex: 1,
  },
  content: {
    paddingBottom: 112,
  },
  controlsStack: {
    backgroundColor: color.background,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  searchModule: {
    backgroundColor: color.background,
    gap: 10,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  resultRow: {
    backgroundColor: color.background,
    marginBottom: 12,
    paddingHorizontal: 15,
  },
  firstResultRow: {
    paddingTop: 12,
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
  refreshText: {
    ...typography.caption,
    color: color.textSubtle,
    paddingHorizontal: 4,
  },
});
