import { db } from "@/lib/db";
import { ROLE_RANK } from "@/features/editor/types/block-members";
import type { AssignableProjectRole } from "./project-members";

export async function getShareLinkIssuer(projectId: string, userId: string, role: AssignableProjectRole) {
  const member = await db.selectFrom("project_members as pm")
    .innerJoin("projects as p", "p.project_id", "pm.project_id")
    .select(["pm.role", "pm.joined_at"])
    .where("pm.project_id", "=", projectId).where("pm.user_id", "=", userId)
    .where("pm.deleted_at", "is", null).where("p.deleted_at", "is", null)
    .executeTakeFirst();
  if (!member || (member.role !== "Owner" && member.role !== "Manager")
    || (role === "Manager" && member.role !== "Owner")) return null;
  return String(new Date(member.joined_at).getTime());
}

export async function redeemProjectShareLink(projectId: string, userId: string, link: {
  issuerId: string; role: AssignableProjectRole; membership: string;
}): Promise<boolean> {
  return db.transaction().execute(async (trx) => {
    // Serialize redemptions for a project and check current authority inside the transaction.
    const project = await trx.selectFrom("projects").select("project_id")
      .where("project_id", "=", projectId).where("deleted_at", "is", null)
      .forUpdate().executeTakeFirst();
    if (!project) return false;
    const issuer = await trx.selectFrom("project_members").select(["role", "joined_at"])
      .where("project_id", "=", projectId).where("user_id", "=", link.issuerId)
      .where("deleted_at", "is", null).forUpdate().executeTakeFirst();
    if (!issuer || (issuer.role !== "Owner" && issuer.role !== "Manager")
      || (link.role === "Manager" && issuer.role !== "Owner")
      || String(new Date(issuer.joined_at).getTime()) !== link.membership) return false;
    const member = await trx.selectFrom("project_members").select(["role", "deleted_at"])
      .where("project_id", "=", projectId).where("user_id", "=", userId)
      .forUpdate().executeTakeFirst();
    if (member?.deleted_at === null) {
      // Redeeming a higher-access link permanently promotes the stored role.
      // Lower-access links never demote members, including the Owner.
      if (ROLE_RANK[link.role] > ROLE_RANK[member.role]) {
        await trx.updateTable("project_members").set({ role: link.role })
          .where("project_id", "=", projectId).where("user_id", "=", userId).execute();
      }
      return true;
    }
    if (member) {
      await trx.updateTable("project_members").set({ role: link.role, deleted_at: null, joined_at: new Date() })
        .where("project_id", "=", projectId).where("user_id", "=", userId).execute();
    } else {
      await trx.insertInto("project_members").values({
        project_id: projectId, user_id: userId, role: link.role, cursor_color: "#3b82f6",
      }).onConflict((oc) => oc.columns(["project_id", "user_id"]).doNothing()).execute();
    }
    return true;
  });
}
