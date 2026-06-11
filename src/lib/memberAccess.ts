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

// Objet membre enrichi avec le role normalise utilise par le code applicatif.
export type AuthenticatedMember = MemberRoleRow & {
  appRole: MemberRole;
};

function withAppRole(row: MemberRoleRow): AuthenticatedMember {
  // Ajoute `appRole` sans perdre les champs bruts de la table `membre`.
  return {
    ...row,
    appRole: roleFromMember(row),
  };
}

export async function fetchMemberByAuthId(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<AuthenticatedMember | null> {
  // Recherche normale : `auth_id` pointe vers l'utilisateur Supabase Auth.
  const { data, error } = await supabase
    .from("membre")
    .select(MEMBER_SELECT)
    .eq("auth_id", authUserId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data) return withAppRole(data as MemberRoleRow);

  // Fallback pour les donnees anciennes ou `id` et `auth_id` peuvent coincider.
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
  // Les routes API recuperent l'identite depuis le cookie pose au login.
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
  // Autorise par id ou par nom de fablab pour couvrir les deux formats historiques.
  return (
    canUseTeach(member.appRole) &&
    (
      canAccessFablab(member.appRole, member.fablab_ref, fablabId) ||
      canAccessFablab(member.appRole, member.fablab_ref, fablabName)
    )
  );
}
