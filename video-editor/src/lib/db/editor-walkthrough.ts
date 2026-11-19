import { sql } from "kysely";
import { db } from "@/lib/db";

export function claimEditorWalkthrough(userId: string, part: "editor" | "workspace") {
  const code = part === "editor" ? "editor.walkthrough.opened" : "editor.walkthrough.workspace.opened";
  const action = part === "editor" ? "Opened the editor walkthrough" : "Opened the workspace walkthrough";
  return db.transaction().execute(async trx => {
    // Two first opens in different tabs or devices should produce one tour.
    await sql`SELECT pg_advisory_xact_lock(hashtext(${"editor-walkthrough:" + userId}))`.execute(trx);
    const result = await sql`
      INSERT INTO account_activity (account_id, action, event_code)
      SELECT u.account_id, ${action}, ${code}
      FROM users u
      WHERE u.user_id = ${userId} AND NOT EXISTS (
        SELECT 1 FROM account_activity a WHERE a.account_id = u.account_id
          AND a.event_code = ${code}
      )
      RETURNING account_activity_id
    `.execute(trx);
    return result.rows.length > 0;
  });
}
