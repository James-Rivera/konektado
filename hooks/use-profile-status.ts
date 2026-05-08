import { useCallback, useEffect, useRef, useState } from 'react';

import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/utils/supabase';

function isOnboardingIntent(role: string | null | undefined) {
  const normalized = (role ?? '').toLowerCase();
  return normalized === 'client' || normalized === 'provider' || normalized === 'both';
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

  const loadStatus = useCallback(async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;

    if (profileLoading) {
      setState((current) => ({ ...current, loading: true }));
      return;
    }

    if (!authenticated || !user) {
      hasLoadedStatusRef.current = true;
      setState({
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
      setState((current) => ({ ...current, loading: true }));
    }

    try {
      const [{ data: userRoles }, { data: preferences }] = await Promise.all([
        supabase
          .from('user_roles')
          .select('role, is_active')
          .eq('user_id', user.id)
          .order('is_active', { ascending: false })
          .limit(1),
        supabase
          .from('user_preferences')
          .select('intent, onboarding_completed_at')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (requestId !== loadRequestRef.current) return;

      const metadataRole = user.user_metadata?.role as string | null | undefined;
      const needsSignupPassword = user.user_metadata?.signup_password_required === true;
      const userRolesRole = userRoles && userRoles.length ? userRoles[0].role : null;
      const candidateRoleSource =
        profile?.active_role || profile?.role || userRolesRole || activeRoleFromIntent(metadataRole);
      const candidateRole = candidateRoleSource ? String(candidateRoleSource).toLowerCase() : null;
      const intentSource = preferences?.intent || metadataRole || candidateRole;
      const needsRole = !candidateRole;
      const isAdmin = isAdminRole(candidateRole);
      const hasName = Boolean(
        profile?.full_name?.trim() ||
          (profile?.first_name?.trim() && profile?.last_name?.trim()),
      );
      const hasCompletedTasteSetup = Boolean(preferences?.onboarding_completed_at);

      const needsProfile =
        !isAdmin && (!hasName || !hasCompletedTasteSetup || !isOnboardingIntent(intentSource));

      hasLoadedStatusRef.current = true;
      setState({
        loading: false,
        authenticated: true,
        needsRole,
        needsProfile,
        needsSignupPassword,
        needsCertificationReview: false,
        isAdmin,
        profile: profile ?? null,
      });
    } catch {
      if (requestId !== loadRequestRef.current) return;
      hasLoadedStatusRef.current = true;
      setState({
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
  }, [authenticated, profile, profileLoading, user]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus, version]);

  useEffect(() => {
    if (!authenticated || !user?.id) return undefined;

    const channel = supabase
      .channel(`profile-status-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void loadStatus();
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
          void loadStatus();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [authenticated, loadStatus, user?.id]);

  return state;
}
