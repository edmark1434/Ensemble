const TeamProjectRepositories = require('../repositories/TeamProjectRepositories');
const TeamsServices = require('./TeamsServices');
const { createNotificationServices } = require('./NotificationServices');
const { getIo } = require('../lib/WebSocket');

function emitSubcontractUpdate(teamId, payload = {}) {
  try {
    const io = getIo();
    if (!io) return;
    const data = {
      team_id: String(teamId),
      teamId: String(teamId),
      ...payload,
    };
    io.emit('subcontractProposalsUpdated', data);
    io.emit('teamTaskWorkspaceUpdated', data);
  } catch (err) {
    console.warn('Failed to emit subcontract realtime update:', err);
  }
}

const withAvatar = (row) => {
  if (!row) return row;
  const base = String(process.env.CLOUDFRONT_URL || process.env.AWS_CLOUDFRONT_URL || '').replace(/\/$/, '');
  const formatPath = (path) => {
    if (!path || /^https?:\/\//i.test(path)) return path;
    const presetMatch = String(path).match(/p\d+\.png$/i);
    if (presetMatch) return `/profile_presets/${presetMatch[0]}`;
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
  const result = await TeamProjectRepositories.updateProjectTask(teamId, taskId, viewerAccountId, data);
  emitSubcontractUpdate(teamId, { action: 'task_updated', task_id: taskId });
  return result;
}

async function updateEditorTask(teamId, taskId, viewerAccountId, changes) {
  const fail = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    throw error;
  };
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (![teamId, taskId, viewerAccountId].every(value => typeof value === 'string' && uuid.test(value))) {
    fail('Invalid task update.', 400);
  }
  const allowedFields = ['status', 'priority', 'starts_at', 'due_at'];
  if (!changes || typeof changes !== 'object' || Array.isArray(changes) ||
      !Object.keys(changes).length || Object.keys(changes).some(key => !allowedFields.includes(key))) {
    fail('Unsupported task changes.', 400);
  }
  const data = { ...changes };
  if (data.status === 'pending') data.status = 'todo';
  if (data.status === 'review') data.status = 'in_review';
  if (data.status !== undefined && !['todo', 'in_progress', 'in_review'].includes(data.status)) {
    fail('Choose To do, In progress, or In review.', 422);
  }
  if (data.priority !== undefined && !['low', 'normal', 'high', 'urgent'].includes(data.priority)) {
    fail('Invalid task priority.', 422);
  }
  for (const field of ['starts_at', 'due_at']) {
    if (data[field] === null) data[field] = 'CLEAR';
    if (data[field] !== undefined && data[field] !== 'CLEAR' &&
        (typeof data[field] !== 'string' || !Number.isFinite(Date.parse(data[field])))) {
      fail('Invalid task date & time.', 422);
    }
  }
  const tasks = await getProjectTaskboard(teamId, viewerAccountId);
  const task = tasks.find(item => String(item.task_id) === taskId);
  if (!task?.assignees?.some(assignee => String(assignee.account_id) === viewerAccountId)) {
    fail('Task unavailable or no longer assigned to you.', 403);
  }
  return updateProjectTask(teamId, taskId, viewerAccountId, data);
}

async function createProjectTask(teamId, viewerAccountId, data) {
  if (!data?.title) {
    const error = new Error('Task title is required');
    error.statusCode = 422;
    throw error;
  }
  const result = await TeamProjectRepositories.createProjectTask(teamId, viewerAccountId, data);
  emitSubcontractUpdate(teamId, { action: 'task_created', task_id: result.task_id });
  return result;
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
  const members = await TeamProjectRepositories.getProjectMembers(teamId, viewerAccountId);
  return members.map(withAvatar);
}

async function getAvailableTeamMembers(teamId, viewerAccountId) {
  await getProjectDetails(teamId, viewerAccountId);
  const members = await TeamProjectRepositories.getAvailableTeamMembersForProject(teamId, viewerAccountId);
  return members.map(withAvatar);
}

async function addProjectTeamMembers(teamId, accountIds, viewerAccountId) {
  await getProjectDetails(teamId, viewerAccountId);
  const result = await TeamProjectRepositories.addProjectTeamMembers(teamId, accountIds, viewerAccountId);
  try {
    if (typeof TeamsServices.syncChat === 'function') {
      await TeamsServices.syncChat(teamId);
    }
  } catch (err) {
    console.warn('Failed to sync project chat after adding members:', err.message);
  }
  try {
    if (Array.isArray(result.added_account_ids)) {
      for (const accId of result.added_account_ids) {
        await createNotificationServices({
          account_id: accId,
          message: `You were added as a contributor to the project workspace "${result.project_title || 'Team Project'}".`,
          is_read: false,
          reference_table: 'teams',
          reference_prefix: 'WORKSPACE_MEMBER_ADDED',
          reference_path: `/team-project/${teamId}`,
        });
      }
    }
  } catch (err) {
    console.warn('Failed to send member added notification:', err.message);
  }
  emitSubcontractUpdate(teamId, { action: 'members_added', account_ids: result.added_account_ids });
  return result;
}

async function removeProjectMember(teamId, memberAccountId, viewerAccountId) {
  await getProjectDetails(teamId, viewerAccountId);
  const result = await TeamProjectRepositories.removeProjectMember(teamId, memberAccountId, viewerAccountId);
  try {
    if (typeof TeamsServices.syncChat === 'function') {
      await TeamsServices.syncChat(teamId);
    }
  } catch (err) {
    console.warn('Failed to sync project chat after member removal:', err.message);
  }
  try {
    if (memberAccountId) {
      await createNotificationServices({
        account_id: memberAccountId,
        message: `You were removed from the project workspace "${result.project_title || 'Team Project'}".`,
        is_read: false,
        reference_table: 'teams',
        reference_prefix: 'WORKSPACE_MEMBER_REMOVED',
        reference_path: '/workspaces',
      });
    }
  } catch (err) {
    console.warn('Failed to send member removal notification:', err.message);
  }
  emitSubcontractUpdate(teamId, { action: 'member_removed', account_id: memberAccountId });
  return result;
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
    if (Array.isArray(result.members)) {
      for (const m of result.members) {
        if (m.candidate_account_id) {
          await createNotificationServices({
            account_id: m.candidate_account_id,
            message: `@${result.lead_handle || 'Freelancer'} invited you to a contract as ${m.role_title || 'a specialist'}. Waiting for the project owner's approval.`,
            is_read: false,
            reference_table: 'teams',
            reference_prefix: 'SUBCONTRACT_MEMBER_NOMINATED',
            reference_path: '/notifications',
          });
        }
      }
    }
  } catch (e) {
    console.warn('Failed to send subcontract proposal notification:', e);
  }
  emitSubcontractUpdate(teamId, { action: 'created', proposal_id: result.proposal_id });
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
        } else if (m.status === 'rejected' && m.candidate_account_id) {
          await createNotificationServices({
            account_id: m.candidate_account_id,
            message: `Your subcontract invitation under @${result.lead_handle || 'Freelancer'}'s contract as ${m.role_title || 'a specialist'} was declined by the project owner.`,
            is_read: false,
            reference_table: 'teams',
            reference_prefix: 'SUBCONTRACT_MEMBER_DECLINED',
            reference_path: '/notifications',
          });
        }
      }
    }
  } catch (e) {
    console.warn('Failed to send subcontract decision notification:', e);
  }
  emitSubcontractUpdate(teamId, { action: 'decided', proposal_id: proposalId, status: result.status });
  return result;
}

async function withdrawSubcontractProposal(teamId, proposalId, viewerAccountId) {
  if (!proposalId) {
    const error = new Error('Proposal ID is required');
    error.statusCode = 400;
    throw error;
  }
  const result = await TeamProjectRepositories.withdrawSubcontractProposal(teamId, proposalId, viewerAccountId);
  emitSubcontractUpdate(teamId, { action: 'withdrawn', proposal_id: proposalId });
  return result;
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
  getAvailableTeamMembers,
  addProjectTeamMembers,
  removeProjectMember,
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
