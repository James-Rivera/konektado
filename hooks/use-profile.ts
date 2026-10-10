import type { User } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getMyUserPreferences } from '@/services/onboarding.service';
import { getSessionUser } from '@/services/session.service';
import { getLatestVerificationStatus } from '@/services/verification.service';
import type { UserPreferences } from '@/types/onboarding.types';
import type { VerificationStatus } from '@/types/verification.types';
import { supabase } from '@/utils/supabase';

type ProfileRealtimeChannel = ReturnType<typeof supabase.channel>;

const reportedRealtimeStatuses = new Set<string>();

function warnProfileRealtime(message: string, error?: unknown) {
  if (__DEV__) {
    console.warn(`[useProfile] ${message}`, error);
  }
}

function noteProfileRealtime(channelName: string, status: string, error?: unknown) {
  if (!__DEV__) return;

  const key = `${channelName}:${status}`;
  if (reportedRealtimeStatuses.has(key)) return;

  reportedRealtimeStatuses.add(key);
  console.debug(
    `[useProfile] Realtime ${status} for ${channelName}; profile fetch/poll fallback remains active.`,
    error,
  );
}

function getRealtimeTopic(channelName: string) {
  return `realtime:${channelName}`;
}

async function removeExistingProfileRealtimeChannels(channelName: string) {
  const topic = getRealtimeTopic(channelName);
  const existingChannels = supabase
    .getChannels()
    .filter((channel) => channel.topic === topic);

  await Promise.all(
    existingChannels.map((channel) =>
      supabase.removeChannel(channel).catch((error) => {
        warnProfileRealtime(`Could not remove stale channel ${channelName}.`, error);
      }),
    ),
  );
}

export type ProfileRecord = {
  id: string;
  email: string | null;
  role: string | null;
  active_role: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  birthdate: string | null;
  province: string | null;
  barangay: string | null;
  purok_sitio: string | null;
  street: string | null;
  subdivision_area: string | null;
  block_lot: string | null;
  house_number: string | null;
  landmark_note: string | null;
  street_address: string | null;
  city: string | null;
  preferred_contact_method: string | null;
  service_type: string | null;
  has_certifications: boolean | null;
  certification_status: string | null;
  phone: string | null;
  about: string | null;
  avatar_url: string | null;
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
  /** Latest verification request status; null when none was ever submitted. */
  latestVerificationStatus: VerificationStatus | null;
  loading: boolean;
  preferences: UserPreferences | null;
  profile: ProfileRecord | null;
  refresh: () => Promise<void>;
  user: User | null;
  version: number;
};

const PROFILE_FALLBACK_POLL_MS = 30000;
const ProfileContext = createContext<ProfileContextValue | null>(null);

