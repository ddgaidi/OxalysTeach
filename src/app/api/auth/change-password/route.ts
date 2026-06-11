import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchMemberByAuthId } from "@/src/lib/memberAccess";

export async function POST(request: NextRequest) {
  // Identite de l'utilisateur connecte, lue depuis les cookies de session.
  const userId = request.cookies.get("user_id")?.value;
  const userEmail = request.cookies.get("user_email")?.value;

  if (!userId || !userEmail) {
    return NextResponse.json(
      { error: "Disponible uniquement pour les comptes technicien." },
      { status: 403 },
    );
  }

  // Le formulaire envoie l'ancien mot de passe pour re-authentifier avant changement.
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
  // Client admin pour lire le membre et mettre a jour le mot de passe.
  const supabaseAdmin = createClient(supabaseUrl, serviceKey ?? anonKey);

  // Seuls les techniciens peuvent changer leur mot de passe depuis ce tableau de bord.
  const member = await fetchMemberByAuthId(supabaseAdmin, userId).catch((error) => {
    console.error("[change-password] membre query error:", error);
    return null;
  });

  if (member?.appRole !== "technician") {
    return NextResponse.json(
      { error: "Disponible uniquement pour les comptes technicien." },
      { status: 403 },
    );
  }

  // Vérifie le mot de passe actuel
  // Re-authentification avec le client anon, comme une connexion classique.
  const supabaseAnon = createClient(supabaseUrl, anonKey);
  const { error: authError } = await supabaseAnon.auth.signInWithPassword({
    email: userEmail,
    password: currentPassword,
  });

  if (authError) {
    return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 401 });
  }

  // Met à jour le mot de passe via la clé service (admin)
  // Mise a jour reelle via l'API admin Supabase.
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (updateError) {
    console.error("[change-password] update error:", updateError.message);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
