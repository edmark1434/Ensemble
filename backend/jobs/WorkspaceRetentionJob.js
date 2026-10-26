const { pool } = require('../lib/Database');

/**
 * WorkspaceRetentionJob
 * Runs daily to purge ephemeral workspace data (tasks, activity history)
 * for teams that have been archived for more than 30 days.
 *
 * NOTE: Contracts, milestones, financial ledgers, wallets, ratings,
 * and user audit histories are NEVER touched and are permanently preserved.
 */
async function purgeExpiredArchivedWorkspaces() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Identify workspaces archived over 30 days ago
        const expiredTeamsRes = await client.query(`
            SELECT t.team_id, tcw.workspace_id, a.display_name as project_title, t.archived_at
              FROM teams t
              JOIN team_contract_workspaces tcw ON tcw.team_id = t.team_id
              JOIN accounts a ON a.account_id = t.account_id
             WHERE t.is_archived = TRUE
               AND t.archived_at IS NOT NULL
               AND t.archived_at < NOW() - INTERVAL '30 days'
        `);

        if (expiredTeamsRes.rows.length === 0) {
            await client.query('COMMIT');
            return { purgedTeams: 0, purgedTasks: 0 };
        }

        const workspaceIds = expiredTeamsRes.rows.map((r) => r.workspace_id).filter(Boolean);
        let purgedTasksCount = 0;

        if (workspaceIds.length > 0) {
            // Delete task assignees for these workspaces
            await client.query(`
                DELETE FROM team_workspace_task_assignees
                 WHERE task_id IN (
                   SELECT task_id FROM team_workspace_tasks
                    WHERE workspace_id = ANY($1::uuid[])
                 )
            `, [workspaceIds]);

            // Delete ephemeral workspace tasks
            const tasksDelRes = await client.query(`
                DELETE FROM team_workspace_tasks
                 WHERE workspace_id = ANY($1::uuid[])
            `, [workspaceIds]);
            purgedTasksCount = tasksDelRes.rowCount || 0;

            // Delete ephemeral workspace activity log
            await client.query(`
                DELETE FROM team_workspace_activity
                 WHERE workspace_id = ANY($1::uuid[])
            `, [workspaceIds]);

            // Delete ephemeral workspace project links
            await client.query(`
                DELETE FROM team_workspace_projects
                 WHERE workspace_id = ANY($1::uuid[])
            `, [workspaceIds]);
        }

        await client.query('COMMIT');
        console.log(`[Retention Job] Successfully purged ${purgedTasksCount} tasks from ${expiredTeamsRes.rows.length} archived workspaces older than 30 days.`);
        return {
            purgedTeams: expiredTeamsRes.rows.length,
            purgedTasks: purgedTasksCount,
        };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Retention Job] Error running retention purge:', err);
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    purgeExpiredArchivedWorkspaces,
};
