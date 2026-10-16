const TeamProjectRepositories = require('../repositories/TeamProjectRepositories');
const TeamsServices = require('./TeamsServices');

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
  updateProjectDetails,
  deleteProject,
  reportProject,
  getProjectChat,
};
