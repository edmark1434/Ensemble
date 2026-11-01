import { NextRequest } from "next/server";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "./editor-session";
import { canUploadToProject } from "../db/upload-policy";

export async function authorizeMediaUpload(request: NextRequest, claimedUserId: string, projectId?: string) {
  const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
  const session = token ? await verifyEditorSession(token) : null;
  if (!session) return { status: 401, error: "Sign in to upload media." };
  if (claimedUserId !== session.userId) return { status: 403, error: "Invalid upload owner." };
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return { status: 403, error: "Invalid request origin." };
  if (projectId !== undefined && (!/^[0-9a-f-]{36}$/i.test(projectId)
    || !await canUploadToProject(session.userId, projectId))) {
    return { status: 403, error: "You cannot upload media to this project." };
  }
  return null;
}
