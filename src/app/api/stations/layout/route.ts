import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchRequestMember, memberCanUseFablab } from "@/src/lib/memberAccess";

type Body = {
  fablabId?: string;
  stations?: { id: number; nom: string }[];
};

/**
 * Met à jour `nom` et `placement` (1…n selon l'ordre du tableau) pour les lignes `station` du fablab.
 * Phase temporaire sur `placement` pour éviter les conflits de contrainte unique lors des permutations.
 */
export async function POST(req: NextRequest) {
  // Le dashboard envoie la liste ordonnee des stations modifiees.
  const body = (await req.json()) as Body;
  const { fablabId, stations } = body ?? {};

  if (!fablabId || typeof fablabId !== "string" || !Array.isArray(stations) || stations.length === 0) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  // Validation stricte avant toute ecriture en base.
  for (const s of stations) {
    if (!Number.isFinite(s.id) || typeof s.nom !== "string") {
      return NextResponse.json({ error: "Données station invalides" }, { status: 400 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  // Ecriture serveur avec service role si disponible.
  const supabase = createClient(supabaseUrl, serviceKey ?? anonKey);

  // Le membre doit appartenir au fablab modifie, sauf admin.
  const auth = await fetchRequestMember(supabase, req).catch((error) => {
    console.error("[stations/layout] membre query error:", error);
    return null;
  });

  if (!auth || !memberCanUseFablab(auth.member, fablabId)) {
    return NextResponse.json({ error: "Non autorisÃ©" }, { status: 403 });
  }

  // Phase temporaire : evite les collisions si `placement` a une contrainte unique.
  const tempBase = 1_000_000;

  // 1. Eloigne toutes les stations de leurs positions finales.
  for (let i = 0; i < stations.length; i++) {
    const { error } = await supabase
      .from("station")
      .update({ placement: tempBase + i })
      .eq("id", stations[i].id)
      .eq("fablab_id", fablabId);
    if (error) {
      console.error("[stations/layout] phase temp", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // 2. Applique l'ordre final et les nouveaux noms.
  for (let i = 0; i < stations.length; i++) {
    const s = stations[i];
    const nom = s.nom.trim() || "Station";
    const { error } = await supabase
      .from("station")
      .update({ nom, placement: i + 1 })
      .eq("id", s.id)
      .eq("fablab_id", fablabId);
    if (error) {
      console.error("[stations/layout] final", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
