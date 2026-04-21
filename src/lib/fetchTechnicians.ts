import { createClient } from "@supabase/supabase-js";

export interface TechnicianRecord {
  id: string;
  prenom: string;
  nom: string;
  image: string | null;
  fablab_id: string;
  created_at: string;
}

function buildSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, serviceKey ?? anonKey);
}

export async function fetchTechniciansByFablabId(
  fablabId: string,
): Promise<TechnicianRecord[]> {
  const supabase = buildSupabaseClient();

  const { data, error } = await supabase
    .from("technicien")
    .select("id, prenom, nom, image, fablab_id, created_at")
    .eq("fablab_id", fablabId)
    .order("nom", { ascending: true });

  if (error) {
    console.error("[fetchTechnicians] Supabase error:", error);
    return [];
  }

  return (data as TechnicianRecord[]) ?? [];
}
