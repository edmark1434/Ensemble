const { pool } = require('../lib/Database');

const ELIGIBLE_CONTRACTS_CTE = `
  WITH eligible_contracts AS (
    SELECT c.contract_id,
           c.contract_type,
           c.status AS contract_status,
           c.rate_credits AS contract_value,
           j.job_id AS listing_id,
           j.title AS listing_title,
           'job'::text AS listing_type,
           CASE WHEN j.client_account_id = t.account_id THEN 'client' ELSE 'freelancer' END AS team_role,
           client_account.display_name AS client_name,
           freelancer_account.display_name AS freelancer_name
      FROM teams t
      JOIN jobs j ON TRUE
      JOIN proposals p ON p.job_id = j.job_id
      JOIN job_contracts jc ON jc.proposal_id = p.proposal_id
      JOIN contracts c ON c.contract_id = jc.contract_id
      JOIN accounts client_account ON client_account.account_id = j.client_account_id
      JOIN accounts freelancer_account ON freelancer_account.account_id = p.freelancer_account_id
     WHERE t.team_id = $1
       AND t.deleted_at IS NULL
       AND (j.client_account_id = t.account_id OR p.freelancer_account_id = t.account_id)
       AND LOWER(c.status) IN ('active', 'waiting', 'done')
    UNION ALL
    SELECT c.contract_id,
           c.contract_type,
           c.status AS contract_status,
           c.rate_credits AS contract_value,
           g.gig_id AS listing_id,
           g.title AS listing_title,
           'gig'::text AS listing_type,
           CASE WHEN gr.client_account_id = t.account_id THEN 'client' ELSE 'freelancer' END AS team_role,
           client_account.display_name AS client_name,
           freelancer_account.display_name AS freelancer_name
      FROM teams t
      JOIN gigs g ON TRUE
      JOIN gig_tiers gt ON gt.gig_id = g.gig_id
      JOIN gig_requests gr ON gr.gig_tier_id = gt.gig_tier_id
      JOIN gig_contracts gc ON gc.gig_request_id = gr.gig_request_id
      JOIN contracts c ON c.contract_id = gc.contract_id
      JOIN accounts client_account ON client_account.account_id = gr.client_account_id
      JOIN accounts freelancer_account ON freelancer_account.account_id = g.freelancer_account_id
     WHERE t.team_id = $1
       AND t.deleted_at IS NULL
       AND (gr.client_account_id = t.account_id OR g.freelancer_account_id = t.account_id)
       AND LOWER(c.status) IN ('active', 'waiting', 'done')
  )`;

async function listContractWorkspaces(teamId, viewerAccountId) {
  const result = await pool.query(
    `${ELIGIBLE_CONTRACTS_CTE}
     SELECT ec.*,
            tcw.workspace_id,
            tcw.updated_at AS workspace_updated_at,
            COALESCE(task_counts.total_tasks, 0)::int AS total_tasks,
            COALESCE(task_counts.completed_tasks, 0)::int AS completed_tasks,
            task_counts.next_due_at,
            COALESCE(member_counts.member_count, 0)::int AS workspace_member_count,
            EXISTS (
              SELECT 1 FROM team_workspace_members twm
               WHERE twm.workspace_id = tcw.workspace_id AND twm.account_id = $2
            ) AS is_workspace_member
       FROM eligible_contracts ec
       LEFT JOIN team_contract_workspaces tcw
         ON tcw.team_id = $1 AND tcw.contract_id = ec.contract_id
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS total_tasks,
                COUNT(*) FILTER (WHERE twt.status = 'completed')::int AS completed_tasks,
                MIN(twt.due_at) FILTER (WHERE twt.status <> 'completed') AS next_due_at
           FROM team_workspace_tasks twt
          WHERE twt.workspace_id = tcw.workspace_id AND twt.deleted_at IS NULL
       ) task_counts ON TRUE
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS member_count
           FROM team_workspace_members twm
          WHERE twm.workspace_id = tcw.workspace_id
       ) member_counts ON TRUE
      ORDER BY tcw.updated_at DESC NULLS LAST, ec.contract_id DESC
    `,
    [teamId, viewerAccountId]
  );
  return result.rows;
}

async function getEligibleContract(teamId, contractId) {
  const result = await pool.query(
    `${ELIGIBLE_CONTRACTS_CTE}
     SELECT * FROM eligible_contracts WHERE contract_id = $2 LIMIT 1`,
    [teamId, contractId]
  );
  return result.rows[0] || null;
}

