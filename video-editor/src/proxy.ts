// (root)/src/proxy.ts

import { NextRequest, NextResponse } from "next/server";
import { verifyHandoffToken } from "@/lib/auth/verify-handoff-token";
import { signEditorSession, EDITOR_SESSION_COOKIE } from "@/lib/auth/editor-session";

export async function proxy(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.next();

  const decoded = await verifyHandoffToken(token);
  if (!decoded) {
    return NextResponse.redirect(new URL("/auth-error", request.url));
  }

  const url = request.nextUrl.clone();
  url.searchParams.delete("token"); // strip it — width/height stay

  const response = NextResponse.redirect(url);
  response.cookies.set(EDITOR_SESSION_COOKIE,
    await signEditorSession({ userId: decoded.userId, account_id: decoded.account_id }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day — long enough for an editing session
      path: "/",
    });

  return response;
}

export const config = {
  matcher: "/editor/:path*",
};