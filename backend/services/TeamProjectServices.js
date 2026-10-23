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
  return await TeamProjectRepositories.updateProjectTask(teamId, taskId, viewerAccountId, data);
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
  return await TeamsServices.report(teamId, viewerAccountId, data);
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

module.exports = {
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
};
