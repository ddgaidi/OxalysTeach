import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const base = {
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  };

  response.cookies.set("auth_token", "", { ...base, httpOnly: true });

  for (const name of ["school_id", "school_name", "user_name", "user_role", "user_id", "member_id", "user_email"]) {
    response.cookies.set(name, "", { ...base, httpOnly: false });
  }

  return response;
}
