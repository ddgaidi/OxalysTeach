import { createClient } from "@supabase/supabase-js";

// Cree un client Supabase serveur avec la cle service role.
// A utiliser uniquement dans les routes API cote serveur.
export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // On bloque explicitement si la cle admin manque pour eviter une operation sensible en mode degrade.
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  // Pas de session persistante pour un client admin partage sur une requete serveur.
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
