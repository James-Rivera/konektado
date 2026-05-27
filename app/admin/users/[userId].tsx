import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useState } from 'react';
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
  AdminInfoRow,
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
  getAdminUserDetail,
  type AdminUserActivityItem,
  type AdminUserDetail,
  type AdminUserPublicPhoto,
  type AdminUserReportItem,
  type AdminUserVerificationStatus,
} from '@/services/admin-user.service';
import type { VerificationStatus } from '@/types/verification.types';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

export default function AdminUserReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string }>();
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!userId) {
      setErrorMessage('Choose a user to review.');
      setLoading(false);
      return;
    }

    setErrorMessage(null);
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const result = await getAdminUserDetail(userId);

    if (result.error || !result.data) {
      setErrorMessage(result.error ?? 'Could not load this user.');
    } else {
      setUser(result.data);
    }

    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminScreenShell
      activeSection="users"
      loading={loading}
      onRefresh={() => load({ silent: true })}
      refreshing={refreshing}
      subtitle="Resident account overview"
      title="User Review">
      <AdminPanel>
        <View style={styles.backRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/admin/users')}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <MaterialIcons color={adminPalette.ink} name="arrow-back" size={20} />
            <Text style={styles.backText}>Users</Text>
          </Pressable>
        </View>

        {loading ? (
          <AdminLoadingState label="Loading user review..." />
        ) : errorMessage ? (
          <AdminErrorState message={errorMessage} onRetry={() => load()} />
        ) : user ? (
          <View style={styles.detailStack}>
            <ProfileSummary user={user} />

            <Section title="Public activity">
              <ActivitySection
                emptyDescription="No active jobs owned by this user."
                emptyTitle="No active jobs"
                icon="work-outline"
                items={user.activeJobs}
                onItemPress={(item) =>
                  router.push({
                    pathname: '/job/[jobId]',
                    params: { adminView: '1', jobId: item.id },
                  })
                }
                title="Active jobs/listings"
              />
              <ActivitySection
                emptyDescription="No active services owned by this user."
                emptyTitle="No active services"
                icon="handyman"
                items={user.activeServices}
                onItemPress={(item) =>
                  router.push({
                    pathname: '/services/[serviceId]',
                    params: { adminView: '1', serviceId: item.id },
                  })
                }
                title="Active services"
              />
            </Section>

            <Section title="Reports">
              <View style={styles.sectionLead}>
                <Text style={styles.sectionLeadText}>
                  {user.reportCount} report{user.reportCount === 1 ? '' : 's'} involving this user or their public listings
                </Text>
              </View>
              {user.recentReports.length ? (
                <View style={styles.inlineList}>
                  {user.recentReports.map((report) => (
                    <ReportRow key={report.id} report={report} />
                  ))}
                </View>
              ) : (
                <InlineEmpty
                  description="No reports are connected to this user through the current reports table."
                  icon="flag"
                  title="No recent reports"
                />
              )}
            </Section>

            <Section title="Verification link">
              <VerificationLink
                latestVerification={user.latestVerification}
                onOpen={() => {
                  if (!user.latestVerification?.id) return;
                  router.push({
                    pathname: '/admin/verifications/[requestId]',
                    params: { requestId: user.latestVerification.id },
                  });
                }}
              />
            </Section>

            <Section title="Public photos">
              <PublicPhotosPreview
                photos={user.publicPhotos}
                onOpenSource={(photo) => {
                  const route = actionForPhoto(photo, user).route;
                  if (route) router.push(route as never);
                }}
                onReviewPhoto={(photo) =>
                  router.push({
                    pathname: '/admin/photos/[photoId]',
                    params: { fromUserId: user.id, photoId: photo.id },
                  })
                }
              />
            </Section>

            <Section title="Admin actions">
              <View style={styles.moderationNotice}>
                <MaterialIcons color={adminPalette.faint} name="lock-outline" size={22} />
                <Text style={styles.moderationText}>
                  Moderation actions require backend enforcement and audit logging.
                </Text>
              </View>
            </Section>
          </View>
        ) : (
          <AdminEmptyState
            description="Choose a resident from Users to review public account activity."
            icon="person-search"
            title="No user selected"
          />
        )}
      </AdminPanel>
    </AdminScreenShell>
  );
}

