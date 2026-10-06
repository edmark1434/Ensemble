// lib/db/block-members.ts

import { db } from "@/lib/db";
import {
  AssignableBlockRole,
  BlockAccess,
  BlockPerson,
  BlockRole, canManageBlockAccess, GeneralAccessLevel, minRole, sceneRoleCeiling,
  StoredBlockRole
} from "@/features/editor/types/block-members";
import { StoredProjectRole } from "@/features/editor/types/editor-role";
import { resolveFileUrl } from "@/lib/file-url";

type PersonRow = {
  user_id: string;
  first_name: string;
  last_name: string;
  email_address: string;
  avatar_path: string | null;
  project_role?: StoredProjectRole | null;
};

const toPerson = (row: PersonRow): BlockPerson => ({
  userId: row.user_id,
  name: `${row.first_name} ${row.last_name}`.trim(),
  email: row.email_address,
  avatarUrl: resolveFileUrl(row.avatar_path),
  projectRole: row.project_role ?? null,
});

export async function isProjectMember(
  projectId: string,
  userId: string,
): Promise<boolean> {
  const row = await db
    .selectFrom("project_members")
    .where("project_id", "=", projectId)
    .where("user_id", "=", userId)
    .where("deleted_at", "is", null)
    .select(["user_id"])
    .executeTakeFirst();
  return !!row;
}

export async function getBlockRole(
  blockId: string,
  userId: string,
): Promise<StoredBlockRole | null> {
  const row = await db
    .selectFrom("block_members")
    .where("block_id", "=", blockId)
    .where("user_id", "=", userId)
    .where("deleted_at", "is", null)
    .select(["role"])
    .executeTakeFirst();
  return row?.role ?? null;
}

export async function getProjectRole(
  projectId: string,
  userId: string,
): Promise<BlockRole | null> {
  const row = await db
    .selectFrom("project_members")
    .where("project_id", "=", projectId)
    .where("user_id", "=", userId)
    .where("deleted_at", "is", null)
    .select(["role"])
    .executeTakeFirst();
  return row?.role ?? null;
}

// What a general access level gives a project member, before their project
// role caps it. Only used when the user has no specific block_members row.
// General access never grants Manager.
const GENERAL_ACCESS_CEILING: Record<GeneralAccessLevel, AssignableBlockRole | null> = {
  "Anyone can edit": "Editor",
  "Anyone can comment": "Commenter",
  "Anyone can view": "Viewer",
  "Restricted": null,
};

/**
 * Effective role in a scene:
 *  - the scene's Owner (block_members row with role Owner) is always Owner
 *  - not a project member -> no access
 *  - a specific block_members row decides the role outright (general access
 *    is ignored, up or down), capped by sceneRoleCeiling(projectRole)
 *  - no specific row -> general access ceiling, capped the same way
 */
export function resolveEffectiveBlockRole({
  blockRole,
  generalAccess,
  projectRole,
}: {
  blockRole: StoredBlockRole | null;
  generalAccess: GeneralAccessLevel;
  projectRole: BlockRole | null;
}): BlockRole | null {
  if (blockRole === "Owner") return "Owner";
  if (!projectRole) return null;

  const ceiling = sceneRoleCeiling(projectRole);
  if (blockRole) return minRole(blockRole, ceiling);

  const general = GENERAL_ACCESS_CEILING[generalAccess] ?? null;
  return general ? minRole(general, ceiling) : null;
}

/** What the collab socket and the write routes check. null = no access. */
export async function getEffectiveBlockRole(
  blockId: string,
  projectId: string,
  userId: string,
): Promise<BlockRole | null> {
  const [blockRow, blockRole, projectRole] = await Promise.all([
    db
      .selectFrom("blocks")
      .where("block_id", "=", blockId)
      .where("deleted_at", "is", null)
      .select(["general_access"])
      .executeTakeFirst(),
    getBlockRole(blockId, userId),
    getProjectRole(projectId, userId),
  ]);

  if (!blockRow) return null;

  return resolveEffectiveBlockRole({
    blockRole,
    generalAccess: blockRow.general_access as GeneralAccessLevel,
    projectRole,
  });
}

/**
 * Everything the access picker needs in one round trip: the owner, the people
 * who've been added, and the project members who could still be added.
 */
