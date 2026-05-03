import type { AppRole, OnboardingIntent } from "@/types/onboarding.types";
import { supabase } from "@/utils/supabase";

export type { AppRole, OnboardingIntent };

export async function saveUserRole({
  activeRole,
  email,
  role,
  userId,
}: {
  activeRole?: AppRole;
  email?: string | null;
  role: OnboardingIntent;
  userId: string;
}) {
  const selectedActiveRole = activeRole ?? role;
  const roles: AppRole[] = [role];

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      email,
      role: selectedActiveRole,
      active_role: selectedActiveRole,
    });

  if (profileError) {
    return profileError;
  }

  for (const nextRole of roles) {
    const { error: rolesError } = await supabase
      .from("user_roles")
      .upsert(
        {
          user_id: userId,
          role: nextRole,
          is_active: nextRole === selectedActiveRole,
        },
        { onConflict: "user_id,role" },
      );

    if (rolesError) {
      return rolesError;
    }
  }

  const { error: deactivateError } = await supabase
    .from("user_roles")
    .update({ is_active: false })
    .eq("user_id", userId)
    .neq("role", selectedActiveRole);

  return deactivateError;
}
