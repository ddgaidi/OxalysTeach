import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchMemberByAuthId } from "@/src/lib/memberAccess";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Identifie le membre courant grace au cookie pose au login.
  const userId = request.cookies.get("user_id")?.value?.trim();

  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  // Le fallback anon garde l'endpoint fonctionnel en environnement local simple.
  const supabase = createClient(supabaseUrl, serviceKey ?? anonKey);

  // Cette route ne renvoie volontairement que l'identite minimale du technicien.
  const member = await fetchMemberByAuthId(supabase, userId).catch((error) => {
    console.error("[technicien/me] membre query error:", error);
    return null;
  });

  if (member?.appRole !== "technician") {
    return NextResponse.json({ error: "Non autorisÃ©" }, { status: 403 });
  }

  return NextResponse.json({
    id: member.id,
    prenom: member.prenom,
    nom: member.nom,
  });
}
