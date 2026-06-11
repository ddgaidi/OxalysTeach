import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import {
  canAccessFablab,
  canUseTeach,
  roleFromMember,
  type MemberRole,
  type MemberRoleRow,
} from "@/src/lib/roles";

const MEMBER_SELECT = "id, auth_id, prenom, nom, email, telephone, image, role, fablab_ref";

export type AuthenticatedMember = MemberRoleRow & {
  appRole: MemberRole;
};

function withAppRole(row: MemberRoleRow): AuthenticatedMember {
  return {
    ...row,
    appRole: roleFromMember(row),
  };
}

export async function fetchMemberByAuthId(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<AuthenticatedMember | null> {
  const { data, error } = await supabase
    .from("membre")
    .select(MEMBER_SELECT)
    .eq("auth_id", authUserId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data) return withAppRole(data as MemberRoleRow);

  const fallback = await supabase
    .from("membre")
    .select(MEMBER_SELECT)
    .eq("id", authUserId)
    .maybeSingle();

  if (fallback.error) throw new Error(fallback.error.message);
  return fallback.data ? withAppRole(fallback.data as MemberRoleRow) : null;
}

export async function fetchRequestMember(
  supabase: SupabaseClient,
  request: NextRequest,
): Promise<{ authUserId: string; member: AuthenticatedMember } | null> {
  const authUserId = request.cookies.get("user_id")?.value?.trim();
  if (!authUserId) return null;

  const member = await fetchMemberByAuthId(supabase, authUserId);
  return member ? { authUserId, member } : null;
}

export function memberCanUseFablab(
  member: AuthenticatedMember,
  fablabId: string,
  fablabName?: string | null,
) {
  return (
    canUseTeach(member.appRole) &&
    (
      canAccessFablab(member.appRole, member.fablab_ref, fablabId) ||
      canAccessFablab(member.appRole, member.fablab_ref, fablabName)
    )
  );
}
