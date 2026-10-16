const { pool } = require('../lib/Database');
const { nanoid } = require('nanoid');

/**
 * Ensures a Contractual Team Project exists for a team job post and links the candidate.
 * Called inside a database transaction (dbClient).
 */
async function ensureContractualTeamProject(dbClient, {
  jobId,
  clientAccountId,
  contractId,
  proposalId,
  freelancerAccountId,
}) {
  // 1. Fetch job details
  const jobRes = await dbClient.query(`
    SELECT j.job_id, j.title, j.description, j.category, j.hiring_type, j.no_of_hires,
           j.client_account_id,
           (SELECT ja.file_id FROM job_attachments ja WHERE ja.job_id = j.job_id AND ja.index = 0 LIMIT 1) as thumbnail_file_id,
           COALESCE((
             SELECT json_agg(t.name) 
             FROM job_tags jt 
             JOIN tags t ON jt.tag_id = t.tag_id 
             WHERE jt.job_id = j.job_id
           ), '[]'::json) as skills
      FROM jobs j
     WHERE j.job_id = $1
  `, [jobId]);

  if (jobRes.rows.length === 0) return null;
  const job = jobRes.rows[0];

  // 2. Fetch proposal milestone role (if specified)
  const propRes = await dbClient.query(`
    SELECT proposal_id, job_milestone_id, freelancer_account_id 
      FROM proposals 
     WHERE proposal_id = $1
  `, [proposalId]);
  const proposal = propRes.rows[0];
  const targetMilestoneId = proposal?.job_milestone_id || null;

  // 3. Check if contractual team already exists for this job
  let teamRes = await dbClient.query(`
    SELECT t.team_id, t.account_id 
      FROM teams t 
     WHERE t.job_id = $1 AND t.team_type = 'contractual' AND t.deleted_at IS NULL 
     LIMIT 1
  `, [jobId]);

  let teamId;
  let teamAccountId;

  if (teamRes.rows.length === 0) {
    // A. Generate unique team handle & join code
    const baseHandle = `prj-${String(jobId).replace(/-/g, '').slice(0, 10)}`;
    const joinCode = nanoid(16);

    // B. Create team account record
    const projectTitle = String(job.title || 'Team Project').trim().slice(0, 255);
    const accountRes = await dbClient.query(`
      INSERT INTO accounts (
        display_name, handle, type, tagline, description, status, avatar_file_id
      ) VALUES ($1, $2, 'Team', 'Contractual Team Job', $3, 'Active', $4)
      RETURNING account_id
    `, [
      projectTitle,
      baseHandle,
      job.description || '',
      job.thumbnail_file_id || null
    ]);
    teamAccountId = accountRes.rows[0].account_id;

    // C. Create contractual team record
    const newTeamRes = await dbClient.query(`
      INSERT INTO teams (
        account_id, join_code, visibility, join_policy, category, team_type, job_id, is_archived
      ) VALUES ($1, $2, 'Private', 'Approval', $3, 'contractual', $4, FALSE)
      RETURNING team_id
    `, [
      teamAccountId,
      joinCode,
      String(job.category || 'General').slice(0, 80),
      jobId
    ]);
    teamId = newTeamRes.rows[0].team_id;

    // D. Add Client as Owner in team_members
    const clientUserRes = await dbClient.query(`
      SELECT user_id FROM users WHERE account_id = $1 LIMIT 1
    `, [clientAccountId]);
    if (clientUserRes.rows[0]?.user_id) {
      await dbClient.query(`
        INSERT INTO team_members (team_id, user_id, role, status)
        VALUES ($1, $2, 'Owner', 'Active')
        ON CONFLICT (team_id, user_id) DO UPDATE SET status = 'Active'
      `, [teamId, clientUserRes.rows[0].user_id]);
    }

    // E. Create team contract workspace
    const wsRes = await dbClient.query(`
      INSERT INTO team_contract_workspaces (team_id, contract_id, created_by_account_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (team_id, contract_id) DO NOTHING
      RETURNING workspace_id
    `, [teamId, contractId, clientAccountId]);
    const workspaceId = wsRes.rows[0]?.workspace_id;

    // F. Pre-populate tasks from job_milestones
    const milestonesRes = await dbClient.query(`
      SELECT job_milestone_id, title, description, tasks, order_index
        FROM job_milestones
       WHERE job_id = $1
       ORDER BY order_index ASC
    `, [jobId]);

    if (workspaceId && milestonesRes.rows.length > 0) {
      for (const ms of milestonesRes.rows) {
        const isLocked = Number(ms.order_index) > 0;
        let taskItems = [];
        try {
          taskItems = Array.isArray(ms.tasks) ? ms.tasks : JSON.parse(ms.tasks || '[]');
        } catch (_) {
          taskItems = [];
        }

        const milestoneTitle = String(ms.title || 'Milestone Task').trim().slice(0, 160);

        if (taskItems.length === 0) {
          // Default single task for the milestone if no sub-tasks provided
          await dbClient.query(`
            INSERT INTO team_workspace_tasks (
              workspace_id, job_milestone_id, title, description, status, priority, is_locked, created_by_account_id
            ) VALUES ($1, $2, $3, $4, 'todo', 'normal', $5, $6)
          `, [
            workspaceId,
            ms.job_milestone_id,
            milestoneTitle,
            ms.description || '',
            isLocked,
            clientAccountId
          ]);
        } else {
          for (let i = 0; i < taskItems.length; i++) {
            const item = taskItems[i];
            const rawTitle = typeof item === 'string' ? item : (item.title || item.task || `Task ${i + 1}`);
            const taskTitle = String(rawTitle).trim().slice(0, 160);
            const taskDesc = typeof item === 'object' ? (item.description || '') : '';
            await dbClient.query(`
              INSERT INTO team_workspace_tasks (
                workspace_id, job_milestone_id, title, description, status, priority, is_locked, sort_order, created_by_account_id
              ) VALUES ($1, $2, $3, $4, 'todo', 'normal', $5, $6, $7)
            `, [
              workspaceId,
              ms.job_milestone_id,
              taskTitle,
              taskDesc,
              isLocked,
              i,
              clientAccountId
            ]);
          }
        }
      }
    }
  } else {
    teamId = teamRes.rows[0].team_id;
    teamAccountId = teamRes.rows[0].account_id;

    // Link this contract to the team contract workspace
    await dbClient.query(`
      INSERT INTO team_contract_workspaces (team_id, contract_id, created_by_account_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (team_id, contract_id) DO NOTHING
    `, [teamId, contractId, clientAccountId]);
  }

  // 4. Register Freelancer in team_members
  const freelancerUserRes = await dbClient.query(`
    SELECT user_id FROM users WHERE account_id = $1 LIMIT 1
  `, [freelancerAccountId]);
  if (freelancerUserRes.rows[0]?.user_id) {
    await dbClient.query(`
      INSERT INTO team_members (team_id, user_id, role, status)
      VALUES ($1, $2, 'Member', 'Active')
      ON CONFLICT (team_id, user_id) DO UPDATE SET status = 'Active'
    `, [teamId, freelancerUserRes.rows[0].user_id]);
  }

  // 5. Get workspace ID
  const wsFind = await dbClient.query(`
    SELECT workspace_id FROM team_contract_workspaces WHERE team_id = $1 LIMIT 1
  `, [teamId]);
  const primaryWorkspaceId = wsFind.rows[0]?.workspace_id;

  if (primaryWorkspaceId) {
    // Add to team_workspace_members
    await dbClient.query(`
      INSERT INTO team_workspace_members (workspace_id, account_id, added_by_account_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (workspace_id, account_id) DO NOTHING
    `, [primaryWorkspaceId, freelancerAccountId, clientAccountId]);

    // If freelancer applied for a specific milestone role, assign those tasks to them
    if (targetMilestoneId) {
      const tasksToAssign = await dbClient.query(`
        SELECT task_id FROM team_workspace_tasks 
         WHERE workspace_id = $1 AND job_milestone_id = $2
      `, [primaryWorkspaceId, targetMilestoneId]);

      for (const t of tasksToAssign.rows) {
        await dbClient.query(`
          INSERT INTO team_workspace_task_assignees (task_id, account_id, assigned_by_account_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (task_id, account_id) DO NOTHING
        `, [t.task_id, freelancerAccountId, clientAccountId]);
      }
    }

    // Record activity in team_workspace_activity
    await dbClient.query(`
      INSERT INTO team_workspace_activity (workspace_id, actor_account_id, action, metadata)
      VALUES ($1, $2, 'contract_offer_extended', $3)
    `, [
      primaryWorkspaceId,
      clientAccountId,
      JSON.stringify({
        freelancer_account_id: freelancerAccountId,
        contract_id: contractId,
        proposal_id: proposalId,
        job_milestone_id: targetMilestoneId,
      })
    ]);
  }

  return { team_id: teamId, account_id: teamAccountId };
}