function ProfileSummary({ user }: { user: AdminUserDetail }) {
  return (
    <View style={styles.profileCard}>
      <View style={styles.profileTop}>
        <UserAvatar avatarUrl={user.avatarUrl} name={user.fullName} />
        <View style={styles.profileCopy}>
          <View style={styles.nameLine}>
            <Text numberOfLines={2} style={styles.profileName}>{user.fullName}</Text>
            <AdminStatusBadge label={user.verificationLabel} tone={toneForVerification(user.verificationStatus)} />
          </View>
          <View style={styles.metaLine}>
            <MaterialIcons color={adminPalette.faint} name="place" size={16} />
            <Text numberOfLines={2} style={styles.profileMeta}>{user.location}</Text>
          </View>
          <View style={styles.metaLine}>
            <MaterialIcons color={adminPalette.faint} name="badge" size={16} />
            <Text style={styles.profileMeta}>{user.roleLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.summaryRows}>
        <AdminInfoRow icon="verified-user" label="Verification" value={user.verificationLabel} />
        <AdminInfoRow icon="chat-bubble-outline" label="Preferred contact" value={user.preferredContactMethod ?? 'Not set'} />
        <AdminInfoRow icon="event-available" label="Availability" value={user.availability ?? 'Not set'} />
        <AdminInfoRow icon="notes" label="About" value={user.about ?? 'Not provided'} />
      </View>
    </View>
  );
}

function ActivitySection({
  emptyDescription,
  emptyTitle,
  icon,
  items,
  onItemPress,
  title,
}: {
  emptyDescription: string;
  emptyTitle: string;
  icon: MaterialIconName;
  items: AdminUserActivityItem[];
  onItemPress: (item: AdminUserActivityItem) => void;
  title: string;
}) {
  return (
    <View style={styles.activityBlock}>
      <View style={styles.blockHeader}>
        <MaterialIcons color={adminPalette.blue} name={icon} size={20} />
        <Text style={styles.blockTitle}>{title}</Text>
      </View>
      {items.length ? (
        <View style={styles.inlineList}>
          {items.map((item) => (
            <ActivityRow key={item.id} item={item} onPress={() => onItemPress(item)} />
          ))}
        </View>
      ) : (
        <InlineEmpty description={emptyDescription} icon={icon} title={emptyTitle} />
      )}
    </View>
  );
}

function ActivityRow({
  item,
  onPress,
}: {
  item: AdminUserActivityItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.inlineRow, pressed && styles.pressed]}>
      <View style={styles.inlineRowCopy}>
        <Text numberOfLines={2} style={styles.inlineRowTitle}>{item.title}</Text>
        <Text numberOfLines={1} style={styles.inlineRowMeta}>
          {item.subtitle} - {item.statusLabel} - {item.photoCount} photo{item.photoCount === 1 ? '' : 's'}
        </Text>
      </View>
      <MaterialIcons color={adminPalette.faint} name="chevron-right" size={22} />
    </Pressable>
  );
}

function ReportRow({ report }: { report: AdminUserReportItem }) {
  return (
    <View style={styles.inlineRow}>
      <View style={styles.inlineRowCopy}>
        <Text numberOfLines={2} style={styles.inlineRowTitle}>{report.reason}</Text>
        <Text numberOfLines={1} style={styles.inlineRowMeta}>
          {report.targetLabel} - {report.status} - {formatDate(report.createdAt)}
        </Text>
      </View>
      <MaterialIcons color={adminPalette.faint} name="flag" size={20} />
    </View>
  );
}

function VerificationLink({
  latestVerification,
  onOpen,
}: {
  latestVerification: AdminUserDetail['latestVerification'];
  onOpen: () => void;
}) {
  if (!latestVerification) {
    return (
      <InlineEmpty
        description="No verification request id is available for this user."
        icon="verified-user"
        title="No verification request"
      />
    );
  }

  return (
    <AdminListCard style={styles.embeddedCard}>
      <View style={styles.verificationRow}>
        <View style={styles.inlineRowCopy}>
          <Text style={styles.inlineRowTitle}>Current verification status</Text>
          <Text style={styles.inlineRowMeta}>{formatVerificationStatus(latestVerification.status)}</Text>
        </View>
        <AdminStatusBadge
          label={formatVerificationStatus(latestVerification.status)}
          tone={toneForVerificationRequest(latestVerification.status)}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
        <MaterialIcons color={adminPalette.blue} name="open-in-new" size={18} />
        <Text style={styles.secondaryButtonText}>Open verification review</Text>
      </Pressable>
    </AdminListCard>
  );
}