type LoadOptions = {
  showLoading?: boolean;
};

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [latestVerificationStatus, setLatestVerificationStatus] = useState<VerificationStatus | null>(null);
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
  // True while the profile realtime channel is subscribed; the poll skips then.
  const realtimeSubscribedRef = useRef(false);

  const loadInternal = useCallback(async ({ showLoading = false }: LoadOptions = {}) => {
    if (inFlightRef.current) {
      pendingLoadRef.current = true;
      await loadPromiseRef.current;
      return;
    }
    inFlightRef.current = true;

    const loadPromise = (async () => {
      if (showLoading || !hasLoadedOnceRef.current) {
        setLoading(true);
      }
      setError(null);

      try {
        do {
          pendingLoadRef.current = false;

          // The local session, not `getUser()`: no Auth round trip before the
          // reads below can start (DEC-137). RLS still checks every query.
          const { error: sessionError, user: sessionUser } = await getSessionUser();

          if (!activeRef.current) return;

          if (sessionError || !sessionUser) {
            setAuthenticated(false);
            setUser(null);
            setProfile(null);
            setPreferences(null);
            setLatestVerificationStatus(null);
            setError(sessionError);
            return;
          }

          setAuthenticated(true);
          setUser(sessionUser);

          // Independent reads, so they share one round trip instead of three.
          const [
            { data, error: profileError },
            { data: providerData },
            preferencesResult,
            verificationResult,
          ] = await Promise.all([
            supabase
              .from('profiles')
              .select(
                'id, email, role, active_role, full_name, first_name, last_name, birthdate, province, barangay, purok_sitio, street, subdivision_area, block_lot, house_number, landmark_note, street_address, city, preferred_contact_method, phone, about, avatar_url, availability, verified_at, barangay_verified_at',
              )
              .eq('id', sessionUser.id)
              .maybeSingle(),
            supabase
              .from('provider_profiles')
              .select('service_type, has_certifications, certification_status')
              .eq('user_id', sessionUser.id)
              .maybeSingle(),
            getMyUserPreferences(),
            getLatestVerificationStatus(sessionUser.id),
          ]);

          if (!activeRef.current) return;

          if (profileError) {
            setProfile(null);
            setPreferences(null);
            setError(profileError.message);
            return;
          }

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
          setPreferences(preferencesResult.error ? null : preferencesResult.data);
          // Keep the last known status on a failed read rather than flashing a
          // pending resident back to "unverified".
          if (!verificationResult.error) setLatestVerificationStatus(verificationResult.data);
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

  const refresh = useCallback(async () => {
    await loadInternal();
  }, [loadInternal]);

  useEffect(() => {
    activeRef.current = true;
    void loadInternal({ showLoading: true });

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      // The mount load above already reads the initial session, so reloading
      // on INITIAL_SESSION ran the whole startup chain a second time. A token
      // refresh changes no profile data, so it does not reload either.
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;

      const shouldShowLoading =
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT' ||
        event === 'USER_UPDATED';

      void loadInternal({ showLoading: shouldShowLoading });
    });

    const appStateSubscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        void refresh();
      }
    });

    // Fallback only: while the realtime channel below is subscribed, it
    // already refreshes on every relevant change, so polling would just spend
    // mobile data re-reading the same rows every 30 seconds.
    const pollTimer = setInterval(() => {
      if (realtimeSubscribedRef.current) return;
      void refresh();
    }, PROFILE_FALLBACK_POLL_MS);

    return () => {
      activeRef.current = false;
      subscription?.subscription.unsubscribe();
      appStateSubscription.remove();
      clearInterval(pollTimer);
    };
  }, [loadInternal, refresh]);

  useEffect(() => {
    if (!user?.id) return undefined;

    let cancelled = false;
    let channel: ProfileRealtimeChannel | null = null;
    const channelName = `profile-cache-${user.id}`;

    const setupChannel = async () => {
      try {
        await removeExistingProfileRealtimeChannels(channelName);

        if (cancelled) return;

        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${user.id}`,
            },
            () => {
              void refresh();
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
              void refresh();
            },
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'client_profiles',
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              void refresh();
            },
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'user_preferences',
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              void refresh();
            },
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'verifications',
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              void refresh();
            },
          );

        channel.subscribe((status, error) => {
          if (cancelled) return;

          realtimeSubscribedRef.current = status === 'SUBSCRIBED';

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            noteProfileRealtime(channelName, status, error);
            void refresh();
          }
        });
      } catch (error) {
        if (cancelled) return;

        realtimeSubscribedRef.current = false;
        warnProfileRealtime(`Could not subscribe to ${channelName}.`, error);
        void refresh();
      }
    };

    void setupChannel();

    return () => {
      cancelled = true;
      realtimeSubscribedRef.current = false;

      if (!channel) return;

      const channelToRemove = channel;
      channel = null;
      void supabase.removeChannel(channelToRemove).catch((error) => {
        warnProfileRealtime(`Could not remove channel ${channelName}.`, error);
      });
    };
  }, [refresh, user?.id]);

  const value = useMemo(
    () => ({
      authenticated,
      error,
      latestVerificationStatus,
      loading,
      preferences,
      profile,
      refresh,
      user,
      version,
    }),
    [authenticated, error, latestVerificationStatus, loading, preferences, profile, refresh, user, version],
  );

  // `value` carries `refresh`, a useCallback that reads activeRef/inFlightRef/
  // pendingLoadRef to de-duplicate concurrent loads. react-hooks/refs flags any
  // ref-touching function passed into a call during render; here the call is
  // createElement, which only stores it on the context value. `refresh` runs
  // from effects and event handlers, never during render.
  // eslint-disable-next-line react-hooks/refs
  return createElement(ProfileContext.Provider, { value }, children);
}

export function useProfile() {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error('useProfile must be used inside ProfileProvider');
  }

  return context;
}