/**
 * Fetch a Contractual Team Project by team_id or job_id.
 * Verifies that viewerAccountId is either client or active member.
 */
async function getTeamProjectDetails(projectIdentifier, viewerAccountId) {
  const query = `
    SELECT t.team_id, t.account_id as team_account_id, t.team_type, t.job_id,
           t.is_archived, t.archived_at, t.created_at as project_created_at,
           a.display_name as project_title, a.handle as project_handle,
           a.tagline, a.description as project_description,
           f.path as thumbnail_path,
           j.title as job_title, j.category as job_category, j.timeline_min, j.timeline_max,
           j.rate_credits_min, j.rate_credits_max,
           client_acc.account_id as client_account_id,
           client_acc.display_name as client_name,
           client_acc.handle as client_handle,
           client_f.path as client_avatar_path,
           CASE 
             WHEN j.client_account_id = $2 THEN 'Client'
             WHEN tm.role IS NOT NULL THEN tm.role
             ELSE 'Viewer'
           END as user_role,
           (j.client_account_id = $2) as is_client,
           tcw.workspace_id
      FROM teams t
      JOIN accounts a ON a.account_id = t.account_id
      LEFT JOIN files f ON f.file_id = a.avatar_file_id
      JOIN jobs j ON j.job_id = t.job_id
      JOIN accounts client_acc ON client_acc.account_id = j.client_account_id
      LEFT JOIN files client_f ON client_f.file_id = client_acc.avatar_file_id
      LEFT JOIN users u ON u.account_id = $2
      LEFT JOIN team_members tm ON tm.team_id = t.team_id AND tm.user_id = u.user_id AND tm.status = 'Active'
      LEFT JOIN team_contract_workspaces tcw ON tcw.team_id = t.team_id
     WHERE (t.team_id::text = $1 OR t.job_id::text = $1)
       AND t.team_type = 'contractual'
       AND t.deleted_at IS NULL
       AND (j.client_account_id = $2 OR tm.user_id IS NOT NULL)
     LIMIT 1
  `;
  const res = await pool.query(query, [String(projectIdentifier), viewerAccountId]);
  if (res.rows.length === 0) return null;
  return res.rows[0];
}

