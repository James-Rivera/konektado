import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';

import {
  AdminEmptyState,
  AdminErrorState,
  AdminFilterTabs,
  AdminListCard,
  AdminLoadingState,
  AdminPanel,
  AdminPrivacyNotice,
  AdminScreenShell,
  AdminStatusBadge,
  adminPalette,
  type AdminTone,
} from '@/components/admin/AdminShell';
import { color, radius, space, typography } from '@/constants/theme';
import {
  listAdminPublicPhotos,
  type AdminPhotoModerationStatus,
  type AdminPhotoSource,
  type AdminPublicPhotoItem,
} from '@/services/admin-photo.service';

type PhotoFilter = AdminPhotoSource | 'all';

const filterLabels: Record<PhotoFilter, string> = {
  all: 'All',
  job: 'Jobs',
  profile: 'Profiles',
  service: 'Services',
};

export default function AdminPhotosScreen() {
  const [photos, setPhotos] = useState<AdminPublicPhotoItem[]>([]);
  const [filter, setFilter] = useState<PhotoFilter>('all');
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

    const result = await listAdminPublicPhotos({ limit: 150 });

    if (result.error || !result.data) {
      setErrorMessage(result.error ?? 'Could not load public photos.');
    } else {
      setPhotos(result.data);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(
    () => ({
      all: photos.length,
      job: photos.filter((photo) => photo.source === 'job').length,
      profile: photos.filter((photo) => photo.source === 'profile').length,
      service: photos.filter((photo) => photo.source === 'service').length,
    }),
    [photos],
  );

  const filterOptions = useMemo(
    () =>
      (['all', 'profile', 'job', 'service'] as PhotoFilter[]).map((value) => ({
        label: filterLabels[value],
        value,
      })),
    [],
  );

  const visiblePhotos = useMemo(() => {
    if (filter === 'all') return photos;
    return photos.filter((photo) => photo.source === filter);
  }, [filter, photos]);

  const emptyState = emptyStateForFilter(filter);

  return (
    <AdminScreenShell
      activeSection="users"
      loading={loading}
      onRefresh={() => load({ silent: true })}
      refreshing={refreshing}
      showRefreshAction={false}
      subtitle="View public-facing app photos"
      title="Photos">
      <AdminPrivacyNotice icon="visibility">
        Only public profile, job, and service photos are shown here. Private verification files remain available only in the verification review flow.
      </AdminPrivacyNotice>

      <AdminPanel>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionCopy}>
            <Text style={styles.sectionTitle}>Public photos</Text>
            <Text style={styles.sectionSubtitle}>Profile, job, and service images visible in the app</Text>
            <Text style={styles.countText}>
              {loading ? 'Loading photos' : `${visiblePhotos.length} of ${counts[filter]} ${filterLabels[filter].toLowerCase()} photos`}
            </Text>
          </View>
        </View>

        <AdminFilterTabs options={filterOptions} value={filter} onChange={setFilter} />

        {loading ? (
          <AdminLoadingState label="Loading public photos..." />
        ) : errorMessage ? (
          <AdminErrorState message={errorMessage} onRetry={() => load()} />
        ) : visiblePhotos.length ? (
          <View style={styles.list}>
            {visiblePhotos.map((photo) => (
              <PhotoAuditCard key={photo.id} photo={photo} />
            ))}
          </View>
        ) : (
          <AdminEmptyState
            description={emptyState.description}
            icon="image"
            title={emptyState.title}
          />
        )}

        <View style={styles.backendNote}>
          <MaterialIcons color={adminPalette.faint} name="info-outline" size={18} />
          <Text style={styles.backendNoteText}>
            Photo review actions apply only to public-facing profile, job, and service photos.
          </Text>
        </View>
      </AdminPanel>
    </AdminScreenShell>
  );
}

