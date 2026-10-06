export async function notifyProjectInvite({
  projectId,
  inviterUserId,
  recipientUserId,
}: {
  projectId: string;
  inviterUserId: string;
  recipientUserId: string;
}): Promise<void> {
  const baseUrl = process.env.BACKEND_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!baseUrl || !secret) {
    console.error("notifyProjectInvite: BACKEND_URL or INTERNAL_API_SECRET is not set");
    return;
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/invitations/internal/share`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": secret,
      },
      body: JSON.stringify({ projectId, inviterUserId, recipientUserId }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error("notifyProjectInvite: main site rejected the invite", res.status, body);
    }
  } catch (err) {
    console.error("notifyProjectInvite: request failed", err);
  }
}