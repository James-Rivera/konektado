import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Skeleton } from '@/components/Skeleton';
import { color, radius, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { listMyJobs } from '@/services/job.service';
import type { JobSummary } from '@/types/marketplace.types';

export default function RenewPostsScreen() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useProfile();
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

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
          const result = await listMyJobs();
          if (!active) return;
          if (result.error || !result.data) {
            Alert.alert('Renew post', result.error ?? 'Could not load your posts.');
          } else {
            setJobs(result.data);
            setSelectedIds((current) =>
              current.length ? current.filter((id) => result.data.some((job) => job.id === id)) : result.data.slice(0, 1).map((job) => job.id),
            );
          }
        } catch {
          if (active) {
            Alert.alert('Renew post', 'Could not refresh your posts right now.');
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

  const selectedCount = selectedIds.length;
  const allIds = useMemo(() => jobs.map((job) => job.id), [jobs]);

  const toggle = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const onRenew = () => {
    Alert.alert('Renew post', 'Renewal business rules are not part of this slice yet.');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()} style={styles.headerIcon}>
            <MaterialIcons color={color.text} name="chevron-left" size={28} />
          </Pressable>
          <Text style={styles.headerTitle}>Renew Post</Text>
          <View style={styles.headerIcon} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelectedIds(allIds)}
              style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
              <Text style={styles.actionButtonText}>Select all</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelectedIds([])}
              style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
              <Text style={styles.actionButtonText}>Deselect all</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Renew Posts</Text>

          {loading ? (
            <View style={styles.skeletonStack}>
              <RenewPostSkeleton />
              <RenewPostSkeleton />
              <RenewPostSkeleton />
            </View>
          ) : null}

          {!loading && jobs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No posts to renew</Text>
              <Text style={styles.emptyText}>Published job posts will appear here when renewal is enabled.</Text>
            </View>
          ) : null}

          {jobs.map((job) => (
            <RenewPostRow
              checked={selectedIds.includes(job.id)}
              job={job}
              key={job.id}
              onToggle={() => toggle(job.id)}
            />
          ))}
        </ScrollView>

        <View style={styles.bottomBar}>
          <Pressable
            accessibilityRole="button"
            disabled={!selectedCount}
            onPress={onRenew}
            style={({ pressed }) => [
              styles.renewButton,
              !selectedCount && styles.renewButtonDisabled,
              pressed && selectedCount > 0 && styles.pressed,
            ]}>
            <Text style={styles.renewButtonText}>Renew post</Text>
          </Pressable>
          <Text style={styles.selectedText}>{selectedCount} listing selected</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function RenewPostRow({
  checked,
  job,
  onToggle,
}: {
  checked: boolean;
  job: JobSummary;
  onToggle: () => void;
}) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onToggle} style={styles.rowCard}>
      <View style={styles.thumb}>
        <MaterialIcons color={color.verificationBlue} name="assignment" size={24} />
      </View>
      <View style={styles.rowCopy}>
        <Text numberOfLines={1} style={styles.rowTitle}>
          {job.title}
        </Text>
        <Text style={styles.rowMeta}>{formatDate(job.createdAt)}</Text>
      </View>
      <MaterialIcons color={color.verificationBlue} name="more-vert" size={24} />
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <MaterialIcons color={color.white} name="check" size={16} /> : null}
      </View>
    </Pressable>
  );
}

function RenewPostSkeleton() {
  return (
    <View style={styles.rowCard}>
      <Skeleton height={48} width={48} borderRadius={radius.sm} />
      <View style={styles.rowCopy}>
        <Skeleton height={14} width="78%" />
        <Skeleton height={12} width={74} />
      </View>
      <Skeleton height={24} width={24} borderRadius={radius.sm} />
      <Skeleton height={24} width={24} borderRadius={radius.sm} />
    </View>
  );
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
    paddingBottom: 120,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: color.verificationBlue,
    borderRadius: radius.pill,
    flex: 1,
    height: 38,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    color: color.white,
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
  rowCard: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    minHeight: 84,
    padding: space.md,
  },
  thumb: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.sm,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  rowCopy: {
    flex: 1,
    gap: space.xs,
  },
  rowTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    color: color.text,
  },
  rowMeta: {
    ...typography.caption,
    color: color.textMuted,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: color.textSubtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  checkboxChecked: {
    backgroundColor: color.verificationBlue,
    borderColor: color.verificationBlue,
  },
  bottomBar: {
    backgroundColor: color.background,
    borderTopColor: color.border,
    borderTopWidth: 1,
    bottom: 0,
    gap: space.sm,
    left: 0,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    position: 'absolute',
    right: 0,
  },
  renewButton: {
    alignItems: 'center',
    backgroundColor: color.verificationBlue,
    borderRadius: radius.lg,
    height: 33,
    justifyContent: 'center',
  },
  renewButtonDisabled: {
    opacity: 0.5,
  },
  renewButtonText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    color: color.white,
  },
  selectedText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    color: color.textSubtle,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
