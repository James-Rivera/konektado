import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import {
  filterSearchJobs,
  filterSearchWorkers,
  getWorkerResultsHeading,
  popularServices,
  type SearchMode,
} from '@/constants/search-demo-data';
import { color, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { useSafeTopInset } from '@/hooks/use-safe-top-inset';

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
  const topInset = useSafeTopInset();
  const { profile } = useProfile();
  const params = useLocalSearchParams<{ filter?: string | string[] }>();
  const filterParam = getParamValue(params.filter);
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);
  const [mode, setMode] = useState<SearchMode>(() => getInitialMode(filterParam));
  const [query, setQuery] = useState('');
  const [selectedService, setSelectedService] = useState<string | null>(null);

  useEffect(() => {
    setMode(getInitialMode(filterParam));
  }, [filterParam]);

  const jobs = useMemo(() => filterSearchJobs(query, selectedService), [query, selectedService]);
  const workers = useMemo(
    () => filterSearchWorkers(query, selectedService),
    [query, selectedService],
  );

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
            {mode === 'jobs'
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

            {(mode === 'jobs' ? jobs.length : workers.length) ? null : (
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
