import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import {
  PublicProfileHeader,
  PublicProfileSkeleton,
  PublicWorkerProfileView,
} from '@/components/public-profile/PublicProfiles';
import { color } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { emitConversationPreviewUpdate } from '@/services/conversation-preview-events';
import { startServiceConversation } from '@/services/conversation.service';
import {
  getCompletionModeForError,
  getCompletionTitleForMode,
  getProfileSetupGateMessage,
  isProfileCompletionRequiredError,
} from '@/services/profile-completion.service';
import { getServiceDetail } from '@/services/service-profile.service';
import { getPublicWorkerProfile } from '@/services/worker-profile.service';
import type { ProviderService, PublicWorkerProfile } from '@/types/marketplace.types';

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function ServicePublicWorkerProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile: currentProfile, loading: currentProfileLoading } = useProfile();
  const params = useLocalSearchParams<{ serviceId?: string | string[] }>();
  const serviceId = getParamValue(params.serviceId);
  const [profile, setProfile] = useState<PublicWorkerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messaging, setMessaging] = useState(false);

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
          setProfile(null);
          setLoading(false);
          return null;
        }

        return getPublicWorkerProfile(detailResult.data.providerId, { sourceServiceId: serviceId });
      })
      .then((workerResult) => {
        if (!active || !workerResult) return;

        if (workerResult.error) {
          setError(workerResult.error);
          setProfile(null);
        } else {
          setProfile(workerResult.data);
        }

        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError('Could not load this worker profile right now.');
        setProfile(null);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [serviceId]);

  const isVerified = Boolean(currentProfile?.barangay_verified_at || currentProfile?.verified_at);
  const isOwnProfile = Boolean(profile && currentProfile?.id === profile.id);
  const messageService = getMessageService(profile);
  const cta = getWorkerCta({
    isOwnProfile,
    isVerified,
    service: messageService,
  });

  const handleMessage = async () => {
    if (!profile) return;
    if (cta.disabled && cta.reason !== 'verification') return;

    if (!isVerified) {
      router.push('/verification');
      return;
    }

    if (!messageService) return;

    setMessaging(true);
    const result = await startServiceConversation({
      serviceId: messageService.id,
      message: `Hi, I am interested in "${messageService.title}". Are you available?`,
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

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <PublicProfileHeader onBack={() => router.back()} title="Worker Profile" />
        {loading || currentProfileLoading ? <PublicProfileSkeleton bottomInset={insets.bottom} /> : null}
        {!loading && error ? (
          <EmptyState description={error} icon="person-search" title="Could not load worker profile" />
        ) : null}
        {!loading && !error && !profile ? (
          <EmptyState
            description="This worker profile is no longer available."
            icon="person-search"
            title="Worker not found"
          />
        ) : null}
        {!loading && !currentProfileLoading && profile ? (
          <PublicWorkerProfileView
            bottomInset={insets.bottom}
            cta={{ ...cta, loading: messaging, onPress: handleMessage }}
            onOpenService={(nextServiceId) =>
              nextServiceId !== serviceId
                ? router.push({ pathname: '/services/[serviceId]', params: { serviceId: nextServiceId } })
                : undefined
            }
            profile={profile}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function getMessageService(profile: PublicWorkerProfile | null): ProviderService | null {
  if (!profile) return null;
  return profile.selectedService ?? profile.services[0] ?? null;
}

function getWorkerCta({
  isOwnProfile,
  isVerified,
  service,
}: {
  isOwnProfile: boolean;
  isVerified: boolean;
  service: ProviderService | null;
}) {
  if (isOwnProfile) {
    return {
      disabled: true,
      helper: 'This is your public worker profile.',
      label: 'This is your public worker profile',
      reason: 'own',
    };
  }

  if (!service) {
    return {
      disabled: true,
      helper: 'This worker has no active service to message about right now.',
      label: 'No active service',
      reason: 'no_service',
    };
  }

  if (!service.isActive || !service.allowMessages) {
    return {
      disabled: true,
      helper: 'This service is not accepting messages right now.',
      label: 'Messages unavailable',
      reason: 'unavailable',
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
    helper: null,
    label: 'Message worker',
    reason: 'available',
  };
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
});
