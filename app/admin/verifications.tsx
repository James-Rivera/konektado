import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AdminEmptyState,
  AdminErrorState,
  AdminFilterTabs,
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
import { color, radius, space } from '@/constants/theme';
import {
  listVerificationRequests,
  type VerificationRequestDetail,
} from '@/services/admin.service';
import type { VerificationStatus } from '@/types/verification.types';

type VerificationFilter = 'pending' | 'reviewed' | 'all';
type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

type SubmissionDetails = {
  birthdate: string | null;
  city: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  firstName: string | null;
  idType: string | null;
  lastName: string | null;
  servicesOrPurpose: string | null;
  streetAddress: string | null;
  submittedNote: string | null;
};

const reviewedStatuses: VerificationStatus[] = [
  'approved',
  'needs_more_info',
  'rejected',
  'cancelled',
  'skipped',
];

const filterLabels: Record<VerificationFilter, string> = {
  all: 'All',
  pending: 'Pending',
  reviewed: 'Reviewed',
};

export default function AdminVerificationQueueScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<VerificationRequestDetail[]>([]);
  const [filter, setFilter] = useState<VerificationFilter>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortOldestFirst, setSortOldestFirst] = useState(false);

  const load = async ({ silent = false }: { silent?: boolean } = {}) => {
    setErrorMessage(null);
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const result = await listVerificationRequests({ limit: 75 });

    if (result.error || !result.data) {
      setErrorMessage(result.error ?? 'Could not load verification requests.');
    } else {
      setRequests(result.data);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const pending = requests.filter((request) => request.status === 'pending').length;
    const reviewed = requests.filter((request) => reviewedStatuses.includes(request.status)).length;
    return { pending, reviewed, all: requests.length };
  }, [requests]);

  const filterOptions = useMemo(
    () =>
      (['pending', 'reviewed', 'all'] as VerificationFilter[]).map((value) => ({
        count: stats[value],
        label: filterLabels[value],
        value,
      })),
    [stats],
  );

  const visibleRequests = useMemo(() => {
    const next = requests.filter((request) => {
      if (filter === 'pending') return request.status === 'pending';
      if (filter === 'reviewed') return reviewedStatuses.includes(request.status);
      return true;
    });

    return next.sort((a, b) => {
      const first = new Date(a.createdAt).getTime();
      const second = new Date(b.createdAt).getTime();
      return sortOldestFirst ? first - second : second - first;
    });
  }, [filter, requests, sortOldestFirst]);

  const openReviewRoute = (request: VerificationRequestDetail) => {
    router.push({
      pathname: '/admin/verifications/[requestId]',
      params: { requestId: request.id },
    });
  };

  return (
    <AdminScreenShell
      activeSection="verifications"
      loading={loading}
      onRefresh={() => load({ silent: true })}
      refreshing={refreshing}
      subtitle="Review residents' identity requests"
      title="Verifications">
      <AdminMetricRow>
        <AdminMetricCard active={filter === 'pending'} icon="schedule" label="Pending" value={formatMetricCount(stats.pending)} />
        <AdminMetricCard active={filter === 'reviewed'} icon="task-alt" label="Reviewed" value={formatMetricCount(stats.reviewed)} />
        <AdminMetricCard active={filter === 'all'} icon="article" label="All" value={formatMetricCount(stats.all)} />
      </AdminMetricRow>

      <AdminPrivacyNotice>
        Verification files are private and only visible during authorized review.
      </AdminPrivacyNotice>

      <AdminPanel>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionCopy}>
            <Text style={styles.sectionTitle}>{titleForFilter(filter)}</Text>
            <Text style={styles.sectionSubtitle}>{subtitleForFilter(filter)}</Text>
          </View>
          <Pressable
            accessibilityLabel={sortOldestFirst ? 'Sort newest first' : 'Sort oldest first'}
            accessibilityRole="button"
            onPress={() => setSortOldestFirst((current) => !current)}
            style={({ pressed }) => [styles.sortButton, pressed && styles.pressed]}>
            <Text style={styles.sortText}>Sort</Text>
            <MaterialIcons color={adminPalette.muted} name="filter-list" size={24} />
          </Pressable>
        </View>

        <AdminFilterTabs options={filterOptions} value={filter} onChange={setFilter} />

        {loading ? (
          <AdminLoadingState label="Loading verification requests..." />
        ) : errorMessage ? (
          <AdminErrorState message={errorMessage} onRetry={() => load()} />
        ) : visibleRequests.length ? (
          <View style={styles.list}>
            {visibleRequests.map((request) => (
              <VerificationRequestCard
                key={request.id}
                request={request}
                onPress={() => openReviewRoute(request)}
              />
            ))}
          </View>
        ) : (
          <AdminEmptyState
            description={emptyDescriptionForFilter(filter)}
            icon="verified-user"
            title={`No ${filterLabels[filter].toLowerCase()} requests`}
          />
        )}
      </AdminPanel>
    </AdminScreenShell>
  );
}