async function ensureWorkspace(teamId, contractId, actorAccountId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const workspace = (await client.query(
      `INSERT INTO team_contract_workspaces (team_id, contract_id, created_by_account_id, project_lead_account_id)
       VALUES ($1, $2, $3, $3)
       ON CONFLICT (team_id, contract_id)
       DO UPDATE SET updated_at = team_contract_workspaces.updated_at
       RETURNING *`,
      [teamId, contractId, actorAccountId]
    )).rows[0];
    await client.query(
      `INSERT INTO team_workspace_members (workspace_id, account_id, added_by_account_id)
       VALUES ($1, $2, $2) ON CONFLICT DO NOTHING`,
      [workspace.workspace_id, actorAccountId]
    );
    await client.query('COMMIT');
    return workspace;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getWorkspace(teamId, contractId) {
  return (await pool.query(
    `SELECT tcw.*,
            COALESCE(tcw.project_lead_account_id, tcw.created_by_account_id) AS effective_project_lead_account_id,
            lead_acc.display_name AS project_lead_name,
            lead_acc.handle AS project_lead_handle,
            f.path AS project_lead_avatar_path
       FROM team_contract_workspaces tcw
       LEFT JOIN accounts lead_acc ON lead_acc.account_id = COALESCE(tcw.project_lead_account_id, tcw.created_by_account_id)
       LEFT JOIN files f ON f.file_id = lead_acc.avatar_file_id
      WHERE tcw.team_id = $1 AND tcw.contract_id = $2`,
    [teamId, contractId]
  )).rows[0] || null;
}

async function isWorkspaceMember(workspaceId, accountId) {
  return Boolean((await pool.query(
    `SELECT 1 FROM team_workspace_members WHERE workspace_id = $1 AND account_id = $2`,
    [workspaceId, accountId]
  )).rowCount);
}

async function listWorkspaceMembers(workspaceId) {
  return (await pool.query(
    `SELECT twm.account_id, twm.joined_at, a.display_name, a.handle, f.path AS avatar_path,
            tm.role AS team_role
       FROM team_workspace_members twm
       JOIN team_contract_workspaces tcw ON tcw.workspace_id = twm.workspace_id
       JOIN accounts a ON a.account_id = twm.account_id
       JOIN users u ON u.account_id = twm.account_id
       JOIN team_members tm ON tm.team_id = tcw.team_id AND tm.user_id = u.user_id AND tm.status = 'Active'
       LEFT JOIN files f ON f.file_id = a.avatar_file_id
      WHERE twm.workspace_id = $1
      ORDER BY CASE tm.role WHEN 'Owner' THEN 0 WHEN 'Admin' THEN 1 ELSE 2 END, a.display_name`,
    [workspaceId]
  )).rows;
}

async function listWorkspaceTasks(workspaceId) {
  return (await pool.query(
    `SELECT twt.*,
            COALESCE(
              json_agg(json_build_object(
                'account_id', twa.account_id,
                'display_name', a.display_name,
                'handle', a.handle,
                'avatar_path', f.path
              ) ORDER BY a.display_name) FILTER (WHERE twa.account_id IS NOT NULL),
              '[]'::json
            ) AS assignees
       FROM team_workspace_tasks twt
       LEFT JOIN team_workspace_task_assignees twa ON twa.task_id = twt.task_id
       LEFT JOIN accounts a ON a.account_id = twa.account_id
       LEFT JOIN files f ON f.file_id = a.avatar_file_id
      WHERE twt.workspace_id = $1 AND twt.deleted_at IS NULL
      GROUP BY twt.task_id
      ORDER BY twt.sort_order, twt.created_at`,
    [workspaceId]
  )).rows;
}

async function listWorkspaceActivity(workspaceId, limit = 50) {
  return (await pool.query(
    `SELECT twa.*, a.display_name AS actor_name, a.handle AS actor_handle,
            twt.title AS task_title
       FROM team_workspace_activity twa
       JOIN accounts a ON a.account_id = twa.actor_account_id
       LEFT JOIN team_workspace_tasks twt ON twt.task_id = twa.task_id
      WHERE twa.workspace_id = $1
      ORDER BY twa.created_at DESC
      LIMIT $2`,
    [workspaceId, limit]
  )).rows;
}

async function listWorkspaceAudience(workspaceId) {
  return (await pool.query(
    `SELECT DISTINCT audience.account_id
       FROM (
         SELECT twm.account_id
           FROM team_workspace_members twm
          WHERE twm.workspace_id = $1
         UNION
         SELECT u.account_id
           FROM team_contract_workspaces tcw
           JOIN team_members tm ON tm.team_id = tcw.team_id
           JOIN users u ON u.user_id = tm.user_id
          WHERE tcw.workspace_id = $1 AND tm.status = 'Active' AND tm.role IN ('Owner', 'Admin')
       ) audience`,
    [workspaceId]
  )).rows.map((row) => row.account_id);
}

async function addWorkspaceMembers(workspaceId, teamId, accountIds, actorAccountId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const active = (await client.query(
      `SELECT u.account_id
         FROM team_members tm
         JOIN users u ON u.user_id = tm.user_id
        WHERE tm.team_id = $1 AND tm.status = 'Active' AND u.account_id = ANY($2::uuid[])`,
      [teamId, accountIds]
    )).rows.map((row) => String(row.account_id));
    if (active.length !== accountIds.length) {
      const error = new Error('Every workspace member must be an active Team member');
      error.statusCode = 422;
      throw error;
    }
    const added = [];
    for (const accountId of accountIds) {
      const result = await client.query(
        `INSERT INTO team_workspace_members (workspace_id, account_id, added_by_account_id)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING account_id`,
        [workspaceId, accountId, actorAccountId]
      );
      if (result.rows[0]) added.push(result.rows[0].account_id);
    }
    if (added.length) {
      await client.query(
        `INSERT INTO team_workspace_activity (workspace_id, actor_account_id, action, metadata)
         VALUES ($1, $2, 'members_added', $3::jsonb)`,
        [workspaceId, actorAccountId, JSON.stringify({ account_ids: added })]
      );
      await client.query('UPDATE team_contract_workspaces SET updated_at = NOW() WHERE workspace_id = $1', [workspaceId]);
    }
    await client.query('COMMIT');
    return added;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function removeWorkspaceMember(workspaceId, accountId, actorAccountId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM team_workspace_task_assignees twa
        USING team_workspace_tasks twt
       WHERE twa.task_id = twt.task_id AND twt.workspace_id = $1 AND twa.account_id = $2`,
      [workspaceId, accountId]
    );
    const removed = (await client.query(
      `DELETE FROM team_workspace_members WHERE workspace_id = $1 AND account_id = $2 RETURNING account_id`,
      [workspaceId, accountId]
    )).rows[0] || null;
    if (removed) {
      await client.query(
        `INSERT INTO team_workspace_activity (workspace_id, actor_account_id, action, metadata)
         VALUES ($1, $2, 'member_removed', $3::jsonb)`,
        [workspaceId, actorAccountId, JSON.stringify({ account_id: accountId })]
      );
      await client.query('UPDATE team_contract_workspaces SET updated_at = NOW() WHERE workspace_id = $1', [workspaceId]);
    }
    await client.query('COMMIT');
    return removed;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getTask(workspaceId, taskId) {
  return (await pool.query(
    `SELECT * FROM team_workspace_tasks
      WHERE workspace_id = $1 AND task_id = $2 AND deleted_at IS NULL`,
    [workspaceId, taskId]
  )).rows[0] || null;
}

async function isTaskAssignee(taskId, accountId) {
  return Boolean((await pool.query(
    `SELECT 1 FROM team_workspace_task_assignees WHERE task_id = $1 AND account_id = $2`,
    [taskId, accountId]
  )).rowCount);
}

async function markOverdueTasks(limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  return (await pool.query(
    `WITH due_tasks AS (
       SELECT task_id
         FROM team_workspace_tasks
        WHERE deleted_at IS NULL
          AND due_at IS NOT NULL
          AND due_at <= NOW()
          AND status NOT IN ('overdue', 'completed')
        ORDER BY due_at, task_id
        LIMIT $1
        FOR UPDATE SKIP LOCKED
     )
     UPDATE team_workspace_tasks task
        SET status = 'overdue',
            completed_at = NULL,
            overdue_notified_at = NULL,
            updated_at = NOW()
       FROM due_tasks
      WHERE task.task_id = due_tasks.task_id
      RETURNING task.*`,
    [safeLimit]
  )).rows;
}

async function listPendingOverdueNotifications(limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  return (await pool.query(
    `SELECT task.task_id,
            task.workspace_id,
            task.title,
            task.due_at,
            workspace.team_id,
            workspace.contract_id,
            COALESCE(team_account.display_name, team_account.handle, 'Team') AS team_name
       FROM team_workspace_tasks task
       JOIN team_contract_workspaces workspace
         ON workspace.workspace_id = task.workspace_id
       JOIN teams team ON team.team_id = workspace.team_id
       JOIN accounts team_account ON team_account.account_id = team.account_id
      WHERE task.deleted_at IS NULL
        AND task.status = 'overdue'
        AND task.due_at IS NOT NULL
        AND task.due_at <= NOW()
        AND task.overdue_notified_at IS NULL
      ORDER BY task.due_at, task.task_id
      LIMIT $1`,
    [safeLimit]
  )).rows;
}

async function listTaskNotificationAudience(taskId) {
  return (await pool.query(
    `SELECT DISTINCT audience.account_id
       FROM (
         SELECT task.created_by_account_id AS account_id
           FROM team_workspace_tasks task
          WHERE task.task_id = $1
         UNION
         SELECT assignee.account_id
           FROM team_workspace_task_assignees assignee
          WHERE assignee.task_id = $1
         UNION
         SELECT users.account_id
           FROM team_workspace_tasks task
           JOIN team_contract_workspaces workspace
             ON workspace.workspace_id = task.workspace_id
           JOIN team_members member ON member.team_id = workspace.team_id
           JOIN users ON users.user_id = member.user_id
          WHERE task.task_id = $1
            AND member.status = 'Active'
            AND member.role IN ('Owner', 'Admin')
       ) audience
      WHERE audience.account_id IS NOT NULL`,
    [taskId]
  )).rows.map((row) => String(row.account_id));
}

async function markOverdueNotificationSent(taskId) {
  return (await pool.query(
    `UPDATE team_workspace_tasks
        SET overdue_notified_at = NOW()
      WHERE task_id = $1
        AND status = 'overdue'
        AND overdue_notified_at IS NULL
      RETURNING overdue_notified_at`,
    [taskId]
  )).rows[0] || null;
}

async function validateWorkspaceAssignees(workspaceId, accountIds, client = pool) {
  if (!accountIds.length) return;
  const result = await client.query(
    `SELECT twm.account_id
       FROM team_workspace_members twm
       JOIN team_contract_workspaces tcw ON tcw.workspace_id = twm.workspace_id
       JOIN users u ON u.account_id = twm.account_id
       JOIN team_members tm ON tm.team_id = tcw.team_id AND tm.user_id = u.user_id
      WHERE twm.workspace_id = $1 AND tm.status = 'Active' AND twm.account_id = ANY($2::uuid[])`,
    [workspaceId, accountIds]
  );
  if (result.rowCount !== accountIds.length) {
    const error = new Error('Assignees must be active members of this workspace');
    error.statusCode = 422;
    throw error;
  }
}

async function replaceTaskAssignees(client, taskId, accountIds, actorAccountId) {
  await client.query('DELETE FROM team_workspace_task_assignees WHERE task_id = $1', [taskId]);
  for (const accountId of accountIds) {
    await client.query(
      `INSERT INTO team_workspace_task_assignees (task_id, account_id, assigned_by_account_id)
       VALUES ($1, $2, $3)`,
      [taskId, accountId, actorAccountId]
    );
  }
}

async function createTask(workspaceId, data, actorAccountId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await validateWorkspaceAssignees(workspaceId, data.assigneeAccountIds, client);
    const task = (await client.query(
      `INSERT INTO team_workspace_tasks
        (workspace_id, title, description, status, priority, starts_at, due_at, sort_order, created_by_account_id, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7,
         COALESCE((SELECT MAX(sort_order) + 1 FROM team_workspace_tasks WHERE workspace_id = $1 AND deleted_at IS NULL), 0),
         $8, CASE WHEN $9::boolean THEN NOW() END)
       RETURNING *`,
      [
        workspaceId,
        data.title,
        data.description,
        data.status,
        data.priority,
        data.startsAt,
        data.dueAt,
        actorAccountId,
        data.status === 'completed',
      ]
    )).rows[0];
    await replaceTaskAssignees(client, task.task_id, data.assigneeAccountIds, actorAccountId);
    await client.query(
      `INSERT INTO team_workspace_activity (workspace_id, task_id, actor_account_id, action, metadata)
       VALUES ($1, $2, $3, 'task_created', $4::jsonb)`,
      [workspaceId, task.task_id, actorAccountId, JSON.stringify({ title: task.title })]
    );
    await client.query('UPDATE team_contract_workspaces SET updated_at = NOW() WHERE workspace_id = $1', [workspaceId]);
    await client.query('COMMIT');
    return task;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateTask(workspaceId, taskId, updates, assigneeAccountIds, actorAccountId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (assigneeAccountIds) await validateWorkspaceAssignees(workspaceId, assigneeAccountIds, client);
    const entries = Object.entries(updates);
    const values = entries.map(([, value]) => value);
    values.push(workspaceId, taskId);
    const setClauses = entries.map(([column], index) => `${column} = $${index + 1}`);
    if (updates.status) {
      setClauses.push(
        updates.status === 'completed'
          ? 'completed_at = COALESCE(completed_at, NOW())'
          : 'completed_at = NULL'
      );
    }
    setClauses.push('updated_at = NOW()');
    const task = (await client.query(
      `UPDATE team_workspace_tasks SET ${setClauses.join(', ')}
        WHERE workspace_id = $${values.length - 1} AND task_id = $${values.length} AND deleted_at IS NULL
        RETURNING *`,
      values
    )).rows[0] || null;
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }
    if (assigneeAccountIds) await replaceTaskAssignees(client, taskId, assigneeAccountIds, actorAccountId);
    await client.query(
      `INSERT INTO team_workspace_activity (workspace_id, task_id, actor_account_id, action, metadata)
       VALUES ($1, $2, $3, 'task_updated', $4::jsonb)`,
      [workspaceId, taskId, actorAccountId, JSON.stringify({ fields: entries.map(([key]) => key), assignees_changed: Boolean(assigneeAccountIds) })]
    );
    await client.query('UPDATE team_contract_workspaces SET updated_at = NOW() WHERE workspace_id = $1', [workspaceId]);
    await client.query('COMMIT');
    return task;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function deleteTask(workspaceId, taskId, actorAccountId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const task = (await client.query(
      `UPDATE team_workspace_tasks SET deleted_at = NOW(), updated_at = NOW()
        WHERE workspace_id = $1 AND task_id = $2 AND deleted_at IS NULL RETURNING *`,
      [workspaceId, taskId]
    )).rows[0] || null;
    if (task) {
      await client.query(
        `INSERT INTO team_workspace_activity (workspace_id, task_id, actor_account_id, action, metadata)
         VALUES ($1, $2, $3, 'task_deleted', $4::jsonb)`,
        [workspaceId, taskId, actorAccountId, JSON.stringify({ title: task.title })]
      );
      await client.query('UPDATE team_contract_workspaces SET updated_at = NOW() WHERE workspace_id = $1', [workspaceId]);
    }
    await client.query('COMMIT');
    return task;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getContractFinancialSnapshot(teamId, contractId) {
  const contractResult = await pool.query(
    `SELECT rate_credits, status FROM contracts WHERE contract_id = $1`,
    [contractId]
  );
  const contract = contractResult.rows[0];
  const contractValue = Number(contract?.rate_credits || 0);

  const releasedResult = await pool.query(
    `SELECT COALESCE(SUM(amount_credits), 0)::int AS released_credits
       FROM credit_transactions
      WHERE reference_table = 'contracts'
        AND reference_id = $1
        AND type = 'Escrow Release'
        AND LOWER(status) = 'completed'`,
    [contractId]
  );
  const releasedCredits = Number(releasedResult.rows[0]?.released_credits || 0);

  const distributedResult = await pool.query(
    `SELECT COALESCE(SUM(amount_credits), 0)::int AS distributed_credits
       FROM team_contract_distributions
      WHERE contract_id = $1`,
    [contractId]
  );
  const distributedCredits = Number(distributedResult.rows[0]?.distributed_credits || 0);

  const walletResult = await pool.query(
    `SELECT COALESCE(SUM(w.balance_credits), 0)::int AS team_available_balance
       FROM teams t
       JOIN account_wallets aw ON aw.account_id = t.account_id
       JOIN wallets w ON w.wallet_id = aw.wallet_id
      WHERE t.team_id = $1 AND w.type = 'account wallets'`,
    [teamId]
  );
  const teamAvailableBalance = Number(walletResult.rows[0]?.team_available_balance || 0);

  const remainingDistributableCredits = Math.max(0, releasedCredits - distributedCredits);

  return {
    contract_value: contractValue,
    released_credits: releasedCredits,
    distributed_credits: distributedCredits,
    remaining_distributable_credits: remainingDistributableCredits,
    team_available_balance: teamAvailableBalance,
    is_funded_and_released: releasedCredits > 0,
    contract_status: contract?.status || 'Unknown',
  };
}

async function listContractDistributions(contractId) {
  const result = await pool.query(
    `SELECT tcd.distribution_id,
            tcd.workspace_id,
            tcd.contract_id,
            tcd.amount_credits,
            tcd.created_at,
            distributor.account_id AS distributor_account_id,
            distributor.display_name AS distributor_name,
            distributor.handle AS distributor_handle,
            recipient.account_id AS recipient_account_id,
            recipient.display_name AS recipient_name,
            recipient.handle AS recipient_handle,
            rf.path AS recipient_avatar_path
       FROM team_contract_distributions tcd
       JOIN accounts distributor ON distributor.account_id = tcd.distributed_by_account_id
       JOIN accounts recipient ON recipient.account_id = tcd.recipient_account_id
       LEFT JOIN files rf ON rf.file_id = recipient.avatar_file_id
      WHERE tcd.contract_id = $1
      ORDER BY tcd.created_at DESC`,
    [contractId]
  );
  return result.rows;
}

async function updateProjectLead(workspaceId, projectLeadAccountId) {
  const result = await pool.query(
    `UPDATE team_contract_workspaces
        SET project_lead_account_id = $2, updated_at = NOW()
      WHERE workspace_id = $1
      RETURNING *`,
    [workspaceId, projectLeadAccountId]
  );
  return result.rows[0] || null;
}

async function distributeContractFunds(workspaceId, teamId, contractId, distributorAccountId, recipients) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock team account wallet
    const source = (await client.query(
      `SELECT w.wallet_id, w.balance_credits, w.status
         FROM teams t
         JOIN account_wallets aw ON aw.account_id = t.account_id
         JOIN wallets w ON w.wallet_id = aw.wallet_id
        WHERE t.team_id = $1 AND t.deleted_at IS NULL AND w.type = 'account wallets'
          FOR UPDATE`,
      [teamId]
    )).rows[0];

    if (!source || String(source.status).toLowerCase() !== 'active') {
      throw new Error('Team account wallet is unavailable');
    }

    // 2. Lock & calculate released credits for this contract
    const releasedRow = (await client.query(
      `SELECT COALESCE(SUM(amount_credits), 0)::int AS released_credits
         FROM credit_transactions
        WHERE reference_table = 'contracts'
          AND reference_id = $1
          AND type = 'Escrow Release'
          AND LOWER(status) = 'completed'`,
      [contractId]
    )).rows[0];
    const releasedCredits = Number(releasedRow?.released_credits || 0);

    // 3. Lock & calculate distributed credits for this contract
    const distributedRow = (await client.query(
      `SELECT COALESCE(SUM(amount_credits), 0)::int AS distributed_credits
         FROM team_contract_distributions
        WHERE contract_id = $1`,
      [contractId]
    )).rows[0];
    const distributedCredits = Number(distributedRow?.distributed_credits || 0);

    const remainingContractCredits = Math.max(0, releasedCredits - distributedCredits);
    const totalRequested = recipients.reduce((sum, r) => sum + r.amount_credits, 0);

    if (releasedCredits <= 0) {
      throw new Error('Contract funds have not been released from client escrow yet');
    }

    if (totalRequested > remainingContractCredits) {
      throw new Error(`Requested distribution (${totalRequested} credits) exceeds remaining contract budget (${remainingContractCredits} credits)`);
    }

    if (Number(source.balance_credits) < totalRequested) {
      throw new Error('Insufficient available Team wallet balance');
    }

    // 4. Lock recipient wallets and verify they are workspace members
    const recipientIds = recipients.map((r) => r.account_id);
    const recipientWallets = (await client.query(
      `SELECT aw.account_id, w.wallet_id, w.status, a.display_name, a.handle
         FROM account_wallets aw
         JOIN wallets w ON w.wallet_id = aw.wallet_id
         JOIN users u ON u.account_id = aw.account_id
         JOIN team_members tm ON tm.user_id = u.user_id
         JOIN team_workspace_members twm ON twm.account_id = aw.account_id AND twm.workspace_id = $2
         JOIN accounts a ON a.account_id = aw.account_id
        WHERE tm.team_id = $1
          AND tm.status = 'Active'
          AND aw.account_id = ANY($3::uuid[])
          AND w.type = 'account wallets'
        ORDER BY w.wallet_id
          FOR UPDATE`,
      [teamId, workspaceId, recipientIds]
    )).rows;

    if (recipientWallets.length !== recipients.length) {
      throw new Error('Every recipient must be an active workspace member of this contract with an active account wallet');
    }

    // 5. Deduct from team wallet
    await client.query(
      `UPDATE wallets SET balance_credits = balance_credits - $1 WHERE wallet_id = $2`,
      [totalRequested, source.wallet_id]
    );

    const walletsByAccountId = new Map(recipientWallets.map((w) => [String(w.account_id), w]));
    const transactions = [];
    const distributions = [];

    for (const recipient of recipients) {
      const destination = walletsByAccountId.get(String(recipient.account_id));
      await client.query(
        `UPDATE wallets SET balance_credits = balance_credits + $1 WHERE wallet_id = $2`,
        [recipient.amount_credits, destination.wallet_id]
      );

      const transaction = (await client.query(
        `INSERT INTO credit_transactions (
           type, amount_credits, status,
           source_wallet_id, destination_wallet_id,
           fee_transaction_id, reference_table, reference_id
         ) VALUES (
           'Fund Transfer', $1, 'completed',
           $2, $3, NULL, 'team_contract_workspaces', $4
         ) RETURNING *`,
        [recipient.amount_credits, source.wallet_id, destination.wallet_id, workspaceId]
      )).rows[0];

      const distribution = (await client.query(
        `INSERT INTO team_contract_distributions (
           workspace_id, contract_id, team_id,
           distributed_by_account_id, recipient_account_id,
           amount_credits, credit_transaction_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          workspaceId,
          contractId,
          teamId,
          distributorAccountId,
          recipient.account_id,
          recipient.amount_credits,
          transaction.credit_transaction_id,
        ]
      )).rows[0];

      transactions.push({
        ...transaction,
        recipient_account_id: recipient.account_id,
        recipient_name: destination.display_name,
        recipient_handle: destination.handle,
      });

      distributions.push({
        ...distribution,
        recipient_name: destination.display_name,
        recipient_handle: destination.handle,
      });
    }

    // 6. Log workspace activity
    await client.query(
      `INSERT INTO team_workspace_activity (workspace_id, actor_account_id, action, metadata)
       VALUES ($1, $2, 'contract_funds_distributed', $3::jsonb)`,
      [
        workspaceId,
        distributorAccountId,
        JSON.stringify({
          distributed_credits: totalRequested,
          recipient_count: recipients.length,
          remaining_contract_credits: remainingContractCredits - totalRequested,
        }),
      ]
    );

    await client.query(
      `UPDATE team_contract_workspaces SET updated_at = NOW() WHERE workspace_id = $1`,
      [workspaceId]
    );

    await client.query('COMMIT');

    return {
      transactions,
      distributions,
      distributed_credits: totalRequested,
      remaining_contract_credits: remainingContractCredits - totalRequested,
      available_team_balance: Number(source.balance_credits) - totalRequested,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  listContractWorkspaces,
  getEligibleContract,
  ensureWorkspace,
  getWorkspace,
  isWorkspaceMember,
  listWorkspaceMembers,
  listWorkspaceTasks,
  listWorkspaceActivity,
  listWorkspaceAudience,
  addWorkspaceMembers,
  removeWorkspaceMember,
  getTask,
  isTaskAssignee,
  markOverdueTasks,
  listPendingOverdueNotifications,
  listTaskNotificationAudience,
  markOverdueNotificationSent,
  createTask,
  updateTask,
  deleteTask,
  getContractFinancialSnapshot,
  listContractDistributions,
  updateProjectLead,
  distributeContractFunds,
};