export async function getBlockAccess(
  blockId: string,
  projectId: string,
  viewerUserId: string,
): Promise<BlockAccess> {
  const [memberRows, candidateRows, blockRow, projectRole] = await Promise.all([
    db
      .selectFrom("block_members as bm")
      .innerJoin("users as u", "u.user_id", "bm.user_id")
      .innerJoin("accounts as a", "a.account_id", "u.account_id")
      .leftJoin("files as f", (join) =>
        join
          .onRef("f.file_id", "=", "a.avatar_file_id")
          .on("f.deleted_at", "is", null),
      )
      .leftJoin("project_members as pm", (join) =>
        join
          .onRef("pm.user_id", "=", "bm.user_id")
          .on("pm.project_id", "=", projectId)
          .on("pm.deleted_at", "is", null),
      )
      .where("bm.block_id", "=", blockId)
      .where("bm.deleted_at", "is", null)
      .select([
        "u.user_id",
        "u.first_name",
        "u.last_name",
        "u.email_address",
        "f.path as avatar_path",
        "bm.role",
        "pm.role as project_role"
      ])
      .orderBy("bm.joined_at")
      .execute(),

    db
      .selectFrom("project_members as pm")
      .innerJoin("users as u", "u.user_id", "pm.user_id")
      .innerJoin("accounts as a", "a.account_id", "u.account_id")
      .leftJoin("files as f", (join) =>
        join
          .onRef("f.file_id", "=", "a.avatar_file_id")
          .on("f.deleted_at", "is", null),
      )
      .where("pm.project_id", "=", projectId)
      .where("pm.deleted_at", "is", null)
      .where(
        "pm.user_id",
        "not in",
        db
          .selectFrom("block_members")
          .where("block_id", "=", blockId)
          .where("deleted_at", "is", null)
          .select("user_id"),
      )
      .select([
        "u.user_id",
        "u.first_name",
        "u.last_name",
        "u.email_address",
        "f.path as avatar_path",
        "pm.role as project_role"
      ])
      .orderBy("u.first_name")
      .orderBy("u.last_name")
      .execute(),

    db
      .selectFrom("blocks")
      .where("block_id", "=", blockId)
      .where("deleted_at", "is", null)
      .select(["general_access"])
      .executeTakeFirst(),

    getProjectRole(projectId, viewerUserId),
  ]);

  const ownerRow = memberRows.find((r) => r.role === "Owner");
  const viewerRow = memberRows.find((r) => r.user_id === viewerUserId);
  const generalAccess =
    (blockRow?.general_access as GeneralAccessLevel) ?? "Anyone can edit";

  return {
    owner: ownerRow ? toPerson(ownerRow) : null,
    members: memberRows.flatMap((r) =>
      r.role === "Owner"
        ? []
        : [{
          ...toPerson(r),
          role: r.role,
          effectiveRole: resolveEffectiveBlockRole({
            blockRole: r.role,
            generalAccess,
            projectRole: r.project_role ?? null,
          }),
        }],
    ),
    candidates: candidateRows.map(toPerson),
    canManage: canManageBlockAccess({ blockRole: viewerRow?.role ?? null, projectRole }),
    canGrantManager: !!ownerRow && ownerRow.user_id === viewerUserId,
    generalAccess,
    viewerRole: resolveEffectiveBlockRole({
      blockRole: viewerRow?.role ?? null,
      generalAccess,
      projectRole,
    }),
  };
}

export type AddBlockMemberResult =
  | "ok"
  | "not_project_member"
  | "already_member";

export async function addBlockMember({
  blockId,
  projectId,
  userId,
  role,
}: {
  blockId: string;
  projectId: string;
  userId: string;
  role: AssignableBlockRole;
}): Promise<AddBlockMemberResult> {
  return db.transaction().execute(async (trx) => {
    // Only people already in the project can be added to one of its scenes.
    // Their cursor colour carries over so they look the same in both docs.
    const projectMembership = await trx
      .selectFrom("project_members")
      .where("project_id", "=", projectId)
      .where("user_id", "=", userId)
      .where("deleted_at", "is", null)
      .select(["cursor_color", "role"])
      .executeTakeFirst();

    if (!projectMembership) return "not_project_member";
    const applied = minRole(role, sceneRoleCeiling(projectMembership.role));

    const existing = await trx
      .selectFrom("block_members")
      .where("block_id", "=", blockId)
      .where("user_id", "=", userId)
      .select(["deleted_at"])
      .executeTakeFirst();

    if (existing && existing.deleted_at === null) return "already_member";

    if (existing) {
      // Removed earlier, being re-added: revive the row instead of inserting
      // a second one for the same (block, user).
      await trx
        .updateTable("block_members")
        .set({ role: applied, deleted_at: null, joined_at: new Date() })
        .where("block_id", "=", blockId)
        .where("user_id", "=", userId)
        .execute();
    } else {
      await trx
        .insertInto("block_members")
        .values({
          block_id: blockId,
          user_id: userId,
          role: applied,
          cursor_color: projectMembership.cursor_color,
        })
        .execute();
    }

    return "ok";
  });
}

/** Returns false when there was nobody to update (or the target is the Owner). */
export async function updateBlockMemberRole({ blockId, projectId, userId, role }: {
  blockId: string; projectId: string; userId: string; role: AssignableBlockRole;
}): Promise<boolean> {
  const projectRole = await getProjectRole(projectId, userId);
  if (!projectRole) return false;
  const applied = minRole(role, sceneRoleCeiling(projectRole));

  const result = await db
    .updateTable("block_members")
    .set({ role: applied })
    .where("block_id", "=", blockId)
    .where("user_id", "=", userId)
    .where("role", "!=", "Owner")
    .where("deleted_at", "is", null)
    .executeTakeFirst();
  return Number(result.numUpdatedRows) > 0;
}

/** Soft delete, same as the rest of the schema. The Owner can't be removed. */
export async function removeBlockMember({
  blockId,
  userId,
}: {
  blockId: string;
  userId: string;
}): Promise<boolean> {
  const result = await db
    .updateTable("block_members")
    .set({ deleted_at: new Date() })
    .where("block_id", "=", blockId)
    .where("user_id", "=", userId)
    .where("role", "!=", "Owner")
    .where("deleted_at", "is", null)
    .executeTakeFirst();
  return Number(result.numUpdatedRows) > 0;
}