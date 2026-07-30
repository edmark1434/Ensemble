const { randomUUID } = require('crypto');
const { getForumGroupById } = require('../Repositories/ForumGroupRepositories');
const { getForumDiscussionById } = require('../Repositories/ForumDiscussionRepositories');
const { getUserById } = require('../Repositories/UserRepositories');
const { createReport } = require('../Repositories/ModeratorSharedRepositories');

function reportError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateReportDetails(reason, description) {
  const cleanReason = String(reason || '').trim();
  const cleanDescription = String(description || '').trim();

  if (!cleanReason || cleanReason.length > 100) {
    throw reportError('A valid report reason is required');
  }
  if (cleanDescription.length < 20) {
    throw reportError('Report details must contain at least 20 characters');
  }

  return { reason: cleanReason, description: cleanDescription };
}

async function requireUser(userId, message) {
  const user = await getUserById(userId);
  if (!user) {
    throw reportError(message, 404);
  }
  return user;
}

function createReportNumber() {
  return `RPT-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
}

async function submitGroupReport(groupId, payload, session) {
  const reporter = await requireUser(session?.userId, 'Reporter account not found');
  const group = await getForumGroupById(groupId);
  if (!group) {
    throw reportError('Forum group not found', 404);
  }

  const owner = group.members?.find((member) => member.role === 'Admin');
  const target = await requireUser(owner?.userId, 'Forum group owner not found');
  if (String(reporter.user_id) === String(target.user_id)) {
    throw reportError('You cannot report your own forum group', 403);
  }

  const details = validateReportDetails(payload.reason, payload.description);
  return createReport({
    reportNumber: createReportNumber(),
    reporterAccountId: reporter.account_id,
    targetAccountId: target.account_id,
    targetType: 'group',
    targetId: String(group._id),
    targetLabel: group.group_name || 'Forum group',
    referenceTable: 'forum_groups',
    ...details,
  });
}

async function submitMemberReport(groupId, memberId, payload, session) {
  const reporter = await requireUser(session?.userId, 'Reporter account not found');
  const group = await getForumGroupById(groupId);
  if (!group) {
    throw reportError('Forum group not found', 404);
  }

  const member = group.members?.find(({ userId }) => String(userId) === String(memberId));
  if (!member) {
    throw reportError('Forum member not found', 404);
  }

  const target = await requireUser(member.userId, 'Forum member not found');
  if (String(reporter.user_id) === String(target.user_id)) {
    throw reportError('You cannot report yourself', 403);
  }

  const details = validateReportDetails(payload.reason, payload.description);
  const targetName = [target.first_name, target.last_name].filter(Boolean).join(' ');
  return createReport({
    reportNumber: createReportNumber(),
    reporterAccountId: reporter.account_id,
    targetAccountId: target.account_id,
    targetType: 'member',
    targetId: String(target.user_id),
    targetLabel: targetName || 'Forum member',
    referenceTable: 'users',
    ...details,
  });
}

async function submitDiscussionReport(discussionId, payload, session) {
  const reporter = await requireUser(session?.userId, 'Reporter account not found');
  const discussion = await getForumDiscussionById(discussionId);
  if (!discussion) throw reportError('Forum discussion not found', 404);
  const target = await requireUser(discussion.user_id, 'Discussion author not found');
  if (String(reporter.user_id) === String(target.user_id)) {
    throw reportError('You cannot report your own discussion', 403);
  }
  const details = validateReportDetails(payload.reason, payload.description);
  return createReport({
    reportNumber: createReportNumber(),
    reporterAccountId: reporter.account_id,
    targetAccountId: target.account_id,
    targetType: 'discussion',
    targetId: String(discussion._id),
    targetLabel: discussion.title || 'Forum discussion',
    referenceTable: 'forum_discussions',
    ...details,
  });
}

module.exports = {
  submitGroupReport,
  submitMemberReport,
  submitDiscussionReport,
};
