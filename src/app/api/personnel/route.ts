import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchTechniciansByFablabId } from "@/src/lib/fetchTechnicians";

export async function GET(req: NextRequest) {
  const fablabId = req.nextUrl.searchParams.get("fablabId");

  if (!fablabId) {
    return NextResponse.json({ error: "fablabId manquant" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey ?? anonKey);

  const [{ data: professors, error: profError }, technicians] = await Promise.all([
    supabase
      .from("professeur")
      .select("id, nom, prenom, matiere, email, fablab_id, created_at")
      .eq("fablab_id", fablabId)
      .order("nom", { ascending: true }),
    fetchTechniciansByFablabId(fablabId),
  ]);

  if (profError) console.error("[API/personnel] Professors error:", profError);

  return NextResponse.json({
    professors: professors ?? [],
    technicians,
  });
}
