import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { signProjectShareLink } from "@/lib/auth/project-share-link";
import { getShareLinkIssuer } from "@/lib/db/project-share-links";
import { ASSIGNABLE_PROJECT_ROLES, type AssignableProjectRole } from "@/lib/db/project-members";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = (await cookies()).get(EDITOR_SESSION_COOKIE)?.value;
  const user = session ? await verifyEditorSession(session) : null;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || !ASSIGNABLE_PROJECT_ROLES.includes(body?.role)) {
    return NextResponse.json({ error: "Invalid project or access level" }, { status: 400 });
  }
  const role = body.role as AssignableProjectRole;
  const membership = await getShareLinkIssuer(id, user.userId, role);
  if (!membership) return NextResponse.json({ error: "You cannot share this access level" }, { status: 403 });
  const token = await signProjectShareLink(id, user.userId, role, membership);
  const url = new URL(`/projects/open/${id}`, process.env.MAIN_APP_URL || "http://localhost:5173");
  url.searchParams.set("share", token);
  return NextResponse.json({ url: url.toString() }, { headers: { "Cache-Control": "private, no-store" } });
}
