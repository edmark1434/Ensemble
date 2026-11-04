import { createHmac } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { ASSIGNABLE_PROJECT_ROLES, type AssignableProjectRole } from "@/lib/db/project-members";

// A separate derived key prevents share links being accepted as editor sessions.
function signingKey() {
  const secret = process.env.EDITOR_SESSION_SECRET;
  if (!secret) throw new Error("Editor session signing is not configured");
  return createHmac("sha256", secret).update("ensemble:project-share-link:v1").digest();
}

export async function signProjectShareLink(projectId: string, issuerId: string, role: AssignableProjectRole, membership: string) {
  return new SignJWT({ projectId, role, membership })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("ensemble-project-sharing")
    .setAudience("project-access")
    .setSubject(issuerId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(signingKey());
}

export async function verifyProjectShareLink(token: string, projectId: string) {
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      algorithms: ["HS256"], issuer: "ensemble-project-sharing", audience: "project-access",
    });
    if (payload.projectId !== projectId || typeof payload.sub !== "string"
      || typeof payload.membership !== "string"
      || !ASSIGNABLE_PROJECT_ROLES.includes(payload.role as AssignableProjectRole)) return null;
    return { issuerId: payload.sub, role: payload.role as AssignableProjectRole, membership: payload.membership };
  } catch {
    return null;
  }
}
