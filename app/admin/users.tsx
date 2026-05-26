import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  AdminEmptyState,
  AdminErrorState,
  AdminFilterTabs,
  AdminInfoRow,
  AdminListCard,
  AdminLoadingState,
  AdminMetricCard,
  AdminMetricRow,
  AdminPanel,
  AdminPrivacyNotice,
  AdminScreenShell,
  AdminStatusBadge,
  adminPalette,
  type AdminTone,
} from '@/components/admin/AdminShell';
import { color, radius, space, typography } from '@/constants/theme';
import {
  listAdminUsers,
  type AdminUserFilter,
  type AdminUserListItem,
  type AdminUserVerificationStatus,
} from '@/services/admin-user.service';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

const filterLabels: Record<AdminUserFilter, string> = {
  all: 'All',
  pending: 'Pending',
  verified: 'Verified',
};

const filterOrder: AdminUserFilter[] = ['all', 'verified', 'pending'];

export default function AdminUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [filter, setFilter] = useState<AdminUserFilter>('all');
  const [search, setSearch] = useState('');
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

    const result = await listAdminUsers({ limit: 150 });

    if (result.error || !result.data) {
      setErrorMessage(result.error ?? 'Could not load users.');
    } else {
      setUsers(result.data);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(
    () => ({
      all: users.length,
      pending: users.filter((user) => user.verificationStatus === 'pending').length,
      verified: users.filter((user) => user.verificationStatus === 'verified').length,
    }),
    [users],
  );

  const filterOptions = useMemo(
    () =>
      filterOrder.map((value) => ({
        count: counts[value],
        label: filterLabels[value],
        value,
      })),
    [counts],
  );

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const filterMatches = filter === 'all' || user.verificationStatus === filter;
      if (!filterMatches) return false;

      if (!query) return true;

      return [user.fullName, user.location, user.roleLabel, user.verificationLabel]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [filter, search, users]);

  const emptyState = getEmptyState(filter, search);

  return (
    <AdminScreenShell
      activeSection="users"
      loading={loading}
      onRefresh={() => load({ silent: true })}
      refreshing={refreshing}
      subtitle="Review residents and public account activity"
      title="Users">
      <AdminMetricRow>
        <AdminMetricCard active={filter === 'all'} icon="people-alt" label="All" value={formatMetricCount(counts.all)} />
        <AdminMetricCard active={filter === 'verified'} icon="verified" label="Verified" value={formatMetricCount(counts.verified)} />
        <AdminMetricCard active={filter === 'pending'} icon="schedule" label="Pending" value={formatMetricCount(counts.pending)} />
      </AdminMetricRow>

      <AdminPrivacyNotice icon="visibility">
        Users shows public profile and activity signals only. Private verification documents stay in verification review.
      </AdminPrivacyNotice>

      <AdminPanel>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionCopy}>
            <Text style={styles.sectionTitle}>Resident review hub</Text>
            <Text style={styles.sectionSubtitle}>Search residents, roles, barangays, and safe activity counts</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/admin/photos' as never)}
            style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}>
            <MaterialIcons color={adminPalette.blue} name="photo-library" size={18} />
            <Text style={styles.secondaryActionText}>Public photos</Text>
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <MaterialIcons color={adminPalette.faint} name="search" size={20} />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={setSearch}
            placeholder="Search by name, barangay, or role"
            placeholderTextColor={adminPalette.faint}
            style={styles.searchInput}
            value={search}
          />
          {search ? (
            <Pressable
              accessibilityLabel="Clear user search"
              accessibilityRole="button"
              onPress={() => setSearch('')}
              style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
              <MaterialIcons color={adminPalette.faint} name="close" size={18} />
            </Pressable>
          ) : null}
        </View>

        <AdminFilterTabs options={filterOptions} value={filter} onChange={setFilter} />

        {loading ? (
          <AdminLoadingState label="Loading users..." />
        ) : errorMessage ? (
          <AdminErrorState message={errorMessage} onRetry={() => load()} />
        ) : visibleUsers.length ? (
          <View style={styles.list}>
            {visibleUsers.map((user) => (
              <UserReviewCard
                key={user.id}
                user={user}
                onPress={() =>
                  router.push({
                    pathname: '/admin/users/[userId]',
                    params: { userId: user.id },
                  })
                }
              />
            ))}
          </View>
        ) : (
          <AdminEmptyState
            description={emptyState.description}
            icon="people-outline"
            title={emptyState.title}
          />
        )}
      </AdminPanel>
    </AdminScreenShell>
  );
}