/**
 * Fetch taskboard cards for the project.
 */
async function getProjectTaskboard(teamId, viewerAccountId) {
  const query = `
    SELECT twt.task_id, twt.workspace_id, twt.job_milestone_id,
           twt.title, twt.description, twt.status, twt.priority,
           twt.is_locked, twt.sort_order, twt.checklist, twt.starts_at, twt.due_at,
           twt.completed_at, twt.created_at,
           jm.title as milestone_title, jm.order_index as milestone_order,
           jm.budget_credits as milestone_budget,
           assignee_acc.account_id as assignee_account_id,
           assignee_acc.display_name as assignee_name,
           assignee_acc.handle as assignee_handle,
           assignee_f.path as assignee_avatar_path
      FROM team_contract_workspaces tcw
      JOIN team_workspace_tasks twt ON twt.workspace_id = tcw.workspace_id
      LEFT JOIN job_milestones jm ON jm.job_milestone_id = twt.job_milestone_id
      LEFT JOIN team_workspace_task_assignees twta ON twta.task_id = twt.task_id
      LEFT JOIN accounts assignee_acc ON assignee_acc.account_id = twta.account_id
      LEFT JOIN files assignee_f ON assignee_f.file_id = assignee_acc.avatar_file_id
     WHERE tcw.team_id = $1
       AND twt.deleted_at IS NULL
     ORDER BY COALESCE(jm.order_index, 0) ASC, twt.sort_order ASC, twt.created_at ASC
  `;
  const res = await pool.query(query, [teamId]);
  return res.rows;
}

