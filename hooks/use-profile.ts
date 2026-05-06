import type { User } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/utils/supabase';

export type ProfileRecord = {
  id: string;
  email: string | null;
  role: string | null;
  active_role: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  birthdate: string | null;
  barangay: string | null;
  street_address: string | null;
  city: string | null;
  service_type: string | null;
  has_certifications: boolean | null;
  certification_status: string | null;
  phone: string | null;
  about: string | null;
  availability: string | null;
  verified_at: string | null;
  barangay_verified_at: string | null;
};

type ProviderProfileRecord = {
  service_type: string | null;
  has_certifications: boolean | null;
  certification_status: string | null;
};

type ProfileContextValue = {
  authenticated: boolean;
  error: string | null;
  loading: boolean;
  profile: ProfileRecord | null;
  refresh: () => Promise<void>;
  user: User | null;
  version: number;
};

const PROFILE_FALLBACK_POLL_MS = 30000;
const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const hasLoadedOnceRef = useRef(false);
  const activeRef = useRef(true);
  const inFlightRef = useRef(false);
  const pendingLoadRef = useRef(false);
  const loadPromiseRef = useRef<Promise<void> | null>(null);

  const load = useCallback(async () => {
    if (inFlightRef.current) {
      pendingLoadRef.current = true;
      await loadPromiseRef.current;
      return;
    }
    inFlightRef.current = true;

    const loadPromise = (async () => {
      if (!hasLoadedOnceRef.current) {
        setLoading(true);
      }
      setError(null);

      try {
        do {
          pendingLoadRef.current = false;

          const { data: userResult, error: userError } = await supabase.auth.getUser();

          if (!activeRef.current) return;

          if (userError || !userResult.user) {
            setAuthenticated(false);
            setUser(null);
            setProfile(null);
            setError(userError?.message ?? null);
            return;
          }

          setAuthenticated(true);
          setUser(userResult.user);

          const { data, error: profileError } = await supabase
            .from('profiles')
            .select(
              'id, email, role, active_role, full_name, first_name, last_name, birthdate, barangay, street_address, city, phone, about, availability, verified_at, barangay_verified_at',
            )
            .eq('id', userResult.user.id)
            .maybeSingle();

          if (!activeRef.current) return;

          if (profileError) {
            setProfile(null);
            setError(profileError.message);
            return;
          }

          const { data: providerData } = await supabase
            .from('provider_profiles')
            .select('service_type, has_certifications, certification_status')
            .eq('user_id', userResult.user.id)
            .maybeSingle();

          if (!activeRef.current) return;

          const base = data as Omit<
            ProfileRecord,
            'service_type' | 'has_certifications' | 'certification_status'
          > | null;
          const providerProfile = (providerData as ProviderProfileRecord | null) ?? null;

          setProfile(
            base
              ? {
                  ...base,
                  service_type: providerProfile?.service_type ?? null,
                  has_certifications: providerProfile?.has_certifications ?? null,
                  certification_status: providerProfile?.certification_status ?? null,
                }
              : null,
          );
        } while (pendingLoadRef.current && activeRef.current);
      } catch (loadError) {
        if (!activeRef.current) return;
        setError(loadError instanceof Error ? loadError.message : 'Could not load profile');
      } finally {
        if (activeRef.current) {
          hasLoadedOnceRef.current = true;
          setLoading(false);
          setVersion((current) => current + 1);
        }
        inFlightRef.current = false;
        loadPromiseRef.current = null;
      }
    })();

    loadPromiseRef.current = loadPromise;
    await loadPromise;
  }, []);

  useEffect(() => {
    activeRef.current = true;
    void load();

    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    const appStateSubscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        void load();
      }
    });

    const pollTimer = setInterval(() => {
      void load();
    }, PROFILE_FALLBACK_POLL_MS);

    return () => {
      activeRef.current = false;
      subscription?.subscription.unsubscribe();
      appStateSubscription.remove();
      clearInterval(pollTimer);
    };
  }, [load]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const channel = supabase
      .channel(`profile-cache-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
          void load();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'provider_profiles',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, user?.id]);

  const value = useMemo(
    () => ({
      authenticated,
      error,
      loading,
      profile,
      refresh: load,
      user,
      version,
    }),
    [authenticated, error, load, loading, profile, user, version],
  );

  return createElement(ProfileContext.Provider, { value }, children);
}

export function useProfile() {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error('useProfile must be used inside ProfileProvider');
  }

  return context;
}
