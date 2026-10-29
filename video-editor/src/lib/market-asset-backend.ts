import "server-only";
import { NextRequest } from "next/server";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";

export const MARKET_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function marketAssetBackend(request: NextRequest, assetId: string, payload: Record<string, unknown>) {
  const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
  const session = token ? await verifyEditorSession(token) : null;
  if (!session) return { status: 401, data: { error: "Sign in to continue." } };
  if (!MARKET_UUID.test(assetId) || typeof payload.projectId !== "string" || !MARKET_UUID.test(payload.projectId)) {
    return { status: 400, data: { error: "Invalid asset or project ID." } };
  }
  const baseUrl = process.env.BACKEND_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!baseUrl || !secret) return { status: 503, data: { error: "Asset purchases are temporarily unavailable." } };
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/assets/internal/editor/${assetId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-secret": secret },
    body: JSON.stringify({ ...payload, accountId: session.account_id }),
    signal: AbortSignal.timeout(30_000), cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok && !data.error && data.message) data.error = data.message;
  return { status: response.status, data };
}