function PhotoAuditCard({ photo }: { photo: AdminPublicPhotoItem }) {
  const router = useRouter();
  const action = actionForPhoto(photo);
  const disabled = !action.route;

  const handleReviewPhoto = () => {
    router.push({
      pathname: '/admin/photos/[photoId]',
      params: { photoId: photo.id },
    });
  };

  const handleOpenPhotoSource = () => {
    if (!action.route) {
      Alert.alert('Photo source unavailable', 'This photo source is unavailable.');
      return;
    }

    router.push(action.route as never);
  };

  return (
    <AdminListCard>
      <View style={styles.photoRow}>
        <Image source={{ uri: photo.imageUrl }} style={styles.thumbnail} />
        <View style={styles.photoCopy}>
          <View style={styles.typeRow}>
            <Text style={styles.sourceType}>{sourceLabel(photo.source)}</Text>
            {photo.moderationStatus === 'visible' ? null : (
              <AdminStatusBadge
                label={formatModerationStatus(photo.moderationStatus)}
                tone={toneForModeration(photo.moderationStatus)}
              />
            )}
          </View>
          <Text numberOfLines={2} style={styles.photoTitle}>
            {photo.title}
          </Text>
          <Text numberOfLines={1} style={styles.photoSubtitle}>
            {photo.ownerName ?? photo.subtitle}
          </Text>
          <View style={styles.metaRow}>
            <MaterialIcons color={adminPalette.faint} name="place" size={14} />
            <Text numberOfLines={1} style={styles.photoMeta}>{photo.location ?? 'Location unavailable'}</Text>
          </View>
          <View style={styles.metaRow}>
            <MaterialIcons color={adminPalette.faint} name="event" size={14} />
            <Text numberOfLines={1} style={styles.photoMeta}>{formatDate(photo.createdAt)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          onPress={handleReviewPhoto}
          style={({ pressed }) => [styles.reviewAction, pressed && styles.pressed]}>
          <Text style={styles.reviewActionText}>Review photo</Text>
          <MaterialIcons color={color.white} name="chevron-right" size={20} />
        </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={handleOpenPhotoSource}
        style={({ pressed }) => [
          styles.primaryAction,
          disabled && styles.primaryActionDisabled,
          pressed && !disabled && styles.pressed,
        ]}>
        <Text style={[styles.primaryActionText, disabled && styles.primaryActionTextDisabled]}>
          {disabled ? action.label : 'Open source'}
        </Text>
        {disabled ? null : <MaterialIcons color={adminPalette.blue} name="chevron-right" size={20} />}
      </Pressable>
      </View>
    </AdminListCard>
  );
}

function actionForPhoto(photo: AdminPublicPhotoItem) {
  if (photo.source === 'job') {
    if (!photo.sourceId) {
      return { label: 'Listing unavailable', route: null };
    }

    return {
      label: 'View listing',
      route: { pathname: '/job/[jobId]', params: { adminView: '1', jobId: photo.sourceId } },
    };
  }

  if (photo.source === 'service') {
    if (!photo.sourceId) {
      return { label: 'Service unavailable', route: null };
    }

    return {
      label: 'View service',
      route: { pathname: '/services/[serviceId]', params: { adminView: '1', serviceId: photo.sourceId } },
    };
  }

  if (!photo.ownerId) {
    return { label: 'Profile unavailable', route: null };
  }

  if (photo.profileRouteKind === 'client') {
    return {
      label: 'View profile',
      route: { pathname: '/client/[clientId]', params: { adminView: '1', clientId: photo.ownerId } },
    };
  }

  if (photo.profileRouteKind === 'worker') {
    return {
      label: 'View profile',
      route: { pathname: '/worker/[workerId]', params: { adminView: '1', workerId: photo.ownerId } },
    };
  }

  return {
    label: 'Profile unavailable',
    route: null,
  };
}

function sourceLabel(source: AdminPhotoSource) {
  if (source === 'profile') return 'Profile photo';
  if (source === 'job') return 'Job photo';
  return 'Service photo';
}

function formatModerationStatus(status: AdminPhotoModerationStatus) {
  if (status === 'flagged') return 'Flagged';
  if (status === 'hidden') return 'Hidden';
  if (status === 'cleared') return 'Cleared';
  return 'Visible';
}

function toneForModeration(status: AdminPhotoModerationStatus): AdminTone {
  if (status === 'hidden') return 'danger';
  if (status === 'flagged') return 'warning';
  if (status === 'cleared') return 'success';
  return 'neutral';
}

function emptyStateForFilter(filter: PhotoFilter) {
  if (filter === 'profile') {
    return {
      title: 'No profile photos found',
      description: 'Public profile photos will appear here.',
    };
  }
  if (filter === 'job') {
    return {
      title: 'No job photos found',
      description: 'Public job listing photos will appear here.',
    };
  }
  if (filter === 'service') {
    return {
      title: 'No service photos found',
      description: 'Public service photos will appear here.',
    };
  }

  return {
    title: 'No public photos found',
    description: 'Public profile, job, and service photos will appear here.',
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return 'Recently updated';
  return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
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
  countText: {
    ...typography.caption,
    color: adminPalette.faint,
    marginTop: space.xs,
  },
  list: {
    gap: 0,
  },
  photoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  thumbnail: {
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    height: 76,
    width: 76,
  },
  photoCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  sourceType: {
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 16,
  },
  typeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  photoTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 20,
  },
  photoSubtitle: {
    ...typography.caption,
    color: adminPalette.muted,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  photoMeta: {
    ...typography.caption,
    color: color.textSubtle,
    flex: 1,
  },
  primaryAction: {
    alignItems: 'center',
    borderColor: adminPalette.blueLine,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 2,
    minHeight: 34,
    paddingLeft: space.md,
    paddingRight: space.xs,
  },
  primaryActionText: {
    ...typography.captionMedium,
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
  },
  primaryActionDisabled: {
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
  },
  primaryActionTextDisabled: {
    color: adminPalette.faint,
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    justifyContent: 'flex-end',
  },
  reviewAction: {
    alignItems: 'center',
    backgroundColor: adminPalette.blue,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 2,
    minHeight: 34,
    paddingLeft: space.md,
    paddingRight: space.xs,
  },
  reviewActionText: {
    ...typography.captionMedium,
    color: color.white,
    fontFamily: 'Satoshi-Bold',
  },
  backendNote: {
    alignItems: 'flex-start',
    borderTopColor: adminPalette.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.sm,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  backendNoteText: {
    ...typography.caption,
    color: adminPalette.faint,
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
});
