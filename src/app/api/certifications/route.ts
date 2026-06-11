import { NextResponse, type NextRequest } from "next/server";
import { fetchRequestMember } from "@/src/lib/memberAccess";
import { canReviewCertifications } from "@/src/lib/roles";
import { createSupabaseAdminClient } from "@/src/lib/supabaseAdmin";

type CertificationAction = {
  requestId?: string;
  action?: "approve" | "decline";
  reason?: string;
};

type CertificationStatus = "en_attente" | "refusee";

function statusToClient(status: string) {
  if (status === "refusee") return "declined";
  return "pending";
}

export async function GET(request: NextRequest) {
  const admin = createSupabaseAdminClient();
  const auth = await fetchRequestMember(admin, request).catch((error) => {
    console.error("[certifications] membre query error:", error);
    return null;
  });

  if (!auth || !canReviewCertifications(auth.member.appRole)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const query = admin
    .from("membre_certification_requete")
    .select("id, membre_id, fablab_id, status, message, reviewed_by, reviewed_at, refusal_reason, created_at")
    .order("created_at", { ascending: false });

  if (auth.member.appRole !== "admin") {
    if (!auth.member.fablab_ref) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    query.eq("fablab_id", auth.member.fablab_ref);
  }

  const { data: requests, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const memberIds = [...new Set((requests ?? []).map((row) => row.membre_id as string))];
  const { data: members } = memberIds.length > 0
    ? await admin.from("membre").select("id, prenom, nom, email, telephone, fablab_ref, role").in("id", memberIds)
    : { data: [] };
  const byId = new Map((members ?? []).map((member) => [member.id, member]));

  return NextResponse.json({
    requests: (requests ?? []).map((requestRow) => ({
      ...requestRow,
      status: statusToClient(requestRow.status),
      requested_at: requestRow.created_at,
      reason: requestRow.refusal_reason ?? requestRow.message,
      member: byId.get(requestRow.membre_id),
    })),
  });
}

export async function POST(request: NextRequest) {
  const admin = createSupabaseAdminClient();
  const auth = await fetchRequestMember(admin, request).catch((error) => {
    console.error("[certifications] membre query error:", error);
    return null;
  });

  if (!auth || !canReviewCertifications(auth.member.appRole)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as CertificationAction;
  if (!body.requestId || !body.action) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const { data: requestRow, error: requestError } = await admin
    .from("membre_certification_requete")
    .select("id, membre_id, fablab_id, status")
    .eq("id", body.requestId)
    .maybeSingle();

  if (requestError || !requestRow) {
    return NextResponse.json({ error: requestError?.message ?? "not_found" }, { status: 404 });
  }

  if (auth.member.appRole !== "admin" && requestRow.fablab_id !== auth.member.fablab_ref) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const reviewedAt = new Date().toISOString();
  const actorRole = auth.member.role ?? auth.member.appRole;

  if (body.action === "approve") {
    const { error: memberError } = await admin
      .from("membre")
      .update({ fablab_ref: requestRow.fablab_id })
      .eq("id", requestRow.membre_id);

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    const { error: deleteError } = await admin
      .from("membre_certification_requete")
      .delete()
      .eq("id", body.requestId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    await admin.from("fablab_log").insert({
      fablab_id: requestRow.fablab_id,
      actor_membre_id: auth.member.id,
      actor_role: actorRole,
      action: "certification_validee",
      details: {
        request_id: body.requestId,
        membre_id: requestRow.membre_id,
        reviewed_at: reviewedAt,
      },
    });

    return NextResponse.json({ ok: true, status: "approved" });
  }

  const { error: updateRequestError } = await admin
    .from("membre_certification_requete")
    .update({
      status: "refusee" satisfies CertificationStatus,
      reviewed_at: reviewedAt,
      reviewed_by: auth.member.id,
      refusal_reason: body.reason ?? null,
    })
    .eq("id", body.requestId);

  if (updateRequestError) {
    return NextResponse.json({ error: updateRequestError.message }, { status: 500 });
  }

  await admin.from("fablab_log").insert({
    fablab_id: requestRow.fablab_id,
    actor_membre_id: auth.member.id,
    actor_role: actorRole,
    action: "certification_refusee",
    details: {
      request_id: body.requestId,
      membre_id: requestRow.membre_id,
      reason: body.reason ?? null,
      reviewed_at: reviewedAt,
    },
  });

  return NextResponse.json({ ok: true, status: "declined" });
}
