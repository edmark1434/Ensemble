const { ObjectId } = require('mongodb');
const { getForumGroupById } = require('../repositories/ForumGroupRepositories');
const { getForumDiscussionById } = require('../repositories/ForumDiscussionRepositories');
const { getUserById } = require('../repositories/UserRepositories');
const { createReport } = require('../repositories/ModeratorSharedRepositories');
const { createReportNumber, buildSubjectSnapshot } = require('../lib/ReportSubject');

/** `reports.type` is varchar(50); a longer reason would fail the insert with a 500. */
const REPORT_TYPE_MAX = 50;
const DESCRIPTION_MIN = 20;
const DESCRIPTION_MAX = 2000;

function reportError(message, statusCode = 400, code = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
}

/** Forum ids are Mongo ObjectIds. A malformed one is a missing item, not a server error. */
function assertForumId(value, label) {
  if (!ObjectId.isValid(String(value || ''))) {
    throw reportError(`${label} not found`, 404);
  }
}

function validateReportDetails(typeOrReason, description) {
  const cleanType = String(typeOrReason || '').trim();
  const cleanDescription = String(description || '').trim();

  if (!cleanType || cleanType.length > REPORT_TYPE_MAX) {
    throw reportError('Choose a reason for this report');
  }
  if (cleanDescription.length < DESCRIPTION_MIN) {
    throw reportError(`Report details must contain at least ${DESCRIPTION_MIN} characters`);
  }
  if (cleanDescription.length > DESCRIPTION_MAX) {
    throw reportError('Report details must not exceed 2,000 characters');
  }

  return { type: cleanType, description: cleanDescription };
}

async function requireUser(userId, message) {
  if (!userId) throw reportError(message, 404);
  const user = await getUserById(userId);
  if (!user) throw reportError(message, 404);
  return user;
}

function displayName(user, fallback) {
  return [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || fallback;
}

function sameUser(left, right) {
  return String(left?.user_id || '') === String(right?.user_id || '');
}

/**
 * Who answers for a group: its owner (the first Admin), else a group moderator. Banned
 * members never stand in for the group.
 */
function groupContact(group) {
  const members = (Array.isArray(group?.members) ? group.members : []).filter(
    (member) => member?.userId && !member.is_banned
  );
  return (
    members.find((member) => member.role === 'Admin') ||
    members.find((member) => member.role === 'Moderator') ||
    null
  );
}

async function submitGroupReport(groupId, payload, session) {
  const reporter = await requireUser(session?.userId, 'Reporter account not found');
  assertForumId(groupId, 'Forum group');
  const group = await getForumGroupById(groupId);
  if (!group) throw reportError('Forum group not found', 404);

  const contact = groupContact(group);
  const target = contact ? await getUserById(contact.userId) : null;
  if (target && sameUser(reporter, target) && contact.role === 'Admin') {
    throw reportError('You cannot report your own forum group', 403);
  }

  const details = validateReportDetails(payload?.type || payload?.reason, payload?.description);
  const label = group.group_name || 'Forum group';
  return createReport({
    reportNumber: createReportNumber(),
    reporterAccountId: reporter.account_id,
    // An ownerless group is still reported so staff can archive it. It then names only the
    // reporter, which makes it a platform report that cannot sanction anyone.
    targetAccountId: target && !sameUser(reporter, target) ? target.account_id : reporter.account_id,
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
  assertForumId(groupId, 'Forum group');
  const group = await getForumGroupById(groupId);
  if (!group) throw reportError('Forum group not found', 404);

  const member = group.members?.find(({ userId }) => String(userId) === String(memberId));
  if (!member) throw reportError('Forum member not found', 404);

  const target = await requireUser(member.userId, 'Forum member not found');
  if (sameUser(reporter, target)) throw reportError('You cannot report yourself', 403);

  const details = validateReportDetails(payload?.type || payload?.reason, payload?.description);
  const targetName = displayName(target, 'Forum member');
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
      title: targetName,
      body: `${targetName} in ${groupName}`,
      href: `/forums/group/${group._id}`,
      extra: { groupId: String(group._id), groupName, groupRole: member.role || 'Member' },
    }),
  });
}

async function submitDiscussionReport(discussionId, payload, session) {
  const reporter = await requireUser(session?.userId, 'Reporter account not found');
  assertForumId(discussionId, 'Forum discussion');
  const discussion = await getForumDiscussionById(discussionId);
  if (!discussion) throw reportError('Forum discussion not found', 404);

  // Discussions store their author as `user_id` (ForumDiscussionServices).
  const author = await requireUser(discussion.user_id, 'Discussion author not found');
  if (sameUser(reporter, author)) {
    throw reportError('You cannot report your own discussion', 403);
  }

  const details = validateReportDetails(payload?.type || payload?.reason, payload?.description);
  const groupId = discussion.forum_group_id;
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

async function submitCommentReport(discussionId, commentId, payload, session) {
  const reporter = await requireUser(session?.userId, 'Reporter account not found');
  assertForumId(discussionId, 'Forum discussion');
  const cleanCommentId = String(commentId || '').trim();
  if (!cleanCommentId || cleanCommentId.length > 100) throw reportError('Comment not found', 404);

  const discussion = await getForumDiscussionById(discussionId);
  if (!discussion) throw reportError('Forum discussion not found', 404);
  const comment = (discussion.comments || []).find(
    (item) => String(item?.comment_id || '') === cleanCommentId
  );
  if (!comment) throw reportError('Comment not found', 404);
  if (comment.deleted_at) {
    throw reportError('This comment was already removed', 409, 'COMMENT_REMOVED');
  }

  const author = await requireUser(comment.user_id, 'Comment author not found');
  if (sameUser(reporter, author)) throw reportError('You cannot report your own comment', 403);

  const details = validateReportDetails(payload?.type || payload?.reason, payload?.description);
  const authorName = displayName(author, 'a member');
  const discussionTitle = discussion.title || 'a discussion';
  return createReport({
    reportNumber: createReportNumber(),
    reporterAccountId: reporter.account_id,
    targetAccountId: author.account_id,
    targetType: 'comment',
    targetId: cleanCommentId,
    referenceTable: 'forum_discussions',
    // The discussion holds the comment, so staff can open it and act on the comment.
    referenceId: String(discussion._id),
    type: details.type,
    description: details.description,
    subjectSnapshot: buildSubjectSnapshot({
      kind: 'comment',
      title: `Comment by ${authorName} on “${discussionTitle}”`,
      body: comment.comment,
      href: `/forums/discussion/${discussion._id}`,
      extra: {
        discussionId: String(discussion._id),
        discussionTitle,
        commentId: cleanCommentId,
        isReply: Boolean(comment.comment_reference_id),
      },
    }),
  });
}

module.exports = {
  submitGroupReport,
  submitMemberReport,
  submitDiscussionReport,
  submitCommentReport,
};
