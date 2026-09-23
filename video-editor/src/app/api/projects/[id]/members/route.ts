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

/** Reading the list: any project member. Changing it: the project Owner only. */
async function authorize(ctx: Ctx, { requireOwner }: { requireOwner: boolean }) {
  const { id: projectId } = await ctx.params;

  const userId = await getSessionUserId();
  if (!userId) return { error: fail("Unauthorized", 401) };

  const role = await getProjectMemberRole(projectId, userId);
  if (!role) return { error: fail("Forbidden", 403) };
  if (requireOwner && role !== "Owner") {
    return { error: fail("Only the project owner can change access", 403) };
  }

  return { projectId, userId };
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await authorize(ctx, { requireOwner: false });
  if ("error" in auth) return auth.error;

  const access = await getProjectAccess(auth.projectId, auth.userId);
  return NextResponse.json(access);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await authorize(ctx, { requireOwner: true });
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  if (typeof body?.userId !== "string" || !isAssignableRole(body?.role)) {
    return fail("Invalid userId/role", 400);
  }

  const result = await addProjectMember({
    projectId: auth.projectId,
    userId: body.userId,
    role: body.role,
  });

  if (result === "already_member") return fail("That user already has access", 409);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await authorize(ctx, { requireOwner: true });
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  if (typeof body?.userId !== "string" || !isAssignableRole(body?.role)) {
    return fail("Invalid userId/role", 400);
  }

  const updated = await updateProjectMemberRole({
    projectId: auth.projectId,
    userId: body.userId,
    role: body.role,
  });
  if (!updated) return fail("Member not found", 404);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await authorize(ctx, { requireOwner: true });
  if ("error" in auth) return auth.error;

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return fail("Invalid userId", 400);

  const removed = await removeProjectMember({ projectId: auth.projectId, userId });
  if (!removed) return fail("Member not found", 404);

  return NextResponse.json({ ok: true });
}