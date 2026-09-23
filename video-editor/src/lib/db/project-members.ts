// lib/db/project-members.ts

import { db } from "@/lib/db";

export type ProjectRole = "Owner" | "Editor" | "Commenter" | "Viewer";
export type AssignableProjectRole = "Editor" | "Commenter" | "Viewer";

export const ASSIGNABLE_PROJECT_ROLES: AssignableProjectRole[] = [
  "Editor",
  "Commenter",
  "Viewer",
];

export interface ProjectPerson {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface ProjectMember extends ProjectPerson {
  role: AssignableProjectRole;
}

export interface ProjectAccess {
  owner: ProjectPerson | null;
  members: ProjectMember[];
  canManage: boolean;
}

type PersonRow = {
  user_id: string;
  first_name: string;
  last_name: string;
  email_address: string;
  avatar_path: string | null;
};

const MAIN_APP_URL = (process.env.MAIN_APP_URL ?? "").replace(/\/+$/, "");

const resolveFileUrl = (path: string | null): string | null => {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;

  if (path.startsWith("/public/")) {
    const rest = path.slice("/public/".length);
    const presetPath = rest.startsWith("profile_presets/")
      ? rest
      : `profile_presets/${rest}`;
    return `${MAIN_APP_URL}/${presetPath}`;
  }

  return `${MAIN_APP_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

const toPerson = (row: PersonRow): ProjectPerson => ({
  userId: row.user_id,
  name: `${row.first_name} ${row.last_name}`.trim(),
  email: row.email_address,
  avatarUrl: resolveFileUrl(row.avatar_path),
});

export async function getProjectMemberRole(
  projectId: string,
  userId: string,
): Promise<ProjectRole | null> {
  const row = await db
    .selectFrom("project_members")
    .where("project_id", "=", projectId)
    .where("user_id", "=", userId)
    .where("deleted_at", "is", null)
    .select(["role"])
    .executeTakeFirst();
  return row?.role ?? null;
}

export async function getProjectAccess(
  projectId: string,
  viewerUserId: string,
): Promise<ProjectAccess> {
  const memberRows = await db
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
    .select([
      "u.user_id",
      "u.first_name",
      "u.last_name",
      "u.email_address",
      "f.path as avatar_path",
      "pm.role",
    ])
    .orderBy("pm.joined_at")
    .execute();

  const ownerRow = memberRows.find((r) => r.role === "Owner");

  return {
    owner: ownerRow ? toPerson(ownerRow) : null,
    members: memberRows.flatMap((r) =>
      r.role === "Owner"
        ? []
        : [{ ...toPerson(r), role: r.role as AssignableProjectRole }],
    ),
    canManage: !!ownerRow && ownerRow.user_id === viewerUserId,
  };
}

const CURSOR_COLORS = ["#F97316", "#3B82F6", "#22C55E", "#EAB308", "#EC4899", "#8B5CF6"];

export type AddProjectMemberResult = "ok" | "already_member";

export async function addProjectMember({
                                         projectId,
                                         userId,
                                         role,
                                       }: {
  projectId: string;
  userId: string;
  role: AssignableProjectRole;
}): Promise<AddProjectMemberResult> {
  return db.transaction().execute(async (trx) => {
    const existing = await trx
      .selectFrom("project_members")
      .where("project_id", "=", projectId)
      .where("user_id", "=", userId)
      .select(["deleted_at"])
      .executeTakeFirst();

    if (existing && existing.deleted_at === null) return "already_member";

    if (existing) {
      // Removed earlier, being re-added: revive the row instead of inserting
      // a second one for the same (project, user).
      await trx
        .updateTable("project_members")
        .set({ role, deleted_at: null, joined_at: new Date() })
        .where("project_id", "=", projectId)
        .where("user_id", "=", userId)
        .execute();
    } else {
      await trx
        .insertInto("project_members")
        .values({
          project_id: projectId,
          user_id: userId,
          role,
          cursor_color: CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)],
        })
        .execute();
    }

    return "ok";
  });
}

/**
 * Platform-wide search for people who could be added — matched by name or
 * email, minus whoever's already on the project (active or soft-deleted;
 * re-adding a deleted row goes through addProjectMember, not a fresh search hit).
 */
export async function searchAddableProjectUsers({
                                                  projectId,
                                                  query,
                                                  limit = 8,
                                                }: {
  projectId: string;
  query: string;
  limit?: number;
}): Promise<ProjectPerson[]> {
  const pattern = `%${query.replace(/[%_]/g, "\\$&")}%`;

  const rows = await db
    .selectFrom("users as u")
    .innerJoin("accounts as a", "a.account_id", "u.account_id")
    .leftJoin("files as f", (join) =>
      join
        .onRef("f.file_id", "=", "a.avatar_file_id")
        .on("f.deleted_at", "is", null),
    )
    .where(({ eb, or }) =>
      or([
        eb("u.first_name", "ilike", pattern),
        eb("u.last_name", "ilike", pattern),
        eb("u.email_address", "ilike", pattern),
      ]),
    )
    .where(
      "u.user_id",
      "not in",
      db
        .selectFrom("project_members")
        .where("project_id", "=", projectId)
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
    .limit(limit)
    .execute();

  return rows.map(toPerson);
}

/** Returns false when there was nobody to update (or the target is the Owner). */
export async function updateProjectMemberRole({
                                                projectId,
                                                userId,
                                                role,
                                              }: {
  projectId: string;
  userId: string;
  role: AssignableProjectRole;
}): Promise<boolean> {
  const result = await db
    .updateTable("project_members")
    .set({ role })
    .where("project_id", "=", projectId)
    .where("user_id", "=", userId)
    .where("role", "!=", "Owner")
    .where("deleted_at", "is", null)
    .executeTakeFirst();
  return Number(result.numUpdatedRows) > 0;
}

/** Soft delete. The Owner can't be removed. */
export async function removeProjectMember({
                                            projectId,
                                            userId,
                                          }: {
  projectId: string;
  userId: string;
}): Promise<boolean> {
  const result = await db
    .updateTable("project_members")
    .set({ deleted_at: new Date() })
    .where("project_id", "=", projectId)
    .where("user_id", "=", userId)
    .where("role", "!=", "Owner")
    .where("deleted_at", "is", null)
    .executeTakeFirst();
  return Number(result.numUpdatedRows) > 0;
}