/**
 * Update a task on the taskboard with ownership enforcement.
 */
async function updateProjectTask(teamId, taskId, viewerAccountId, { title, description, status, checklist, priority, due_at }) {
  // Verify permissions: Viewer must be assigned to task OR be the client owner
  const permRes = await pool.query(`
    SELECT twt.task_id, t.account_id as team_account_id, j.client_account_id,
           twta.account_id as assignee_account_id, twt.is_locked
      FROM team_workspace_tasks twt
      JOIN team_contract_workspaces tcw ON twt.workspace_id = tcw.workspace_id
      JOIN teams t ON t.team_id = tcw.team_id
      JOIN jobs j ON j.job_id = t.job_id
      LEFT JOIN team_workspace_task_assignees twta ON twta.task_id = twt.task_id
     WHERE tcw.team_id = $1 AND twt.task_id = $2 AND twt.deleted_at IS NULL
  `, [teamId, taskId]);

  if (permRes.rows.length === 0) {
    throw new Error('Task not found in this team project.');
  }

  const { client_account_id, assignee_account_id, is_locked } = permRes.rows[0];
  const isAuthorized = String(viewerAccountId) === String(client_account_id) ||
                       String(viewerAccountId) === String(assignee_account_id);

  if (!isAuthorized) {
    throw new Error('You do not have permission to modify this task.');
  }

  if (is_locked && String(viewerAccountId) !== String(client_account_id)) {
    throw new Error('This task is locked waiting for previous milestones to be completed.');
  }

  const updateRes = await pool.query(`
    UPDATE team_workspace_tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           checklist = COALESCE($4, checklist),
           priority = COALESCE($5, priority),
           due_at = COALESCE($6, due_at),
           completed_at = CASE WHEN $3 = 'completed' THEN NOW() WHEN $3 IS NOT NULL AND $3 != 'completed' THEN NULL ELSE completed_at END,
           updated_at = NOW()
     WHERE task_id = $7
    RETURNING *
  `, [
    title || null,
    description !== undefined ? description : null,
    status || null,
    checklist ? JSON.stringify(checklist) : null,
    priority || null,
    due_at || null,
    taskId
  ]);

  // Log activity
  const wsRes = await pool.query(`SELECT workspace_id FROM team_contract_workspaces WHERE team_id = $1 LIMIT 1`, [teamId]);
  if (wsRes.rows[0]?.workspace_id) {
    await pool.query(`
      INSERT INTO team_workspace_activity (workspace_id, task_id, actor_account_id, action, metadata)
      VALUES ($1, $2, $3, 'task_updated', $4)
    `, [
      wsRes.rows[0].workspace_id,
      taskId,
      viewerAccountId,
      JSON.stringify({ status, priority, title })
    ]);
  }

  return updateRes.rows[0];
}

/**
 * Create a new task on the taskboard.
 */
async function createProjectTask(teamId, viewerAccountId, { title, description, priority, job_milestone_id, assignee_account_id, checklist }) {
  const wsRes = await pool.query(`
    SELECT tcw.workspace_id, j.client_account_id
      FROM team_contract_workspaces tcw
      JOIN teams t ON t.team_id = tcw.team_id
      JOIN jobs j ON j.job_id = t.job_id
     WHERE tcw.team_id = $1
     LIMIT 1
  `, [teamId]);

  if (wsRes.rows.length === 0) throw new Error('Project workspace not found');
  const { workspace_id, client_account_id } = wsRes.rows[0];

  const taskRes = await pool.query(`
    INSERT INTO team_workspace_tasks (
      workspace_id, job_milestone_id, title, description, status, priority, is_locked, checklist, created_by_account_id
    ) VALUES ($1, $2, $3, $4, 'todo', COALESCE($5, 'normal'), FALSE, $6, $7)
    RETURNING *
  `, [
    workspace_id,
    job_milestone_id || null,
    title,
    description || '',
    priority || 'normal',
    JSON.stringify(checklist || []),
    viewerAccountId
  ]);

  const task = taskRes.rows[0];

  if (assignee_account_id) {
    await pool.query(`
      INSERT INTO team_workspace_task_assignees (task_id, account_id, assigned_by_account_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (task_id, account_id) DO NOTHING
    `, [task.task_id, assignee_account_id, viewerAccountId]);
  }

  await pool.query(`
    INSERT INTO team_workspace_activity (workspace_id, task_id, actor_account_id, action, metadata)
    VALUES ($1, $2, $3, 'task_created', $4)
  `, [workspace_id, task.task_id, viewerAccountId, JSON.stringify({ title, priority })]);

  return task;
}

