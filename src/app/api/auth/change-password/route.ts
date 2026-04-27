import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const userRole = request.cookies.get("user_role")?.value;
  const userId = request.cookies.get("user_id")?.value;
  const userEmail = request.cookies.get("user_email")?.value;

  if (userRole !== "technician" || !userId || !userEmail) {
    return NextResponse.json(
      { error: "Disponible uniquement pour les comptes technicien." },
      { status: 403 },
    );
  }

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Champs manquants." }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "Le nouveau mot de passe doit contenir au moins 6 caractères." },
      { status: 400 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Vérifie le mot de passe actuel
  const supabaseAnon = createClient(supabaseUrl, anonKey);
  const { error: authError } = await supabaseAnon.auth.signInWithPassword({
    email: userEmail,
    password: currentPassword,
  });

  if (authError) {
    return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 401 });
  }

  // Met à jour le mot de passe via la clé service (admin)
  const supabaseAdmin = createClient(supabaseUrl, serviceKey ?? anonKey);
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (updateError) {
    console.error("[change-password] update error:", updateError.message);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
