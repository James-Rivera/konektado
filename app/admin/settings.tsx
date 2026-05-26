import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  AdminErrorState,
  AdminInfoRow,
  AdminLoadingState,
  AdminPanel,
  AdminScreenShell,
  adminPalette,
} from '@/components/admin/AdminShell';
import { space, typography } from '@/constants/theme';
import { getAdminProfile } from '@/services/admin.service';
import type { PublicProfileSummary } from '@/types/marketplace.types';

export default function AdminSettingsScreen() {
  const [profile, setProfile] = useState<PublicProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = async ({ silent = false }: { silent?: boolean } = {}) => {
    setErrorMessage(null);
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const result = await getAdminProfile();

    if (result.error || !result.data) {
      setErrorMessage(result.error ?? 'Could not load the admin account.');
    } else {
      setProfile(result.data);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminScreenShell
      activeSection="settings"
      loading={loading}
      onRefresh={() => load({ silent: true })}
      refreshing={refreshing}
      subtitle="Barangay admin settings"
      title="Settings">
      <AdminPanel>
        {loading ? (
          <AdminLoadingState label="Loading admin account..." />
        ) : errorMessage ? (
          <AdminErrorState message={errorMessage} onRetry={() => load()} />
        ) : (
          <View style={styles.accountBlock}>
            <View style={styles.accountHeader}>
              <Text style={styles.accountTitle}>Admin account</Text>
              <Text style={styles.accountSubtitle}>Role-based access is active for this session.</Text>
            </View>
            <AdminInfoRow icon="person-outline" label="Name" value={profile?.fullName ?? 'Barangay admin'} />
            <AdminInfoRow icon="place" label="Barangay" value={profile?.barangay ?? 'Not set'} />
            <AdminInfoRow icon="location-city" label="City" value={profile?.city ?? 'Not set'} />
          </View>
        )}
      </AdminPanel>
    </AdminScreenShell>
  );
}

const styles = StyleSheet.create({
  accountBlock: {
    gap: 0,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  accountHeader: {
    gap: 2,
    paddingBottom: space.md,
  },
  accountTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 20,
    lineHeight: 26,
  },
  accountSubtitle: {
    ...typography.body,
    color: adminPalette.muted,
  },
});
