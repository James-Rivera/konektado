import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/utils/supabase";

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
};

type ProviderProfileRecord = {
  service_type: string | null;
  has_certifications: boolean | null;
  certification_status: string | null;
};

export function useProfile() {
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: userResult, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userResult.user) {
      setProfile(null);
      setLoading(false);
      setError(userError?.message ?? "Not signed in");
      return;
    }

    const { data, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, email, role, active_role, full_name, first_name, last_name, birthdate, barangay, street_address, city, phone, about, availability, verified_at",
      )
      .eq("id", userResult.user.id)
      .maybeSingle();

    if (profileError) {
      setProfile(null);
      setError(profileError.message);
    } else {
      const base = data as ProfileRecord;
      const { data: providerData } = await supabase
        .from("provider_profiles")
        .select("service_type, has_certifications, certification_status")
        .eq("user_id", userResult.user.id)
        .maybeSingle();

      const providerProfile =
        (providerData as ProviderProfileRecord | null) ?? null;
      setProfile({
        ...base,
        service_type: providerProfile?.service_type ?? null,
        has_certifications: providerProfile?.has_certifications ?? null,
        certification_status: providerProfile?.certification_status ?? null,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    load();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      if (active) {
        load();
      }
    });

    return () => {
      active = false;
      subscription?.subscription.unsubscribe();
    };
  }, [load]);

  return { profile, loading, error, refresh: load };
}
