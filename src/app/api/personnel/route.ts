import { NextRequest, NextResponse } from "next/server";
import { fetchRequestMember, memberCanUseFablab } from "@/src/lib/memberAccess";
import { fetchFablabNameById, fetchPersonnelByFablabId } from "@/src/lib/personnel";
import { createSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const fablabId = req.nextUrl.searchParams.get("fablabId");

  if (!fablabId) {
    return NextResponse.json({ error: "fablabId manquant" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const fablabName = await fetchFablabNameById(supabase, fablabId);

  const auth = await fetchRequestMember(supabase, req).catch((error) => {
    console.error("[API/personnel] membre query error:", error);
    return null;
  });

  if (!auth || !memberCanUseFablab(auth.member, fablabId, fablabName)) {
    return NextResponse.json({ error: "Non autorise" }, { status: 403 });
  }

  const { professors, technicians } = await fetchPersonnelByFablabId(supabase, fablabId);

  return NextResponse.json({
    professors,
    technicians,
  });
}
