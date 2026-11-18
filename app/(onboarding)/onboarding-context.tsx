import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { AppState } from 'react-native';

import { RecoveryScreen } from '@/components/recovery-screen';
import { AppSplashScreen } from '@/components/app-splash-screen';
import {
  emptyOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingProfile,
} from '@/services/onboarding.service';
import { useProfile } from '@/hooks/use-profile';
import type { OnboardingDraft, OnboardingIntent, VerificationUpload } from '@/types/onboarding.types';
import { showAlert } from '@/utils/alert';

export type { OnboardingDraft, VerificationUpload };

export type OnboardingContextValue = {
  draft: OnboardingDraft;
  role: OnboardingIntent | null;
  updateDraft: (patch: Partial<OnboardingDraft>) => void;
  loading: boolean;
  saving: boolean;
  setVerificationFiles: (files: VerificationUpload[]) => void;
  saveProfile: () => Promise<boolean>;
};

export const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { refresh: refreshProfile } = useProfile();
  const [draft, setDraft] = useState<OnboardingDraft>(emptyOnboardingDraft);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const loadRequestRef = useRef(0);
  const [saving, setSaving] = useState(false);
  const [userMeta, setUserMeta] = useState<{ id: string; email: string | null } | null>(null);
  const [cachedRole, setCachedRole] = useState<OnboardingIntent | null>(null);
  const [needsRoleRecovery, setNeedsRoleRecovery] = useState(false);

  const loadDraft = useCallback(() => {
    const request = ++loadRequestRef.current;
    return loadOnboardingDraft()
      .catch(() => ({ data: null, error: 'Could not load details' }))
      .then((result) => {
        if (request !== loadRequestRef.current) return;

        if (result.error || !result.data) {
          setLoadError(true);
          setLoading(false);
          return;
        }
        setLoadError(false);
        setDraft(result.data.draft);
        setUserMeta({ id: result.data.userId, email: result.data.email });
        setCachedRole(result.data.intent);
        setNeedsRoleRecovery(!result.data.intent);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    void loadDraft();
    return () => { loadRequestRef.current += 1; };
  }, [loadDraft]);

  useEffect(() => {
    if (!loadError) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setLoading(true);
        void loadDraft();
      }
    });
    return () => subscription.remove();
  }, [loadDraft, loadError]);

  useEffect(() => {
    if (loading || !needsRoleRecovery) return;

    const routeSegments = [...segments] as string[];
    const currentPath =
      routeSegments[0] === '(onboarding)' && routeSegments[1]
        ? `/(onboarding)/${routeSegments[1]}`
        : '/(onboarding)';

    router.replace({
      pathname: '/(auth)/role',
      params: { returnTo: currentPath },
    });
  }, [loading, needsRoleRecovery, router, segments]);

  const updateDraft = useCallback((patch: Partial<OnboardingDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const setVerificationFiles = useCallback((files: VerificationUpload[]) => {
    setDraft((prev) => ({ ...prev, verificationFiles: files }));
  }, []);

  const saveProfile = useCallback(async () => {
    if (!userMeta || !cachedRole) {
      showAlert('Not signed in', 'Please sign in again to continue.');
      return false;
    }

    setSaving(true);

    try {
      const result = await saveOnboardingProfile({
        draft,
        email: userMeta.email,
        intent: cachedRole,
        userId: userMeta.id,
      });

      if (result.error) {
        showAlert('Could not save profile', result.error);
        return false;
      }

      await refreshProfile();
      return true;
    } finally {
      setSaving(false);
    }
  }, [cachedRole, draft, refreshProfile, userMeta]);

  const value = useMemo(
    () => ({
      role: cachedRole,
      draft,
      updateDraft,
      setVerificationFiles,
      loading,
      saving,
      saveProfile,
    }),
    [cachedRole, draft, loading, saving, saveProfile, setVerificationFiles, updateDraft],
  );

  if (loading || needsRoleRecovery) {
    return <AppSplashScreen />;
  }

  if (loadError) {
    return <RecoveryScreen retry={async () => {
      setLoading(true);
      await loadDraft();
    }} />;
  }

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within the OnboardingProvider');
  }
  return ctx;
}

// This file is a provider, not a route; export a noop component to satisfy Expo Router.
export default function OnboardingContextFile() {
  return null;
}
