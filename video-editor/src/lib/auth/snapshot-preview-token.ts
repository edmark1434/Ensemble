import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

function encryptionKey() {
  const secret = process.env.EDITOR_SESSION_SECRET;
  if (!secret) throw new Error("Editor session signing is not configured");
  return createHmac("sha256", secret).update("ensemble:snapshot-preview:v1").digest();
}

// Authenticated encryption hides the sequential ID and rejects tampering.
// This token is purpose-specific and cannot be used as an editor session.
export function createSnapshotPreviewToken(snapshotId: string, userId: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const payload = JSON.stringify({ snapshotId, userId, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });
  const ciphertext = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  return `v1.${Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url")}`;
}

export function readSnapshotPreviewToken(token: string): { snapshotId: number; userId: string } | null {
  try {
    if (!/^v1\.[A-Za-z0-9_-]{40,1024}$/.test(token)) return null;
    const bytes = Buffer.from(token.slice(3), "base64url");
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const payload = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8"));
    const snapshotId = Number(payload.snapshotId);
    if (!Number.isSafeInteger(snapshotId) || snapshotId <= 0 || typeof payload.userId !== "string"
      || typeof payload.expiresAt !== "number" || payload.expiresAt <= Date.now()) return null;
    return { snapshotId, userId: payload.userId };
  } catch { return null; }
}
