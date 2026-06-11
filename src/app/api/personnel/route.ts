import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchRequestMember, memberCanUseFablab } from "@/src/lib/memberAccess";

export async function GET(req: NextRequest) {
  const fablabId = req.nextUrl.searchParams.get("fablabId");

  if (!fablabId) {
    return NextResponse.json({ error: "fablabId manquant" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey ?? anonKey);

  const auth = await fetchRequestMember(supabase, req).catch((error) => {
    console.error("[API/personnel] membre query error:", error);
    return null;
  });

  if (!auth || !memberCanUseFablab(auth.member, fablabId)) {
    return NextResponse.json({ error: "Non autorise" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("personnel_fablabs")
    .select("id, nom, prenom, matiere, email, image, role, fablab_id, created_at")
    .eq("fablab_id", fablabId)
    .in("role", ["professeur", "technicien"])
    .order("nom", { ascending: true });

  if (error) {
    console.error("[API/personnel] personnel_fablabs error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const professors = rows
    .filter((person) => person.role === "professeur")
    .map((person) => ({
      ...person,
      matiere: person.matiere ?? "Equipe pedagogique",
    }));
  const technicians = rows.filter((person) => person.role === "technicien");

  return NextResponse.json({
    professors,
    technicians,
  });
}