/**
 * Delete a task card (soft delete).
 */
async function deleteProjectTask(teamId, taskId, viewerAccountId) {
  const permRes = await pool.query(`
    SELECT twt.task_id, t.account_id as team_account_id, j.client_account_id, twt.created_by_account_id
      FROM team_workspace_tasks twt
      JOIN team_contract_workspaces tcw ON twt.workspace_id = tcw.workspace_id
      JOIN teams t ON t.team_id = tcw.team_id
      JOIN jobs j ON j.job_id = t.job_id
     WHERE tcw.team_id = $1 AND twt.task_id = $2 AND twt.deleted_at IS NULL
  `, [teamId, taskId]);

  if (permRes.rows.length === 0) throw new Error('Task not found');
  const { client_account_id, created_by_account_id } = permRes.rows[0];
  const isAuthorized = String(viewerAccountId) === String(client_account_id) ||
                       String(viewerAccountId) === String(created_by_account_id);

  if (!isAuthorized) throw new Error('Unauthorized to delete this task');

  await pool.query(`
    UPDATE team_workspace_tasks SET deleted_at = NOW() WHERE task_id = $1
  `, [taskId]);

  return { success: true };
}

/**
 * Unlocks sequential milestone tasks and auto-archives team project when all contracts are complete.
 */
async function unlockSequentialMilestones(dbClient, contractId, completedMilestoneIndex) {
  const infoRes = await dbClient.query(`
    SELECT t.team_id, tcw.workspace_id, j.job_id, p.job_milestone_id, jm.order_index
      FROM team_contract_workspaces tcw
      JOIN teams t ON t.team_id = tcw.team_id
      JOIN jobs j ON j.job_id = t.job_id
      LEFT JOIN job_contracts jc ON jc.contract_id = tcw.contract_id
      LEFT JOIN proposals p ON p.proposal_id = jc.proposal_id
      LEFT JOIN job_milestones jm ON jm.job_milestone_id = p.job_milestone_id
     WHERE tcw.contract_id = $1 AND t.team_type = 'contractual'
     LIMIT 1
  `, [contractId]);

  if (infoRes.rows.length === 0) return;
  const { team_id, workspace_id, job_id, order_index } = infoRes.rows[0];

  const currentOrder = order_index !== null ? Number(order_index) : (completedMilestoneIndex || 0);
  const nextOrder = currentOrder + 1;

  // Unlock tasks for the next milestone in this workspace
  await dbClient.query(`
    UPDATE team_workspace_tasks twt
       SET is_locked = FALSE, updated_at = NOW()
      FROM job_milestones jm
     WHERE twt.workspace_id = $1
       AND twt.job_milestone_id = jm.job_milestone_id
       AND jm.job_id = $2
       AND jm.order_index <= $3
  `, [workspace_id, job_id, nextOrder]);

  await dbClient.query(`
    INSERT INTO team_workspace_activity (workspace_id, actor_account_id, action, metadata)
    VALUES ($1, (SELECT client_account_id FROM jobs WHERE job_id = $2), 'milestone_unlocked', $3)
  `, [workspace_id, job_id, JSON.stringify({ unlocked_milestone_order: nextOrder })]);

  // Check if all contracts in this team are complete
  const pendingContractsRes = await dbClient.query(`
    SELECT COUNT(*) as count
      FROM team_contract_workspaces tcw
      JOIN contracts c ON c.contract_id = tcw.contract_id
     WHERE tcw.team_id = $1
       AND c.status NOT IN ('Done', 'Completed', 'Cancelled')
  `, [team_id]);

  const pendingCount = parseInt(pendingContractsRes.rows[0]?.count || '0', 10);
  if (pendingCount === 0) {
    await dbClient.query(`
      UPDATE teams
         SET is_archived = TRUE, archived_at = NOW()
       WHERE team_id = $1 AND is_archived = FALSE
    `, [team_id]);

    await dbClient.query(`
      INSERT INTO team_workspace_activity (workspace_id, actor_account_id, action, metadata)
      VALUES ($1, (SELECT client_account_id FROM jobs WHERE job_id = $2), 'team_project_archived', $3)
    `, [workspace_id, job_id, JSON.stringify({ reason: 'All milestones and contracts finished' })]);
  }
}

