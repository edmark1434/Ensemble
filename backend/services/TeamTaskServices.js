const TeamTaskRepositories = require('../repositories/TeamTaskRepositories');
const TeamRepositories = require('../repositories/TeamsRepositories');
const { createNotificationServices } = require('./NotificationServices');
const { getIo } = require('../lib/WebSocket');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TASK_STATUSES = new Set(['todo', 'in_progress', 'in_review', 'completed']);
const TASK_PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);

class TeamTaskError extends Error {
  constructor(message, statusCode = 400, code = 'TEAM_TASK_INVALID') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function requireUuid(value, label) {
  const normalized = String(value || '').trim();
  if (!UUID_PATTERN.test(normalized)) {
    throw new TeamTaskError(`A valid ${label} is required`, 422, 'INVALID_ID');
  }
  return normalized;
}

function clean(value, maxLength) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function parseDate(value, label) {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new TeamTaskError(`${label} must be a valid date`, 422);
  return date.toISOString();
}

function uniqueAccountIds(values = []) {
  if (!Array.isArray(values) || values.length > 100) {
    throw new TeamTaskError('Assignees must be an array with at most 100 members', 422);
  }
  return [...new Set(values.map((value) => requireUuid(value, 'member account ID')))];
}

async function teamContext(teamId, actorAccountId) {
  const normalizedTeamId = requireUuid(teamId, 'Team ID');
  const normalizedActorId = requireUuid(actorAccountId, 'account ID');
  const team = await TeamRepositories.getTeam(normalizedTeamId, normalizedActorId);
  if (!team) throw new TeamTaskError('Team not found', 404, 'TEAM_NOT_FOUND');
  const membership = await TeamRepositories.getMembership(normalizedTeamId, normalizedActorId);
  if (!membership || membership.status !== 'Active') {
    throw new TeamTaskError('Only active Team members can access the task dashboard', 403, 'TEAM_ACCESS_FORBIDDEN');
  }
  return {
    teamId: normalizedTeamId,
    actorAccountId: normalizedActorId,
    team,
    membership,
    canManage: ['Owner', 'Admin'].includes(membership.role),
  };
}

async function workspaceContext(teamId, contractId, actorAccountId, { createForManager = false } = {}) {
  const context = await teamContext(teamId, actorAccountId);
  const normalizedContractId = requireUuid(contractId, 'contract ID');
  const contract = await TeamTaskRepositories.getEligibleContract(context.teamId, normalizedContractId);
  if (!contract) throw new TeamTaskError('Active Team contract not found', 404, 'TEAM_CONTRACT_NOT_FOUND');
  let workspace = await TeamTaskRepositories.getWorkspace(context.teamId, normalizedContractId);
  if (!workspace && createForManager && context.canManage) {
    workspace = await TeamTaskRepositories.ensureWorkspace(context.teamId, normalizedContractId, context.actorAccountId);
  }
  if (!workspace) {
    throw new TeamTaskError('This workspace has not been created by a Team Owner or Admin', 404, 'WORKSPACE_NOT_CREATED');
  }
  const isWorkspaceMember = await TeamTaskRepositories.isWorkspaceMember(workspace.workspace_id, context.actorAccountId);
  if (!context.canManage && !isWorkspaceMember) {
    throw new TeamTaskError('You have not been added to this workspace', 403, 'WORKSPACE_ACCESS_FORBIDDEN');
  }
  return { ...context, contractId: normalizedContractId, contract, workspace, isWorkspaceMember };
}

async function getWorkspaceSnapshot(context) {
  const [members, tasks, activity, activeTeamMembers] = await Promise.all([
    TeamTaskRepositories.listWorkspaceMembers(context.workspace.workspace_id),
    TeamTaskRepositories.listWorkspaceTasks(context.workspace.workspace_id),
    TeamTaskRepositories.listWorkspaceActivity(context.workspace.workspace_id),
    TeamRepositories.listMembers(context.teamId, ['Active']),
  ]);
  return {
    workspace: context.workspace,
    contract: context.contract,
    members,
    available_members: activeTeamMembers,
    tasks,
    activity,
    permissions: {
      can_manage: context.canManage,
      can_create_tasks: context.canManage,
      can_manage_members: context.canManage,
    },
    current_account_id: context.actorAccountId,
  };
}

async function emitWorkspaceUpdate(context, action, taskId = null) {
  const audience = await TeamTaskRepositories.listWorkspaceAudience(context.workspace.workspace_id);
  if (!audience.length) return;
  try {
    getIo().to(audience.map(String)).emit('teamTaskWorkspaceUpdated', {
      team_id: context.teamId,
      contract_id: context.contractId,
      workspace_id: context.workspace.workspace_id,
      task_id: taskId,
      action,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Unable to broadcast Team task update:', error.message);
  }
}

async function notifyAssignments(context, accountIds, task) {
  const recipients = [...new Set(accountIds)].filter((accountId) => accountId !== context.actorAccountId);
  for (const accountId of recipients) {
    try {
      const notification = await createNotificationServices({
        message: `You were assigned to "${task.title}" for Team ${context.team.display_name}.`,
        is_read: false,
        reference_table: 'team_workspace_tasks',
        reference_prefix: 'TEAM_TASK_ASSIGNED',
        reference_path: `/teams/${context.teamId}/tasks/${context.contractId}`,
        reference_id: task.task_id,
        account_id: accountId,
      });
      try {
        getIo().to(String(accountId)).emit('notification', notification);
      } catch (_error) {
        // The durable notification remains available after reconnect.
      }
    } catch (error) {
      console.error('Unable to create Team task assignment notification:', error.message);
    }
  }
}

async function listWorkspacesServices(teamId, actorAccountId) {
  const context = await teamContext(teamId, actorAccountId);
  const cards = await TeamTaskRepositories.listContractWorkspaces(context.teamId, context.actorAccountId);
  return {
    items: cards.map((card) => ({
      ...card,
      can_open: context.canManage || Boolean(card.is_workspace_member),
      can_manage: context.canManage,
    })),
    current_user_role: context.membership.role,
  };
}

async function getWorkspaceServices(teamId, contractId, actorAccountId) {
  const context = await workspaceContext(teamId, contractId, actorAccountId, { createForManager: true });
  return getWorkspaceSnapshot(context);
}

async function addMembersServices(teamId, contractId, actorAccountId, payload) {
  const context = await workspaceContext(teamId, contractId, actorAccountId, { createForManager: true });
  if (!context.canManage) throw new TeamTaskError('Only Team Owners and Admins can add workspace members', 403);
  const accountIds = uniqueAccountIds(payload?.account_ids);
  if (!accountIds.length) throw new TeamTaskError('Select at least one Team member', 422);
  const added = await TeamTaskRepositories.addWorkspaceMembers(
    context.workspace.workspace_id,
    context.teamId,
    accountIds,
    context.actorAccountId
  );
  await emitWorkspaceUpdate(context, 'members_added');
  return { added_account_ids: added, ...(await getWorkspaceSnapshot(context)) };
}

async function removeMemberServices(teamId, contractId, memberAccountId, actorAccountId) {
  const context = await workspaceContext(teamId, contractId, actorAccountId, { createForManager: true });
  if (!context.canManage) throw new TeamTaskError('Only Team Owners and Admins can remove workspace members', 403);
  const memberId = requireUuid(memberAccountId, 'member account ID');
  await TeamTaskRepositories.removeWorkspaceMember(context.workspace.workspace_id, memberId, context.actorAccountId);
  await emitWorkspaceUpdate(context, 'member_removed');
  return getWorkspaceSnapshot(context);
}

function normalizeTaskPayload(payload, { partial = false } = {}) {
  const normalized = {};
  if (!partial || payload.title !== undefined) {
    normalized.title = clean(payload.title, 160);
    if (!normalized.title) throw new TeamTaskError('Task title is required', 422);
  }
  if (!partial || payload.description !== undefined) normalized.description = clean(payload.description, 5000) || null;
  if (!partial || payload.status !== undefined) {
    normalized.status = String(payload.status || 'todo');
    if (!TASK_STATUSES.has(normalized.status)) throw new TeamTaskError('Invalid task status', 422);
  }
  if (!partial || payload.priority !== undefined) {
    normalized.priority = String(payload.priority || 'normal');
    if (!TASK_PRIORITIES.has(normalized.priority)) throw new TeamTaskError('Invalid task priority', 422);
  }
  if (!partial || payload.starts_at !== undefined) normalized.startsAt = parseDate(payload.starts_at, 'Start date');
  if (!partial || payload.due_at !== undefined) normalized.dueAt = parseDate(payload.due_at, 'Due date');
  if (normalized.startsAt && normalized.dueAt && new Date(normalized.dueAt) < new Date(normalized.startsAt)) {
    throw new TeamTaskError('Due date cannot be before the start date', 422);
  }
  if (!partial || payload.assignee_account_ids !== undefined) {
    normalized.assigneeAccountIds = uniqueAccountIds(payload.assignee_account_ids || []);
  }
  return normalized;
}

async function createTaskServices(teamId, contractId, actorAccountId, payload) {
  const context = await workspaceContext(teamId, contractId, actorAccountId, { createForManager: true });
  if (!context.canManage) throw new TeamTaskError('Only Team Owners and Admins can create tasks', 403);
  const data = normalizeTaskPayload(payload || {});
  const task = await TeamTaskRepositories.createTask(context.workspace.workspace_id, data, context.actorAccountId);
  await notifyAssignments(context, data.assigneeAccountIds, task);
  await emitWorkspaceUpdate(context, 'task_created', task.task_id);
  return getWorkspaceSnapshot(context);
}

async function updateTaskServices(teamId, contractId, taskId, actorAccountId, payload) {
  const context = await workspaceContext(teamId, contractId, actorAccountId);
  const normalizedTaskId = requireUuid(taskId, 'task ID');
  const existing = await TeamTaskRepositories.getTask(context.workspace.workspace_id, normalizedTaskId);
  if (!existing) throw new TeamTaskError('Task not found', 404, 'TASK_NOT_FOUND');
  const isAssignee = await TeamTaskRepositories.isTaskAssignee(normalizedTaskId, context.actorAccountId);
  if (!context.canManage) {
    if (!isAssignee) throw new TeamTaskError('Only an assignee can update this task', 403);
    if (Object.keys(payload || {}).some((key) => key !== 'status')) {
      throw new TeamTaskError('Task assignees may only update task status', 403);
    }
  }
  const data = normalizeTaskPayload(payload || {}, { partial: true });
  const effectiveStartsAt = data.startsAt !== undefined ? data.startsAt : existing.starts_at;
  const effectiveDueAt = data.dueAt !== undefined ? data.dueAt : existing.due_at;
  if (effectiveStartsAt && effectiveDueAt && new Date(effectiveDueAt) < new Date(effectiveStartsAt)) {
    throw new TeamTaskError('Due date cannot be before the start date', 422);
  }
  const updates = {};
  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.status !== undefined) updates.status = data.status;
  if (data.priority !== undefined) updates.priority = data.priority;
  if (data.startsAt !== undefined) updates.starts_at = data.startsAt;
  if (data.dueAt !== undefined) updates.due_at = data.dueAt;
  if (!Object.keys(updates).length && data.assigneeAccountIds === undefined) {
    throw new TeamTaskError('No task changes were provided', 422);
  }
  const beforeTasks = data.assigneeAccountIds
    ? await TeamTaskRepositories.listWorkspaceTasks(context.workspace.workspace_id)
    : [];
  const previousAssignees = new Set(
    (beforeTasks.find((task) => String(task.task_id) === normalizedTaskId)?.assignees || [])
      .map((assignee) => String(assignee.account_id))
  );
  const task = await TeamTaskRepositories.updateTask(
    context.workspace.workspace_id,
    normalizedTaskId,
    updates,
    data.assigneeAccountIds,
    context.actorAccountId
  );
  if (data.assigneeAccountIds) {
    await notifyAssignments(
      context,
      data.assigneeAccountIds.filter((accountId) => !previousAssignees.has(accountId)),
      task
    );
  }
  await emitWorkspaceUpdate(context, 'task_updated', normalizedTaskId);
  return getWorkspaceSnapshot(context);
}

async function deleteTaskServices(teamId, contractId, taskId, actorAccountId) {
  const context = await workspaceContext(teamId, contractId, actorAccountId);
  if (!context.canManage) throw new TeamTaskError('Only Team Owners and Admins can delete tasks', 403);
  const normalizedTaskId = requireUuid(taskId, 'task ID');
  const task = await TeamTaskRepositories.deleteTask(context.workspace.workspace_id, normalizedTaskId, context.actorAccountId);
  if (!task) throw new TeamTaskError('Task not found', 404, 'TASK_NOT_FOUND');
  await emitWorkspaceUpdate(context, 'task_deleted', normalizedTaskId);
  return getWorkspaceSnapshot(context);
}

module.exports = {
  TeamTaskError,
  listWorkspacesServices,
  getWorkspaceServices,
  addMembersServices,
  removeMemberServices,
  createTaskServices,
  updateTaskServices,
  deleteTaskServices,
};
