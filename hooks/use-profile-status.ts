import { useEffect, useState } from "react";

import { supabase } from "@/utils/supabase";

const CERT_RECOMMENDED_JOBS = new Set([
  "Electrician",
  "Plumber",
  "Construction Worker",
  "Mason",
  "PC Repair",
  "Carpenter",
  "Appliance Repair",
  "Welder",
  "Mechanic",
]);

type ProviderProfileSnapshot = {
  service_type: string | null;
  has_certifications: boolean | null;
};

function parseServiceTypes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isProviderRole(role: string | null | undefined): role is "provider" {
  return (role ?? "").toLowerCase() === "provider";
}

function isClientRole(role: string | null | undefined): role is "client" {
  return (role ?? "").toLowerCase() === "client";
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
          profile?.active_role || profile?.role || userRolesRole || metadataRole;
        const candidateRole = candidateRoleSource
          ? String(candidateRoleSource).toLowerCase()
          : null;
        const needsRole = !candidateRole;
        const hasName = Boolean(
          profile?.full_name?.trim() ||
          (profile?.first_name?.trim() && profile?.last_name?.trim()),
        );

        let needsProfile = !hasName;
        if (isClientRole(candidateRole)) {
          needsProfile = !hasName;
        } else if (isProviderRole(candidateRole)) {
          const { data: providerProfile } = await supabase
            .from("provider_profiles")
            .select("service_type, has_certifications")
            .eq("user_id", userResult.user.id)
            .maybeSingle();

          const providerSnapshot =
            (providerProfile as ProviderProfileSnapshot | null) ?? null;
          const hasServiceType = Boolean(providerSnapshot?.service_type?.trim());
          const selectedServices = parseServiceTypes(providerSnapshot?.service_type);
          const requiresCertificationDecision = selectedServices.some((service) =>
            CERT_RECOMMENDED_JOBS.has(service),
          );
          const hasCertificationDecision =
            providerSnapshot?.has_certifications !== null &&
            providerSnapshot?.has_certifications !== undefined;

          const providerComplete =
            hasName &&
            hasServiceType &&
            (!requiresCertificationDecision || hasCertificationDecision);
          needsProfile = !providerComplete;
        }

        const needsCertificationReview = false;

        // Heal missing active_role if we have any role source
        if (!profile?.active_role && candidateRole) {
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
