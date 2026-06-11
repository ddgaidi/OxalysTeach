import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeMemberRole } from "@/src/lib/roles";

type PersonnelFablabRow = {
  id: string;
  nom: string | null;
  prenom: string | null;
  matiere: string | null;
  email: string | null;
  image: string | null;
  role: string | null;
  fablab_id: string;
  created_at: string | null;
};

// Ligne issue de `membre`, utilisee pour completer le personnel quand l'ancienne table est incomplete.
type MemberPersonnelRow = {
  id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  image: string | null;
  role: string | null;
  fablab_ref: string | null;
};

export type ProfessorPersonnel = {
  id: string;
  nom: string;
  prenom: string;
  matiere: string;
  email: string;
  image: string | null;
  role: "professeur";
  fablab_id: string;
  created_at: string;
};

export type TechnicianPersonnel = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  image: string | null;
  role: "technicien";
  fablab_id: string;
  created_at: string;
};

export type FablabPersonnel = {
  professors: ProfessorPersonnel[];
  technicians: TechnicianPersonnel[];
};

function cleanText(value: string | null | undefined): string {
  // Evite d'exposer `null` ou des espaces parasites dans l'UI.
  return (value ?? "").trim();
}

function normalizeIdentity(value: string): string {
  // Cle de comparaison robuste pour dedoublonner les personnes.
  return value
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function identityKey(person: { id: string; role: string; email?: string | null; prenom: string; nom: string }): string {
  // Priorite a l'email, puis au nom complet, puis a l'id si aucune identite lisible.
  const email = normalizeIdentity(person.email ?? "");
  if (email) return `${person.role}:email:${email}`;
  const name = normalizeIdentity(`${person.prenom} ${person.nom}`);
  if (name) return `${person.role}:name:${name}`;
  return `${person.role}:id:${person.id}`;
}

function sortByName<T extends { nom: string; prenom: string }>(people: T[]): T[] {
  // Tri francais stable : nom puis prenom.
  return [...people].sort((a, b) => {
    const byLastName = a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" });
    if (byLastName !== 0) return byLastName;
    return a.prenom.localeCompare(b.prenom, "fr", { sensitivity: "base" });
  });
}

function dedupeByIdentity<T extends { id: string; role: string; email?: string | null; prenom: string; nom: string }>(
  people: T[],
): T[] {
  // Supprime les doublons entre `personnel_fablabs` et `membre`.
  const seen = new Set<string>();
  return people.filter((person) => {
    const key = identityKey(person);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function personnelRowToProfessor(row: PersonnelFablabRow): ProfessorPersonnel {
  // Projection de l'ancienne table personnel vers le format attendu par l'UI.
  return {
    id: row.id,
    nom: cleanText(row.nom),
    prenom: cleanText(row.prenom),
    matiere: cleanText(row.matiere) || "Equipe pedagogique",
    email: cleanText(row.email),
    image: row.image ?? null,
    role: "professeur",
    fablab_id: row.fablab_id,
    created_at: row.created_at ?? "",
  };
}

function personnelRowToTechnician(row: PersonnelFablabRow): TechnicianPersonnel {
  // Projection d'un technicien issu de `personnel_fablabs`.
  return {
    id: row.id,
    nom: cleanText(row.nom),
    prenom: cleanText(row.prenom),
    email: cleanText(row.email),
    image: row.image ?? null,
    role: "technicien",
    fablab_id: row.fablab_id,
    created_at: row.created_at ?? "",
  };
}

function memberRowToProfessor(row: MemberPersonnelRow, fablabId: string): ProfessorPersonnel {
  // Les membres n'ont pas toujours de matiere, on garde un libelle generique.
  return {
    id: row.id,
    nom: cleanText(row.nom),
    prenom: cleanText(row.prenom),
    matiere: "Equipe pedagogique",
    email: cleanText(row.email),
    image: row.image ?? null,
    role: "professeur",
    fablab_id: fablabId,
    created_at: "",
  };
}

function memberRowToTechnician(row: MemberPersonnelRow, fablabId: string): TechnicianPersonnel {
  // Projection d'un technicien rattache directement dans `membre`.
  return {
    id: row.id,
    nom: cleanText(row.nom),
    prenom: cleanText(row.prenom),
    email: cleanText(row.email),
    image: row.image ?? null,
    role: "technicien",
    fablab_id: fablabId,
    created_at: "",
  };
}

export async function fetchFablabNameById(
  supabase: SupabaseClient,
  fablabId: string,
): Promise<string | null> {
  // Sert aux controles d'acces qui acceptent parfois l'id ou le nom du fablab.
  const { data, error } = await supabase
    .from("fablab")
    .select("nom")
    .eq("id", fablabId)
    .maybeSingle();

  if (error) {
    console.error("[personnel] fablab query error:", error);
    return null;
  }

  return typeof data?.nom === "string" ? data.nom : null;
}

export async function fetchPersonnelByFablabId(
  supabase: SupabaseClient,
  fablabId: string,
): Promise<FablabPersonnel> {
  // Fusionne les deux sources de personnel en parallele pour reduire la latence.
  const [personnelResult, membersResult] = await Promise.all([
    supabase
      .from("personnel_fablabs")
      .select("id, nom, prenom, matiere, email, image, role, fablab_id, created_at")
      .eq("fablab_id", fablabId)
      .order("nom", { ascending: true }),
    supabase
      .from("membre")
      .select("id, nom, prenom, email, image, role, fablab_ref")
      .eq("fablab_ref", fablabId)
      .order("nom", { ascending: true }),
  ]);

  if (personnelResult.error) {
    console.error("[personnel] personnel_fablabs query error:", personnelResult.error);
  }

  if (membersResult.error) {
    console.error("[personnel] membre query error:", membersResult.error);
  }

  const personnelRows = ((personnelResult.data ?? []) as PersonnelFablabRow[])
    .filter((row) => {
      // On ne garde que les profils visibles dans OxalysTeach.
      const role = normalizeMemberRole(row.role);
      return role === "professor" || role === "technician";
    });

  const memberRows = ((membersResult.data ?? []) as MemberPersonnelRow[])
    .filter((row) => {
      // Meme filtre pour la table `membre`, qui peut contenir des etudiants.
      const role = normalizeMemberRole(row.role);
      return role === "professor" || role === "technician";
    });

  const professors = sortByName(dedupeByIdentity([
    // Les professeurs viennent d'abord de la table dediee, puis des membres rattaches.
    ...personnelRows
      .filter((row) => normalizeMemberRole(row.role) === "professor")
      .map(personnelRowToProfessor),
    ...memberRows
      .filter((row) => normalizeMemberRole(row.role) === "professor")
      .map((row) => memberRowToProfessor(row, fablabId)),
  ]));

  const technicians = sortByName(dedupeByIdentity([
    // Meme fusion pour les techniciens.
    ...personnelRows
      .filter((row) => normalizeMemberRole(row.role) === "technician")
      .map(personnelRowToTechnician),
    ...memberRows
      .filter((row) => normalizeMemberRole(row.role) === "technician")
      .map((row) => memberRowToTechnician(row, fablabId)),
  ]));

  return {
    professors,
    technicians,
  };
}