function VerificationRequestCard({
  request,
  onPress,
}: {
  request: VerificationRequestDetail;
  onPress: () => void;
}) {
  const details = parseSubmissionDetails(request.notes);
  const name = request.profile?.fullName || fullNameFromDetails(details, request) || 'Konektado resident';
  const location =
    [request.profile?.barangay, request.profile?.city].filter(Boolean).join(', ') ||
    details.city ||
    'Barangay San Pedro, Santo Tomas';
  const idType = details.idType ? formatFileType(details.idType) : 'Not provided';
  const pending = request.status === 'pending';

  return (
    <AdminListCard>
      <View style={styles.requestTop}>
        <ResidentAvatar avatarUrl={request.profile?.avatarUrl ?? null} name={name} />
        <View style={styles.requestIdentity}>
          <View style={styles.requestNameRow}>
            <Text numberOfLines={2} style={styles.requestName}>
              {name}
            </Text>
            <AdminStatusBadge label={formatStatusLabel(request.status)} tone={toneForStatus(request.status)} />
          </View>
          <View style={styles.locationRow}>
            <MaterialIcons color={adminPalette.faint} name="place" size={20} />
            <Text numberOfLines={2} style={styles.locationText}>
              {location}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.requestDivider} />

      <View style={styles.metadataList}>
        <MetadataRow icon="calendar-today" label="Submitted" value={formatDate(request.createdAt)} />
        <MetadataRow icon="folder" label="Files" value={`${request.files.length} uploaded`} />
        <MetadataRow icon="badge" label="ID type" value={idType} />
      </View>

      <Pressable
        accessibilityLabel={`${pending ? 'Review' : 'View'} request for ${name}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.reviewButton, !pending && styles.reviewButtonSecondary, pressed && styles.pressed]}>
        <MaterialIcons color={pending ? color.white : adminPalette.blue} name="search" size={28} />
        <Text style={[styles.reviewButtonText, !pending && styles.reviewButtonTextSecondary]}>
          {pending ? 'Review Request' : 'View Review'}
        </Text>
        <MaterialIcons color={pending ? color.white : adminPalette.blue} name="chevron-right" size={28} />
      </Pressable>
    </AdminListCard>
  );
}

function ResidentAvatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />;
  }

  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarInitials}>{getInitials(name) || 'KR'}</Text>
    </View>
  );
}

function MetadataRow({
  icon,
  label,
  value,
}: {
  icon: MaterialIconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metadataRow}>
      <View style={styles.metadataIcon}>
        <MaterialIcons color={adminPalette.blue} name={icon} size={22} />
      </View>
      <Text style={styles.metadataLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.metadataValue}>
        {value}
      </Text>
    </View>
  );
}

function parseSubmissionDetails(notes: string | null): SubmissionDetails {
  if (!notes) return emptySubmissionDetails();

  try {
    const parsed = JSON.parse(notes) as {
      contact?: { email?: string | null; phone?: string | null };
      document?: { idType?: string | null };
      identity?: {
        birthdate?: string | null;
        city?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        streetAddress?: string | null;
      };
      servicesOrPurpose?: string | null;
      submittedNote?: string | null;
    };

    return {
      birthdate: parsed.identity?.birthdate ?? null,
      city: parsed.identity?.city ?? null,
      contactEmail: parsed.contact?.email ?? null,
      contactPhone: parsed.contact?.phone ?? null,
      firstName: parsed.identity?.firstName ?? null,
      idType: parsed.document?.idType ?? null,
      lastName: parsed.identity?.lastName ?? null,
      servicesOrPurpose: parsed.servicesOrPurpose ?? null,
      streetAddress: parsed.identity?.streetAddress ?? null,
      submittedNote: parsed.submittedNote ?? null,
    };
  } catch {
    return {
      ...emptySubmissionDetails(),
      submittedNote: notes,
    };
  }
}

function emptySubmissionDetails(): SubmissionDetails {
  return {
    birthdate: null,
    city: null,
    contactEmail: null,
    contactPhone: null,
    firstName: null,
    idType: null,
    lastName: null,
    servicesOrPurpose: null,
    streetAddress: null,
    submittedNote: null,
  };
}

function fullNameFromDetails(details: SubmissionDetails, request: VerificationRequestDetail) {
  return [details.firstName, details.lastName].filter(Boolean).join(' ') || request.profile?.fullName || '';
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMetricCount(value: number) {
  return String(value).padStart(2, '0');
}

function formatFileType(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function toneForStatus(status: VerificationStatus): AdminTone {
  if (status === 'approved') return 'success';
  if (status === 'pending' || status === 'needs_more_info') return 'warning';
  if (status === 'rejected') return 'danger';
  return 'neutral';
}

function formatStatusLabel(status: VerificationStatus) {
  if (status === 'needs_more_info') return 'Needs more info';
  return status.replace(/_/g, ' ');
}

function titleForFilter(filter: VerificationFilter) {
  if (filter === 'reviewed') return 'Reviewed requests';
  if (filter === 'all') return 'All requests';
  return 'Pending queue';
}

function subtitleForFilter(filter: VerificationFilter) {
  if (filter === 'reviewed') return 'Requests already reviewed by barangay admins';
  if (filter === 'all') return 'Every verification request available to admins';
  return 'Requests waiting for your review';
}

function emptyDescriptionForFilter(filter: VerificationFilter) {
  if (filter === 'reviewed') return 'Approved, rejected, and correction requests will appear here.';
  if (filter === 'all') return 'Verification requests will appear here after residents submit them.';
  return 'New resident identity requests will appear here.';
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
  sortButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 4,
  },
  sortText: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 20,
  },
  list: {
    gap: 0,
  },
  requestTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  avatarImage: {
    backgroundColor: color.surfaceAlt,
    borderColor: adminPalette.line,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 48,
    width: 48,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blueLine,
    borderWidth: 1,
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarInitials: {
    color: adminPalette.blueDeep,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  requestIdentity: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  requestNameRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  requestName: {
    color: adminPalette.ink,
    flex: 1,
    fontFamily: 'Satoshi-Bold',
    fontSize: 17,
    lineHeight: 22,
  },
  locationRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 6,
  },
  locationText: {
    color: adminPalette.muted,
    flex: 1,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  requestDivider: {
    backgroundColor: adminPalette.line,
    height: 1,
  },
  metadataList: {
    gap: 0,
  },
  metadataRow: {
    alignItems: 'center',
    borderBottomColor: adminPalette.lineStrong,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 46,
    paddingVertical: 8,
  },
  metadataIcon: {
    alignItems: 'center',
    backgroundColor: color.white,
    borderRadius: radius.sm,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  metadataLabel: {
    color: adminPalette.muted,
    flex: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  metadataValue: {
    color: adminPalette.ink,
    flex: 1,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'right',
  },
  reviewButton: {
    alignItems: 'center',
    backgroundColor: adminPalette.blue,
    borderRadius: 24,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 20,
  },
  reviewButtonSecondary: {
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blueLine,
    borderWidth: 1,
  },
  reviewButtonText: {
    color: color.white,
    flex: 1,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  reviewButtonTextSecondary: {
    color: adminPalette.blue,
  },
  pressed: {
    opacity: 0.72,
  },
});
