import { NextResponse } from "next/server";

type LoginPayload = {
  username?: string;
  password?: string;
  schoolId?: string;
  schoolName?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as LoginPayload;
  const isValid = body.username === "admin" && body.password === "1234";

  if (!isValid) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  
  // Cookie de session principal
  response.cookies.set("auth_token", "admin-session", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  if (body.schoolName) {
    response.cookies.set("school_name", body.schoolName, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
  }

  if (body.schoolId) {
    response.cookies.set("school_id", body.schoolId, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
  }

  return response;
}
