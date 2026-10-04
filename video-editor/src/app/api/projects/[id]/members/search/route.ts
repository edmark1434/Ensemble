// app/api/projects/[id]/members/search/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { getProjectMemberRole, searchAddableProjectUsers } from "@/lib/db/project-members";
import {canEditWithRole, canManageSharing} from "@/features/editor/types/editor-role";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(EDITOR_SESSION_COOKIE)?.value;
  const decoded = sessionCookie ? await verifyEditorSession(sessionCookie) : null;
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;

  // Owners and managers can add people, so they're the ones who can search.
  const role = await getProjectMemberRole(projectId, decoded.userId);
  if (!canManageSharing(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length === 0) return NextResponse.json({ results: [] });

  const results = await searchAddableProjectUsers({ projectId, query: q });
  return NextResponse.json({ results });
}