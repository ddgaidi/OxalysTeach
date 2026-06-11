import { createClient } from "@supabase/supabase-js";
import { fetchPersonnelByFablabId } from "@/src/lib/personnel";

export interface TechnicianRecord {
  id: string;
  prenom: string;
  nom: string;
  image: string | null;
  fablab_id: string;
  created_at: string;
}

function buildSupabaseClient() {
  // Preferer la cle service en route serveur, avec fallback anon pour garder les lectures possibles.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, serviceKey ?? anonKey);
}

export async function fetchTechniciansByFablabId(
  fablabId: string,
): Promise<TechnicianRecord[]> {
  // Reutilise la fusion centrale du personnel puis ne renvoie que les champs utiles aux techniciens.
  const supabase = buildSupabaseClient();
  const { technicians } = await fetchPersonnelByFablabId(supabase, fablabId);

  return technicians.map((row) => ({
    id: row.id,
    prenom: row.prenom,
    nom: row.nom,
    image: row.image ?? null,
    fablab_id: row.fablab_id,
    created_at: row.created_at,
  }));
}