function PublicPhotosPreview({
  onOpenSource,
  onReviewPhoto,
  photos,
}: {
  onOpenSource: (photo: AdminUserPublicPhoto) => void;
  onReviewPhoto: (photo: AdminUserPublicPhoto) => void;
  photos: AdminUserPublicPhoto[];
}) {
  const groups = [
    { photos: photos.filter((photo) => photo.source === 'profile'), title: 'Profile photos' },
    { photos: photos.filter((photo) => photo.source === 'job'), title: 'Job/listing photos' },
    { photos: photos.filter((photo) => photo.source === 'service'), title: 'Service photos' },
  ].filter((group) => group.photos.length);

  return (
    <View style={styles.photosBlock}>
      <AdminPrivacyNotice icon="visibility">
        Only public profile, job, and service photos are listed here.
      </AdminPrivacyNotice>

      {photos.length ? (
        <View style={styles.photoGroups}>
          {groups.map((group) => (
            <View key={group.title} style={styles.photoGroup}>
              <View style={styles.photoGroupHeader}>
                <Text style={styles.photoGroupTitle}>{group.title}</Text>
                <Text style={styles.photoGroupCount}>
                  {group.photos.length} photo{group.photos.length === 1 ? '' : 's'}
                </Text>
              </View>
              <View style={styles.photoGrid}>
                {group.photos.map((photo) => (
                  <View key={photo.id} style={styles.photoTile}>
                    <Image source={{ uri: photo.imageUrl }} style={styles.photoImage} />
                    <View style={styles.photoTileCopy}>
                      <View style={styles.photoTileHeader}>
                        <Text numberOfLines={1} style={styles.photoLabel}>{sourceLabel(photo.source)}</Text>
                        {photo.moderationStatus === 'visible' ? null : (
                          <AdminStatusBadge
                            label={formatModerationStatus(photo.moderationStatus)}
                            tone={toneForPhotoStatus(photo.moderationStatus)}
                          />
                        )}
                      </View>
                      <View style={styles.photoActions}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => onReviewPhoto(photo)}
                          style={({ pressed }) => [styles.photoActionButton, pressed && styles.pressed]}>
                          <Text style={styles.photoActionText}>Review photo</Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => onOpenSource(photo)}
                          style={({ pressed }) => [styles.photoSourceButton, pressed && styles.pressed]}>
                          <Text style={styles.photoSourceText}>Open source</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <InlineEmpty
          description="This user has no public profile, job, or service photos."
          icon="photo-library"
          title="No public photos"
        />
      )}
    </View>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function InlineEmpty({
  description,
  icon,
  title,
}: {
  description: string;
  icon: MaterialIconName;
  title: string;
}) {
  return (
    <View style={styles.inlineEmpty}>
      <MaterialIcons color={adminPalette.faint} name={icon} size={24} />
      <View style={styles.inlineEmptyCopy}>
        <Text style={styles.inlineEmptyTitle}>{title}</Text>
        <Text style={styles.inlineEmptyText}>{description}</Text>
      </View>
    </View>
  );
}

function UserAvatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  if (avatarUrl) return <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />;

  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarInitials}>{getInitials(name) || 'KR'}</Text>
    </View>
  );
}

function sourceLabel(source: AdminUserPublicPhoto['source']) {
  if (source === 'profile') return 'Profile';
  if (source === 'job') return 'Job';
  return 'Service';
}

function actionForPhoto(photo: AdminUserPublicPhoto, user: AdminUserDetail) {
  if (photo.source === 'job') {
    return {
      route: { pathname: '/job/[jobId]', params: { adminView: '1', jobId: photo.sourceId } },
    };
  }

  if (photo.source === 'service') {
    return {
      route: { pathname: '/services/[serviceId]', params: { adminView: '1', serviceId: photo.sourceId } },
    };
  }

  if (user.roles.includes('worker')) {
    return {
      route: { pathname: '/worker/[workerId]', params: { adminView: '1', workerId: user.id } },
    };
  }

  return {
    route: { pathname: '/client/[clientId]', params: { adminView: '1', clientId: user.id } },
  };
}

function formatModerationStatus(status: AdminUserPublicPhoto['moderationStatus']) {
  if (status === 'flagged') return 'Flagged';
  if (status === 'hidden') return 'Hidden';
  if (status === 'cleared') return 'Cleared';
  return 'Visible';
}

function toneForPhotoStatus(status: AdminUserPublicPhoto['moderationStatus']): AdminTone {
  if (status === 'hidden') return 'danger';
  if (status === 'flagged') return 'warning';
  if (status === 'cleared') return 'success';
  return 'neutral';
}

function toneForVerification(status: AdminUserVerificationStatus): AdminTone {
  if (status === 'verified') return 'success';
  if (status === 'pending') return 'warning';
  return 'neutral';
}

function toneForVerificationRequest(status: VerificationStatus): AdminTone {
  if (status === 'approved') return 'success';
  if (status === 'pending' || status === 'needs_more_info') return 'warning';
  if (status === 'rejected') return 'danger';
  return 'neutral';
}

function formatVerificationStatus(status: VerificationStatus) {
  if (status === 'needs_more_info') return 'Needs more info';
  return status
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
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
  backRow: {
    borderBottomColor: adminPalette.line,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: space.xs,
    minHeight: 36,
    paddingHorizontal: space.sm,
  },
  backText: {
    ...typography.captionMedium,
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
  },
  detailStack: {
    gap: 14,
    padding: 16,
  },
  profileCard: {
    backgroundColor: color.white,
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  profileTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
    padding: 14,
  },
  avatarImage: {
    backgroundColor: color.surfaceAlt,
    borderColor: adminPalette.line,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 58,
    width: 58,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blueLine,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  avatarInitials: {
    color: adminPalette.blueDeep,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 22,
  },
  profileCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  nameLine: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'space-between',
  },
  profileName: {
    color: adminPalette.ink,
    flex: 1,
    fontFamily: 'Satoshi-Bold',
    fontSize: 19,
    lineHeight: 24,
  },
  metaLine: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 5,
  },
  profileMeta: {
    ...typography.caption,
    color: adminPalette.muted,
    flex: 1,
  },
  summaryRows: {
    borderTopColor: adminPalette.line,
    borderTopWidth: 1,
    paddingHorizontal: 14,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 22,
  },
  sectionBody: {
    backgroundColor: color.white,
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionLead: {
    borderBottomColor: adminPalette.line,
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionLeadText: {
    ...typography.body,
    color: adminPalette.muted,
  },
  activityBlock: {
    borderBottomColor: adminPalette.line,
    borderBottomWidth: 1,
  },
  blockHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  blockTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 19,
  },
  inlineList: {
    gap: 0,
  },
  inlineRow: {
    alignItems: 'center',
    borderTopColor: adminPalette.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: space.sm,
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inlineRowCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  inlineRowTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 19,
  },
  inlineRowMeta: {
    ...typography.caption,
    color: adminPalette.muted,
  },
  inlineEmpty: {
    alignItems: 'flex-start',
    borderTopColor: adminPalette.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  inlineEmptyCopy: {
    flex: 1,
    gap: 2,
  },
  inlineEmptyTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 19,
  },
  inlineEmptyText: {
    ...typography.caption,
    color: adminPalette.muted,
  },
  embeddedCard: {
    borderTopWidth: 0,
  },
  verificationRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  photosBlock: {
    gap: 0,
  },
  photoGroups: {
    gap: 0,
  },
  photoGroup: {
    borderTopColor: adminPalette.line,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  photoGroupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  photoGroupTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 18,
  },
  photoGroupCount: {
    ...typography.caption,
    color: adminPalette.muted,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    padding: 14,
  },
  photoTile: {
    backgroundColor: color.surfaceAlt,
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    width: '31%',
  },
  photoImage: {
    aspectRatio: 1,
    backgroundColor: color.surfaceAlt,
    width: '100%',
  },
  photoLabel: {
    ...typography.caption,
    color: adminPalette.muted,
    flex: 1,
  },
  photoTileCopy: {
    gap: space.xs,
    padding: 6,
  },
  photoTileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  photoActions: {
    gap: 5,
  },
  photoActionButton: {
    alignItems: 'center',
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blueLine,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  photoActionText: {
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
    lineHeight: 14,
  },
  photoSourceButton: {
    alignItems: 'center',
    borderColor: adminPalette.line,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  photoSourceText: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
    lineHeight: 14,
  },
  secondaryButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderColor: adminPalette.blueLine,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.xs,
    justifyContent: 'center',
    margin: 14,
    minHeight: 40,
    paddingHorizontal: space.md,
  },
  secondaryButtonText: {
    ...typography.captionMedium,
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
  },
  moderationNotice: {
    alignItems: 'flex-start',
    backgroundColor: color.surfaceAlt,
    flexDirection: 'row',
    gap: space.sm,
    padding: 14,
  },
  moderationText: {
    ...typography.body,
    color: adminPalette.muted,
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
});
