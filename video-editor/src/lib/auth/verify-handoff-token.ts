// lib/auth/verify-handoff-token.ts

import { jwtVerify } from "jose";

interface HandoffTokenPayload {
  userId: string;
  account_id: string;
  purpose: string;
}

export async function verifyHandoffToken(token: string): Promise<HandoffTokenPayload | null> {
  const secret = process.env.EDITOR_HANDOFF_SECRET;
  if (!secret) {
    console.error("EDITOR_HANDOFF_SECRET is not configured");
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (payload.purpose !== "editor-handoff") return null;
    return payload as unknown as HandoffTokenPayload;
  } catch (err) {
    return null; // invalid or expired
  }
}