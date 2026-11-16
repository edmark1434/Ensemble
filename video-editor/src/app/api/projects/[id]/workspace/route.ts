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
