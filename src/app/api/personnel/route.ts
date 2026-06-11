import { NextRequest, NextResponse } from "next/server";
import { fetchRequestMember, memberCanUseFablab } from "@/src/lib/memberAccess";
import { fetchFablabNameById, fetchPersonnelByFablabId } from "@/src/lib/personnel";
import { createSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Le dashboard demande le personnel d'un fablab precis via query string.
  const fablabId = req.nextUrl.searchParams.get("fablabId");

  if (!fablabId) {
    return NextResponse.json({ error: "fablabId manquant" }, { status: 400 });
  }

  // Client admin necessaire pour fusionner `personnel_fablabs` et `membre`.
  const supabase = createSupabaseAdminClient();
  const fablabName = await fetchFablabNameById(supabase, fablabId);

  // Controle que le membre connecte peut consulter ce fablab.
  const auth = await fetchRequestMember(supabase, req).catch((error) => {
    console.error("[API/personnel] membre query error:", error);
    return null;
  });

  if (!auth || !memberCanUseFablab(auth.member, fablabId, fablabName)) {
    return NextResponse.json({ error: "Non autorise" }, { status: 403 });
  }

  // Renvoie les deux listes dans une seule reponse pour eviter deux appels cote client.
  const { professors, technicians } = await fetchPersonnelByFablabId(supabase, fablabId);

  return NextResponse.json({
    professors,
    technicians,
  });
}
