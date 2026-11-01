import "server-only";
import { readUploadPlan } from "./db/upload-policy";

// Only call after verifying the editor session. Never forward browser headers.
export async function renderServerHeaders(userId: string, includePlan = false) {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) throw new Error("Render authentication is not configured");
  const headers: Record<string, string> = {
    "x-internal-secret": secret,
    "x-user-id": userId,
  };
  if (includePlan) {
    const plan = (await readUploadPlan(userId)).trim().toLowerCase();
    headers["x-render-tier"] = plan === "business" ? "business" : plan === "premium" ? "pro" : "free";
  }
  return headers;
}
