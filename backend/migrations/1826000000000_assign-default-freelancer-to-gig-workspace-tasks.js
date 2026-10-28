/**
 * Migration: 1826000000000_assign-default-freelancer-to-gig-workspace-tasks.js
 * Ensures all gig workspace tasks are assigned by default to the freelancer (solo or team).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */

exports.shorthands = undefined;

exports.up = async (pgm) => {
  const unassignedRes = await pgm.db.query(`
    SELECT DISTINCT twt.task_id, g.freelancer_account_id, gr.client_account_id,
           (
             SELECT u.account_id
             FROM team_members tm
             JOIN teams t ON t.team_id = tm.team_id
             JOIN users u ON u.user_id = tm.user_id
             WHERE t.account_id = g.freelancer_account_id AND tm.status = 'Active'
             ORDER BY CASE WHEN tm.role = 'Owner' THEN 1 WHEN tm.role = 'Leader' THEN 2 WHEN tm.role = 'Manager' THEN 3 ELSE 4 END ASC
             LIMIT 1
           ) as team_leader_account_id
    FROM team_workspace_tasks twt
    JOIN team_contract_workspaces tcw ON tcw.workspace_id = twt.workspace_id
    JOIN gig_contracts gc ON gc.contract_id = tcw.contract_id
    JOIN gig_requests gr ON gr.gig_request_id = gc.gig_request_id
    JOIN gig_tiers gt ON gt.gig_tier_id = gr.gig_tier_id
    JOIN gigs g ON g.gig_id = gt.gig_id
    LEFT JOIN team_workspace_task_assignees twta ON twta.task_id = twt.task_id
    WHERE twta.account_id IS NULL AND twt.deleted_at IS NULL
  `);

  for (const row of unassignedRes.rows) {
    const assigneeId = row.team_leader_account_id || row.freelancer_account_id;
    if (assigneeId) {
      await pgm.db.query(`
        INSERT INTO team_workspace_task_assignees (task_id, account_id, assigned_by_account_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (task_id, account_id) DO NOTHING
      `, [row.task_id, assigneeId, row.client_account_id]);
    }

    // If it's a team, also assign the team account so it appears under both filters
    if (row.team_leader_account_id && row.freelancer_account_id && row.team_leader_account_id !== row.freelancer_account_id) {
      await pgm.db.query(`
        INSERT INTO team_workspace_task_assignees (task_id, account_id, assigned_by_account_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (task_id, account_id) DO NOTHING
      `, [row.task_id, row.freelancer_account_id, row.client_account_id]);
    }
  }
};

exports.down = async (pgm) => {
  // Down migration intentionally no-op to preserve taskboard state
};