/**
 * Edit team project details (Only client owner).
 */
async function updateProjectDetails(teamId, viewerAccountId, { title, description }) {
  const permRes = await pool.query(`
    SELECT t.team_id, t.account_id, j.client_account_id
      FROM teams t
      JOIN jobs j ON j.job_id = t.job_id
     WHERE t.team_id = $1 AND t.team_type = 'contractual'
  `, [teamId]);

  if (permRes.rows.length === 0) throw new Error('Project not found');
  if (String(permRes.rows[0].client_account_id) !== String(viewerAccountId)) {
    throw new Error('Only the client owner can edit this project.');
  }

  await pool.query(`
    UPDATE accounts
       SET display_name = COALESCE($1, display_name),
           description = COALESCE($2, description),
           updated_at = NOW()
     WHERE account_id = $3
  `, [title || null, description !== undefined ? description : null, permRes.rows[0].account_id]);

  return { success: true };
}

/**
 * Delete team project (Only client owner).
 */
async function deleteProject(teamId, viewerAccountId) {
  const permRes = await pool.query(`
    SELECT t.team_id, j.client_account_id
      FROM teams t
      JOIN jobs j ON j.job_id = t.job_id
     WHERE t.team_id = $1 AND t.team_type = 'contractual'
  `, [teamId]);

  if (permRes.rows.length === 0) throw new Error('Project not found');
  if (String(permRes.rows[0].client_account_id) !== String(viewerAccountId)) {
    throw new Error('Only the client owner can delete this project.');
  }

  await pool.query(`
    UPDATE teams SET deleted_at = NOW() WHERE team_id = $1
  `, [teamId]);

  return { success: true };
}

/**
 * Fetch member's contract(s) for the project.
 * Client sees all contracts; Freelancer sees only their own.
 */
async function getProjectContracts(teamId, viewerAccountId) {
  const isClientRes = await pool.query(`
    SELECT (j.client_account_id = $2) as is_client
      FROM teams t
      JOIN jobs j ON j.job_id = t.job_id
     WHERE t.team_id = $1
  `, [teamId, viewerAccountId]);

  const isClient = Boolean(isClientRes.rows[0]?.is_client);

  const query = `
    SELECT c.contract_id, c.contract_type, c.status as contract_status,
           c.rate_credits, c.starts_at, c.deadline_at, c.created_at,
           p.proposal_id, p.job_milestone_id,
           jm.title as milestone_title, jm.order_index as milestone_order,
           freelancer_acc.account_id as freelancer_account_id,
           freelancer_acc.display_name as freelancer_name,
           freelancer_acc.handle as freelancer_handle,
           freelancer_f.path as freelancer_avatar_path,
           (
             SELECT json_agg(json_build_object(
               'id', cm.contract_milestone_id,
               'index', cm.index,
               'name', cm.name,
               'description', cm.description,
               'status', cm.status,
               'credits', cm.credits,
               'revisions_max', cm.no_of_revisions_max,
               'deadline_at', cm.deadline_at
             ) ORDER BY cm.index ASC)
             FROM contract_milestones cm
             WHERE cm.contract_id = c.contract_id
           ) as milestones
      FROM team_contract_workspaces tcw
      JOIN contracts c ON c.contract_id = tcw.contract_id
      JOIN job_contracts jc ON jc.contract_id = c.contract_id
      JOIN proposals p ON p.proposal_id = jc.proposal_id
      LEFT JOIN job_milestones jm ON jm.job_milestone_id = p.job_milestone_id
      JOIN accounts freelancer_acc ON freelancer_acc.account_id = p.freelancer_account_id
      LEFT JOIN files freelancer_f ON freelancer_f.file_id = freelancer_acc.avatar_file_id
     WHERE tcw.team_id = $1
       AND ($2 = TRUE OR p.freelancer_account_id = $3)
     ORDER BY COALESCE(jm.order_index, 0) ASC, c.created_at ASC
  `;

  const res = await pool.query(query, [teamId, isClient, viewerAccountId]);
  return res.rows;
}

