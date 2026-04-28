import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = {
  fablabId?: string;
  stations?: { id: number; nom: string }[];
};

/**
 * Met à jour `nom` et `placement` (1…n selon l'ordre du tableau) pour les lignes `station` du fablab.
 * Phase temporaire sur `placement` pour éviter les conflits de contrainte unique lors des permutations.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const { fablabId, stations } = body ?? {};

  if (!fablabId || typeof fablabId !== "string" || !Array.isArray(stations) || stations.length === 0) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  for (const s of stations) {
    if (!Number.isFinite(s.id) || typeof s.nom !== "string") {
      return NextResponse.json({ error: "Données station invalides" }, { status: 400 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey ?? anonKey);

  const tempBase = 1_000_000;

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
