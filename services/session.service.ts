import type { User } from '@supabase/supabase-js';

import { supabase } from '@/utils/supabase';

/**
 * The signed-in user from the locally stored session.
 *
 * `supabase.auth.getUser()` asks the Auth server on every call, which costs a
 * full round trip before the real query even starts, and several of those
 * stacked up on Home and Profile loads (DEC-137). `getSession()` reads the
 * stored session and only touches the network when the access token has
 * expired and must be refreshed.
 *
 * This is safe for client code because it only decides *which* rows to ask
 * for: every query still carries the access token, and RLS checks it on the
 * server. Keep `getUser()` where the app needs freshly validated account data,
 * such as the signup and OTP flows in `auth.service.ts`.
 */
export async function getSessionUser(): Promise<{ error: string | null; user: User | null }> {
  const { data, error } = await supabase.auth.getSession();

  if (error) return { error: error.message, user: null };
  return { error: null, user: data.session?.user ?? null };
}
