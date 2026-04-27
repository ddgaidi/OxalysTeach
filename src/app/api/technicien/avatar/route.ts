export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getTechnicienAvatarBucket,
  getTechnicienAvatarDisplayUrl,
  getTechnicienImageColumn,
  fileExtensionForMime,
  isImageFileLike,
  resolveImageContentType,
} from "@/src/lib/technicienStorage";

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value?.trim();
  const userRole = request.cookies.get("user_role")?.value;

  if (!userId || userRole !== "technician") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    return NextResponse.json(
      { error: "Configuration serveur : SUPABASE_SERVICE_ROLE_KEY requise pour l'upload." },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const bucket = getTechnicienAvatarBucket();

  const formData = await request.formData();
  const entry = formData.get("file");
  if (!isImageFileLike(entry)) {
    return NextResponse.json(
      { error: "Aucun fichier image valide reçu (format multipart / fichier manquant)." },
      { status: 400 },
    );
  }

  const { contentType, ok: typeOk } = resolveImageContentType(entry);
  if (!typeOk) {
    return NextResponse.json(
      { error: "Fichier non reconnu comme image (type MIME manquant ou extension non supportée)." },
      { status: 400 },
    );
  }

  if (entry.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Max 2MB" }, { status: 400 });
  }

  const ext = fileExtensionForMime(contentType, entry.name || "photo.jpg");
  const path = `${userId}.${ext}`;

  const buffer = Buffer.from(await entry.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: true,
  });

  if (uploadError) {
    console.error("[technicien/avatar] storage upload:", uploadError.message, { bucket, path });
    return NextResponse.json(
      { error: `Stockage: ${uploadError.message}. Vérifiez le bucket « ${bucket} » dans Supabase.` },
      { status: 500 },
    );
  }

  const imageField = getTechnicienImageColumn();
  const { data: updated, error: dbError } = await supabase
    .from("technicien")
    .update({ [imageField]: path })
    .eq("id", userId)
    .select("id");

  if (dbError) {
    console.error("[technicien/avatar] db update:", dbError.message);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  if (!updated?.length) {
    return NextResponse.json(
      {
        error:
          "Aucune ligne technicien mise à jour : l'identifiant de session ne correspond pas à un profil (vérifier la table technicien / colonne id).",
      },
      { status: 404 },
    );
  }

  const displayUrl = await getTechnicienAvatarDisplayUrl(supabase, path, bucket);

  return NextResponse.json({ ok: true, url: displayUrl });
}
