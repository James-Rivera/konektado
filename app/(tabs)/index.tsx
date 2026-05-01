import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { JobCard } from '@/components/JobCard';
import { NoticeBanner } from '@/components/NoticeBanner';
import { Pill } from '@/components/Pill';
import { SearchBar } from '@/components/SearchBar';
import { WorkerCard } from '@/components/WorkerCard';
import { homeFilters, nearbyJobs, nearbyWorkers } from '@/constants/demo-data';
import { color, space, typography } from '@/constants/theme';

export default function HomeScreen() {
  const [selectedFilter, setSelectedFilter] = useState(homeFilters[0]);

  return (
    <View style={styles.screen}>
      <AppHeader
        actionIcon="notifications-none"
        actionLabel="Notifications"
        eyebrow="Barangay San Pedro"
        title="Konektado"
        subtitle="Find nearby jobs and trusted local services.">
        <SearchBar editable={false} />
      </AppHeader>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <NoticeBanner
          actionLabel="Start verification"
          message="Browse now. Posting, messaging, saving, and reviews unlock after barangay approval."
          title="Verification required for marketplace actions"
          variant="warning"
        />

        <View style={styles.filterRow}>
          {homeFilters.map((filter) => (
            <Pill
              key={filter}
              label={filter}
              onPress={() => setSelectedFilter(filter)}
              selected={selectedFilter === filter}
            />
          ))}
        </View>

        <SectionHeader title="Nearby jobs" action="See all" />
        <View style={styles.stack}>
          {nearbyJobs.map((job) => (
            <JobCard key={job.title} {...job} />
          ))}
        </View>

        <SectionHeader title="Workers near you" action="See all" />
        <View style={styles.stack}>
          {nearbyWorkers.map((worker) => (
            <WorkerCard key={worker.name} {...worker} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
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
  sectionAction: {
    ...typography.captionMedium,
    color: color.primary,
  },
  stack: {
    gap: space.md,
  },
});
