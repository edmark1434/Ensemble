const TeamTaskServices = require('../services/TeamTaskServices');

function accountId(req) {
  return req.user?.account_id || req.session?.user?.account_id;
}

function sendError(res, error) {
  const status = Number(error.statusCode) || 500;
  return res.status(status).json({
    success: false,
    message: status < 500 ? error.message : 'Unable to process Team task request',
    ...(error.code ? { code: error.code } : {}),
  });
}

async function list(req, res) {
  try {
    const data = await TeamTaskServices.listWorkspacesServices(req.params.teamId, accountId(req));
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Unable to list Team task workspaces:', error.message);
    sendError(res, error);
  }
}

async function detail(req, res) {
  try {
    const data = await TeamTaskServices.getWorkspaceServices(req.params.teamId, req.params.contractId, accountId(req));
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Unable to load Team task workspace:', error.message);
    sendError(res, error);
  }
}

async function addMembers(req, res) {
  try {
    const data = await TeamTaskServices.addMembersServices(req.params.teamId, req.params.contractId, accountId(req), req.body);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Unable to add Team workspace members:', error.message);
    sendError(res, error);
  }
}

async function removeMember(req, res) {
  try {
    const data = await TeamTaskServices.removeMemberServices(
      req.params.teamId,
      req.params.contractId,
      req.params.memberAccountId,
      accountId(req)
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Unable to remove Team workspace member:', error.message);
    sendError(res, error);
  }
}

async function createTask(req, res) {
  try {
    const data = await TeamTaskServices.createTaskServices(req.params.teamId, req.params.contractId, accountId(req), req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Unable to create Team task:', error.message);
    sendError(res, error);
  }
}

async function updateTask(req, res) {
  try {
    const data = await TeamTaskServices.updateTaskServices(
      req.params.teamId,
      req.params.contractId,
      req.params.taskId,
      accountId(req),
      req.body
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Unable to update Team task:', error.message);
    sendError(res, error);
  }
}

async function deleteTask(req, res) {
  try {
    const data = await TeamTaskServices.deleteTaskServices(
      req.params.teamId,
      req.params.contractId,
      req.params.taskId,
      accountId(req)
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Unable to delete Team task:', error.message);
    sendError(res, error);
  }
}

module.exports = { list, detail, addMembers, removeMember, createTask, updateTask, deleteTask };
