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

    // F. Pre-populate tasks from job_milestones or contract_milestones
    let milestonesRes = await dbClient.query(`
      SELECT job_milestone_id, title, description, tasks, order_index
        FROM job_milestones
       WHERE job_id = $1
       ORDER BY order_index ASC
    `, [jobId]);

    if (workspaceId && milestonesRes.rows.length === 0) {
      milestonesRes = await dbClient.query(`
        SELECT contract_milestone_id as job_milestone_id, name as title, description, '[]'::jsonb as tasks, index as order_index
          FROM contract_milestones
         WHERE contract_id = $1
         ORDER BY index ASC
      `, [contractId]);
    }

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
    } else {
      // General/solo hire: assign all workspace tasks to the hired contributor
      const allTasks = await dbClient.query(`
        SELECT task_id FROM team_workspace_tasks 
         WHERE workspace_id = $1
      `, [primaryWorkspaceId]);
      for (const t of allTasks.rows) {
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
           twt.title, twt.description,
           CASE WHEN twt.status = 'in_review' THEN 'review' ELSE twt.status END as status,
           twt.priority,
           twt.is_locked, twt.sort_order, twt.checklist, twt.starts_at, twt.due_at,
           twt.completed_at, twt.created_at,
           twt.created_by_account_id,
           CASE WHEN twt.created_by_account_id = j.client_account_id THEN true ELSE false END as is_contract_task,
           jm.title as milestone_title, jm.order_index as milestone_order,
           jm.budget_credits as milestone_budget,
           assignee_acc.account_id as assignee_account_id,
           assignee_acc.display_name as assignee_name,
           assignee_acc.handle as assignee_handle,
           assignee_f.path as assignee_avatar_path
      FROM team_contract_workspaces tcw
      JOIN teams t ON t.team_id = tcw.team_id
      JOIN jobs j ON j.job_id = t.job_id
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
           twta.account_id as assignee_account_id, twt.is_locked, twt.created_by_account_id,
           twt.job_milestone_id
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

  const { client_account_id, assignee_account_id, is_locked, created_by_account_id, job_milestone_id } = permRes.rows[0];
  const isAssignee = String(viewerAccountId) === String(assignee_account_id);
  const isClient = String(viewerAccountId) === String(client_account_id);
  const isContractTask = String(created_by_account_id) === String(client_account_id);

  // Check if viewer is a subcontractor in this workspace
  const subRes = await pool.query(`
    SELECT cs.assigned_milestone_id, cs.permissions, cs.parent_contractor_account_id
      FROM contract_subcontractors cs
      JOIN team_contract_workspaces tcw ON tcw.contract_id = cs.contract_id
     WHERE tcw.team_id = $1 AND cs.account_id = $2
     LIMIT 1
  `, [teamId, viewerAccountId]);

  const isSubcontractor = subRes.rows.length > 0;
  if (isSubcontractor) {
    const sub = subRes.rows[0];
    const subPerms = sub.permissions || {};
    // Strict milestone check: must belong to subcontractor's assigned milestone
    if (sub.assigned_milestone_id && job_milestone_id && String(sub.assigned_milestone_id) !== String(job_milestone_id)) {
      const err = new Error('Subcontractors can only view and modify tasks under their assigned contract milestone.');
      err.statusCode = 403;
      throw err;
    }
    if (status !== undefined && status !== null && subPerms.can_update_task_status === false) {
      const err = new Error('Your subcontractor permissions do not allow modifying task status.');
      err.statusCode = 403;
      throw err;
    }
    if (isContractTask && (title !== undefined && title !== null)) {
      throw new Error('Contract-defined milestone tasks cannot be renamed.');
    }
  } else if (!isAssignee && !isClient) {
    // Check if viewer is the primary freelancer for this milestone's contract
    const leadRes = await pool.query(`
      SELECT 1 FROM team_contract_workspaces tcw
        JOIN contracts c ON c.contract_id = tcw.contract_id
        JOIN job_contracts jc ON jc.contract_id = c.contract_id
        JOIN proposals p ON p.proposal_id = jc.proposal_id
       WHERE tcw.team_id = $1 AND c.freelancer_account_id = $2
         AND (p.job_milestone_id = $3 OR $3 IS NULL)
       LIMIT 1
    `, [teamId, viewerAccountId, job_milestone_id]);

    if (leadRes.rows.length === 0) {
      throw new Error('You do not have permission to modify this task.');
    }
  }

  // Contract task title/description cannot be modified by contributors
  if (isContractTask && (title !== undefined && title !== null)) {
    throw new Error('Contract-defined milestone tasks cannot be edited.');
  }

  // Only the person assigned to the task, the primary contractor, or client can change its status
  if (status !== undefined && status !== null && !isAssignee && !isClient && !isSubcontractor) {
    throw new Error('Only the assigned team member can change the status of this task.');
  }

  if (is_locked && !isClient) {
    throw new Error('This task is locked waiting for previous milestones to be completed.');
  }

  const normalizedStatus = status === 'review' ? 'in_review' : status;

  const updateRes = await pool.query(`
    UPDATE team_workspace_tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           checklist = COALESCE($4, checklist),
           priority = COALESCE($5, priority),
           due_at = CASE WHEN $6 = 'CLEAR' THEN NULL WHEN $6 IS NOT NULL THEN $6::timestamptz ELSE due_at END,
           completed_at = CASE WHEN $3 = 'completed' THEN NOW() WHEN $3 IS NOT NULL AND $3 != 'completed' THEN NULL ELSE completed_at END,
           updated_at = NOW()
     WHERE task_id = $7
    RETURNING *
  `, [
    title || null,
    description !== undefined ? description : null,
    normalizedStatus || null,
    checklist ? JSON.stringify(checklist) : null,
    priority || null,
    due_at !== undefined ? due_at : null,
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
 * Auto-assigns to the creator (the contributor). Clients cannot create tasks.
 */
async function createProjectTask(teamId, viewerAccountId, { title, description, priority, job_milestone_id, checklist }) {
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

  // Clients cannot create tasks on the taskboard
  if (String(viewerAccountId) === String(client_account_id)) {
    const error = new Error('Clients cannot add tasks to the team workspace; tasks are managed by assigned contributors.');
    error.statusCode = 403;
    throw error;
  }

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

  // The creator is automatically the assigned contributor (members cannot assign tasks to someone else)
  await pool.query(`
    INSERT INTO team_workspace_task_assignees (task_id, account_id, assigned_by_account_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (task_id, account_id) DO NOTHING
  `, [task.task_id, viewerAccountId, viewerAccountId]);

  await pool.query(`
    INSERT INTO team_workspace_activity (workspace_id, task_id, actor_account_id, action, metadata)
    VALUES ($1, $2, $3, 'task_created', $4)
  `, [workspace_id, task.task_id, viewerAccountId, JSON.stringify({ title, priority })]);

  return task;
}

/**
 * Delete a task card (soft delete).
 * Contract-defined tasks cannot be deleted.
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
  const isContractTask = String(created_by_account_id) === String(client_account_id);

  if (isContractTask) {
    throw new Error('Contract-defined milestone tasks cannot be deleted.');
  }

  const isCreator = String(viewerAccountId) === String(created_by_account_id);
  if (!isCreator) throw new Error('Unauthorized to delete this task; only its creator can remove it.');
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
           COALESCE(jm.title, cs_jm.title, cs.role_title) as milestone_role,
           COALESCE(jm.order_index, cs_jm.order_index) as milestone_order,
           COALESCE(c.contract_id, cs.contract_id) as contract_id,
           c.status as contract_status,
           tm.joined_at,
           (tm.role = 'Subcontractor' OR cs.account_id IS NOT NULL) as is_subcontractor,
           cs.parent_contractor_account_id,
           lead_acc.display_name as parent_contractor_name,
           lead_acc.handle as parent_contractor_handle,
           lead_f.path as parent_contractor_avatar_path,
           COALESCE(p.job_milestone_id, cs.assigned_milestone_id) as assigned_milestone_id,
           COALESCE(jm.title, cs_jm.title) as assigned_milestone_title,
           cs.permissions as subcontractor_permissions
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.team_id AND tm.status = 'Active'
      JOIN users u ON u.user_id = tm.user_id
      JOIN accounts a ON a.account_id = u.account_id
      LEFT JOIN files f ON f.file_id = a.avatar_file_id
      LEFT JOIN proposals p ON p.freelancer_account_id = a.account_id AND p.job_id = t.job_id AND p.deleted_at IS NULL
      LEFT JOIN job_contracts jc ON jc.proposal_id = p.proposal_id
      LEFT JOIN contracts c ON c.contract_id = jc.contract_id
      LEFT JOIN job_milestones jm ON jm.job_milestone_id = p.job_milestone_id
      LEFT JOIN contract_subcontractors cs ON cs.account_id = a.account_id
           AND cs.contract_id IN (
             SELECT tcw2.contract_id FROM team_contract_workspaces tcw2 WHERE tcw2.team_id = t.team_id
           )
      LEFT JOIN accounts lead_acc ON lead_acc.account_id = cs.parent_contractor_account_id
      LEFT JOIN files lead_f ON lead_f.file_id = lead_acc.avatar_file_id
      LEFT JOIN job_milestones cs_jm ON cs_jm.job_milestone_id = cs.assigned_milestone_id
     WHERE t.team_id = $1
     ORDER BY a.account_id, tm.role = 'Owner' DESC, COALESCE(jm.order_index, cs_jm.order_index, 0) ASC
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
      c.starts_at as contract_starts_at,
      c.created_at as contract_created_at,
      c.deadline_at as contract_overall_deadline,
      COALESCE(
        cm.deadline_at,
        cm.started_at + (COALESCE(jm.duration_hours, 72) || ' hours')::interval,
        c.starts_at + (COALESCE(jm.duration_hours, 72) || ' hours')::interval,
        c.created_at + (COALESCE(jm.duration_hours, 72) || ' hours')::interval,
        c.deadline_at
      ) as deadline_at,
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

async function getSubcontractProposals(teamId, viewerAccountId) {
  const proposalsRes = await pool.query(`
    SELECT p.proposal_id, p.team_id, p.contract_id, p.lead_account_id,
           p.status, p.terms_accepted, p.terms_accepted_at,
           p.proposal_notes, p.client_feedback,
           p.reviewed_by_account_id, p.reviewed_at,
           p.created_at, p.updated_at,
           lead_acc.display_name as lead_name,
           lead_acc.handle as lead_handle,
           lead_f.path as lead_avatar_path,
           rev_acc.display_name as reviewer_name,
           rev_acc.handle as reviewer_handle
      FROM team_subcontract_proposals p
      JOIN accounts lead_acc ON lead_acc.account_id = p.lead_account_id
      LEFT JOIN files lead_f ON lead_f.file_id = lead_acc.avatar_file_id
      LEFT JOIN accounts rev_acc ON rev_acc.account_id = p.reviewed_by_account_id
     WHERE p.team_id = $1
     ORDER BY p.created_at DESC
  `, [teamId]);

  if (proposalsRes.rows.length === 0) return [];

  const proposalIds = proposalsRes.rows.map((p) => p.proposal_id);

  const membersRes = await pool.query(`
    SELECT pm.proposal_member_id, pm.proposal_id, pm.contract_id,
           pm.candidate_account_id, pm.role_title, pm.assigned_milestone_id,
           pm.agreed_credits, pm.permissions, pm.status, pm.client_notes,
           pm.decided_at, pm.created_at,
           cand_acc.display_name as candidate_name,
           cand_acc.handle as candidate_handle,
           cand_f.path as candidate_avatar_path,
           jm.title as milestone_title,
           jm.order_index as milestone_order
      FROM team_subcontract_proposal_members pm
      JOIN accounts cand_acc ON cand_acc.account_id = pm.candidate_account_id
      LEFT JOIN files cand_f ON cand_f.file_id = cand_acc.avatar_file_id
      LEFT JOIN job_milestones jm ON jm.job_milestone_id = pm.assigned_milestone_id
     WHERE pm.proposal_id = ANY($1::uuid[])
     ORDER BY pm.created_at ASC
  `, [proposalIds]);

  const membersByProposal = {};
  for (const m of membersRes.rows) {
    if (!membersByProposal[m.proposal_id]) {
      membersByProposal[m.proposal_id] = [];
    }
    membersByProposal[m.proposal_id].push(m);
  }

  return proposalsRes.rows.map((p) => ({
    ...p,
    members: membersByProposal[p.proposal_id] || [],
  }));
}

async function createSubcontractProposal(teamId, viewerAccountId, { contract_id, members, proposal_notes, terms_accepted }) {
  // 1. Verify contract belongs to team and viewer is the primary freelancer
  const contractRes = await pool.query(`
    SELECT c.contract_id, c.freelancer_account_id, j.client_account_id,
           lead_acc.display_name as lead_name, lead_acc.handle as lead_handle
      FROM team_contract_workspaces tcw
      JOIN contracts c ON c.contract_id = tcw.contract_id
      JOIN teams t ON t.team_id = tcw.team_id
      JOIN jobs j ON j.job_id = t.job_id
      JOIN accounts lead_acc ON lead_acc.account_id = c.freelancer_account_id
     WHERE tcw.team_id = $1 AND c.contract_id = $2
     LIMIT 1
  `, [teamId, contract_id]);

  if (contractRes.rows.length === 0) {
    const err = new Error('Contract not found in this team project.');
    err.statusCode = 404;
    throw err;
  }

  const { freelancer_account_id, client_account_id, lead_name, lead_handle } = contractRes.rows[0];

  if (String(freelancer_account_id) !== String(viewerAccountId)) {
    const err = new Error('Only the assigned contract freelancer can nominate subcontractors.');
    err.statusCode = 403;
    throw err;
  }

  // 2. Validate candidates
  for (const m of members) {
    const candId = m.candidate_account_id || m.account_id;
    if (!candId) {
      const err = new Error('Each team member must specify a valid account ID.');
      err.statusCode = 422;
      throw err;
    }
    if (String(candId) === String(client_account_id)) {
      const err = new Error('Cannot add the project client as a subcontractor.');
      err.statusCode = 422;
      throw err;
    }
    if (String(candId) === String(viewerAccountId)) {
      const err = new Error('You cannot nominate yourself as a subcontractor.');
      err.statusCode = 422;
      throw err;
    }

    // Check if already an active member in this project team
    const existingActive = await pool.query(`
      SELECT 1 FROM team_members tm
      JOIN users u ON u.user_id = tm.user_id
      WHERE tm.team_id = $1 AND u.account_id = $2 AND tm.status = 'Active'
      LIMIT 1
    `, [teamId, candId]);

    if (existingActive.rows.length > 0) {
      const candUser = await pool.query('SELECT handle, display_name FROM accounts WHERE account_id = $1', [candId]);
      const handle = candUser.rows[0]?.handle || candUser.rows[0]?.display_name || 'User';
      const err = new Error(`@${handle} is already an active member in this project workspace.`);
      err.statusCode = 409;
      throw err;
    }
  }

  // 3. Insert proposal and members in transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const propRes = await client.query(`
      INSERT INTO team_subcontract_proposals (
        team_id, contract_id, lead_account_id, status, terms_accepted, terms_accepted_at, proposal_notes
      ) VALUES ($1, $2, $3, 'pending', $4, NOW(), $5)
      RETURNING *
    `, [
      teamId,
      contract_id,
      viewerAccountId,
      Boolean(terms_accepted),
      proposal_notes?.trim() || null,
    ]);

    const proposal = propRes.rows[0];
    const createdMembers = [];

    for (const m of members) {
      const candId = m.candidate_account_id || m.account_id;
      const memRes = await client.query(`
        INSERT INTO team_subcontract_proposal_members (
          proposal_id, contract_id, candidate_account_id, role_title,
          assigned_milestone_id, agreed_credits, permissions, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
        RETURNING *
      `, [
        proposal.proposal_id,
        contract_id,
        candId,
        m.role_title?.trim() || 'Video Editor',
        m.assigned_milestone_id || null,
        m.agreed_credits ? Number(m.agreed_credits) : null,
        JSON.stringify(m.permissions || {
          can_view_tasks: true,
          can_update_task_status: true,
          can_upload_drafts: true,
          can_create_subtasks: false,
        }),
      ]);
      createdMembers.push(memRes.rows[0]);
    }

    // Activity log
    const wsRes = await client.query('SELECT workspace_id FROM team_contract_workspaces WHERE team_id = $1 LIMIT 1', [teamId]);
    if (wsRes.rows[0]?.workspace_id) {
      await client.query(`
        INSERT INTO team_workspace_activity (workspace_id, actor_account_id, action, metadata)
        VALUES ($1, $2, 'subcontract_proposal_submitted', $3)
      `, [
        wsRes.rows[0].workspace_id,
        viewerAccountId,
        JSON.stringify({
          proposal_id: proposal.proposal_id,
          member_count: members.length,
          contract_id,
        }),
      ]);
    }

    await client.query('COMMIT');

    return {
      ...proposal,
      lead_name,
      lead_handle,
      client_account_id,
      members: createdMembers,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function decideSubcontractProposal(teamId, proposalId, viewerAccountId, { decision, member_decisions, client_feedback }) {
  // 1. Fetch proposal & verify client
  const propRes = await pool.query(`
    SELECT p.*, j.client_account_id, tcw.workspace_id,
           lead_acc.display_name as lead_name, lead_acc.handle as lead_handle
      FROM team_subcontract_proposals p
      JOIN teams t ON t.team_id = p.team_id
      JOIN jobs j ON j.job_id = t.job_id
      LEFT JOIN team_contract_workspaces tcw ON tcw.team_id = t.team_id
      JOIN accounts lead_acc ON lead_acc.account_id = p.lead_account_id
     WHERE p.proposal_id = $1 AND p.team_id = $2
     LIMIT 1
  `, [proposalId, teamId]);

  if (propRes.rows.length === 0) {
    const err = new Error('Subcontract proposal not found.');
    err.statusCode = 404;
    throw err;
  }

  const proposal = propRes.rows[0];

  if (String(viewerAccountId) !== String(proposal.client_account_id)) {
    const err = new Error('Only the project client can approve or reject subcontract requests.');
    err.statusCode = 403;
    throw err;
  }

  if (proposal.status !== 'pending') {
    const err = new Error(`This proposal has already been resolved (${proposal.status}).`);
    err.statusCode = 400;
    throw err;
  }

  const membersRes = await pool.query(
    'SELECT * FROM team_subcontract_proposal_members WHERE proposal_id = $1',
    [proposalId]
  );
  const proposalMembers = membersRes.rows;

  const decisionsMap = {};
  if (Array.isArray(member_decisions)) {
    for (const d of member_decisions) {
      decisionsMap[d.proposal_member_id] = d;
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let approvedCount = 0;
    let rejectedCount = 0;

    for (const member of proposalMembers) {
      const explicitDecision = decisionsMap[member.proposal_member_id];
      const memberStatus = explicitDecision ? explicitDecision.status : (decision === 'rejected' ? 'rejected' : 'approved');
      const clientNotes = explicitDecision?.client_notes || client_feedback || null;

      if (memberStatus === 'approved') {
        approvedCount++;
        await client.query(`
          UPDATE team_subcontract_proposal_members
             SET status = 'approved',
                 client_notes = $1,
                 decided_at = NOW()
           WHERE proposal_member_id = $2
        `, [clientNotes, member.proposal_member_id]);

        // Find candidate user_id
        const userRes = await client.query('SELECT user_id FROM users WHERE account_id = $1 LIMIT 1', [member.candidate_account_id]);
        const candUserId = userRes.rows[0]?.user_id;

        if (candUserId) {
          // 1. Add to team_members as Subcontractor
          await client.query(`
            INSERT INTO team_members (team_id, user_id, role, status, joined_at, invited_by_account_id)
            VALUES ($1, $2, 'Subcontractor', 'Active', NOW(), $3)
            ON CONFLICT (team_id, user_id)
            DO UPDATE SET role = 'Subcontractor', status = 'Active', deleted_at = NULL, updated_at = NOW()
          `, [teamId, candUserId, proposal.lead_account_id]);

          // 2. Upsert into contract_subcontractors
          await client.query(`
            INSERT INTO contract_subcontractors (
              contract_id, account_id, role_title, agreed_credits,
              assigned_milestone_id, parent_contractor_account_id,
              permissions, proposal_member_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (contract_id, account_id)
            DO UPDATE SET
              role_title = EXCLUDED.role_title,
              agreed_credits = EXCLUDED.agreed_credits,
              assigned_milestone_id = EXCLUDED.assigned_milestone_id,
              parent_contractor_account_id = EXCLUDED.parent_contractor_account_id,
              permissions = EXCLUDED.permissions,
              proposal_member_id = EXCLUDED.proposal_member_id
          `, [
            proposal.contract_id,
            member.candidate_account_id,
            member.role_title,
            member.agreed_credits,
            member.assigned_milestone_id,
            proposal.lead_account_id,
            member.permissions,
            member.proposal_member_id,
          ]);

          // 3. Auto-assign to tasks under the milestone if assigned_milestone_id exists
          if (member.assigned_milestone_id && proposal.workspace_id) {
            await client.query(`
              INSERT INTO team_workspace_task_assignees (task_id, account_id, assigned_by_account_id)
              SELECT twt.task_id, $1, $2
                FROM team_workspace_tasks twt
               WHERE twt.workspace_id = $3 AND twt.job_milestone_id = $4 AND twt.deleted_at IS NULL
              ON CONFLICT (task_id, account_id) DO NOTHING
            `, [
              member.candidate_account_id,
              viewerAccountId,
              proposal.workspace_id,
              member.assigned_milestone_id,
            ]);
          }
        }
      } else {
        rejectedCount++;
        await client.query(`
          UPDATE team_subcontract_proposal_members
             SET status = 'rejected',
                 client_notes = $1,
                 decided_at = NOW()
           WHERE proposal_member_id = $2
        `, [clientNotes, member.proposal_member_id]);
      }
    }

    const finalStatus =
      approvedCount > 0 && rejectedCount === 0
        ? 'approved'
        : approvedCount === 0 && rejectedCount > 0
        ? 'rejected'
        : 'partially_approved';

    const updatedPropRes = await client.query(`
      UPDATE team_subcontract_proposals
         SET status = $1,
             client_feedback = $2,
             reviewed_by_account_id = $3,
             reviewed_at = NOW(),
             updated_at = NOW()
       WHERE proposal_id = $4
       RETURNING *
    `, [
      finalStatus,
      client_feedback?.trim() || null,
      viewerAccountId,
      proposalId,
    ]);

    // Activity log
    if (proposal.workspace_id) {
      await client.query(`
        INSERT INTO team_workspace_activity (workspace_id, actor_account_id, action, metadata)
        VALUES ($1, $2, 'subcontract_proposal_decided', $3)
      `, [
        proposal.workspace_id,
        viewerAccountId,
        JSON.stringify({
          proposal_id: proposalId,
          status: finalStatus,
          approved_count: approvedCount,
          rejected_count: rejectedCount,
        }),
      ]);
    }

    await client.query('COMMIT');

    return {
      ...updatedPropRes.rows[0],
      lead_account_id: proposal.lead_account_id,
      lead_handle: proposal.lead_handle,
      approved_count: approvedCount,
      rejected_count: rejectedCount,
      members: proposalMembers.map((m) => ({
        ...m,
        status: decisionsMap[m.proposal_member_id]?.status || (decision === 'rejected' ? 'rejected' : 'approved'),
      })),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function withdrawSubcontractProposal(teamId, proposalId, viewerAccountId) {
  const propRes = await pool.query(`
    SELECT * FROM team_subcontract_proposals
     WHERE proposal_id = $1 AND team_id = $2
     LIMIT 1
  `, [proposalId, teamId]);

  if (propRes.rows.length === 0) {
    const err = new Error('Proposal not found.');
    err.statusCode = 404;
    throw err;
  }

  const proposal = propRes.rows[0];
  if (String(viewerAccountId) !== String(proposal.lead_account_id)) {
    const err = new Error('Only the nominating freelancer can withdraw this proposal.');
    err.statusCode = 403;
    throw err;
  }

  if (proposal.status !== 'pending') {
    const err = new Error('Only pending proposals can be withdrawn.');
    err.statusCode = 400;
    throw err;
  }

  await pool.query(`
    UPDATE team_subcontract_proposals
       SET status = 'withdrawn', updated_at = NOW()
     WHERE proposal_id = $1
  `, [proposalId]);

  await pool.query(`
    UPDATE team_subcontract_proposal_members
       SET status = 'withdrawn'
     WHERE proposal_id = $1
  `, [proposalId]);

  return { success: true, proposal_id: proposalId, status: 'withdrawn' };
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
  getSubcontractProposals,
  createSubcontractProposal,
  decideSubcontractProposal,
  withdrawSubcontractProposal,
  ensureContractualMember,
};


