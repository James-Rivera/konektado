import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { PopularServicesSection } from '@/components/search/PopularServicesSection';
import {
  SearchFiltersSheet,
  type SearchDiscoveryFilters,
} from '@/components/search/SearchFiltersSheet';
import { SearchHeaderRow } from '@/components/search/SearchHeaderRow';
import { SearchJobResultCard } from '@/components/search/SearchJobResultCard';
import { SearchResultHeader } from '@/components/search/SearchResultHeader';
import { SearchSegmentedControl } from '@/components/search/SearchSegmentedControl';
import { SearchWorkerResultCard } from '@/components/search/SearchWorkerResultCard';
import type { SearchJobItem, SearchMode, SearchWorkerItem } from '@/constants/search-demo-data';
import {
  SEARCH_DISCOVERY_GROUPS,
  type DiscoveryGroupKey,
  type MvpServiceOption,
  type SearchWorkType,
  doesServiceMatchWorkType,
  getDiscoveryGroupsForWorkType,
  getDiscoveryGroupForService,
  getDisplayLabelForMvpService,
  getOrderedDiscoveryGroupsForMode,
  getServicesForDiscoveryGroup,
  getServicesForDiscoveryGroupAndWorkType,
  getStoredMvpServiceOption,
} from '@/constants/service-taxonomy';
import { color, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { useSafeTopInset } from '@/hooks/use-safe-top-inset';
import {
  formatJobSubtitle,
  formatClientJobsPostedText,
  formatClientRatingText,
  formatJobPostTitle,
  formatRelativeMarketplaceDate,
  formatServiceRate,
  formatServiceJobsDoneText,
  formatServicePostTitle,
  formatServiceRatingText,
  getMarketplaceLocation,
  getPublicProfileAvatarUrl,
  isPresenceActive,
} from '@/services/marketplace.helpers';
import { searchJobs as searchOpenJobs } from '@/services/job.service';
import { getMyUserPreferences } from '@/services/onboarding.service';
import { searchServices } from '@/services/service-profile.service';
import type { JobSummary, ServiceSearchResult } from '@/types/marketplace.types';
import type { UserPreferences } from '@/types/onboarding.types';

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

type RankingContext = {
  filters: SearchDiscoveryFilters;
  mode: SearchMode;
  preferences: UserPreferences | null;
  query: string;
  userBarangay?: string | null;
  userCity?: string | null;
};

const ALL_GROUP_OPTION = { key: 'all' as const, label: 'All groups' };
const ALL_SERVICE_OPTION = { key: 'all' as const, label: 'All services' };
const SEARCH_LIMIT = 40;
const SEARCH_RESULT_GROUP_LABELS: Record<DiscoveryGroupKey, string> = {
  'Home & Local Help': 'Home & Local Help',
  'Errands & Assistance': 'Errands & Assistance',
  'Learning & Tutoring': 'Learning & Tutoring',
  'Digital & Document Help': 'Digital & Document Help',
  'Tech Setup Help': 'Tech Setup Help',
};

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
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [browseGroup, setBrowseGroup] = useState<DiscoveryGroupKey>('Home & Local Help');
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [workers, setWorkers] = useState<ServiceSearchResult[]>([]);
  const [loadedModes, setLoadedModes] = useState<Record<SearchMode, boolean>>({
    jobs: false,
    workers: false,
  });
  const [refreshingModes, setRefreshingModes] = useState<Record<SearchMode, boolean>>({
    jobs: false,
    workers: false,
  });
  const [appliedFilters, setAppliedFilters] = useState<SearchDiscoveryFilters>(() => buildDefaultFilters());
  const [draftFilters, setDraftFilters] = useState<SearchDiscoveryFilters>(() => buildDefaultFilters());
  const searchRequestRef = useRef(0);
  const controlsTranslateY = useRef(new Animated.Value(0)).current;
  const controlsHeightRef = useRef(0);
  const controlsVisibleRef = useRef(true);
  const lastScrollOffset = useRef(0);
  const [controlsHeight, setControlsHeight] = useState(0);
  const debouncedQuery = useDebouncedValue(query, 300);
  const normalizedQuery = useMemo(() => normalizeSearchText(debouncedQuery.trim()), [debouncedQuery]);

  const orderedGroups = useMemo(
    () => getOrderedDiscoveryGroupsForMode({ mode, preferences }),
    [mode, preferences],
  );

  const browseGroupsForWorkType = useMemo(
    () => getDiscoveryGroupsForWorkType(appliedFilters.workType, orderedGroups),
    [appliedFilters.workType, orderedGroups],
  );

  useEffect(() => {
    let active = true;

    getMyUserPreferences().then((result) => {
      if (!active || result.error) return;
      setPreferences(result.data);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const nextDefaultFilters = buildDefaultFilters();
    const nextBrowseGroups = getDiscoveryGroupsForWorkType(nextDefaultFilters.workType, orderedGroups);
    setAppliedFilters(nextDefaultFilters);
    setDraftFilters(nextDefaultFilters);
    setBrowseGroup(nextBrowseGroups[0] ?? orderedGroups[0] ?? 'Home & Local Help');
  }, [orderedGroups]);

  useEffect(() => {
    if (browseGroupsForWorkType.includes(browseGroup)) return;
    setBrowseGroup(browseGroupsForWorkType[0] ?? orderedGroups[0] ?? 'Home & Local Help');
  }, [browseGroup, browseGroupsForWorkType, orderedGroups]);

  useEffect(() => {
    let active = true;
    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;

    if (!isFocused) {
      return () => {
        active = false;
      };
    }

    const structuredServices = getStructuredServiceFilterValues(appliedFilters);
    const barangayFilter =
      appliedFilters.locationScope === 'same_barangay' ? profile?.barangay ?? undefined : undefined;
    const rateBounds = getRateBounds(appliedFilters.rateRange);

    setRefreshingModes((current) => ({ ...current, [mode]: true }));

    const searchPromise =
      mode === 'jobs'
        ? searchOpenJobs({
            text: normalizedQuery,
            serviceNeeded:
              appliedFilters.service !== 'all' ? appliedFilters.service : undefined,
            serviceNeededIn:
              appliedFilters.service === 'all' && structuredServices.length !== getAllServiceCount()
                ? structuredServices
                : undefined,
            barangay: barangayFilter,
            budgetMin: rateBounds.min,
            budgetMax: rateBounds.max,
            experienceLevel: appliedFilters.experienceLevel,
            certificationRequired:
              appliedFilters.certification === 'required_or_available' ? true : undefined,
            verifiedOnly: appliedFilters.verifiedOnly,
            limit: SEARCH_LIMIT,
          }).then((result) => {
            if (!active || requestId !== searchRequestRef.current) return;
            if (result.data) setJobs(result.data);
          })
        : searchServices({
            text: normalizedQuery,
            category:
              appliedFilters.service !== 'all' ? appliedFilters.service : undefined,
            categories:
              appliedFilters.service === 'all' && structuredServices.length !== getAllServiceCount()
                ? structuredServices
                : undefined,
            barangay: barangayFilter,
            rateMin: rateBounds.min,
            rateMax: rateBounds.max,
            experienceLevel: appliedFilters.experienceLevel,
            certificationAvailable:
              appliedFilters.certification === 'required_or_available' ? true : undefined,
            verifiedOnly: appliedFilters.verifiedOnly,
            limit: SEARCH_LIMIT,
          }).then((result) => {
            if (!active || requestId !== searchRequestRef.current) return;
            if (result.data) setWorkers(result.data);
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
  }, [appliedFilters, isFocused, mode, normalizedQuery, profile?.barangay]);

  const selectedService = appliedFilters.service === 'all' ? null : appliedFilters.service;

  const visibleJobs = useMemo(() => {
    const context: RankingContext = {
      filters: appliedFilters,
      mode,
      preferences,
      query: normalizedQuery,
      userBarangay: profile?.barangay,
      userCity: profile?.city,
    };

    return rankJobsForSearch(filterJobsForClient(jobs, context), context).map(mapJobToSearchItem);
  }, [appliedFilters, jobs, mode, normalizedQuery, preferences, profile?.barangay, profile?.city]);

  const visibleWorkers = useMemo(() => {
    const context: RankingContext = {
      filters: appliedFilters,
      mode,
      preferences,
      query: normalizedQuery,
      userBarangay: profile?.barangay,
      userCity: profile?.city,
    };

    return rankWorkersForSearch(filterWorkersForClient(workers, context), context).map(
      mapServiceToSearchItem,
    );
  }, [appliedFilters, mode, normalizedQuery, preferences, profile?.barangay, profile?.city, workers]);

  const resultHeading = getSearchResultsHeading({
    mode,
    query,
    selectedService,
  });
  const activeResultCount = mode === 'jobs' ? visibleJobs.length : visibleWorkers.length;
  const activeModeLoaded = loadedModes[mode];
  const activeModeRefreshing = refreshingModes[mode];
  const showInitialSkeleton = activeModeRefreshing && !activeModeLoaded && activeResultCount === 0;
  const showRefreshIndicator = activeModeRefreshing && activeModeLoaded && activeResultCount > 0;

  const groupedBrowseServices = useMemo(() => {
    const browseServices = getServicesForDiscoveryGroupAndWorkType(
      browseGroup,
      appliedFilters.workType,
    );
    return browseServices.map((service) => ({
      key: service,
      label: getDisplayLabelForMvpService(service),
    }));
  }, [appliedFilters.workType, browseGroup]);

  const collapsedBrowseServices = useMemo(() => {
    const previewGroup =
      selectedService
        ? getDiscoveryGroupForService(selectedService) ?? browseGroup
        : browseGroupsForWorkType.includes(browseGroup)
          ? browseGroup
          : browseGroupsForWorkType[0] ?? orderedGroups[0] ?? 'Home & Local Help';

    return prioritizeSelectedService(
      getServicesForDiscoveryGroupAndWorkType(
        previewGroup,
        appliedFilters.workType,
      ),
      selectedService,
    ).map((service) => ({
      key: service,
      label: getDisplayLabelForMvpService(service),
    }));
  }, [appliedFilters.workType, browseGroup, browseGroupsForWorkType, orderedGroups, selectedService]);

  const groupOptions = useMemo(
    () =>
      browseGroupsForWorkType.map((group) => ({
        key: group,
        label: SEARCH_RESULT_GROUP_LABELS[group],
      })),
    [browseGroupsForWorkType],
  );

  const sheetGroupsForWorkType = useMemo(
    () => getDiscoveryGroupsForWorkType(draftFilters.workType, orderedGroups),
    [draftFilters.workType, orderedGroups],
  );

  const sheetGroupOptions = useMemo(
    () => [
      ALL_GROUP_OPTION,
      ...sheetGroupsForWorkType.map((group) => ({
        key: group,
        label: SEARCH_RESULT_GROUP_LABELS[group],
      })),
    ],
    [sheetGroupsForWorkType],
  );

  const sheetServiceOptions = useMemo(() => {
    const servicesForSheet = getServicesForDiscoveryGroupAndWorkType(
      draftFilters.serviceGroup,
      draftFilters.workType,
    );

    return [
      ALL_SERVICE_OPTION,
      ...servicesForSheet.map((service) => ({
        key: service,
        label: getDisplayLabelForMvpService(service),
      })),
    ];
  }, [draftFilters.serviceGroup, draftFilters.workType]);

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

  const handleGroupPress = useCallback((group: DiscoveryGroupKey) => {
    revealControlsAtTop();
    setBrowseGroup(group);
  }, [revealControlsAtTop]);

  const handleChipPress = useCallback((service: string) => {
    const nextStoredService = getStoredMvpServiceOption(service);
    const nextSelected = selectedService === nextStoredService ? null : nextStoredService;
    const nextGroup = getDiscoveryGroupForService(nextStoredService) ?? browseGroup;

    revealControlsAtTop();
    setBrowseGroup(nextGroup);
    setAppliedFilters((current) => ({
      ...current,
      serviceGroup: nextGroup,
      service: nextSelected ?? 'all',
    }));
    setDraftFilters((current) => ({
      ...current,
      serviceGroup: nextGroup,
      service: nextSelected ?? 'all',
    }));
    setQuery(nextSelected ? getDisplayLabelForMvpService(nextSelected) : '');
  }, [browseGroup, revealControlsAtTop, selectedService]);

  const clearSearch = useCallback(() => {
    const nextDefaults = buildDefaultFilters();
    const nextBrowseGroups = getDiscoveryGroupsForWorkType(nextDefaults.workType, orderedGroups);
    revealControlsAtTop();
    setQuery('');
    setAppliedFilters(nextDefaults);
    setDraftFilters(nextDefaults);
    setBrowseGroup(nextBrowseGroups[0] ?? orderedGroups[0] ?? 'Home & Local Help');
  }, [orderedGroups, revealControlsAtTop]);

  const handleOpenFilters = useCallback(() => {
    setDraftFilters(appliedFilters);
    setIsFilterSheetVisible(true);
  }, [appliedFilters]);

  const handleDraftFilterChange = useCallback(
    <K extends keyof SearchDiscoveryFilters,>(key: K, value: SearchDiscoveryFilters[K]) => {
      setDraftFilters((current) => {
        const next = { ...current, [key]: value };

        if (key === 'workType') {
          return reconcileFiltersForWorkType(next, orderedGroups);
        }

        if (key === 'serviceGroup') {
          next.service = 'all';
        }

        if (key === 'service' && value !== 'all') {
          next.serviceGroup = getDiscoveryGroupForService(value as MvpServiceOption) ?? current.serviceGroup;
        }

        return next;
      });
    },
    [orderedGroups],
  );

  const handleResetFilters = useCallback(() => {
    setDraftFilters(buildDefaultFilters());
  }, []);

  const handleApplyFilters = useCallback(() => {
    const nextFilters = reconcileFiltersForWorkType(draftFilters, orderedGroups);
    const nextBrowseGroups = getDiscoveryGroupsForWorkType(nextFilters.workType, orderedGroups);

    setAppliedFilters(nextFilters);
    if (nextFilters.service !== 'all') {
      setQuery((current) => current || getDisplayLabelForMvpService(nextFilters.service));
      setBrowseGroup(getDiscoveryGroupForService(nextFilters.service) ?? nextBrowseGroups[0] ?? browseGroup);
    } else if (nextFilters.serviceGroup !== 'all') {
      setBrowseGroup(nextFilters.serviceGroup);
    } else {
      setBrowseGroup(nextBrowseGroups[0] ?? browseGroup);
    }
    revealControlsAtTop();
    setIsFilterSheetVisible(false);
  }, [browseGroup, draftFilters, orderedGroups, revealControlsAtTop]);

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
      rows.push(...visibleJobs.map((job) => ({ key: `job-${job.id}`, type: 'job' as const, job })));
    } else {
      rows.push(
        ...visibleWorkers.map((worker) => ({
          key: `worker-${worker.id}`,
          type: 'worker' as const,
          worker,
        })),
      );
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
    mode,
    showInitialSkeleton,
    showRefreshIndicator,
    verificationKnown,
    visibleJobs,
    visibleWorkers,
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
          collapsedServices={collapsedBrowseServices}
          groups={groupOptions}
          onPressGroup={handleGroupPress}
          onPressService={handleChipPress}
          selectedGroup={browseGroup}
          selectedService={selectedService}
          services={groupedBrowseServices}
        />
      </>
    ),
    [
      browseGroup,
      collapsedBrowseServices,
      groupOptions,
      groupedBrowseServices,
      handleChipPress,
      handleGroupPress,
      handleModeChange,
      mode,
      query,
      selectedService,
      topInset,
    ],
  );

  const renderSearchRow = useCallback(
    ({ index, item }: { index: number; item: SearchListRow }) => {
      if (item.type === 'resultHeader') {
        return <SearchResultHeader title={resultHeading} onFilterPress={handleOpenFilters} />;
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
            <SearchJobResultSkeleton loadingLocationInline={index % 2 === 1} />
          </View>
        );
      }

      if (item.type === 'workerSkeleton') {
        return (
          <View style={rowStyle}>
            <SearchWorkerResultSkeleton loadingLocationInline={index % 2 === 1} />
          </View>
        );
      }

      if (item.type === 'job') {
        return (
          <View style={rowStyle}>
            <SearchJobResultCard job={item.job} onOpenJob={() => openJob(item.job.id)} />
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
    [clearSearch, handleOpenFilters, openJob, openService, resultHeading],
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
        />

        <SearchFiltersSheet
          filters={draftFilters}
          groups={sheetGroupOptions}
          onApply={handleApplyFilters}
          onChange={handleDraftFilterChange}
          onClose={() => setIsFilterSheetVisible(false)}
          onReset={handleResetFilters}
          services={sheetServiceOptions}
          visible={isFilterSheetVisible}
        />
      </SafeAreaView>
    </View>
  );
}

function buildDefaultFilters(): SearchDiscoveryFilters {
  return {
    workType: 'either',
    serviceGroup: 'all',
    service: 'all',
    locationScope: 'nearby',
    rateRange: 'any',
    experienceLevel: 'all',
    certification: 'any',
    verifiedOnly: false,
    sort: 'relevant',
  };
}

function reconcileFiltersForWorkType(
  filters: SearchDiscoveryFilters,
  orderedGroups: readonly DiscoveryGroupKey[],
): SearchDiscoveryFilters {
  const validGroups = getDiscoveryGroupsForWorkType(filters.workType, orderedGroups);
  const service =
    filters.service !== 'all' && doesServiceMatchWorkType(filters.service, filters.workType)
      ? filters.service
      : 'all';
  const serviceGroup =
    filters.serviceGroup !== 'all' && validGroups.includes(filters.serviceGroup)
      ? filters.serviceGroup
      : 'all';

  return {
    ...filters,
    service,
    serviceGroup: service !== 'all' ? getDiscoveryGroupForService(service) ?? serviceGroup : serviceGroup,
  };
}

function getStructuredServiceFilterValues(filters: SearchDiscoveryFilters) {
  if (filters.service !== 'all') {
    return doesServiceMatchWorkType(filters.service, filters.workType) ? [filters.service] : [];
  }

  return getServicesForDiscoveryGroupAndWorkType(filters.serviceGroup, filters.workType);
}

function getRateBounds(rateRange: SearchDiscoveryFilters['rateRange']) {
  if (rateRange === 'under_500') return { min: null, max: 500 };
  if (rateRange === '500_1000') return { min: 500, max: 1000 };
  if (rateRange === '1000_plus') return { min: 1000, max: null };
  return { min: null, max: null };
}

function prioritizeSelectedService(
  services: MvpServiceOption[],
  selectedService: MvpServiceOption | null,
) {
  if (!selectedService || !services.includes(selectedService)) return services;
  return [selectedService, ...services.filter((service) => service !== selectedService)];
}

function getServicesForAllGroups() {
  return SEARCH_DISCOVERY_GROUPS.flatMap((group) => getServicesForDiscoveryGroup(group));
}

function getAllServiceCount() {
  return getServicesForAllGroups().length;
}

function getSearchResultsHeading({
  mode,
  query,
  selectedService,
}: {
  mode: SearchMode;
  query: string;
  selectedService: MvpServiceOption | null;
}) {
  const subject = selectedService
    ? getDisplayLabelForMvpService(selectedService)
    : query.trim();

  if (subject) {
    return `Showing ${subject.toLowerCase()} ${mode === 'jobs' ? 'jobs' : 'workers'} near you`;
  }

  return mode === 'jobs' ? 'Showing jobs near you' : 'Showing workers near you';
}

function normalizeSearchText(value: string) {
  const storedService = getStoredMvpServiceOption(value);
  return storedService ?? value;
}

function filterJobsForClient(items: JobSummary[], context: RankingContext) {
  return items.filter((job) => {
    if (!matchesWorkType(job.serviceNeeded, context.filters.workType)) return false;
    if (!matchesGroup(job.serviceNeeded, context.filters.serviceGroup)) return false;
    if (
      context.filters.locationScope === 'same_barangay' &&
      context.userBarangay &&
      normalizeLocationValue(job.barangay) !== normalizeLocationValue(context.userBarangay)
    ) {
      return false;
    }

    return true;
  });
}

function filterWorkersForClient(items: ServiceSearchResult[], context: RankingContext) {
  return items.filter((service) => {
    if (!matchesWorkType(service.category, context.filters.workType)) return false;
    if (!matchesGroup(service.category, context.filters.serviceGroup)) return false;
    if (
      context.filters.locationScope === 'same_barangay' &&
      context.userBarangay &&
      normalizeLocationValue(service.barangay ?? service.provider?.barangay) !==
        normalizeLocationValue(context.userBarangay)
    ) {
      return false;
    }

    return true;
  });
}

function rankJobsForSearch(items: JobSummary[], context: RankingContext) {
  if (context.filters.sort === 'newest') return items;

  return [...items].sort((left, right) => {
    const leftScore =
      context.filters.sort === 'nearby'
        ? scoreLocation(left.barangay, left.locationText, context) * 100 + scoreJobRelevance(left, context)
        : scoreJobRelevance(left, context);
    const rightScore =
      context.filters.sort === 'nearby'
        ? scoreLocation(right.barangay, right.locationText, context) * 100 + scoreJobRelevance(right, context)
        : scoreJobRelevance(right, context);

    if (rightScore !== leftScore) return rightScore - leftScore;
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

function rankWorkersForSearch(items: ServiceSearchResult[], context: RankingContext) {
  if (context.filters.sort === 'newest') return items;

  return [...items].sort((left, right) => {
    const leftScore =
      context.filters.sort === 'nearby'
        ? scoreLocation(left.barangay ?? left.provider?.barangay, left.locationText, context) * 100 +
          scoreWorkerRelevance(left, context)
        : scoreWorkerRelevance(left, context);
    const rightScore =
      context.filters.sort === 'nearby'
        ? scoreLocation(right.barangay ?? right.provider?.barangay, right.locationText, context) * 100 +
          scoreWorkerRelevance(right, context)
        : scoreWorkerRelevance(right, context);

    if (rightScore !== leftScore) return rightScore - leftScore;
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

function scoreJobRelevance(job: JobSummary, context: RankingContext) {
  const serviceNeeded = job.serviceNeeded ?? job.category;
  const exactServiceMatch =
    context.filters.service !== 'all' && serviceNeeded === context.filters.service ? 40 : 0;
  const groupMatch =
    context.filters.serviceGroup !== 'all' &&
    getDiscoveryGroupForService(serviceNeeded) === context.filters.serviceGroup
      ? 16
      : 0;
  const preferenceMatch = scorePreferenceMatch(serviceNeeded, context);
  const workTypeMatch = matchesWorkType(serviceNeeded, context.filters.workType) ? 12 : 0;
  const locationMatch = scoreLocation(job.barangay, job.locationText, context) * 20;
  const freshness = scoreFreshness(job.createdAt, 7) * 12;
  const queryMatch = scoreQueryMatch([job.title, job.description, job.category, job.serviceNeeded, ...job.tags], context.query);
  const trustMatch =
    Math.min(job.clientReviewCount, 3) * 2 +
    Math.min(job.clientJobsPostedCount, 3) +
    (job.clientAverageRating && job.clientAverageRating >= 4.5 ? 2 : 0);

  return exactServiceMatch + groupMatch + preferenceMatch + workTypeMatch + locationMatch + freshness + queryMatch + trustMatch;
}

function scoreWorkerRelevance(service: ServiceSearchResult, context: RankingContext) {
  const category = service.category;
  const exactServiceMatch =
    context.filters.service !== 'all' && category === context.filters.service ? 40 : 0;
  const groupMatch =
    context.filters.serviceGroup !== 'all' &&
    getDiscoveryGroupForService(category) === context.filters.serviceGroup
      ? 16
      : 0;
  const preferenceMatch = scorePreferenceMatch(category, context);
  const workTypeMatch = matchesWorkType(category, context.filters.workType) ? 12 : 0;
  const locationMatch = scoreLocation(service.barangay ?? service.provider?.barangay, service.locationText, context) * 20;
  const freshness = scoreFreshness(service.createdAt, 14) * 8;
  const queryMatch = scoreQueryMatch(
    [service.title, service.description, service.category, service.locationText, ...service.tags],
    context.query,
  );
  const trustMatch =
    Math.min(service.reviewCount, 3) * 2 +
    Math.min(service.completedJobsCount, 3) * 2 +
    (service.averageRating && service.averageRating >= 4.5 ? 3 : 0);

  return exactServiceMatch + groupMatch + preferenceMatch + workTypeMatch + locationMatch + freshness + queryMatch + trustMatch;
}

function scorePreferenceMatch(service: string | null | undefined, context: RankingContext) {
  const structuredPreferences =
    context.mode === 'jobs'
      ? context.preferences?.offeredServices ?? []
      : context.preferences?.neededServices ?? [];
  const customPreferences =
    context.mode === 'jobs'
      ? context.preferences?.customOfferedServices ?? []
      : context.preferences?.customNeededServices ?? [];
  const storedService = getStoredMvpServiceOption(service);
  if (!storedService) return 0;

  if (structuredPreferences.includes(storedService)) return 24;
  if (
    structuredPreferences.some(
      (preference) =>
        getDiscoveryGroupForService(preference) && getDiscoveryGroupForService(preference) === getDiscoveryGroupForService(storedService),
    )
  ) {
    return 12;
  }

  const normalizedService = normalizeText(service);
  return customPreferences.some((preference) => normalizedService.includes(normalizeText(preference))) ? 6 : 0;
}

function scoreQueryMatch(values: (string | null | undefined)[], query: string) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;

  const haystack = normalizeText(values.filter(Boolean).join(' '));
  if (!haystack) return 0;
  if (haystack.includes(normalizedQuery)) return 18;

  const queryWords = normalizedQuery.split(' ').filter((word) => word.length >= 4);
  return queryWords.some((word) => haystack.includes(word)) ? 8 : 0;
}

function scoreLocation(
  barangay: string | null | undefined,
  locationText: string | null | undefined,
  context: RankingContext,
) {
  const normalizedUserBarangay = normalizeLocationValue(context.userBarangay);
  const normalizedUserCity = normalizeLocationValue(context.userCity);
  const normalizedBarangay = normalizeLocationValue(barangay);
  const normalizedLocation = normalizeLocationValue(locationText);

  if (normalizedUserBarangay && normalizedBarangay === normalizedUserBarangay) return 1;
  if (normalizedUserBarangay && normalizedLocation.includes(normalizedUserBarangay)) return 0.8;
  if (normalizedUserCity && normalizedLocation.includes(normalizedUserCity)) return 0.45;
  return 0;
}

function scoreFreshness(createdAt: string, windowDays: number) {
  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return 0;
  const ageDays = Math.max(0, (Date.now() - createdTime) / (24 * 60 * 60 * 1000));
  return Math.max(0, 1 - Math.min(1, ageDays / windowDays));
}

function matchesWorkType(service: string | null | undefined, workType: SearchWorkType) {
  return doesServiceMatchWorkType(service, workType);
}

function matchesGroup(service: string | null | undefined, group: 'all' | DiscoveryGroupKey) {
  if (group === 'all') return true;
  return getDiscoveryGroupForService(service) === group;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeLocationValue(value: string | null | undefined) {
  return normalizeText(value)
    .replace(/\bbarangay\b/g, '')
    .replace(/\bbrgy\b/g, '')
    .replace(/\bsto\b/g, 'santo')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapJobToSearchItem(job: JobSummary): SearchJobItem {
  const category = job.category || 'Job';
  const location = getMarketplaceLocation(job);
  const displayService = getDisplayLabelForMvpService(job.serviceNeeded);
  const displayCategory = displayService || category;

  return {
    id: job.id,
    postedAt: formatRelativeMarketplaceDate(job.createdAt),
    title: formatJobPostTitle({
      title: job.title,
      serviceNeeded: displayService || job.serviceNeeded,
      category: displayCategory,
      cue: job.serviceNeeded ? 'needHelpWith' : 'lookingFor',
    }),
    subtitle: formatJobSubtitle(job),
    description: job.description || 'No description provided yet.',
    tags: Array.from(
      new Set(
        [displayCategory, ...job.tags.map((tag) => getDisplayLabelForMvpService(tag) || tag), 'Open job'].filter(Boolean),
      ),
    ),
    clientRatingText: formatClientRatingText(job),
    jobsPostedText: formatClientJobsPostedText(job),
    location,
    matchReason: `Open ${displayCategory.toLowerCase()} job near ${location}.`,
  };
}

function mapServiceToSearchItem(service: ServiceSearchResult): SearchWorkerItem {
  const category = getDisplayLabelForMvpService(service.category) || service.category || 'Service';
  const location = getMarketplaceLocation(service);
  const headlineTitle =
    service.category === 'Basic home repair' && service.title === 'Basic home repair help'
      ? 'Minor home fix support'
      : service.title;

  return {
    id: service.id,
    name: service.provider?.fullName || 'Konektado resident',
    avatarUrl: getPublicProfileAvatarUrl(service.provider),
    statusLine: formatWorkerAvailability(service.availabilityText),
    rateLine: formatServiceRate(service),
    headline: formatServicePostTitle({
      title: headlineTitle,
      category,
      cue: service.isActive ? 'availableFor' : 'offers',
    }),
    tags: Array.from(
      new Set([category, ...service.tags.map((tag) => getDisplayLabelForMvpService(tag) || tag)].filter(Boolean)),
    ),
    ratingText: formatServiceRatingText(service),
    jobsDoneText: formatServiceJobsDoneText(service, service.completedJobsCount),
    location,
    matchReason: `Offers ${category.toLowerCase()} help near ${location}.`,
    isActive: isPresenceActive(
      service.isActive && (service.availabilityText || service.provider?.availability || true),
    ),
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

  const withPrefix = /^available\b/i.test(shortened)
    ? shortened
    : `Available ${shortened.charAt(0).toLowerCase()}${shortened.slice(1)}`;

  return withPrefix.length <= 40
    ? withPrefix
    : shortened.length <= 40
      ? shortened
      : `${shortened.slice(0, 37).trim()}...`;
}

function SearchJobResultSkeleton({ loadingLocationInline }: { loadingLocationInline: boolean }) {
  return (
    <SearchJobResultCard isLoading loadingLocationInline={loadingLocationInline} showSaveAction={false} />
  );
}

function SearchWorkerResultSkeleton({ loadingLocationInline }: { loadingLocationInline: boolean }) {
  return (
    <SearchWorkerResultCard
      isLoading
      loadingLocationInline={loadingLocationInline}
      showSaveAction={false}
    />
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
