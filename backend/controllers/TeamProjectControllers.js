const TeamProjectServices = require('../services/TeamProjectServices');

function getAccountId(req) {
  return req.user?.account_id || req.user?.accountId || req.session?.account_id;
}

const wrap = (fn, successCode = 200) => async (req, res) => {
  try {
    const accountId = getAccountId(req);
    if (!accountId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const data = await fn(req, accountId);
    return res.status(successCode).json({ success: true, data });
  } catch (error) {
    console.error('TeamProject Controller Error:', error);
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Internal server error' });
  }
};

module.exports = {
  getDetails: wrap((req, accountId) => TeamProjectServices.getProjectDetails(req.params.id, accountId)),
  getTaskboard: wrap((req, accountId) => TeamProjectServices.getProjectTaskboard(req.params.id, accountId)),
  updateTask: wrap((req, accountId) => TeamProjectServices.updateProjectTask(req.params.id, req.params.taskId, accountId, req.body)),
  createTask: wrap((req, accountId) => TeamProjectServices.createProjectTask(req.params.id, accountId, req.body), 201),
  deleteTask: wrap((req, accountId) => TeamProjectServices.deleteProjectTask(req.params.id, req.params.taskId, accountId)),
  getContracts: wrap((req, accountId) => TeamProjectServices.getProjectContracts(req.params.id, accountId)),
  getMilestones: wrap((req, accountId) => TeamProjectServices.getProjectMilestones(req.params.id, accountId)),
  getHistory: wrap((req, accountId) => TeamProjectServices.getProjectHistory(req.params.id, accountId)),
  getMembers: wrap((req, accountId) => TeamProjectServices.getProjectMembers(req.params.id, accountId)),
  getSubcontractProposals: wrap((req, accountId) => TeamProjectServices.getSubcontractProposals(req.params.id, accountId)),
  createSubcontractProposal: wrap((req, accountId) => TeamProjectServices.createSubcontractProposal(req.params.id, accountId, req.body), 201),
  decideSubcontractProposal: wrap((req, accountId) => TeamProjectServices.decideSubcontractProposal(req.params.id, req.params.proposalId, accountId, req.body)),
  withdrawSubcontractProposal: wrap((req, accountId) => TeamProjectServices.withdrawSubcontractProposal(req.params.id, req.params.proposalId, accountId)),
  updateProject: wrap((req, accountId) => TeamProjectServices.updateProjectDetails(req.params.id, accountId, req.body)),
  deleteProject: wrap((req, accountId) => TeamProjectServices.deleteProject(req.params.id, accountId)),
  reportProject: wrap((req, accountId) => TeamProjectServices.reportProject(req.params.id, accountId, req.body), 201),
  getChat: wrap((req, accountId) => TeamProjectServices.getProjectChat(req.params.id, accountId)),
  getVideoProjects: wrap((req, accountId) => TeamProjectServices.getVideoProjects(req.params.id, accountId)),
  getAvailableVideoProjects: wrap((req, accountId) => TeamProjectServices.getAvailableVideoProjects(req.params.id, accountId)),
  createVideoProject: wrap((req, accountId) => TeamProjectServices.createVideoProject(req.params.id, accountId, req.body), 201),
  linkVideoProject: wrap((req, accountId) => TeamProjectServices.linkVideoProject(req.params.id, accountId, req.body)),
  unlinkVideoProject: wrap((req, accountId) => TeamProjectServices.unlinkVideoProject(req.params.id, req.params.projectId, accountId)),
};
