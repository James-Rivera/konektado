import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CachedRemoteImage } from '@/components/CachedRemoteImage';
import { EmptyState } from '@/components/EmptyState';
import { useFeedback } from '@/components/FeedbackProvider';
import {
  PublicProfileHeader,
  PublicProfileSkeleton,
} from '@/components/public-profile/PublicProfiles';
import {
  getDisplayLabelForMvpService,
  getDisplayTitleForMvpService,
} from '@/constants/service-taxonomy';
import { color, typography } from '@/constants/theme';
import { useAdminViewOnly } from '@/hooks/use-admin-view-only';
import { useProfile } from '@/hooks/use-profile';
import { useSavedPosts } from '@/hooks/use-saved-posts';
import { emitConversationPreviewUpdate } from '@/services/conversation-preview-events';
import { startServiceConversation } from '@/services/conversation.service';
import {
  formatServicePostTitle,
  formatServiceRate,
  formatServiceJobsDoneText,
  formatServiceRatingText,
  getExperienceLabel,
  getMarketplaceLocation,
  getPublicProfileAvatarUrl,
} from '@/services/marketplace.helpers';
import {
  getCompletionModeForError,
  getCompletionTitleForMode,
  getProfileSetupGateMessage,
  isProfileCompletionRequiredError,
} from '@/services/profile-completion.service';
import { getServiceDetail, updateServiceAvailability } from '@/services/service-profile.service';
import { getPublicWorkerProfile } from '@/services/worker-profile.service';
import type { ProviderService, PublicWorkerProfile, ServiceDetail } from '@/types/marketplace.types';
import { getCardImageUrl } from '@/utils/image-processing';

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function ServicePublicWorkerProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showErrorToast, showSuccessToast } = useFeedback();
  const { profile: currentProfile, loading: currentProfileLoading } = useProfile();
  const params = useLocalSearchParams<{
    adminView?: string | string[];
    previewPublic?: string | string[];
    serviceId?: string | string[];
  }>();
  const serviceId = getParamValue(params.serviceId);
  const previewPublic = getParamValue(params.previewPublic) === '1';
  const { adminViewOnly, adminViewRequested } = useAdminViewOnly(params.adminView);
  const [profile, setProfile] = useState<PublicWorkerProfile | null>(null);
  const [serviceDetail, setServiceDetail] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messaging, setMessaging] = useState(false);
  const [updatingService, setUpdatingService] = useState(false);
  const { isPending, isSaved, refreshSavedPosts, toggleSaved } = useSavedPosts();

  useEffect(() => {
    let active = true;

    if (!serviceId) {
      setLoading(false);
      setError('Service profile not found.');
      return;
    }

    setLoading(true);
    setError(null);
    getServiceDetail(serviceId)
      .then((detailResult) => {
        if (!active) return null;
        if (detailResult.error || !detailResult.data) {
          setError(detailResult.error ?? 'Service profile not found.');
          setServiceDetail(null);
          setProfile(null);
          setLoading(false);
          return null;
        }

        setServiceDetail(detailResult.data);
        return getPublicWorkerProfile(detailResult.data.providerId, { sourceServiceId: serviceId });
      })
      .then((workerResult) => {
        if (!active || !workerResult) return;

        if (workerResult.error) {
          setProfile(null);
        } else {
          setProfile(workerResult.data);
        }

        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError('Could not load this service right now.');
        setServiceDetail(null);
        setProfile(null);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [serviceId]);

  useEffect(() => {
    if (!currentProfile?.id || !serviceId) return;
    void refreshSavedPosts();
  }, [currentProfile?.id, refreshSavedPosts, serviceId]);

  const isVerified = Boolean(currentProfile?.barangay_verified_at || currentProfile?.verified_at);
  const isCurrentUsersService = Boolean(serviceDetail && currentProfile?.id === serviceDetail.providerId && !adminViewOnly);
  const isOwnerManageView = isCurrentUsersService && !previewPublic;
  const messageService = serviceDetail ?? getMessageService(profile);
  const cta = getServiceCta({
    isOwnService: isCurrentUsersService,
    isVerified,
    service: messageService,
  });
  const saveTarget = serviceId
    ? { postType: 'service' as const, postId: serviceId }
    : null;

  const handleSave = async () => {
    if (!saveTarget || isCurrentUsersService || adminViewOnly) return;
    if (isPending(saveTarget)) return;
    if (!isVerified) {
      router.push('/verification');
      return;
    }

    const result = await toggleSaved(saveTarget);
    if (result.error || !result.data) {
      showErrorToast(result.error ?? 'Could not update saved posts.');
      return;
    }

    showSuccessToast(result.data.saved ? 'Saved' : 'Removed from saved');
  };

  const handleMessage = async () => {
    if (!serviceDetail) return;
    if (cta.disabled && cta.reason !== 'verification') return;

    if (!isVerified) {
      router.push('/verification');
      return;
    }

    setMessaging(true);
    const result = await startServiceConversation({
      serviceId: serviceDetail.id,
      message: `Hi, I am interested in "${serviceDetail.title}". Are you available?`,
    });
    setMessaging(false);

    if (result.error || !result.data) {
      if (isProfileCompletionRequiredError(result.error)) {
        const mode = getCompletionModeForError(result.error) ?? 'hiring';
        Alert.alert(getCompletionTitleForMode(mode), getProfileSetupGateMessage(), [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Complete profile',
            onPress: () => router.push({ pathname: '/profile/complete' as never, params: { mode } }),
          },
        ]);
        return;
      }

      Alert.alert('Message worker', result.error ?? 'Could not open the conversation.');
      return;
    }

    emitConversationPreviewUpdate({
      conversation: result.data,
      conversationId: result.data.id,
      userId: currentProfile?.id,
    });
    router.push({
      pathname: '/conversation/[conversationId]',
      params: { conversationId: result.data.id },
    });
  };

  const handleEditService = () => {
    if (!serviceDetail) return;
    router.push({ pathname: '/create-service' as never, params: { serviceId: serviceDetail.id } } as never);
  };

  const handlePreviewPublicListing = () => {
    if (!serviceDetail) return;
    router.push({
      pathname: '/services/[serviceId]',
      params: { previewPublic: '1', serviceId: serviceDetail.id },
    } as never);
  };

  const handleViewWorkerProfile = () => {
    if (!serviceDetail) return;
    router.push({
      pathname: '/worker/[workerId]' as never,
      params: { sourceServiceId: serviceDetail.id, workerId: serviceDetail.providerId },
    } as never);
  };

  const handleToggleServiceActive = async () => {
    if (!serviceDetail || updatingService) return;

    setUpdatingService(true);
    const result = await updateServiceAvailability({
      isActive: !serviceDetail.isActive,
      serviceId: serviceDetail.id,
    });
    setUpdatingService(false);

    if (result.error || !result.data) {
      showErrorToast(result.error ?? 'Could not update this service.');
      return;
    }

    setServiceDetail((current) =>
      current && current.id === result.data.id
        ? {
            ...current,
            ...result.data,
            provider: current.provider,
            providerServices: current.providerServices,
            averageRating: current.averageRating,
            completedJobsCount: current.completedJobsCount,
            reviewCount: current.reviewCount,
          }
        : current,
    );
    showSuccessToast(result.data.isActive ? 'Service reactivated' : 'Service deactivated');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <PublicProfileHeader
          actionActive={Boolean(saveTarget && isSaved(saveTarget))}
          actionIcon={saveTarget && !isCurrentUsersService && !adminViewOnly
            ? isSaved(saveTarget)
              ? 'bookmark'
              : 'bookmark-border'
            : undefined}
          actionLabel={saveTarget && isSaved(saveTarget) ? 'Remove saved service' : 'Save service'}
          onAction={saveTarget ? handleSave : undefined}
          onBack={() => router.back()}
          title={isOwnerManageView ? 'Service post' : 'Service Detail'}
        />
        {loading || currentProfileLoading ? (
          <PublicProfileSkeleton bottomInset={insets.bottom} showCta={!adminViewRequested} />
        ) : null}
        {!loading && error ? (
          <EmptyState description={error} icon="search-off" title="Could not load service detail" />
        ) : null}
        {!loading && !error && !profile ? (
          <EmptyState
            description="This worker profile is no longer available."
            icon="person-search"
            title="Worker not found"
          />
        ) : null}
        {!loading && !currentProfileLoading && isOwnerManageView && serviceDetail ? (
          <OwnerServicePostView
            bottomInset={insets.bottom}
            onEdit={handleEditService}
            onPreviewPublicListing={handlePreviewPublicListing}
            onToggleActive={handleToggleServiceActive}
            service={serviceDetail}
            updating={updatingService}
          />
        ) : null}
        {!loading && !currentProfileLoading && !isOwnerManageView && serviceDetail ? (
          <PublicServiceDetailView
            adminViewOnly={adminViewOnly}
            bottomInset={insets.bottom}
            cta={{ ...cta, loading: messaging, onPress: handleMessage }}
            onOpenService={(nextServiceId) =>
              nextServiceId !== serviceId
                ? router.push({
                    pathname: '/services/[serviceId]',
                    params: {
                      ...(adminViewOnly ? { adminView: '1' } : {}),
                      serviceId: nextServiceId,
                    },
                  })
                : undefined
            }
            onViewWorkerProfile={handleViewWorkerProfile}
            service={serviceDetail}
            workerProfile={profile}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function PublicServiceDetailView({
  adminViewOnly = false,
  bottomInset,
  cta,
  onOpenService,
  onViewWorkerProfile,
  service,
  workerProfile,
}: {
  adminViewOnly?: boolean;
  bottomInset: number;
  cta: ReturnType<typeof getServiceCta> & { loading?: boolean; onPress: () => void };
  onOpenService?: (serviceId: string) => void;
  onViewWorkerProfile: () => void;
  service: ServiceDetail;
  workerProfile: PublicWorkerProfile | null;
}) {
  const imageUrl = getCardImageUrl({ imageUrl: service.photoUrls[0] });
  const displayCategory = getDisplayLabelForMvpService(service.category) || service.category;
  const title = formatServicePostTitle({
    title: getDisplayTitleForMvpService(service.title, service.category) || service.title,
    category: displayCategory,
  });
  const location = getMarketplaceLocation(service);
  const providerName =
    workerProfile?.fullName || service.provider?.fullName || 'Konektado resident';
  const providerLocation =
    workerProfile?.publicLocation || service.provider?.barangay || location;
  const providerAvatarUrl =
    workerProfile?.avatarUrl ?? getPublicProfileAvatarUrl(service.provider);
  const verified = Boolean(
    workerProfile?.barangayVerifiedAt ||
      workerProfile?.verifiedAt ||
      service.provider?.barangayVerifiedAt ||
      service.provider?.verifiedAt,
  );
  const otherServices = service.providerServices.filter((item) => item.id !== service.id);

  return (
    <View style={styles.publicScreen}>
      <ScrollView
        contentContainerStyle={[
          styles.publicContent,
          { paddingBottom: Math.max(bottomInset, 12) + (adminViewOnly ? 24 : 132) },
        ]}
        showsVerticalScrollIndicator={false}>
        {imageUrl ? <CachedRemoteImage uri={imageUrl} style={styles.publicHeroImage} /> : null}

        <View style={styles.publicSection}>
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, service.isActive ? styles.statusDotActive : styles.statusDotInactive]} />
            <Text style={styles.statusPillText}>{service.isActive ? 'Active service' : 'Inactive service'}</Text>
          </View>
          <Text style={styles.publicTitle}>{title}</Text>
          <View style={styles.publicMetaStack}>
            <PublicMeta icon="local-offer" text={formatServiceRate(service)} tint="primary" />
            <PublicMeta icon="event-available" text={service.rateNegotiable ? 'Rate negotiable' : 'Rate listed'} />
            <PublicMeta icon="category" text={displayCategory} />
            <PublicMeta icon="schedule" text={service.availabilityText || 'Availability to coordinate'} />
            <PublicMeta icon="location-on" text={location} />
          </View>
        </View>

        <View style={styles.publicSection}>
          <Text style={styles.publicSectionTitle}>About this service</Text>
          <Text style={styles.publicBody}>{service.description || 'No description provided yet.'}</Text>
        </View>

        <View style={styles.publicSection}>
          <Text style={styles.publicSectionTitle}>Service details</Text>
          <View style={styles.publicDetailGrid}>
            <PublicDetail label="Service" value={displayCategory} />
            <PublicDetail label="Experience" value={getExperienceLabel(service.experienceLevel)} />
            <PublicDetail
              label="Certification"
              value={service.certificationAvailable ? service.certificationNote || 'Available' : 'Not listed'}
            />
            <PublicDetail label="Messages" value={service.allowMessages ? 'On' : 'Off'} />
          </View>
        </View>

        {service.tags.length ? (
          <View style={styles.publicSection}>
            <Text style={styles.publicSectionTitle}>Tags</Text>
            <View style={styles.publicTagRow}>
              {service.tags.map((tag) => (
                <View key={tag} style={styles.publicTag}>
                  <Text numberOfLines={1} style={styles.publicTagText}>
                    {getDisplayLabelForMvpService(tag) || tag}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.publicSection}>
          <Text style={styles.publicSectionTitle}>Worker</Text>
          <View style={styles.workerTrustCard}>
            <View style={styles.workerTrustRow}>
              <WorkerAvatar imageUrl={providerAvatarUrl} name={providerName} />
              <View style={styles.workerTrustCopy}>
                <Text numberOfLines={1} style={styles.workerTrustName}>
                  {providerName}
                </Text>
                <View style={styles.workerTrustMetaRow}>
                  <MaterialIcons color={color.textSubtle} name="location-on" size={14} />
                  <Text numberOfLines={1} style={styles.workerTrustMeta}>
                    {providerLocation}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.workerTrustStats}>
              {verified ? (
                <View style={styles.workerVerifiedBadge}>
                  <MaterialIcons color="#2F7D32" name="verified" size={14} />
                  <Text style={styles.workerVerifiedText}>Verified</Text>
                </View>
              ) : null}
              <WorkerTrustPill icon="star-border" text={formatServiceRatingText(service)} />
              <WorkerTrustPill
                icon="check-circle"
                text={formatServiceJobsDoneText(service, service.completedJobsCount)}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={onViewWorkerProfile}
              style={({ pressed }) => [styles.workerProfileButton, pressed && styles.pressed]}>
              <MaterialIcons color={color.primary} name="person" size={16} />
              <Text style={styles.workerProfileButtonText}>View worker profile</Text>
            </Pressable>
          </View>
        </View>

        {otherServices.length ? (
          <View style={styles.publicSection}>
            <Text style={styles.publicSectionTitle}>Other services from this worker</Text>
            <View style={styles.otherServicesList}>
              {otherServices.slice(0, 3).map((item) => (
                <Pressable
                  accessibilityRole="button"
                  key={item.id}
                  onPress={() => onOpenService?.(item.id)}
                  style={({ pressed }) => [styles.otherServiceCard, pressed && styles.pressed]}>
                  <View style={styles.otherServiceCopy}>
                    <Text numberOfLines={2} style={styles.otherServiceTitle}>
                      {formatServicePostTitle({
                        title: getDisplayTitleForMvpService(item.title, item.category) || item.title,
                        category: getDisplayLabelForMvpService(item.category) || item.category,
                      })}
                    </Text>
                    <Text style={styles.otherServiceMeta}>{formatServiceRate(item)}</Text>
                  </View>
                  <MaterialIcons color={color.textSubtle} name="chevron-right" size={20} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.publicSection}>
          <Text style={styles.publicSectionTitle}>Safety note</Text>
          <View style={styles.safetyNote}>
            <MaterialIcons color={color.primary} name="info-outline" size={18} />
            <Text style={styles.safetyText}>
              Rate is for coordination. Payment and final agreement happen outside Konektado.
            </Text>
          </View>
        </View>
      </ScrollView>
      {adminViewOnly ? null : <PublicServiceCta bottomInset={bottomInset} cta={cta} />}
    </View>
  );
}

function OwnerServicePostView({
  bottomInset,
  onEdit,
  onPreviewPublicListing,
  onToggleActive,
  service,
  updating,
}: {
  bottomInset: number;
  onEdit: () => void;
  onPreviewPublicListing: () => void;
  onToggleActive: () => void;
  service: ServiceDetail;
  updating: boolean;
}) {
  const imageUrl = getCardImageUrl({ imageUrl: service.photoUrls[0] });

  return (
    <View style={styles.ownerScreen}>
      <ScrollView
        contentContainerStyle={[
          styles.ownerContent,
          { paddingBottom: Math.max(bottomInset, 12) + 24 },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.ownerHero}>
          {imageUrl ? <CachedRemoteImage uri={imageUrl} style={styles.ownerHeroImage} /> : null}
          <View style={styles.ownerHeroCopy}>
            <View style={styles.statusPill}>
              <View style={[styles.statusDot, service.isActive ? styles.statusDotActive : styles.statusDotInactive]} />
              <Text style={styles.statusPillText}>{service.isActive ? 'Active service' : 'Inactive service'}</Text>
            </View>
            <Text style={styles.ownerTitle}>
              {formatServicePostTitle({ title: service.title, category: service.category })}
            </Text>
            <Text style={styles.ownerMeta}>{formatServiceRate(service)}</Text>
          </View>
        </View>

        <View style={styles.ownerActions}>
          <OwnerActionButton icon="edit" label="Edit" onPress={onEdit} />
          <OwnerActionButton
            icon={service.isActive ? 'pause-circle' : 'play-circle'}
            label={updating ? 'Updating...' : service.isActive ? 'Deactivate' : 'Reactivate'}
            onPress={onToggleActive}
            disabled={updating}
          />
          <OwnerActionButton icon="person-search" label="Preview public listing" onPress={onPreviewPublicListing} />
        </View>

        <OwnerSection title="Service details">
          <OwnerDetail icon="category" label="Service" value={service.category} />
          <OwnerDetail icon="schedule" label="Availability" value={service.availabilityText || 'Availability to coordinate'} />
          <OwnerDetail icon="location-on" label="Location" value={getMarketplaceLocation(service)} />
          <OwnerDetail icon="trending-up" label="Experience" value={getExperienceLabel(service.experienceLevel)} />
        </OwnerSection>

        <OwnerSection title="Description">
          <Text style={styles.ownerBody}>{service.description || 'No description provided.'}</Text>
        </OwnerSection>

        <OwnerSection title="Helpful tags">
          {service.tags.length ? (
            <View style={styles.ownerTags}>
              {service.tags.map((tag) => (
                <View key={tag} style={styles.ownerTag}>
                  <Text style={styles.ownerTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.ownerMuted}>No tags added.</Text>
          )}
        </OwnerSection>

        <OwnerSection title="Listing options">
          <OwnerDetail icon="chat-bubble-outline" label="Messages" value={service.allowMessages ? 'On' : 'Off'} />
          <OwnerDetail icon="quickreply" label="Auto-reply" value={service.autoReplyEnabled ? 'On' : 'Off'} />
          <OwnerDetail icon="pause-circle" label="Pause when unavailable" value={service.autoPauseEnabled ? 'On' : 'Off'} />
        </OwnerSection>
      </ScrollView>
    </View>
  );
}

function OwnerSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <View style={styles.ownerSection}>
      <Text style={styles.ownerSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function OwnerDetail({
  icon,
  label,
  value,
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.ownerDetailRow}>
      <MaterialIcons color={color.textSubtle} name={icon} size={17} />
      <View style={styles.ownerDetailCopy}>
        <Text style={styles.ownerDetailLabel}>{label}</Text>
        <Text style={styles.ownerDetailValue}>{value}</Text>
      </View>
    </View>
  );
}

function OwnerActionButton({
  disabled,
  icon,
  label,
  onPress,
}: {
  disabled?: boolean;
  icon: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.ownerActionButton,
        disabled && styles.ownerActionDisabled,
        pressed && !disabled && styles.pressed,
      ]}>
      <MaterialIcons color={color.primary} name={icon} size={18} />
      <Text style={styles.ownerActionText}>{label}</Text>
    </Pressable>
  );
}

function getMessageService(profile: PublicWorkerProfile | null): ProviderService | null {
  if (!profile) return null;
  return profile.selectedService ?? profile.services[0] ?? null;
}

function getServiceCta({
  isOwnService,
  isVerified,
  service,
}: {
  isOwnService: boolean;
  isVerified: boolean;
  service: ProviderService | null;
}) {
  if (isOwnService) {
    return {
      disabled: true,
      helper: 'This is your service post.',
      label: 'This is your service',
      reason: 'own',
    };
  }

  if (!service) {
    return {
      disabled: true,
      helper: 'This service is no longer available.',
      label: 'Service unavailable',
      reason: 'no_service',
    };
  }

  if (!service.isActive) {
    return {
      disabled: true,
      helper: 'This service is not active right now.',
      label: 'Service inactive',
      reason: 'inactive',
    };
  }

  if (!service.allowMessages) {
    return {
      disabled: true,
      helper: 'This service is not accepting messages right now.',
      label: 'Messages unavailable',
      reason: 'messages_off',
    };
  }

  if (!isVerified) {
    return {
      disabled: false,
      helper: 'Complete barangay verification to message workers and clients.',
      label: 'Verify to message',
      reason: 'verification',
    };
  }

  return {
    disabled: false,
    helper: service.availabilityText ? null : 'Ask about availability in Messages.',
    label: 'Message worker',
    reason: 'available',
  };
}

function PublicServiceCta({
  bottomInset,
  cta,
}: {
  bottomInset: number;
  cta: ReturnType<typeof getServiceCta> & { loading?: boolean; onPress: () => void };
}) {
  return (
    <View style={[styles.publicCtaBar, { paddingBottom: 12 + Math.max(bottomInset, 12) }]}>
      <Text style={styles.publicCtaHelper}>
        {cta.helper || 'Messages are for coordination. Final agreement happens outside Konektado.'}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: cta.disabled || cta.loading }}
        disabled={cta.disabled || cta.loading}
        onPress={cta.onPress}
        style={({ pressed }) => [
          styles.publicCtaButton,
          (cta.disabled || cta.loading) && styles.publicCtaDisabled,
          pressed && !cta.disabled && !cta.loading && styles.pressed,
        ]}>
        <MaterialIcons color={cta.disabled ? color.textSubtle : color.primary} name="chat-bubble" size={17} />
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          numberOfLines={1}
          style={[styles.publicCtaButtonText, cta.disabled && styles.publicCtaButtonTextDisabled]}>
          {cta.loading ? 'Opening...' : cta.label}
        </Text>
      </Pressable>
    </View>
  );
}

function PublicMeta({
  icon,
  text,
  tint = 'default',
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  text: string;
  tint?: 'default' | 'primary';
}) {
  return (
    <View style={styles.publicMetaRow}>
      <MaterialIcons color={tint === 'primary' ? color.primary : color.textSubtle} name={icon} size={16} />
      <Text style={[styles.publicMetaText, tint === 'primary' && styles.publicMetaTextPrimary]}>{text}</Text>
    </View>
  );
}

function PublicDetail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.publicDetailItem}>
      <Text style={styles.publicDetailLabel}>{label}</Text>
      <Text style={styles.publicDetailValue}>{value}</Text>
    </View>
  );
}

function WorkerAvatar({ imageUrl, name }: { imageUrl?: string | null; name: string }) {
  return (
    <View style={styles.workerAvatar}>
      {imageUrl ? (
        <CachedRemoteImage uri={imageUrl} style={styles.workerAvatarImage} />
      ) : (
        <Text style={styles.workerAvatarText}>{getInitials(name)}</Text>
      )}
    </View>
  );
}

function WorkerTrustPill({
  icon,
  text,
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  text: string;
}) {
  return (
    <View style={styles.workerTrustPill}>
      <MaterialIcons color={icon === 'star-border' ? color.brandYellow : color.textSubtle} name={icon} size={14} />
      <Text numberOfLines={1} style={styles.workerTrustPillText}>
        {text}
      </Text>
    </View>
  );
}

function getInitials(name: string) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return initials || 'K';
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
  publicScreen: {
    backgroundColor: color.background,
    flex: 1,
  },
  publicContent: {
    backgroundColor: color.background,
  },
  publicHeroImage: {
    backgroundColor: color.cardTint,
    height: 238,
    width: '100%',
  },
  publicSection: {
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  publicTitle: {
    ...typography.screenTitle,
    color: color.text,
    fontSize: 24,
    lineHeight: 30,
  },
  publicMetaStack: {
    gap: 10,
  },
  publicMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  publicMetaText: {
    ...typography.caption,
    color: color.textMuted,
    flex: 1,
  },
  publicMetaTextPrimary: {
    ...typography.bodyMedium,
    color: color.primary,
  },
  publicSectionTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  publicBody: {
    ...typography.body,
    color: color.textMuted,
  },
  publicDetailGrid: {
    columnGap: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
  },
  publicDetailItem: {
    borderColor: color.border,
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    gap: 3,
    minHeight: 70,
    minWidth: 132,
    padding: 12,
  },
  publicDetailLabel: {
    ...typography.caption,
    color: color.textSubtle,
  },
  publicDetailValue: {
    ...typography.bodyMedium,
    color: color.text,
  },
  publicTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  publicTag: {
    backgroundColor: color.primarySoft,
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: 10,
  },
  publicTagText: {
    ...typography.captionMedium,
    color: color.primary,
  },
  workerTrustCard: {
    borderColor: color.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    padding: 14,
  },
  workerTrustRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  workerAvatar: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: 999,
    height: 52,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 52,
  },
  workerAvatarImage: {
    height: '100%',
    width: '100%',
  },
  workerAvatarText: {
    ...typography.bodyMedium,
    color: color.text,
  },
  workerTrustCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  workerTrustName: {
    ...typography.bodyMedium,
    color: color.text,
  },
  workerTrustMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minWidth: 0,
  },
  workerTrustMeta: {
    ...typography.caption,
    color: color.textMuted,
    flex: 1,
  },
  workerTrustStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  workerVerifiedBadge: {
    alignItems: 'center',
    backgroundColor: color.successSoft,
    borderColor: color.success,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 28,
    paddingHorizontal: 9,
  },
  workerVerifiedText: {
    ...typography.captionMedium,
    color: color.text,
  },
  workerTrustPill: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 28,
    maxWidth: '100%',
    paddingHorizontal: 9,
  },
  workerTrustPillText: {
    ...typography.caption,
    color: color.textMuted,
    flexShrink: 1,
  },
  workerProfileButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
  },
  workerProfileButtonText: {
    ...typography.bodyMedium,
    color: color.primary,
  },
  otherServicesList: {
    gap: 10,
  },
  otherServiceCard: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  otherServiceCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  otherServiceTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  otherServiceMeta: {
    ...typography.captionMedium,
    color: color.primary,
  },
  safetyNote: {
    alignItems: 'flex-start',
    backgroundColor: color.primarySoft,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  safetyText: {
    ...typography.caption,
    color: color.textMuted,
    flex: 1,
  },
  publicCtaBar: {
    backgroundColor: color.background,
    borderTopColor: color.border,
    borderTopWidth: 1,
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  publicCtaHelper: {
    ...typography.caption,
    color: color.textMuted,
  },
  publicCtaButton: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 42,
  },
  publicCtaDisabled: {
    backgroundColor: color.surfaceAlt,
  },
  publicCtaButtonText: {
    ...typography.bodyMedium,
    color: color.primary,
  },
  publicCtaButtonTextDisabled: {
    color: color.textSubtle,
  },
  ownerScreen: {
    backgroundColor: color.background,
    flex: 1,
  },
  ownerContent: {
    gap: 18,
    padding: 18,
  },
  ownerHero: {
    borderColor: color.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    overflow: 'hidden',
  },
  ownerHeroImage: {
    height: 220,
    width: '100%',
  },
  ownerHeroCopy: {
    gap: 8,
    padding: 16,
  },
  statusPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: color.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 28,
    paddingHorizontal: 10,
  },
  statusDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  statusDotActive: {
    backgroundColor: color.success,
  },
  statusDotInactive: {
    backgroundColor: color.warning,
  },
  statusPillText: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  ownerTitle: {
    ...typography.screenTitle,
    color: color.text,
    fontSize: 24,
    lineHeight: 30,
  },
  ownerMeta: {
    ...typography.bodyMedium,
    color: color.primary,
  },
  ownerActions: {
    gap: 10,
  },
  ownerActionButton: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  ownerActionDisabled: {
    opacity: 0.6,
  },
  ownerActionText: {
    ...typography.bodyMedium,
    color: color.primary,
  },
  ownerSection: {
    borderColor: color.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  ownerSectionTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  ownerBody: {
    ...typography.body,
    color: color.textMuted,
  },
  ownerMuted: {
    ...typography.caption,
    color: color.textMuted,
  },
  ownerDetailRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  ownerDetailCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  ownerDetailLabel: {
    ...typography.caption,
    color: color.textSubtle,
  },
  ownerDetailValue: {
    ...typography.bodyMedium,
    color: color.text,
  },
  ownerTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ownerTag: {
    backgroundColor: color.primarySoft,
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: 10,
  },
  ownerTagText: {
    ...typography.captionMedium,
    color: color.primary,
  },
  pressed: {
    opacity: 0.72,
  },
});
