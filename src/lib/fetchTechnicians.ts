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

  const { data: links, error: linkErr } = await supabase
    .from("technicien_fablabs")
    .select("technicien_id")
    .eq("fablab_id", fablabId);

  if (linkErr) {
    console.error("[fetchTechnicians] technicien_fablabs:", linkErr);
    return [];
  }
  if (!links?.length) {
    return [];
  }

  const ids = [...new Set(links.map((l) => l.technicien_id as string))];

  const { data, error } = await supabase
    .from("technicien")
    .select("id, prenom, nom, image, created_at")
    .in("id", ids)
    .order("nom", { ascending: true });

  if (error) {
    console.error("[fetchTechnicians] technicien:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    ...row,
    fablab_id: fablabId,
  })) as TechnicianRecord[];
}
