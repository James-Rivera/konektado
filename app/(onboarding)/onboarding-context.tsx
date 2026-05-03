import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import {
  emptyOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingProfile,
} from '@/services/onboarding.service';
import type { OnboardingDraft, OnboardingIntent, VerificationUpload } from '@/types/onboarding.types';

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

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(emptyOnboardingDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userMeta, setUserMeta] = useState<{ id: string; email: string | null } | null>(null);
  const [cachedRole, setCachedRole] = useState<OnboardingIntent | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const result = await loadOnboardingDraft();

      if (!active) return;

      if (result.error || !result.data) {
        Alert.alert('Not signed in', result.error ?? 'Please sign in again to continue.');
        setLoading(false);
        return;
      }

      setDraft(result.data.draft);
      setUserMeta({ id: result.data.userId, email: result.data.email });
      setCachedRole(result.data.intent);
      setLoading(false);
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  const updateDraft = useCallback((patch: Partial<OnboardingDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const setVerificationFiles = useCallback((files: VerificationUpload[]) => {
    setDraft((prev) => ({ ...prev, verificationFiles: files }));
  }, []);

  const saveProfile = useCallback(async () => {
    if (!userMeta || !cachedRole) {
      Alert.alert('Not signed in', 'Please sign in again to continue.');
      return false;
    }

    setSaving(true);
    const result = await saveOnboardingProfile({
      draft,
      email: userMeta.email,
      intent: cachedRole,
      userId: userMeta.id,
    });
    setSaving(false);

    if (result.error) {
      Alert.alert('Could not save profile', result.error);
      return false;
    }

    return true;
  }, [cachedRole, draft, userMeta]);

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
