import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getTechnicienAvatarBucket,
  getTechnicienAvatarDisplayUrl,
  getTechnicienImageColumn,
} from "@/src/lib/technicienStorage";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value?.trim();
  const userRole = request.cookies.get("user_role")?.value;

  if (userRole !== "technician" || !userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey ?? anonKey);
  const bucket = getTechnicienAvatarBucket();
  const imageCol = getTechnicienImageColumn();

  const { data, error } = await supabase
    .from("technicien")
    .select(`id, prenom, nom, ${imageCol}, fablab_id`)
    .eq("id", userId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const row = data as unknown as Record<string, unknown>;
  const rawImage = row[imageCol] as string | null;

  const image =
    rawImage != null
      ? await getTechnicienAvatarDisplayUrl(supabase, rawImage, bucket)
      : null;

  return NextResponse.json({ ...row, image });
}
