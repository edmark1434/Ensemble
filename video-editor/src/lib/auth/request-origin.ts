import type { NextRequest } from "next/server";

/**
 * Same-origin guard for browser writes (CSRF). Behind Cloudflare or another
 * reverse proxy, `request.nextUrl.origin` is the internal listener built from
 * server.ts's hostname/port (e.g. http://localhost:3000), never the public
 * editor URL, so the browser's Origin is compared with the host the browser
 * addressed instead — the same check Next.js applies to Server Actions.
 * A cross-site page cannot set Host, and a custom X-Forwarded-Host forces a
 * CORS preflight that the editor never approves.
 */
export function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  if (origin === request.nextUrl.origin) return true;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  return originHost === (forwardedHost || request.headers.get("host"));
}