function UserReviewCard({
  onPress,
  user,
}: {
  onPress: () => void;
  user: AdminUserListItem;
}) {
  return (
    <AdminListCard>
      <View style={styles.userHeader}>
        <UserAvatar avatarUrl={user.avatarUrl} name={user.fullName} />
        <View style={styles.userCopy}>
          <View style={styles.nameRow}>
            <Text numberOfLines={2} style={styles.userName}>
              {user.fullName}
            </Text>
            <AdminStatusBadge label={user.verificationLabel} tone={toneForVerification(user.verificationStatus)} />
          </View>
          <View style={styles.metaLine}>
            <MaterialIcons color={adminPalette.faint} name="place" size={16} />
            <Text numberOfLines={2} style={styles.locationText}>
              {user.location}
            </Text>
          </View>
          <View style={styles.metaLine}>
            <MaterialIcons color={adminPalette.faint} name={roleIcon(user.roleLabel)} size={16} />
            <Text style={styles.roleText}>{user.roleLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.countRows}>
        <AdminInfoRow icon="photo-library" label="Public photos" value={String(user.publicPhotosCount)} />
        <AdminInfoRow icon="work-outline" label="Active jobs" value={String(user.activeJobsCount)} />
        <AdminInfoRow icon="handyman" label="Active services" value={String(user.activeServicesCount)} />
        <AdminInfoRow icon="flag" label="Reports" value={String(user.reportCount)} />
      </View>

      <Pressable
        accessibilityLabel={`Review user ${user.fullName}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.reviewButton, pressed && styles.pressed]}>
        <MaterialIcons color={color.white} name="manage-search" size={22} />
        <Text style={styles.reviewButtonText}>Review user</Text>
        <MaterialIcons color={color.white} name="chevron-right" size={24} />
      </Pressable>
    </AdminListCard>
  );
}

function UserAvatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />;
  }

  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarInitials}>{getInitials(name) || 'KR'}</Text>
    </View>
  );
}

function getEmptyState(filter: AdminUserFilter, search: string) {
  if (search.trim()) {
    return {
      title: 'No users match',
      description: 'Try another name, barangay, or role.',
    };
  }
  if (filter === 'verified') {
    return {
      title: 'No verified users',
      description: 'Verified residents will appear here.',
    };
  }
  if (filter === 'pending') {
    return {
      title: 'No pending users',
      description: 'Residents with pending verification requests will appear here.',
    };
  }

  return {
    title: 'No users found',
    description: 'Resident profiles will appear here after signup.',
  };
}

function roleIcon(label: string): MaterialIconName {
  if (label.includes('Worker')) return 'engineering';
  if (label.includes('Client')) return 'person-search';
  return 'person-outline';
}

function toneForVerification(status: AdminUserVerificationStatus): AdminTone {
  if (status === 'verified') return 'success';
  if (status === 'pending') return 'warning';
  return 'neutral';
}

function formatMetricCount(value: number) {
  return String(value).padStart(2, '0');
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

const styles = StyleSheet.create({
  sectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  sectionCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  sectionTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 20,
    lineHeight: 26,
  },
  sectionSubtitle: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  secondaryAction: {
    alignItems: 'center',
    borderColor: adminPalette.blueLine,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.xs,
    minHeight: 38,
    paddingHorizontal: space.md,
  },
  secondaryActionText: {
    ...typography.captionMedium,
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
  },
  searchWrap: {
    alignItems: 'center',
    backgroundColor: color.white,
    borderBottomColor: adminPalette.line,
    borderTopColor: adminPalette.line,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    minHeight: 50,
    paddingHorizontal: 24,
  },
  searchInput: {
    color: adminPalette.ink,
    flex: 1,
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    lineHeight: 20,
    minHeight: 46,
    paddingVertical: 0,
  },
  clearButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  list: {
    gap: 0,
  },
  userHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
  },
  avatarImage: {
    backgroundColor: color.surfaceAlt,
    borderColor: adminPalette.line,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 52,
    width: 52,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blueLine,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  avatarInitials: {
    color: adminPalette.blueDeep,
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 20,
  },
  userCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  nameRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'space-between',
  },
  userName: {
    color: adminPalette.ink,
    flex: 1,
    fontFamily: 'Satoshi-Bold',
    fontSize: 17,
    lineHeight: 22,
  },
  metaLine: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 5,
  },
  locationText: {
    ...typography.caption,
    color: adminPalette.muted,
    flex: 1,
  },
  roleText: {
    ...typography.captionMedium,
    color: adminPalette.muted,
  },
  countRows: {
    gap: 0,
  },
  reviewButton: {
    alignItems: 'center',
    backgroundColor: adminPalette.blue,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: space.lg,
  },
  reviewButtonText: {
    ...typography.button,
    color: color.white,
    flex: 1,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
