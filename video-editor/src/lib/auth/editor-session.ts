// lib/auth/editor-session.ts

import { SignJWT, jwtVerify } from "jose";

export const EDITOR_SESSION_COOKIE = "editorSession";

interface EditorSessionPayload {
  userId: string;
  account_id: string;
}

function getSecret() {
  return new TextEncoder().encode(process.env.EDITOR_SESSION_SECRET!);
}

export async function signEditorSession(payload: EditorSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(getSecret());
}

export async function verifyEditorSession(token: string): Promise<EditorSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as EditorSessionPayload;
  } catch {
    return null;
  }
}