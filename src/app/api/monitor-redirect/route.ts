import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchMemberByAuthId } from "@/src/lib/memberAccess";
import { canAccessFablab, canUseMonitor } from "@/src/lib/roles";

const DEFAULT_MONITOR_BASE = "https://oxalys-monitor.vercel.app";

export const runtime = "nodejs";

function monitorBase(): string {
  const raw = process.env.NEXT_PUBLIC_MONITOR_URL ?? DEFAULT_MONITOR_BASE;
  return raw.replace(/\/$/, "");
}

function decodeCookieValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function GET(request: NextRequest) {
  const authToken = request.cookies.get("auth_token")?.value;
  const schoolId = request.cookies.get("school_id")?.value;
  const schoolName = decodeCookieValue(request.cookies.get("school_name")?.value);
  let userEmail = request.cookies.get("user_email")?.value?.trim();
  const userId = request.cookies.get("user_id")?.value;

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", "monitor");

  if (!authToken || !schoolId) {
    return NextResponse.redirect(loginUrl);
  }

  if (!userId) {
    return NextResponse.redirect(loginUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("[monitor-redirect] SUPABASE_SERVICE_ROLE_KEY is required");
    return NextResponse.redirect(`${monitorBase()}/connexion`);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const member = await fetchMemberByAuthId(supabaseAdmin, userId).catch((error) => {
    console.error("[monitor-redirect] membre query failed:", error);
    return null;
  });

  const canAccessSelectedSchool =
    member &&
    (
      canAccessFablab(member.appRole, member.fablab_ref, schoolId) ||
      canAccessFablab(member.appRole, member.fablab_ref, schoolName)
    );

  if (!member || !canUseMonitor(member.appRole) || !canAccessSelectedSchool) {
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
    return NextResponse.redirect(`${monitorBase()}/connexion?error=handoff`);
  }

  const dest = new URL(`${monitorBase()}/auth/monitor-callback`);
  dest.searchParams.set("token_hash", linkData.properties.hashed_token);
  dest.searchParams.set("school_id", schoolId);

  return NextResponse.redirect(dest);
}
