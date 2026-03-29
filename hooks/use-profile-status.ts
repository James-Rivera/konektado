import { useEffect, useState } from "react";

import { supabase } from "@/utils/supabase";

export type ProfileStatus = {
  loading: boolean;
  authenticated: boolean;
  needsRole: boolean;
  needsProfile: boolean;
  needsCertificationReview: boolean;
  profile: {
    role?: string | null;
    full_name?: string | null;
    app_role?: string | null;
    certification_status?: string | null;
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

    const load = async () => {
      try {
        const { data: userResult, error: userError } =
          await supabase.auth.getUser();

        if (!active) return;

        if (userError || !userResult.user) {
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

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, full_name, app_role, certification_status")
          .eq("id", userResult.user.id)
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

        const needsRole = !profile?.role;
        const needsProfile = false;
        const needsCertificationReview = false;

        setState({
          loading: false,
          authenticated: true,
          needsRole,
          needsProfile,
          needsCertificationReview,
          profile: profile ?? null,
        });
      } catch (err) {
        if (!active) return;
        setState({
          loading: false,
          authenticated: false,
          needsRole: false,
          needsProfile: false,
          needsCertificationReview: false,
          profile: null,
        });
      }
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      active = false;
      sub?.subscription.unsubscribe();
    };
  }, []);

  return state;
}
