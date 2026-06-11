export type MemberRole = "student" | "professor" | "technician" | "admin";
export type DbMemberRole = "etudiant" | "professeur" | "technicien" | "administrateur";

export type MemberRoleRow = {
  id: string;
  auth_id: string | null;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  telephone?: string | null;
  image?: string | null;
  role: DbMemberRole | MemberRole | string | null;
  fablab_ref: string | null;
};

export function normalizeMemberRole(role: string | null | undefined): MemberRole {
  switch (role) {
    case "administrateur":
    case "admin":
      return "admin";
    case "technicien":
    case "technician":
      return "technician";
    case "professeur":
    case "professor":
      return "professor";
    case "etudiant":
    case "student":
    default:
      return "student";
  }
}

export function roleFromMember(member: Pick<MemberRoleRow, "role">): MemberRole {
  return normalizeMemberRole(member.role);
}

export function dbRoleFromMemberRole(role: MemberRole): DbMemberRole {
  switch (role) {
    case "admin":
      return "administrateur";
    case "technician":
      return "technicien";
    case "professor":
      return "professeur";
    case "student":
    default:
      return "etudiant";
  }
}

export function canUseTeach(role: string | null | undefined) {
  const normalized = normalizeMemberRole(role);
  return normalized === "professor" || normalized === "technician" || normalized === "admin";
}

export function canUseMonitor(role: string | null | undefined) {
  const normalized = normalizeMemberRole(role);
  return normalized === "technician" || normalized === "admin";
}

export function canReviewCertifications(role: string | null | undefined) {
  return canUseTeach(role);
}

export function canAccessFablab(
  role: string | null | undefined,
  memberFablabId: string | null | undefined,
  fablabId: string | null | undefined,
) {
  const normalized = normalizeMemberRole(role);
  if (normalized === "admin") return true;
  if (!fablabId || !memberFablabId) return false;
  return canUseTeach(normalized) && memberFablabId === fablabId;
}
