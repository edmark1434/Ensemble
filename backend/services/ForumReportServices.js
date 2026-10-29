const { getForumGroupById } = require('../repositories/ForumGroupRepositories');
const { getForumDiscussionById } = require('../repositories/ForumDiscussionRepositories');
const { getUserById } = require('../repositories/UserRepositories');
const { createReport } = require('../repositories/ModeratorSharedRepositories');
const { createReportNumber, buildSubjectSnapshot } = require('../lib/ReportSubject');

function reportError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateReportDetails(typeOrReason, description) {
  const cleanType = String(typeOrReason || '').trim();
  const cleanDescription = String(description || '').trim();

  if (!cleanType || cleanType.length > 100) {
    throw reportError('A valid report type is required');
  }
  if (cleanDescription.length < 20) {
    throw reportError('Report details must contain at least 20 characters');
  }

  return { type: cleanType, description: cleanDescription };
}

async function requireUser(userId, message) {
  const user = await getUserById(userId);
  if (!user) {
    throw reportError(message, 404);
  }
  return user;
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

  const details = validateReportDetails(payload.type || payload.reason, payload.description);
  const label = group.group_name || 'Forum group';
  return createReport({
    reportNumber: createReportNumber(),
    reporterAccountId: reporter.account_id,
    targetAccountId: target.account_id,
    targetType: 'group',
    targetId: String(group._id),
    referenceTable: 'forum_groups',
    type: details.type,
    description: details.description,
    subjectSnapshot: buildSubjectSnapshot({
      kind: 'group',
      title: label,
      body: group.description,
      href: `/forums/group/${group._id}`,
    }),
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

  const details = validateReportDetails(payload.type || payload.reason, payload.description);
  const targetName = [target.first_name, target.last_name].filter(Boolean).join(' ') || target.handle;
  const groupName = group.group_name || 'forum group';
  return createReport({
    reportNumber: createReportNumber(),
    reporterAccountId: reporter.account_id,
    targetAccountId: target.account_id,
    targetType: 'member',
    targetId: String(target.user_id),
    referenceTable: 'forum_groups',
    referenceId: String(group._id),
    type: details.type,
    description: details.description,
    subjectSnapshot: buildSubjectSnapshot({
      kind: 'member',
      title: targetName || 'Forum member',
      body: `${targetName || 'Member'} in ${groupName}`,
      href: `/forums/group/${group._id}`,
    }),
  });
}

async function submitDiscussionReport(discussionId, payload, session) {
  const reporter = await requireUser(session?.userId, 'Reporter account not found');
  const discussion = await getForumDiscussionById(discussionId);
  if (!discussion) {
    throw reportError('Forum discussion not found', 404);
  }

  const author = await requireUser(discussion.author_id || discussion.userId, 'Discussion author not found');
  if (String(reporter.user_id) === String(author.user_id)) {
    throw reportError('You cannot report your own discussion', 403);
  }

  const details = validateReportDetails(payload.type || payload.reason, payload.description);
  const groupId = discussion.forum_group_id || discussion.group_id || discussion.groupId;
  return createReport({
    reportNumber: createReportNumber(),
    reporterAccountId: reporter.account_id,
    targetAccountId: author.account_id,
    targetType: 'discussion',
    targetId: String(discussion._id),
    referenceTable: 'forum_discussions',
    referenceId: groupId ? String(groupId) : null,
    type: details.type,
    description: details.description,
    subjectSnapshot: buildSubjectSnapshot({
      kind: 'discussion',
      title: discussion.title || 'Forum discussion',
      body: discussion.content,
      href: `/forums/discussion/${discussion._id}`,
    }),
  });
}

module.exports = {
  submitGroupReport,
  submitMemberReport,
  submitDiscussionReport,
};
