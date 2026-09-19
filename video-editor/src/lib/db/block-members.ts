// lib/db/block-members.ts

import { db } from "@/lib/db";
import type {
  AssignableBlockRole,
  BlockAccess,
  BlockPerson,
  BlockRole,
} from "@/features/editor/types/block-members";

type PersonRow = {
  user_id: string;
  first_name: string;
  last_name: string;
  email_address: string;
  avatar_path: string | null;
};

// Only project Owners and Editors can be given access to a scene.
const ADDABLE_PROJECT_ROLES = ["Owner", "Editor"] as const;

// files.path -> a URL an <img> can load. Avatars are either presets from the
// main app's public/ folder ("/public/profile_presets/p1.png") or a real path.
// The main app is a different origin from the editor, so URLs must be absolute.
const MAIN_APP_URL = (process.env.MAIN_APP_URL ?? "").replace(/\/+$/, "");

const resolveFileUrl = (path: string | null): string | null => {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;

  // Next serves public/ from the site root, so "public" is never part of the
  // URL. Rows can look like "/public/profile_presets/p1.png" or
  // "/public/p1.png" (where the file actually sits in profile_presets/), so
  // normalise both to /profile_presets/<name>.
  if (path.startsWith("/public/")) {
    const rest = path.slice("/public/".length);
    const presetPath = rest.startsWith("profile_presets/")
      ? rest
      : `profile_presets/${rest}`;
    return `${MAIN_APP_URL}/${presetPath}`;
  }

  return `${MAIN_APP_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

const toPerson = (row: PersonRow): BlockPerson => ({
  userId: row.user_id,
  name: `${row.first_name} ${row.last_name}`.trim(),
  email: row.email_address,
  avatarUrl: resolveFileUrl(row.avatar_path),
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
): Promise<BlockRole | null> {
  const row = await db
    .selectFrom("block_members")
    .where("block_id", "=", blockId)
    .where("user_id", "=", userId)
    .where("deleted_at", "is", null)
    .select(["role"])
    .executeTakeFirst();
  return row?.role ?? null;
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
  const [memberRows, candidateRows] = await Promise.all([
    db
      .selectFrom("block_members as bm")
      .innerJoin("users as u", "u.user_id", "bm.user_id")
      .innerJoin("accounts as a", "a.account_id", "u.account_id")
      .leftJoin("files as f", (join) =>
        join
          .onRef("f.file_id", "=", "a.avatar_file_id")
          .on("f.deleted_at", "is", null),
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
      .where("pm.role", "in", [...ADDABLE_PROJECT_ROLES])
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
      ])
      .orderBy("u.first_name")
      .orderBy("u.last_name")
      .execute(),
  ]);

  const ownerRow = memberRows.find((r) => r.role === "Owner");

  return {
    owner: ownerRow ? toPerson(ownerRow) : null,
    members: memberRows.flatMap((r) =>
      r.role === "Owner" ? [] : [{ ...toPerson(r), role: r.role }],
    ),
    candidates: candidateRows.map(toPerson),
    canManage: !!ownerRow && ownerRow.user_id === viewerUserId,
  };
}

export type AddBlockMemberResult =
  | "ok"
  | "not_project_member"
  | "not_editor"
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
    if (!(ADDABLE_PROJECT_ROLES as readonly string[]).includes(projectMembership.role)) {
      return "not_editor";
    }

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
        .set({ role, deleted_at: null, joined_at: new Date() })
        .where("block_id", "=", blockId)
        .where("user_id", "=", userId)
        .execute();
    } else {
      await trx
        .insertInto("block_members")
        .values({
          block_id: blockId,
          user_id: userId,
          role,
          cursor_color: projectMembership.cursor_color,
        })
        .execute();
    }

    return "ok";
  });
}

/** Returns false when there was nobody to update (or the target is the Owner). */
export async function updateBlockMemberRole({
  blockId,
  userId,
  role,
}: {
  blockId: string;
  userId: string;
  role: AssignableBlockRole;
}): Promise<boolean> {
  const result = await db
    .updateTable("block_members")
    .set({ role })
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