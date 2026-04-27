import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  // The matcher below already excludes /api/* and static files.
  // Only page routes reach this function — protect them with a session check.
  if (!request.cookies.has("auth_token")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run proxy ONLY on page routes — exclude api, static assets, and the login page itself
  matcher: [
    "/((?!api|login|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
