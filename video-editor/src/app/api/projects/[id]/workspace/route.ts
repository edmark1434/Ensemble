import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { getEditorWorkspaceSnapshot, WorkspaceAccessError } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const cookie = (await cookies()).get(EDITOR_SESSION_COOKIE)?.value;
    const session = cookie ? await verifyEditorSession(cookie) : null;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
    const { id } = await context.params;
    return NextResponse.json(await getEditorWorkspaceSnapshot(id, session.userId), { headers });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers });
    }
    return NextResponse.json({ error: "Unable to load your workspace. Please try again." }, { status: 500, headers });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const cookie = (await cookies()).get(EDITOR_SESSION_COOKIE)?.value;
    const session = cookie ? await verifyEditorSession(cookie) : null;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const { taskId, changes } = await request.json();
    if (changes?.status !== undefined && !["todo", "pending", "in_progress", "in_review", "review"].includes(changes.status)) {
      return NextResponse.json({ error: "Task status is managed automatically." }, { status: 400 });
    }
    const snapshot = await getEditorWorkspaceSnapshot(id, session.userId);
    const workspace = snapshot.workspaces.find(item => item.tasks.some(task => task.id === taskId));
    if (!workspace) return NextResponse.json({ error: "Task unavailable or no longer assigned to you." }, { status: 403 });
    const baseUrl = process.env.BACKEND_URL;
    const secret = process.env.INTERNAL_API_SECRET;
    if (!baseUrl || !secret) return NextResponse.json({ error: "Task updates are temporarily unavailable." }, { status: 503 });
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/team-projects/internal/editor/${workspace.id}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-internal-secret": secret },
      body: JSON.stringify({ accountId: session.account_id, changes }),
      signal: AbortSignal.timeout(30_000), cache: "no-store",
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      const error = response.status < 500
        ? result?.error || result?.message || "Unable to update task."
        : "Unable to update task. Please try again.";
      return NextResponse.json({ error }, { status: response.status });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const status = error instanceof WorkspaceAccessError ? error.status : error instanceof SyntaxError ? 400 : 500;
    return NextResponse.json({ error: status === 500 ? "Unable to update task. Refresh before retrying." : error instanceof Error ? error.message : "Invalid request" }, { status });
  }
}
