// app/api/blocks/[id]/members/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import {getBlockProjectId, updateBlock} from "@/lib/db/blocks";
import {
  addBlockMember,
  getBlockAccess,
  getBlockRole,
  isProjectMember,
  removeBlockMember,
  updateBlockMemberRole,
} from "@/lib/db/block-members";
import {
  ASSIGNABLE_BLOCK_ROLES,
  type AssignableBlockRole, GENERAL_ACCESS_LEVELS, GeneralAccessLevel,
} from "@/features/editor/types/block-members";

type Ctx = { params: Promise<{ id: string }> };

const isAssignableRole = (v: unknown): v is AssignableBlockRole =>
  typeof v === "string" && (ASSIGNABLE_BLOCK_ROLES as string[]).includes(v);

const isGeneralAccessLevel = (v: unknown): v is GeneralAccessLevel =>
  typeof v === "string" && (GENERAL_ACCESS_LEVELS as string[]).includes(v);

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(EDITOR_SESSION_COOKIE)?.value;
  const decoded = sessionCookie ? await verifyEditorSession(sessionCookie) : null;
  return decoded?.userId ?? null;
}

/**
 * Reading the list: any project member. Changing it: the scene's Owner only.
 * The projectId always comes from the block row, never from the client.
 */
async function authorize(ctx: Ctx, { requireOwner }: { requireOwner: boolean }) {
  const { id: blockId } = await ctx.params;

  const userId = await getSessionUserId();
  if (!userId) return { error: fail("Unauthorized", 401) };

  const projectId = await getBlockProjectId(blockId);
  if (!projectId) return { error: fail("Block not found", 404) };

  if (requireOwner) {
    if ((await getBlockRole(blockId, userId)) !== "Owner") {
      return { error: fail("Only the scene owner can change access", 403) };
    }
  } else if (!(await isProjectMember(projectId, userId))) {
    return { error: fail("Forbidden", 403) };
  }

  return { blockId, projectId, userId };
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await authorize(ctx, { requireOwner: false });
  if ("error" in auth) return auth.error;

  const access = await getBlockAccess(auth.blockId, auth.projectId, auth.userId);
  return NextResponse.json(access);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await authorize(ctx, { requireOwner: true });
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  if (typeof body?.userId !== "string" || !isAssignableRole(body?.role)) {
    return fail("Invalid userId/role", 400);
  }

  const result = await addBlockMember({
    blockId: auth.blockId,
    projectId: auth.projectId,
    userId: body.userId,
    role: body.role,
  });

  if (result === "not_project_member") {
    return fail("That user isn't a member of this project", 400);
  }
  if (result === "not_editor") {
    return fail("Only project owners and editors can be added", 400);
  }
  if (result === "already_member") {
    return fail("That user already has access", 409);
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await authorize(ctx, { requireOwner: true });
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);

  if (body?.generalAccess !== undefined) {
    if (!isGeneralAccessLevel(body.generalAccess)) {
      return fail("Invalid generalAccess", 400);
    }
    await updateBlock({ blockId: auth.blockId, generalAccess: body.generalAccess });
    return NextResponse.json({ ok: true });
  }

  if (typeof body?.userId !== "string" || !isAssignableRole(body?.role)) {
    return fail("Invalid userId/role", 400);
  }

  const updated = await updateBlockMemberRole({
    blockId: auth.blockId,
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

  const removed = await removeBlockMember({ blockId: auth.blockId, userId });
  if (!removed) return fail("Member not found", 404);

  return NextResponse.json({ ok: true });
}