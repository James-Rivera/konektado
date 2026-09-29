import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import {
  PublicClientProfileView,
  PublicProfileHeader,
  PublicProfileSkeleton,
} from '@/components/public-profile/PublicProfiles';
import { color } from '@/constants/theme';
import { useAdminViewOnly } from '@/hooks/use-admin-view-only';
import { useProfile } from '@/hooks/use-profile';
import { useVerificationGate } from '@/hooks/use-verification-gate';
import { startJobConversation } from '@/services/conversation.service';
import { emitConversationPreviewUpdate } from '@/services/conversation-preview-events';
import { getPublicClientProfile } from '@/services/client-profile.service';
import {
  getCompletionModeForError,
  getCompletionTitleForMode,
  getProfileSetupGateMessage,
  isProfileCompletionRequiredError,
} from '@/services/profile-completion.service';
import type { JobSummary, PublicClientProfile } from '@/types/marketplace.types';
import { showAlert } from '@/utils/alert';
import type { VerificationGateCopy } from '@/utils/verification-gate';

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function PublicClientProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile: currentProfile, loading: currentProfileLoading } = useProfile();
  const params = useLocalSearchParams<{
    adminView?: string | string[];
    clientId?: string | string[];
    sourceJobId?: string | string[];
  }>();
  const clientId = getParamValue(params.clientId);
  const sourceJobId = getParamValue(params.sourceJobId);
  const { adminViewOnly, adminViewRequested } = useAdminViewOnly(params.adminView);
  const [profile, setProfile] = useState<PublicClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messaging, setMessaging] = useState(false);

  useEffect(() => {
    let active = true;

    if (!clientId) {
      setLoading(false);
      setError('Client profile not found.');
      return;
    }

    setLoading(true);
    setError(null);
    getPublicClientProfile(clientId, { sourceJobId }).then((result) => {
      if (!active) return;

      if (result.error) {
        setError(result.error);
        setProfile(null);
      } else {
        setProfile(result.data);
      }

      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [clientId, sourceJobId]);

  const { getCopy: getGateCopy, requireVerified } = useVerificationGate();
  const isOwnProfile = Boolean(profile && currentProfile?.id === profile.id);
  const messageJob = getMessageJob(profile);
  const cta = getClientCta({
    isOwnProfile,
    gateCopy: getGateCopy('message'),
    job: messageJob,
  });

  const handleMessage = async () => {
    if (!profile) return;
    if (cta.disabled && cta.reason !== 'verification') return;

    if (!requireVerified('message')) return;

    if (!messageJob) return;

    setMessaging(true);
    const result = await startJobConversation({
      jobId: messageJob.id,
      message: `Hi, I am interested in "${messageJob.title}". Is this job still available?`,
    });
    setMessaging(false);

    if (result.error || !result.data) {
      if (isProfileCompletionRequiredError(result.error)) {
        const mode = getCompletionModeForError(result.error) ?? 'work';
        showAlert(getCompletionTitleForMode(mode), getProfileSetupGateMessage(), [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Complete profile',
            onPress: () => router.push({ pathname: '/profile/complete' as never, params: { mode } }),
          },
        ]);
        return;
      }

      showAlert('Message client', result.error ?? 'Could not open the conversation.');
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
        <PublicProfileHeader onBack={() => router.back()} title="Client Profile" />
        {loading || currentProfileLoading ? (
          <PublicProfileSkeleton bottomInset={insets.bottom} showCta={!adminViewRequested} />
        ) : null}
        {!loading && error ? (
          <EmptyState description={error} icon="person-search" title="Could not load client profile" />
        ) : null}
        {!loading && !error && !profile ? (
          <EmptyState
            description="This profile can’t be viewed right now. Profiles appear here once barangay verification is complete."
            icon="person-search"
            title="Profile not available"
          />
        ) : null}
        {!loading && !currentProfileLoading && profile ? (
          <PublicClientProfileView
            adminViewOnly={adminViewOnly}
            bottomInset={insets.bottom}
            cta={{ ...cta, loading: messaging, onPress: handleMessage }}
            onOpenJob={(jobId) =>
              router.push({
                pathname: '/job/[jobId]',
                params: {
                  ...(adminViewOnly ? { adminView: '1' } : {}),
                  jobId,
                },
              })
            }
            profile={profile}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function getMessageJob(profile: PublicClientProfile | null): JobSummary | null {
  if (!profile) return null;
  return profile.selectedJob ?? profile.activeJobs[0] ?? null;
}

function getClientCta({
  isOwnProfile,
  gateCopy,
  job,
}: {
  isOwnProfile: boolean;
  gateCopy: VerificationGateCopy | null;
  job: JobSummary | null;
}) {
  if (isOwnProfile) {
    return {
      disabled: true,
      helper: 'This is your public hiring profile.',
      label: 'This is your public hiring profile',
      reason: 'own',
    };
  }

  if (!job) {
    return {
      disabled: true,
      helper: 'This client has no active job to message about right now.',
      label: 'No active job',
      reason: 'no_job',
    };
  }

  if (!['open', 'reviewing'].includes(job.status) || !job.allowMessages) {
    return {
      disabled: true,
      helper: 'This job is not accepting messages right now.',
      label: 'Messages unavailable',
      reason: 'unavailable',
    };
  }

  if (gateCopy) {
    return {
      disabled: false,
      helper: gateCopy.helper,
      label: gateCopy.ctaLabel,
      reason: 'verification',
    };
  }

  return {
    disabled: false,
    helper: null,
    label: 'Message client',
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
