import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchMemberByAuthId } from "@/src/lib/memberAccess";
import { canAccessFablab, canUseTeach } from "@/src/lib/roles";

type LoginPayload = {
  username?: string;
  password?: string;
  schoolId?: string;
  schoolName?: string;
};

function setCookies(
  response: NextResponse,
  {
    token,
    schoolId,
    schoolName,
    userName,
    userRole,
    userId,
    memberId,
    userEmail,
  }: {
    token: string;
    schoolId: string;
    schoolName: string;
    userName: string;
    userRole: string;
    userId?: string;
    memberId?: string;
    userEmail?: string;
  },
) {
  const base = {
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  };

  response.cookies.set("auth_token", token, { ...base, httpOnly: true });
  response.cookies.set("school_id", schoolId, { ...base, httpOnly: false });
  response.cookies.set("school_name", schoolName, { ...base, httpOnly: false });
  response.cookies.set("user_name", userName, { ...base, httpOnly: false });
  response.cookies.set("user_role", userRole, { ...base, httpOnly: false });
  if (userId) response.cookies.set("user_id", userId, { ...base, httpOnly: false });
  if (memberId) response.cookies.set("member_id", memberId, { ...base, httpOnly: false });
  if (userEmail) response.cookies.set("user_email", userEmail, { ...base, httpOnly: false });
}

export async function POST(request: Request) {
  const body = (await request.json()) as LoginPayload;
  const { username, password, schoolId, schoolName } = body;

  if (!username || !password || !schoolId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    // Authentification avec le compte Supabase Auth (email + mot de passe)
    const supabaseAnon = createClient(supabaseUrl, anonKey);
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: username,
      password,
    });

    if (authError || !authData?.user) {
      console.error("[login] Supabase Auth error:", authError?.message);
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const authUserId = authData.user.id;

    const supabaseService = createClient(supabaseUrl, serviceKey ?? anonKey);

    const member = await fetchMemberByAuthId(supabaseService, authUserId);
    if (!member) {
      console.error("[login] User authenticated but not found in membre:", authUserId);
      return NextResponse.json({ ok: false, error: "not_staff" }, { status: 401 });
    }

    if (!canUseTeach(member.appRole)) {
      return NextResponse.json({ ok: false, error: "not_staff" }, { status: 403 });
    }

    if (!canAccessFablab(member.appRole, member.fablab_ref, schoolId)) {
      return NextResponse.json(
        { ok: false, error: "school_mismatch" },
        { status: 403 },
      );
    }

    const fullName = `${member.prenom ?? ""} ${member.nom ?? ""}`.trim() || authData.user.email || username;
    const response = NextResponse.json({ ok: true, role: member.appRole });
    setCookies(response, {
      token: "staff-session",
      schoolId,
      schoolName: schoolName ?? "",
      userName: fullName,
      userRole: member.appRole,
      userId: authUserId,
      memberId: member.id,
      userEmail: authData.user.email ?? username,
    });
    return response;
  } catch (err) {
    console.error("[login] unexpected error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
