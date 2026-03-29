import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/utils/supabase';

type JobRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  budget: number | null;
  status: string;
  created_at: string;
};

type ProviderRow = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  service_type: string | null;
  has_certifications: boolean | null;
  certification_status: string | null;
  city: string | null;
  barangay: string | null;
  verified_at: string | null;
};

type ProviderProfileSnapshot = {
  user_id: string;
  service_type: string | null;
  has_certifications: boolean | null;
  certification_status: string | null;
};

export default function ExploreScreen() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useProfile();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);

  const activeRole = useMemo(() => {
    const sourceRole = profile?.active_role || profile?.role;
    if (!sourceRole) return null;
    return sourceRole.toLowerCase();
  }, [profile?.active_role, profile?.role]);

  const loadData = useCallback(async () => {
    if (!activeRole) {
      setLoading(false);
      setJobs([]);
      setProviders([]);
      return;
    }

    setError(null);
    setLoading(true);

    if (activeRole === 'provider') {
      const { data, error: jobsError } = await supabase
        .from('jobs')
        .select('id, title, description, location, budget, status, created_at')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(25);

      if (jobsError) {
        setError(jobsError.message);
        setJobs([]);
      } else {
        setJobs((data as JobRow[]) ?? []);
      }

      if (profile?.id) {
        const { data: applications } = await supabase
          .from('job_applications')
          .select('job_id')
          .eq('applicant_id', profile.id)
          .limit(200);
        setAppliedJobIds(new Set((applications ?? []).map((row) => row.job_id as string)));
      }

      setProviders([]);
      setLoading(false);
      return;
    }

    const { data, error: providersError } = await supabase
      .from('profiles')
      .select('id, full_name, first_name, last_name, city, barangay, verified_at')
      .or('active_role.eq.provider,role.eq.provider')
      .order('verified_at', { ascending: false, nullsFirst: false })
      .limit(25);

    if (providersError) {
      setError(providersError.message);
      setProviders([]);
    } else {
      const baseProviders = (data as ProviderRow[]) ?? [];
      const providerIds = baseProviders.map((provider) => provider.id).filter(Boolean);

      if (!providerIds.length) {
        setProviders(baseProviders);
      } else {
        const { data: providerSnapshots } = await supabase
          .from('provider_profiles')
          .select('user_id, service_type, has_certifications, certification_status')
          .in('user_id', providerIds);

        const snapshotMap = new Map<string, ProviderProfileSnapshot>();
        ((providerSnapshots as ProviderProfileSnapshot[] | null) ?? []).forEach((snapshot) => {
          snapshotMap.set(snapshot.user_id, snapshot);
        });

        const merged = baseProviders.map((provider) => {
          const snapshot = snapshotMap.get(provider.id);
          if (!snapshot) return provider;

          return {
            ...provider,
            service_type: snapshot.service_type ?? null,
            has_certifications: snapshot.has_certifications ?? null,
            certification_status: snapshot.certification_status ?? null,
          };
        });

        setProviders(merged);
      }
    }
    setJobs([]);
      setAppliedJobIds(new Set());
    setLoading(false);
    }, [activeRole, profile?.id]);

  useEffect(() => {
    if (profileLoading) return;
    loadData();
  }, [loadData, profileLoading]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const applyToJob = useCallback(
    async (jobId: string) => {
      if (!profile?.id) {
        Alert.alert('Not signed in', 'Please sign in again to apply for jobs.');
        return;
      }

      if (appliedJobIds.has(jobId)) {
        Alert.alert('Already applied', 'You already applied for this job.');
        return;
      }

      setApplyingJobId(jobId);
      const { error: applyError } = await supabase
        .from('job_applications')
        .insert({ job_id: jobId, applicant_id: profile.id });

      setApplyingJobId(null);

      if (applyError) {
        if (applyError.code === '23505') {
          setAppliedJobIds((prev) => new Set([...prev, jobId]));
          Alert.alert('Already applied', 'You already applied for this job.');
          return;
        }
        Alert.alert('Could not apply', applyError.message);
        return;
      }

      setAppliedJobIds((prev) => new Set([...prev, jobId]));
      Alert.alert('Application sent', 'Your application has been submitted.');
    },
    [appliedJobIds, profile?.id],
  );

  if (profileLoading || loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
        <ThemedText>Loading explore...</ThemedText>
      </ThemedView>
    );
  }

  if (!activeRole) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="subtitle">Choose your role first</ThemedText>
        <ThemedText style={styles.muted}>Complete role setup to see marketplace results.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ThemedText type="title">Explore</ThemedText>
      <ThemedText style={styles.muted}>
        {activeRole === 'provider'
          ? 'Open jobs you can apply for.'
          : activeRole === 'client'
          ? 'Providers available in your area.'
          : 'Complete role setup to unlock marketplace actions.'}
      </ThemedText>

      {activeRole === 'client' ? (
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/create-job')}>
          <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
            Post a new job
          </ThemedText>
        </TouchableOpacity>
      ) : null}

      {error ? (
        <View style={styles.errorCard}>
          <ThemedText type="defaultSemiBold">Could not load data</ThemedText>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : null}

      {activeRole === 'provider' ? (
        jobs.length ? (
          jobs.map((job) => (
            <View key={job.id} style={styles.card}>
              <ThemedText type="defaultSemiBold">{job.title}</ThemedText>
              <ThemedText style={styles.metaText}>{job.location || 'Location not set'}</ThemedText>
              <ThemedText style={styles.metaText}>Budget: {formatBudget(job.budget)}</ThemedText>
              {job.description ? <ThemedText>{job.description}</ThemedText> : null}
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => applyToJob(job.id)}
                disabled={appliedJobIds.has(job.id) || applyingJobId === job.id}
              >
                <ThemedText style={styles.applyButtonText}>
                  {appliedJobIds.has(job.id)
                    ? 'Applied'
                    : applyingJobId === job.id
                    ? 'Applying...'
                    : 'Apply'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <EmptyState text="No open jobs yet. Pull to refresh again soon." />
        )
      ) : providers.length ? (
        providers.map((provider) => (
          <View key={provider.id} style={styles.card}>
            <ThemedText type="defaultSemiBold">{formatProviderName(provider)}</ThemedText>
            <ThemedText style={styles.metaText}>{provider.service_type || 'Service not specified'}</ThemedText>
            <ThemedText style={styles.metaText}>
              {[provider.barangay, provider.city].filter(Boolean).join(', ') || 'Location not set'}
            </ThemedText>
            <View style={styles.badgeRow}>
              {provider.has_certifications || provider.certification_status === 'approved' ? (
                <View style={[styles.badgePill, styles.certifiedBadge]}>
                  <ThemedText style={styles.badgeText}>Certified Skills</ThemedText>
                </View>
              ) : null}

              {provider.verified_at ? (
                <View style={[styles.badgePill, styles.verifiedBadge]}>
                  <ThemedText style={styles.badgeText}>Barangay Verified</ThemedText>
                </View>
              ) : null}
            </View>
          </View>
        ))
      ) : (
        <EmptyState text="No providers found yet. Pull to refresh again soon." />
      )}
    </ScrollView>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyCard}>
      <ThemedText>{text}</ThemedText>
    </View>
  );
}

function formatProviderName(provider: ProviderRow) {
  const combined = [provider.first_name, provider.last_name]
    .filter((segment) => Boolean(segment && segment.trim()))
    .join(' ')
    .trim();
  return combined || provider.full_name || 'Unnamed provider';
}

function formatBudget(value: number | null) {
  if (value === null || value === undefined) return 'Not specified';
  return `PHP ${Number(value).toLocaleString()}`;
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 12,
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
  },
  muted: {
    color: '#6b7280',
  },
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    gap: 6,
    backgroundColor: '#fff',
  },
  primaryButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
  },
  metaText: {
    color: '#4b5563',
  },
  applyButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#111827',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  verified: {
    color: '#059669',
  },
  unverified: {
    color: '#b45309',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  badgePill: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  certifiedBadge: {
    backgroundColor: '#dcfce7',
  },
  verifiedBadge: {
    backgroundColor: '#dbeafe',
  },
  badgeText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fff',
  },
  errorCard: {
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#fef2f2',
    gap: 4,
  },
  errorText: {
    color: '#b91c1c',
  },
});
