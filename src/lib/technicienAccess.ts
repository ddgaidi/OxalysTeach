import type { SupabaseClient } from "@supabase/supabase-js";

/** Vérifie que le technicien a bien accès à l’établissement (table de liaison). */
export async function isTechnicienInFablab(
  supabase: SupabaseClient,
  technicienId: string,
  fablabId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("technicien_fablabs")
    .select("id")
    .eq("technicien_id", technicienId)
    .eq("fablab_id", fablabId)
    .maybeSingle();

  return !error && data != null;
}
