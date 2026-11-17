const TeamProjectRepositories = require('../repositories/TeamProjectRepositories');
const TeamsServices = require('./TeamsServices');
const { createNotificationServices } = require('./NotificationServices');

const withAvatar = (row) => {
  if (!row) return row;
  const base = String(process.env.CLOUDFRONT_URL || process.env.AWS_CLOUDFRONT_URL || '').replace(/\/$/, '');
  const formatPath = (path) => {
    if (!path || /^https?:\/\//i.test(path)) return path;
    return base ? `${base}/${String(path).replace(/^\/+/, '')}` : path;
  };

  return {
    ...row,
    thumbnail_path: formatPath(row.thumbnail_path),
    client_avatar_path: formatPath(row.client_avatar_path),
    avatar_path: formatPath(row.avatar_path),
    assignee_avatar_path: formatPath(row.assignee_avatar_path),
    actor_avatar_path: formatPath(row.actor_avatar_path),
    freelancer_avatar_path: formatPath(row.freelancer_avatar_path),
    lead_avatar_path: formatPath(row.lead_avatar_path),
    candidate_avatar_path: formatPath(row.candidate_avatar_path),
    parent_contractor_avatar_path: formatPath(row.parent_contractor_avatar_path),
  };
};

async function getProjectDetails(identifier, viewerAccountId) {
  if (!identifier) {
    const error = new Error('Project identifier is required');
    error.statusCode = 400;
    throw error;
  }
  const project = await TeamProjectRepositories.getTeamProjectDetails(identifier, viewerAccountId);
  if (!project) {
    const error = new Error('Team project not found or you are not a member');
    error.statusCode = 404;
    throw error;
  }
  return withAvatar(project);
}

async function getProjectTaskboard(teamId, viewerAccountId) {
  // First ensure viewer has access to this project
  await getProjectDetails(teamId, viewerAccountId);
  const tasks = await TeamProjectRepositories.getProjectTaskboard(teamId, viewerAccountId);
  return tasks.map(withAvatar);
}

async function updateProjectTask(teamId, taskId, viewerAccountId, data) {
  const { starts_at: _startsAt, ...taskChanges } = data || {};
  return await TeamProjectRepositories.updateProjectTask(teamId, taskId, viewerAccountId, taskChanges);
}

async function createProjectTask(teamId, viewerAccountId, data) {
  if (!data?.title) {
    const error = new Error('Task title is required');
    error.statusCode = 422;
    throw error;
  }
  return await TeamProjectRepositories.createProjectTask(teamId, viewerAccountId, data);
}

async function deleteProjectTask(teamId, taskId, viewerAccountId) {
  return await TeamProjectRepositories.deleteProjectTask(teamId, taskId, viewerAccountId);
}

async function getProjectContracts(teamId, viewerAccountId) {
  await getProjectDetails(teamId, viewerAccountId);
  const contracts = await TeamProjectRepositories.getProjectContracts(teamId, viewerAccountId);
  return contracts.map(withAvatar);
}

async function getProjectHistory(teamId, viewerAccountId) {
  await getProjectDetails(teamId, viewerAccountId);
  const history = await TeamProjectRepositories.getProjectHistory(teamId);
  return history.map(withAvatar);
}

async function getProjectMembers(teamId, viewerAccountId) {
  await getProjectDetails(teamId, viewerAccountId);
  const members = await TeamProjectRepositories.getProjectMembers(teamId);
  return members.map(withAvatar);
}

async function updateProjectDetails(teamId, viewerAccountId, data) {
  return await TeamProjectRepositories.updateProjectDetails(teamId, viewerAccountId, data);
}

async function deleteProject(teamId, viewerAccountId) {
  return await TeamProjectRepositories.deleteProject(teamId, viewerAccountId);
}

async function reportProject(teamId, viewerAccountId, data) {
  return await TeamsServices.report(teamId, viewerAccountId, { ...data, source: 'project' });
}

async function getProjectChat(teamId, viewerAccountId) {
  const project = await getProjectDetails(teamId, viewerAccountId);
  await TeamProjectRepositories.ensureContractualMember(
    project.team_id,
    viewerAccountId,
    project.is_client ? 'Owner' : 'Member'
  );
  return await TeamsServices.chat(project.team_id, viewerAccountId);
}

async function getProjectMilestones(teamId, viewerAccountId) {
  await getProjectDetails(teamId, viewerAccountId);
  const milestones = await TeamProjectRepositories.getProjectMilestones(teamId, viewerAccountId);
  return milestones.map(withAvatar);
}

async function getSubcontractProposals(teamId, viewerAccountId) {
  await getProjectDetails(teamId, viewerAccountId);
  const proposals = await TeamProjectRepositories.getSubcontractProposals(teamId, viewerAccountId);
  return proposals.map((p) => ({
    ...withAvatar(p),
    members: (p.members || []).map(withAvatar),
  }));
}

async function createSubcontractProposal(teamId, viewerAccountId, data) {
  if (!data?.contract_id) {
    const error = new Error('Contract ID is required');
    error.statusCode = 400;
    throw error;
  }
  if (!Array.isArray(data?.members) || data.members.length === 0) {
    const error = new Error('At least one candidate specialist must be selected');
    error.statusCode = 422;
    throw error;
  }
  if (!data?.terms_accepted) {
    const error = new Error('You must review and accept the subcontracting terms and lead accountability');
    error.statusCode = 422;
    throw error;
  }
  const result = await TeamProjectRepositories.createSubcontractProposal(teamId, viewerAccountId, data);
  try {
    if (result.client_account_id) {
      await createNotificationServices({
        account_id: result.client_account_id,
        message: `@${result.lead_handle || 'Freelancer'} submitted a subcontract proposal to add ${result.members?.length || 1} team specialist(s) to this project.`,
        is_read: false,
        reference_table: 'teams',
        reference_prefix: 'SUBCONTRACT_PROPOSAL_SUBMITTED',
        reference_path: `/team-project/${teamId}?tab=contract`,
      });
    }
  } catch (e) {
    console.warn('Failed to send subcontract proposal notification:', e);
  }
  return result;
}

async function decideSubcontractProposal(teamId, proposalId, viewerAccountId, data) {
  if (!proposalId) {
    const error = new Error('Proposal ID is required');
    error.statusCode = 400;
    throw error;
  }
  const result = await TeamProjectRepositories.decideSubcontractProposal(teamId, proposalId, viewerAccountId, data);
  try {
    if (result.lead_account_id) {
      await createNotificationServices({
        account_id: result.lead_account_id,
        message: `Your subcontract team proposal was ${result.status === 'approved' ? 'approved' : result.status === 'partially_approved' ? 'partially approved' : 'declined'} by the client.`,
        is_read: false,
        reference_table: 'teams',
        reference_prefix: 'SUBCONTRACT_PROPOSAL_DECIDED',
        reference_path: `/team-project/${teamId}?tab=contract`,
      });
    }
    if (Array.isArray(result.members)) {
      for (const m of result.members) {
        if (m.status === 'approved' && m.candidate_account_id) {
          await createNotificationServices({
            account_id: m.candidate_account_id,
            message: `You were approved to join the project workspace under @${result.lead_handle}'s contract as ${m.role_title}.`,
            is_read: false,
            reference_table: 'teams',
            reference_prefix: 'SUBCONTRACT_MEMBER_APPROVED',
            reference_path: `/team-project/${teamId}?tab=taskboard`,
          });
        }
      }
    }
  } catch (e) {
    console.warn('Failed to send subcontract decision notification:', e);
  }
  return result;
}

async function withdrawSubcontractProposal(teamId, proposalId, viewerAccountId) {
  if (!proposalId) {
    const error = new Error('Proposal ID is required');
    error.statusCode = 400;
    throw error;
  }
  return await TeamProjectRepositories.withdrawSubcontractProposal(teamId, proposalId, viewerAccountId);
}

async function getVideoProjects(teamId, viewerAccountId) {
  const project = await getProjectDetails(teamId, viewerAccountId);
  const projects = await TeamProjectRepositories.getWorkspaceProjects(project.team_id);
  return projects.map(withAvatar);
}

async function getAvailableVideoProjects(teamId, viewerAccountId) {
  const project = await getProjectDetails(teamId, viewerAccountId);
  const projects = await TeamProjectRepositories.getAvailableProjectsForLinking(project.team_id, viewerAccountId);
  return projects.map(withAvatar);
}

async function createVideoProject(teamId, viewerAccountId, data) {
  const project = await getProjectDetails(teamId, viewerAccountId);
  return await TeamProjectRepositories.createWorkspaceProject(project.team_id, viewerAccountId, data);
}

async function linkVideoProject(teamId, viewerAccountId, data) {
  const project = await getProjectDetails(teamId, viewerAccountId);
  return await TeamProjectRepositories.linkWorkspaceProject(project.team_id, viewerAccountId, data.projectId);
}

async function unlinkVideoProject(teamId, projectId, viewerAccountId) {
  const project = await getProjectDetails(teamId, viewerAccountId);
  return await TeamProjectRepositories.unlinkWorkspaceProject(project.team_id, viewerAccountId, projectId);
}

async function updateEditorTask(teamId, taskId, accountId, changes) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const fail = (message, statusCode) => { throw Object.assign(new Error(message), { statusCode }); };
  if (![teamId, taskId, accountId].every(value => typeof value === 'string' && uuid.test(value))) fail('Invalid task request', 400);
  if (!changes || !Object.keys(changes).length || Object.keys(changes).some(key => !['status', 'priority', 'starts_at', 'due_at'].includes(key))) fail('Invalid task changes', 400);
  if (changes.status !== undefined && !['todo', 'in_progress', 'in_review', 'completed'].includes(changes.status)) fail('Invalid task status', 400);
  if (changes.priority !== undefined && !['low', 'normal', 'high', 'urgent'].includes(changes.priority)) fail('Invalid task priority', 400);
  if (changes.starts_at !== undefined
    && (changes.due_at === undefined || (changes.starts_at === null) !== (changes.due_at === null))) {
    fail('Provide both dates to set or clear a task range', 400);
  }
  const normalized = { ...changes };
  for (const field of ['starts_at', 'due_at']) {
    const value = changes[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
      fail('Task dates must be valid dates', 400);
    }
    normalized[field] = new Date(value).toISOString();
  }
  if (normalized.starts_at && normalized.due_at && normalized.starts_at > normalized.due_at) {
    fail('Due date cannot be before the start date', 422);
  }
  changes = normalized;
  const context = await TeamProjectRepositories.getEditorTaskContext(teamId, taskId);
  if (!context) fail('Task not found', 404);
  if (context.team_type === 'contractual') {
    await getProjectDetails(teamId, accountId);
    return TeamProjectRepositories.updateProjectTask(teamId, taskId, accountId, changes.due_at === null
      ? { ...changes, due_at: 'CLEAR' }
      : changes);
  }
  return require('./TeamTaskServices').updateTaskServices(teamId, context.contract_id, taskId, accountId, changes);
}

module.exports = {
  updateEditorTask,
  getProjectDetails,
  getProjectTaskboard,
  updateProjectTask,
  createProjectTask,
  deleteProjectTask,
  getProjectContracts,
  getProjectHistory,
  getProjectMembers,
  getProjectMilestones,
  getSubcontractProposals,
  createSubcontractProposal,
  decideSubcontractProposal,
  withdrawSubcontractProposal,
  updateProjectDetails,
  deleteProject,
  reportProject,
  getProjectChat,
  getVideoProjects,
  getAvailableVideoProjects,
  createVideoProject,
  linkVideoProject,
  unlinkVideoProject,
};