/**
 * Fetch project activity history log.
 */
async function getProjectHistory(teamId) {
  const query = `
    SELECT twa.activity_id, twa.action, twa.metadata, twa.created_at,
           a.account_id as actor_account_id,
           a.display_name as actor_name,
           a.handle as actor_handle,
           f.path as actor_avatar_path,
           twt.title as task_title
      FROM team_contract_workspaces tcw
      JOIN team_workspace_activity twa ON twa.workspace_id = tcw.workspace_id
      JOIN accounts a ON a.account_id = twa.actor_account_id
      LEFT JOIN files f ON f.file_id = a.avatar_file_id
      LEFT JOIN team_workspace_tasks twt ON twt.task_id = twa.task_id
     WHERE tcw.team_id = $1
     ORDER BY twa.created_at DESC
     LIMIT 100
  `;
  const res = await pool.query(query, [teamId]);
  return res.rows;
}

/**
 * Fetch project members roster.
 */
async function getProjectMembers(teamId) {
  const query = `
    SELECT DISTINCT ON (a.account_id)
           a.account_id, a.display_name, a.handle,
           f.path as avatar_path,
           tm.role as team_role,
           jm.title as milestone_role,
           jm.order_index as milestone_order,
           c.contract_id,
           c.status as contract_status,
           tm.joined_at
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.team_id AND tm.status = 'Active'
      JOIN users u ON u.user_id = tm.user_id
      JOIN accounts a ON a.account_id = u.account_id
      LEFT JOIN files f ON f.file_id = a.avatar_file_id
      LEFT JOIN proposals p ON p.freelancer_account_id = a.account_id AND p.job_id = t.job_id AND p.deleted_at IS NULL
      LEFT JOIN job_contracts jc ON jc.proposal_id = p.proposal_id
      LEFT JOIN contracts c ON c.contract_id = jc.contract_id
      LEFT JOIN job_milestones jm ON jm.job_milestone_id = p.job_milestone_id
     WHERE t.team_id = $1
     ORDER BY a.account_id, tm.role = 'Owner' DESC, COALESCE(jm.order_index, 0) ASC
  `;
  const res = await pool.query(query, [teamId]);
  return res.rows;
}

/**
 * Fetch unified sequential milestones pipeline for team project overview.
 */
