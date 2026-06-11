import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/src/lib/supabaseAdmin";
import { fetchRequestMember, memberCanUseFablab } from "@/src/lib/memberAccess";
import { fetchFablabNameById, fetchPersonnelByFablabId } from "@/src/lib/personnel";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Endpoint specialise pour les sections qui n'ont besoin que des techniciens.
  const fablabId = req.nextUrl.searchParams.get("fablabId");

  if (!fablabId) {
    return NextResponse.json({ error: "fablabId manquant" }, { status: 400 });
  }

  // Client admin pour lire les donnees personnel meme sous RLS stricte.
  const supabase = createSupabaseAdminClient();
  const fablabName = await fetchFablabNameById(supabase, fablabId);

  // Meme controle d'acces que `/api/personnel`.
  const auth = await fetchRequestMember(supabase, req).catch((error) => {
    console.error("[API/techniciens] membre query error:", error);
    return null;
  });

  if (!auth || !memberCanUseFablab(auth.member, fablabId, fablabName)) {
    return NextResponse.json({ error: "Non autorise" }, { status: 403 });
  }

  // Le helper central garde la logique de fusion et de dedoublonnage.
  const { technicians } = await fetchPersonnelByFablabId(supabase, fablabId);

  return NextResponse.json({ technicians });
}
