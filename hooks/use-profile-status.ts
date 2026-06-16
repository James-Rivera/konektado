import { type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';

import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/utils/supabase';

type ProfileStatusChannel = ReturnType<typeof supabase.channel>;
type ProfileStatusRealtimeListener = () => void;
type ProfileStatusRealtimeEntry = {
  channel: ProfileStatusChannel | null;
  channelName: string;
  closed: boolean;
  listeners: Set<ProfileStatusRealtimeListener>;
  setupPromise: Promise<void> | null;
  userId: string;
};

const profileStatusRealtimeByUser = new Map<string, ProfileStatusRealtimeEntry>();

function warnProfileStatusRealtime(message: string, error?: unknown) {
  if (__DEV__) {
    console.warn(`[useProfileStatus] ${message}`, error);
  }
}

function getRealtimeTopic(channelName: string) {
  return `realtime:${channelName}`;
}

async function removeExistingProfileStatusChannels(channelName: string) {
  const topic = getRealtimeTopic(channelName);
  const existingChannels = supabase
    .getChannels()
    .filter((channel) => channel.topic === topic);

  await Promise.all(
    existingChannels.map((channel) =>
      supabase.removeChannel(channel).catch((error) => {
        warnProfileStatusRealtime(`Could not remove stale channel ${channelName}.`, error);
      }),
    ),
  );
}

function notifyProfileStatusListeners(userId: string) {
  const entry = profileStatusRealtimeByUser.get(userId);
  if (!entry) return;

  for (const listener of Array.from(entry.listeners)) {
    try {
      listener();
    } catch (error) {
      warnProfileStatusRealtime(`Profile status listener failed for ${userId}.`, error);
    }
  }
}

async function setupProfileStatusRealtime(entry: ProfileStatusRealtimeEntry) {
  try {
    await removeExistingProfileStatusChannels(entry.channelName);

    if (
      entry.closed ||
      profileStatusRealtimeByUser.get(entry.userId) !== entry ||
      entry.listeners.size === 0
    ) {
      return;
    }

    const channel = supabase
      .channel(entry.channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${entry.userId}`,
        },
        () => {
          notifyProfileStatusListeners(entry.userId);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_preferences',
          filter: `user_id=eq.${entry.userId}`,
        },
        () => {
          notifyProfileStatusListeners(entry.userId);
        },
      );

    entry.channel = channel;
    channel.subscribe((status, error) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        warnProfileStatusRealtime(
          `Realtime subscription ${entry.channelName} reported ${status}.`,
          error,
        );
      }
    });
  } catch (error) {
    if (profileStatusRealtimeByUser.get(entry.userId) === entry) {
      entry.channel = null;
    }
    warnProfileStatusRealtime(`Could not subscribe to ${entry.channelName}.`, error);
  } finally {
    if (profileStatusRealtimeByUser.get(entry.userId) === entry) {
      entry.setupPromise = null;
    }
  }
}

function subscribeToProfileStatusRealtime(
  userId: string,
  listener: ProfileStatusRealtimeListener,
) {
  const channelName = `profile-status-${userId}`;
  let entry = profileStatusRealtimeByUser.get(userId);

  if (!entry) {
    entry = {
      channel: null,
      channelName,
      closed: false,
      listeners: new Set(),
      setupPromise: null,
      userId,
    };
    profileStatusRealtimeByUser.set(userId, entry);
    entry.setupPromise = setupProfileStatusRealtime(entry);
  }

  entry.listeners.add(listener);

  return () => {
    const currentEntry = profileStatusRealtimeByUser.get(userId);
    if (!currentEntry) return;

    currentEntry.listeners.delete(listener);
    if (currentEntry.listeners.size > 0) return;

    currentEntry.closed = true;
    profileStatusRealtimeByUser.delete(userId);

    const removeChannel = () => {
      if (!currentEntry.channel) return;

      const channel = currentEntry.channel;
      currentEntry.channel = null;
      void supabase.removeChannel(channel).catch((error) => {
        warnProfileStatusRealtime(`Could not remove channel ${currentEntry.channelName}.`, error);
      });
    };

    if (currentEntry.setupPromise) {
      void currentEntry.setupPromise.finally(removeChannel);
      return;
    }

    removeChannel();
  };
}

function isOnboardingIntent(role: string | null | undefined) {
  const normalized = (role ?? '').toLowerCase();
  return normalized === 'client' || normalized === 'provider';
}

function isAdminRole(role: string | null | undefined) {
  return (role ?? '').toLowerCase() === 'barangay_admin';
}

function activeRoleFromIntent(role: string | null | undefined): 'client' | 'provider' | null {
  const normalized = (role ?? '').toLowerCase();
  if (normalized === 'provider') return 'provider';
  if (normalized === 'client' || normalized === 'both') return 'client';
  return null;
}

export type ProfileStatus = {
  loading: boolean;
  authenticated: boolean;
  needsRole: boolean;
  needsProfile: boolean;
  needsSignupPassword: boolean;
  needsCertificationReview: boolean;
  isAdmin: boolean;
  profile: {
    role?: string | null;
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

export function useProfileStatus(): ProfileStatus {
  const {
    authenticated,
    loading: profileLoading,
    preferences,
    profile,
    user,
    version,
  } = useProfile();
  const [state, setState] = useState<ProfileStatus>({
    loading: true,
    authenticated: false,
    needsRole: false,
    needsProfile: false,
    needsSignupPassword: false,
    needsCertificationReview: false,
    isAdmin: false,
    profile: null,
  });
  const hasLoadedStatusRef = useRef(false);
  const loadRequestRef = useRef(0);
  const mountedRef = useRef(false);
  const setStatusState = useCallback((nextState: SetStateAction<ProfileStatus>) => {
    if (!mountedRef.current) return;
    setState(nextState);
  }, []);

  const loadStatus = useCallback(async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;

    if (!mountedRef.current) return;

    if (profileLoading) {
      setStatusState((current) => ({ ...current, loading: true }));
      return;
    }

    if (!authenticated || !user) {
      hasLoadedStatusRef.current = true;
      setStatusState({
        loading: false,
        authenticated: false,
        needsRole: false,
        needsProfile: false,
        needsSignupPassword: false,
        needsCertificationReview: false,
        isAdmin: false,
        profile: null,
      });
      return;
    }

    if (!hasLoadedStatusRef.current) {
      setStatusState((current) => ({ ...current, loading: true }));
    }

    try {
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role, is_active')
        .eq('user_id', user.id)
        .order('is_active', { ascending: false })
        .limit(1);

      if (!mountedRef.current || requestId !== loadRequestRef.current) return;

      const metadataRole = user.user_metadata?.role as string | null | undefined;
      const needsSignupPassword = user.user_metadata?.signup_password_required === true;
      const userRolesRole = userRoles && userRoles.length ? userRoles[0].role : null;
      const roleSources = [
        preferences?.intent,
        metadataRole,
        profile?.active_role,
        profile?.role,
        userRolesRole,
        activeRoleFromIntent(metadataRole),
      ];
      const candidateRole =
        roleSources.find((role) => isOnboardingIntent(role))?.toLowerCase() ?? null;
      const isAdmin = roleSources.some((role) => isAdminRole(role));
      const needsRole = !isAdmin && !candidateRole;
      const hasName = Boolean(
        profile?.full_name?.trim() ||
          (profile?.first_name?.trim() && profile?.last_name?.trim()),
      );
      const hasCompletedTasteSetup = Boolean(preferences?.onboardingCompletedAt);

      const needsProfile =
        !isAdmin && (!hasName || !hasCompletedTasteSetup || !candidateRole);

      hasLoadedStatusRef.current = true;
      setStatusState({
        loading: false,
        authenticated: true,
        needsRole,
        needsProfile,
        needsSignupPassword,
        needsCertificationReview: false,
        isAdmin,
        profile: profile ?? null,
      });
    } catch (error) {
      if (!mountedRef.current || requestId !== loadRequestRef.current) return;
      warnProfileStatusRealtime('Could not load profile status.', error);
      hasLoadedStatusRef.current = true;
      setStatusState({
        loading: false,
        authenticated: false,
        needsRole: false,
        needsProfile: false,
        needsSignupPassword: false,
        needsCertificationReview: false,
        isAdmin: false,
        profile: null,
      });
    }
  }, [authenticated, preferences, profile, profileLoading, setStatusState, user]);

  const loadStatusRef = useRef(loadStatus);

  useEffect(() => {
    loadStatusRef.current = loadStatus;
  }, [loadStatus]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      loadRequestRef.current += 1;
    };
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus, version]);

  useEffect(() => {
    if (!authenticated || !user?.id) return undefined;

    return subscribeToProfileStatusRealtime(user.id, () => {
      void loadStatusRef.current();
    });
  }, [authenticated, user?.id]);

  return state;
}
