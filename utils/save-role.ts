import { supabase } from '@/utils/supabase';

export type AppRole = 'client' | 'provider';

export async function saveUserRole({
  email,
  role,
  userId,
}: {
  email?: string | null;
  role: AppRole;
  userId: string;
}) {
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: userId, email, role, active_role: role });

  if (profileError) {
    return profileError;
  }

  const { error: rolesError } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role, is_active: true }, { onConflict: 'user_id,role' });

  if (rolesError) {
    return rolesError;
  }

  const { error: deactivateError } = await supabase
    .from('user_roles')
    .update({ is_active: false })
    .eq('user_id', userId)
    .neq('role', role);

  return deactivateError;
}
