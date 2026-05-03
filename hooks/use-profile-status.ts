import { useEffect, useState } from "react";

import { supabase } from "@/utils/supabase";

function isProviderRole(role: string | null | undefined): role is "provider" {
  return (role ?? "").toLowerCase() === "provider";
}

function isClientRole(role: string | null | undefined): role is "client" {
  return (role ?? "").toLowerCase() === "client";
}

function isOnboardingIntent(role: string | null | undefined) {
  const normalized = (role ?? "").toLowerCase();
  return normalized === "client" || normalized === "provider" || normalized === "both";
}

function activeRoleFromIntent(role: string | null | undefined): "client" | "provider" | null {
  const normalized = (role ?? "").toLowerCase();
  if (normalized === "provider") return "provider";
  if (normalized === "client" || normalized === "both") return "client";
  return null;
}

export type ProfileStatus = {
  loading: boolean;
  authenticated: boolean;
  needsRole: boolean;
  needsProfile: boolean;
  needsCertificationReview: boolean;
  profile: {
    role?: string | null;
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

export function useProfileStatus(): ProfileStatus {
  const [state, setState] = useState<ProfileStatus>({
    loading: true,
    authenticated: false,
    needsRole: false,
    needsProfile: false,
    needsCertificationReview: false,
    profile: null,
  });

  useEffect(() => {
    let active = true;
    let statusChannel: ReturnType<typeof supabase.channel> | null = null;
    let subscribedUserId: string | null = null;
    let inFlight = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const { data: userResult, error: userError } =
          await supabase.auth.getUser();

        if (!active) return;

        if (userError || !userResult.user) {
          if (statusChannel) {
            await supabase.removeChannel(statusChannel);
            statusChannel = null;
            subscribedUserId = null;
          }
          setState((prev) => ({
            ...prev,
            loading: false,
            authenticated: false,
            profile: null,
            needsRole: false,
            needsProfile: false,
          }));
          return;
        }

        if (!statusChannel || subscribedUserId !== userResult.user.id) {
          if (statusChannel) {
            await supabase.removeChannel(statusChannel);
          }

          subscribedUserId = userResult.user.id;
          statusChannel = supabase
            .channel(`profile-status-${userResult.user.id}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "profiles",
                filter: `id=eq.${userResult.user.id}`,
              },
              () => {
                load();
              },
            )
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "user_roles",
                filter: `user_id=eq.${userResult.user.id}`,
              },
              () => {
                load();
              },
            )
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "provider_profiles",
                filter: `user_id=eq.${userResult.user.id}`,
              },
              () => {
                load();
              },
            )
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "user_preferences",
                filter: `user_id=eq.${userResult.user.id}`,
              },
              () => {
                load();
              },
            )
            .subscribe();
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, active_role, full_name, first_name, last_name")
          .eq("id", userResult.user.id)
          .maybeSingle();

        const { data: userRoles } = await supabase
          .from("user_roles")
          .select("role, is_active")
          .eq("user_id", userResult.user.id)
          .order("is_active", { ascending: false })
          .limit(1);

        const { data: preferences } = await supabase
          .from("user_preferences")
          .select("intent, onboarding_completed_at")
          .eq("user_id", userResult.user.id)
          .maybeSingle();

        if (!active) return;

        if (profileError) {
          setState({
            loading: false,
            authenticated: true,
            needsRole: true,
            needsProfile: true,
            needsCertificationReview: false,
            profile: null,
          });
          return;
        }

        const metadataRole = (userResult.user.user_metadata as any)?.role as string | null;
        const userRolesRole = userRoles && userRoles.length ? userRoles[0].role : null;
        const candidateRoleSource =
          profile?.active_role || profile?.role || userRolesRole || activeRoleFromIntent(metadataRole);
        const candidateRole = candidateRoleSource ? String(candidateRoleSource).toLowerCase() : null;
        const intentSource = preferences?.intent || metadataRole || candidateRole;
        const needsRole = !candidateRole;
        const hasName = Boolean(
          profile?.full_name?.trim() ||
          (profile?.first_name?.trim() && profile?.last_name?.trim()),
        );
        const hasCompletedTasteSetup = Boolean(preferences?.onboarding_completed_at);

        const needsProfile = !hasName || !hasCompletedTasteSetup || !isOnboardingIntent(intentSource);

        const needsCertificationReview = false;

        // Heal missing active_role if we have any role source
        if (!profile?.active_role && (isClientRole(candidateRole) || isProviderRole(candidateRole))) {
          await supabase
            .from("profiles")
            .upsert({
              id: userResult.user.id,
              active_role: candidateRole,
              role: candidateRole,
            })
            .single();
        }

        setState({
          loading: false,
          authenticated: true,
          needsRole,
          needsProfile,
          needsCertificationReview,
          profile: profile ?? null,
        });
      } catch {
        if (!active) return;
        setState({
          loading: false,
          authenticated: false,
          needsRole: false,
          needsProfile: false,
          needsCertificationReview: false,
          profile: null,
        });
      } finally {
        inFlight = false;
      }
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    // Fallback polling keeps guard state fresh when realtime events are not enabled.
    pollTimer = setInterval(() => {
      load();
    }, 2000);

    return () => {
      active = false;
      sub?.subscription.unsubscribe();
      if (pollTimer) {
        clearInterval(pollTimer);
      }
      if (statusChannel) {
        supabase.removeChannel(statusChannel);
      }
    };
  }, []);

  return state;
}
