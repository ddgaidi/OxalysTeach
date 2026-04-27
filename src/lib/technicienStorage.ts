import type { SupabaseClient } from "@supabase/supabase-js";

const SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7;

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Bucket Storage Supabase (doit exister, même nom côté dashboard Storage). Surchargé via l’env si besoin. */
export function getTechnicienAvatarBucket(): string {
  const b = process.env.SUPABASE_TECHNICIEN_AVATAR_BUCKET?.trim();
  return b && b.length > 0 ? b : "technicien";
}

/** Colonne en base (ex. `image`, `avatar`, `avatar_url`). */
export function getTechnicienImageColumn(): string {
  const c = process.env.SUPABASE_TECHNICIEN_IMAGE_FIELD?.trim() || "image";
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(c)) {
    return "image";
  }
  return c;
}

/**
 * Colonne `image` : clé d’objet (ex. `uuid.jpg`) ou URL publique / signée héritée.
 */
export function technicienObjectPathFromImageColumn(
  stored: string | null | undefined,
  bucket: string = getTechnicienAvatarBucket(),
): string | null {
  if (stored == null || typeof stored !== "string") return null;
  const s = stored.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) {
    return s.replace(/^\//, "");
  }
  const b = escapeRegExp(bucket);
  const publicMatch = s.match(new RegExp(`/object/public/${b}/(.+?)(?:\\?|$)`));
  if (publicMatch) return decodeURIComponent(publicMatch[1].replace(/\+/g, " "));
  const signMatch = s.match(new RegExp(`/object/sign/${b}/(.+?)(?:\\?|$)`));
  if (signMatch) return decodeURIComponent(signMatch[1].replace(/\+/g, " "));
  return null;
}

export async function getTechnicienAvatarDisplayUrl(
  supabase: SupabaseClient,
  imageColumn: string | null,
  bucket: string = getTechnicienAvatarBucket(),
): Promise<string | null> {
  if (imageColumn == null || !String(imageColumn).trim()) return null;

  const objectPath = technicienObjectPathFromImageColumn(imageColumn, bucket);
  if (objectPath) {
    const { data: signed, error: signErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectPath, SIGNED_URL_TTL_SEC);
    if (!signErr && signed?.signedUrl) {
      return signed.signedUrl;
    }

    // Bucket public ou échec signature : URL directe (fonctionne si le bucket est public)
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(objectPath);
    if (pub?.publicUrl) {
      return pub.publicUrl;
    }
  }

  const trimmed = String(imageColumn).trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function isImageFileLike(
  v: FormDataEntryValue | null,
): v is { arrayBuffer: () => Promise<ArrayBuffer>; type: string; name?: string; size: number } {
  if (v == null || typeof v === "string") return false;
  if (typeof Blob !== "undefined" && v instanceof Blob) return true;
  return (
    typeof v === "object" &&
    v !== null &&
    "arrayBuffer" in v &&
    typeof (v as Blob).arrayBuffer === "function"
  );
}

function extFromName(name: string | undefined): string | null {
  if (!name) return null;
  const m = name.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : null;
}

/** MIME image ou, si vide, extension du nom de fichier (certains OS n’envoient pas de type). */
export function resolveImageContentType(
  file: Pick<Blob, "type"> & { name?: string },
): { contentType: string; ok: boolean } {
  const raw = file.type?.trim() ?? "";
  if (raw.startsWith("image/")) {
    return { contentType: raw, ok: true };
  }
  const ext = extFromName("name" in file ? file.name : undefined);
  if (!ext) return { contentType: "application/octet-stream", ok: false };
  if (/^(jpe?g|png|gif|webp|heic|heif)$/i.test(ext)) {
    const map: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      heic: "image/heic",
      heif: "image/heif",
    };
    const k = ext.toLowerCase();
    return { contentType: map[k] ?? "image/jpeg", ok: true };
  }
  return { contentType: "application/octet-stream", ok: false };
}

export function fileExtensionForMime(mime: string, fallbackName: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  if (map[mime]) return map[mime];
  const fromName = extFromName(fallbackName);
  if (fromName) return fromName;
  return "jpg";
}