async function getProjectMilestones(teamId, viewerAccountId) {
  const query = `
    SELECT 
      jm.job_milestone_id,
      jm.title as milestone_title,
      jm.description as milestone_description,
      jm.order_index,
      jm.budget_credits,
      jm.tasks as milestone_tasks,
      jm.duration_hours,
      
      -- Contract details
      c.contract_id,
      c.status as contract_status,
      c.rate_credits as contract_credits,
      COALESCE(cm.deadline_at, c.deadline_at) as deadline_at,
      cm.contract_milestone_id,
      COALESCE(cm.status, c.status, 'pending') as milestone_status,
      cm.credits as milestone_credits,
      cm.started_at,
      cm.no_of_revisions_max,
      (
        SELECT COUNT(*)::int
        FROM milestone_submits ms
        WHERE ms.contract_milestone_id = cm.contract_milestone_id AND LOWER(ms.status) = 'revision_requested'
      ) as revisions_used,
      (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id', ms.milestone_submit_id,
              'message', ms.message,
              'attachments', ms.attachments,
              'status', ms.status,
              'submitted_at', ms.submitted_at,
              'responded_at', ms.responded_at
            ) ORDER BY ms.submitted_at DESC
          ),
          '[]'::json
        )
        FROM milestone_submits ms
        WHERE ms.contract_milestone_id = cm.contract_milestone_id
      ) as submissions,
      
      -- Assignee details
      freelancer_acc.account_id as assignee_account_id,
      freelancer_acc.display_name as assignee_name,
      freelancer_acc.handle as assignee_handle,
      freelancer_f.path as assignee_avatar_path,
      
      -- Task counts for this milestone
      (
        SELECT COUNT(*) 
        FROM team_workspace_tasks twt 
        JOIN team_contract_workspaces tcw ON twt.workspace_id = tcw.workspace_id
        WHERE tcw.team_id = t.team_id AND twt.job_milestone_id = jm.job_milestone_id AND twt.deleted_at IS NULL
      ) as total_tasks,
      (
        SELECT COUNT(*) 
        FROM team_workspace_tasks twt 
        JOIN team_contract_workspaces tcw ON twt.workspace_id = tcw.workspace_id
        WHERE tcw.team_id = t.team_id AND twt.job_milestone_id = jm.job_milestone_id AND twt.deleted_at IS NULL AND twt.status = 'completed'
      ) as completed_tasks

    FROM teams t
    JOIN jobs j ON j.job_id = t.job_id
    JOIN job_milestones jm ON jm.job_id = j.job_id
    LEFT JOIN proposals p ON p.job_milestone_id = jm.job_milestone_id AND p.status IN ('Hired', 'accepted', 'active', 'completed')
    LEFT JOIN job_contracts jc ON jc.proposal_id = p.proposal_id
    LEFT JOIN contracts c ON c.contract_id = jc.contract_id AND c.status != 'Cancelled'
    LEFT JOIN contract_milestones cm ON cm.contract_id = c.contract_id
    LEFT JOIN accounts freelancer_acc ON freelancer_acc.account_id = p.freelancer_account_id
    LEFT JOIN files freelancer_f ON freelancer_f.file_id = freelancer_acc.avatar_file_id
    WHERE t.team_id = $1
    ORDER BY jm.order_index ASC
  `;
  const res = await pool.query(query, [teamId]);

  let allPreviousCompleted = true;
  let currentFound = false;

  return res.rows.map((row) => {
    const statusLower = String(row.milestone_status || '').toLowerCase();
    const contractStatusLower = String(row.contract_status || '').toLowerCase();
    const isCompleted = statusLower === 'completed' || statusLower === 'approved' || contractStatusLower === 'done' || contractStatusLower === 'completed';
    
    let isCurrent = false;
    let isUpcoming = false;
    let isLocked = false;

    if (isCompleted) {
      isCurrent = false;
      isUpcoming = false;
      isLocked = false;
    } else {
      if (allPreviousCompleted && !currentFound) {
        isCurrent = true;
        currentFound = true;
        isUpcoming = false;
        isLocked = false;
      } else {
        isCurrent = false;
        isUpcoming = true;
        isLocked = true;
      }
      allPreviousCompleted = false;
    }

    let parsedTasks = [];
    try {
      parsedTasks = Array.isArray(row.milestone_tasks) ? row.milestone_tasks : JSON.parse(row.milestone_tasks || '[]');
    } catch (_) {
      parsedTasks = [];
    }

    return {
      ...row,
      milestone_tasks: parsedTasks,
      total_tasks: parseInt(row.total_tasks || '0', 10),
      completed_tasks: parseInt(row.completed_tasks || '0', 10),
      budget_credits: Number(row.budget_credits || row.contract_credits || 0),
      is_completed: isCompleted,
      is_current: isCurrent,
      is_upcoming: isUpcoming,
      is_locked: isLocked,
    };
  });
}

async function ensureContractualMember(teamId, accountId, role = 'Member') {
  const userRes = await pool.query('SELECT user_id FROM users WHERE account_id = $1 LIMIT 1', [accountId]);
  const userId = userRes.rows[0]?.user_id;
  if (!userId) return null;
  return (await pool.query(`
    INSERT INTO team_members (team_id, user_id, role, status)
    VALUES ($1, $2, $3, 'Active')
    ON CONFLICT (team_id, user_id) DO UPDATE SET status = 'Active'
    RETURNING *
  `, [teamId, userId, role])).rows[0] || null;
}

module.exports = {
  ensureContractualTeamProject,
  getTeamProjectDetails,
  getProjectTaskboard,
  createProjectTask,
  updateProjectTask,
  deleteProjectTask,
  unlockSequentialMilestones,
  updateProjectDetails,
  deleteProject,
  getProjectContracts,
  getProjectHistory,
  getProjectMembers,
  getProjectMilestones,
  ensureContractualMember,
};


