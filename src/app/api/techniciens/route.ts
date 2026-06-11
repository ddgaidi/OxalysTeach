import { NextRequest, NextResponse } from "next/server";
import { fetchTechniciansByFablabId } from "@/src/lib/fetchTechnicians";
import { createSupabaseAdminClient } from "@/src/lib/supabaseAdmin";
import { fetchRequestMember, memberCanUseFablab } from "@/src/lib/memberAccess";

export async function GET(req: NextRequest) {
  const fablabId = req.nextUrl.searchParams.get("fablabId");

  if (!fablabId) {
    return NextResponse.json({ error: "fablabId manquant" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const auth = await fetchRequestMember(supabase, req).catch((error) => {
    console.error("[API/techniciens] membre query error:", error);
    return null;
  });

  if (!auth || !memberCanUseFablab(auth.member, fablabId)) {
    return NextResponse.json({ error: "Non autorise" }, { status: 403 });
  }

  const technicians = await fetchTechniciansByFablabId(fablabId);

  return NextResponse.json({ technicians });
}
