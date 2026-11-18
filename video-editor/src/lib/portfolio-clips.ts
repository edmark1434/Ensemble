import "server-only";

export class PortfolioError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function portfolioBackend<T>(projectId: string, accountId: string, input: Record<string, unknown>): Promise<T> {
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) throw new PortfolioError("Invalid project.", 400);
  const base = process.env.BACKEND_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!base || !secret) throw new PortfolioError("Portfolio service unavailable.", 503);
  const response = await fetch(`${base.replace(/\/$/, "")}/api/editor/internal/portfolio/${projectId}`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-internal-secret": secret },
    body: JSON.stringify({ ...input, accountId }), cache: "no-store", signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  if (!response.ok) throw new PortfolioError(data.message || "Portfolio service unavailable.", response.status);
  return data;
}

export function portfolioTerms(projectId: string, accountId: string) {
  return portfolioBackend<{ name: string; maxSeconds: number | null; width: number; height: number }>(
    projectId, accountId, { action: "terms" });
}
