import { NextResponse, type NextRequest } from "next/server";
import { fetchRequestMember, memberCanUseFablab } from "@/src/lib/memberAccess";
import { normalizeMemberRole } from "@/src/lib/roles";
import { createSupabaseAdminClient } from "@/src/lib/supabaseAdmin";
import type { AirStatus } from "@/src/lib/schools";

export const runtime = "nodejs";

type MemberRow = {
  id: string;
  fablab_ref: string | null;
  role: string | null;
};

type Payload = {
  fablabId?: string;
  from?: AirStatus;
  to?: AirStatus;
  average?: number | null;
};

const ORDER: Record<AirStatus, number> = {
  "Optimal": 0,
  "Moyen": 1,
  "Alerte": 2,
  "Danger": 3,
  "Hors service": 4,
};

function shouldNotifyMember(member: MemberRow, from: AirStatus | undefined, to: AirStatus) {
  // Chaque role a un seuil de notification different pour eviter le bruit.
  const role = normalizeMemberRole(member.role);
  if (role === "admin") return false;
  const changedThreshold = from ? ORDER[from] !== ORDER[to] : true;
  if (!changedThreshold) return false;

  if (role === "technician") return true;
  if (role === "professor") return to === "Alerte" || to === "Danger" || to === "Hors service";
  return to === "Danger";
}

export async function POST(request: NextRequest) {
  // Le dashboard appelle cette route quand le statut global d'air change.
  const body = (await request.json()) as Payload;
  if (!body.fablabId || !body.to) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Client admin pour lire les membres du fablab et pousser la notification.
  const admin = createSupabaseAdminClient();

  // L'appelant doit lui-meme avoir acces au fablab concerne.
  const auth = await fetchRequestMember(admin, request).catch((error) => {
    console.error("[notifications/air-quality] membre query error:", error);
    return null;
  });

  if (!auth || !memberCanUseFablab(auth.member, body.fablabId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (auth.member.appRole === "admin") {
    // Les admins declenchent parfois la supervision mais ne recoivent pas de notification perso.
    return NextResponse.json({ ok: true, skipped: "admin" });
  }

  // Tous les membres rattaches au fablab sont candidats a la notification.
  const { data: members, error } = await admin
    .from("membre")
    .select("id, fablab_ref, role")
    .eq("fablab_ref", body.fablabId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Le filtre applique les regles par role et par changement de seuil.
  const recipients = ((members ?? []) as MemberRow[]).filter((member) =>
    shouldNotifyMember(member, body.from, body.to!),
  );

  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  // Message court stocke directement sur chaque membre pour l'app cliente.
  const title = `Seuil ${body.to}`;
  const message = body.average == null
    ? `Le FabLab est passe en etat ${body.to}.`
    : `Le FabLab est passe en etat ${body.to} avec un indice moyen de ${Math.round(body.average)}.`;

  // Mise a jour en masse des membres destinataires.
  const { error: updateError } = await admin
    .from("membre")
    .update({
      notification_title: title,
      notification_message: message,
      notification_type: body.to,
      notification_read: false,
      updated_at: new Date().toISOString(),
    })
    .in("id", recipients.map((member) => member.id));

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, notified: recipients.length });
}
