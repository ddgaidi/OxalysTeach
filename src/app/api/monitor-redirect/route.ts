import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_MONITOR_BASE = "https://oxalys-monitor.vercel.app";

export const runtime = "nodejs";

function monitorBase(): string {
  const raw = process.env.NEXT_PUBLIC_MONITOR_URL ?? DEFAULT_MONITOR_BASE;
  return raw.replace(/\/$/, "");
}

export async function GET(request: NextRequest) {
  const authToken = request.cookies.get("auth_token")?.value;
  const role = request.cookies.get("user_role")?.value;
  const schoolId = request.cookies.get("school_id")?.value;
  let userEmail = request.cookies.get("user_email")?.value?.trim();
  const userId = request.cookies.get("user_id")?.value;

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", "monitor");

  if (!authToken || !schoolId) {
    return NextResponse.redirect(loginUrl);
  }

  if (role === "admin") {
    const ssoSecret = process.env.OXALYS_SSO_SHARED_SECRET;
    if (!ssoSecret) {
      console.error("[monitor-redirect] OXALYS_SSO_SHARED_SECRET is required for accès Moniteur (compte admin)");
      return NextResponse.redirect(`${monitorBase()}/login?error=sso_config`);
    }
    const exp = Math.floor(Date.now() / 1000) + 5 * 60;
    const payload = { m: "admin" as const, school_id: schoolId, exp };
    const d = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const s = createHmac("sha256", ssoSecret).update(d).digest("base64url");
    const dest = new URL(`${monitorBase()}/api/auth/teach-sso`);
    dest.searchParams.set("d", d);
    dest.searchParams.set("s", s);
    return NextResponse.redirect(dest);
  }

  if (role !== "technician" || !userId) {
    return NextResponse.redirect(loginUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("[monitor-redirect] SUPABASE_SERVICE_ROLE_KEY is required");
    return NextResponse.redirect(`${monitorBase()}/login`);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: techRow, error: techError } = await supabaseAdmin
    .from("technicien")
    .select("id, fablab_id")
    .eq("id", userId)
    .maybeSingle();

  if (techError || !techRow || techRow.fablab_id !== schoolId) {
    return NextResponse.redirect(loginUrl);
  }

  if (!userEmail) {
    const { data: u, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userErr || !u.user?.email) {
      return NextResponse.redirect(loginUrl);
    }
    userEmail = u.user.email;
  }

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: userEmail,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error("[monitor-redirect] generateLink failed:", linkError?.message);
    return NextResponse.redirect(`${monitorBase()}/login?error=handoff`);
  }

  const dest = new URL(`${monitorBase()}/auth/monitor-callback`);
  dest.searchParams.set("token_hash", linkData.properties.hashed_token);
  dest.searchParams.set("school_id", schoolId);

  return NextResponse.redirect(dest);
}
