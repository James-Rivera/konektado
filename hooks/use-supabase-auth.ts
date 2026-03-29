import { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { supabase } from "@/utils/supabase";

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setSession(data.session ?? null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_, nextSession) => {
        if (!isMounted) return;
        setSession(nextSession);
      },
    );

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}
