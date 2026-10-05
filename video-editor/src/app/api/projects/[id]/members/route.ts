// app/api/projects/[id]/members/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import {
  addProjectMember,
  ASSIGNABLE_PROJECT_ROLES,
  getProjectAccess,
  getProjectMemberRole,
  removeProjectMember,
  updateProjectMemberRole,
  type AssignableProjectRole,
} from "@/lib/db/project-members";
import { recheckProject } from "@/lib/collab/access-recheck";
import { canManageSharing } from "@/features/editor/types/editor-role";

type Ctx = { params: Promise<{ id: string }> };

const isAssignableRole = (v: unknown): v is AssignableProjectRole =>
  typeof v === "string" && (ASSIGNABLE_PROJECT_ROLES as string[]).includes(v);

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(EDITOR_SESSION_COOKIE)?.value;
  const decoded = sessionCookie ? await verifyEditorSession(sessionCookie) : null;
  return decoded?.userId ?? null;
}

/** Reading the list: any project member. Changing it: project Owners and Editors. */
async function authorize(ctx: Ctx, { requireManager }: { requireManager: boolean }) {
  const { id: projectId } = await ctx.params;

  const userId = await getSessionUserId();
  if (!userId) return { error: fail("Unauthorized", 401) };

  const role = await getProjectMemberRole(projectId, userId);
  if (!role) return { error: fail("Forbidden", 403) };
  if (requireManager && !canManageSharing(role)) {
    return { error: fail("Only project owners and managers can change access", 403) };
  }

  return { projectId, userId, role };
}

const MANAGER_ONLY = "Only the project owner can grant or change manager access";

async function touchesManager(
  auth: { projectId: string; role: string },
  targetUserId: string,
  newRole?: string,
) {
  if (auth.role === "Owner") return false;
  if (newRole === "Manager") return true;
  return (await getProjectMemberRole(auth.projectId, targetUserId)) === "Manager";
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await authorize(ctx, { requireManager: false });
  if ("error" in auth) return auth.error;

  const access = await getProjectAccess(auth.projectId, auth.userId);
  return NextResponse.json(access);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await authorize(ctx, { requireManager: true });
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  if (typeof body?.userId !== "string" || !isAssignableRole(body?.role)) {
    return fail("Invalid userId/role", 400);
  }

  if (await touchesManager(auth, body.userId, body.role)) return fail(MANAGER_ONLY, 403);

  const result = await addProjectMember({
    projectId: auth.projectId,
    userId: body.userId,
    role: body.role,
  });

  if (result === "already_member") return fail("That user already has access", 409);
  void recheckProject(auth.projectId);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await authorize(ctx, { requireManager: true });
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  if (typeof body?.userId !== "string" || !isAssignableRole(body?.role)) {
    return fail("Invalid userId/role", 400);
  }

  if (await touchesManager(auth, body.userId, body.role)) return fail(MANAGER_ONLY, 403);

  const updated = await updateProjectMemberRole({
    projectId: auth.projectId,
    userId: body.userId,
    role: body.role,
  });
  if (!updated) return fail("Member not found", 404);

  void recheckProject(auth.projectId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await authorize(ctx, { requireManager: true });
  if ("error" in auth) return auth.error;

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return fail("Invalid userId", 400);

  if (await touchesManager(auth, userId)) return fail(MANAGER_ONLY, 403);

  const removed = await removeProjectMember({ projectId: auth.projectId, userId });
  if (!removed) return fail("Member not found", 404);

  void recheckProject(auth.projectId);
  return NextResponse.json({ ok: true });
}