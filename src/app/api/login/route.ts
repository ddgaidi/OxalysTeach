import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isTechnicienInFablab } from "@/src/lib/technicienAccess";

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
    userEmail,
  }: {
    token: string;
    schoolId: string;
    schoolName: string;
    userName: string;
    userRole: string;
    userId?: string;
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

  // ── 1. Admin fallback — aucun appel Supabase ──────────────────────────────
  if (username === "admin" && password === "1234") {
    const response = NextResponse.json({ ok: true, role: "admin" });
    setCookies(response, {
      token: "admin-session",
      schoolId,
      schoolName: schoolName ?? "",
      userName: "Administrateur",
      userRole: "admin",
    });
    return response;
  }

  // ── 2. Connexion via Supabase Auth + vérification technicien ──────────────
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

    // Vérification dans la table technicien :
    // le technicien doit avoir le même UUID que son compte Supabase Auth
    const supabaseService = createClient(supabaseUrl, serviceKey ?? anonKey);
    const { data: techRow, error: techError } = await supabaseService
      .from("technicien")
      .select("id, prenom, nom")
      .eq("id", authUserId)
      .maybeSingle();

    if (techError) {
      console.error("[login] technicien query error:", techError.message);
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    if (!techRow) {
      // Compte Supabase valide mais pas dans la table technicien
      console.error("[login] User authenticated but not found in technicien table:", authUserId);
      return NextResponse.json({ ok: false, error: "not_technician" }, { status: 401 });
    }

    const allowed = await isTechnicienInFablab(supabaseService, authUserId, schoolId);
    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "school_mismatch" },
        { status: 403 },
      );
    }

    // Connexion technicien valide
    const fullName = `${techRow.prenom} ${techRow.nom}`;
    const response = NextResponse.json({ ok: true, role: "technician" });
    setCookies(response, {
      token: "technician-session",
      schoolId,
      schoolName: schoolName ?? "",
      userName: fullName,
      userRole: "technician",
      userId: authUserId,
      userEmail: authData.user.email ?? username,
    });
    return response;
  } catch (err) {
    console.error("[login] unexpected error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
