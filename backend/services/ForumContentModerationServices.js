const {
  getModeratorForumGroups,
  getModeratorForumGroupDetail,
  setForumGroupStatus,
  getModeratorForumDiscussions,
  getModeratorForumDiscussionDetail,
  setForumDiscussionStatus,
  removeForumDiscussionComment,
} = require('../repositories/ForumModeratorRepositories');
const { updateForumGroupMember } = require('../repositories/ForumGroupRepositories');
const { recordAccountActivity } = require('../repositories/AccountActivityRepositories');
const { resolveStaffForSession } = require('../lib/StaffSession');
const { emitForumEvent } = require('../lib/WebSocket');

/**
 * Forum content moderation shared by the admin console (Moderation →
 * Management → Forum) and the Forum Moderator desk. Both consoles get the same
 * validation, the same already-in-that-state guards and the same audit trail;
 * route-level middleware is what decides who may call in.
 */

function forumError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


/**
 * Writes one forum moderation action to the account activity log.
 *
 * Logging is best effort: a forum change that is already committed must not
 * fail because its audit row could not be written.
 */
async function logForumAction({
  accountId,
  action,
  eventCode,
  referenceTable,
  referencePrefix,
  referenceId,
  session,
  metadata,
}) {
  if (!accountId) return;
  try {
    const staff = await resolveStaffForSession(session);
    await recordAccountActivity({
      accountId,
      action,
      eventCode,
      referenceTable,
      referencePrefix,
      referenceId,
      actorStaffId: staff?.staff_id || null,
      actorAccountId: staff?.account_id || session?.account_id || session?.accountId || null,
      metadata,
    });
  } catch (err) {
    console.error('Forum moderation action was applied but not logged:', err.message);
  }
}

async function listForumGroupsForStaff({ search, status } = {}) {
  return getModeratorForumGroups({ search, status });
}

async function getForumGroupForStaff(groupId) {
  return getModeratorForumGroupDetail(groupId);
}

async function setForumGroupVisibility(groupId, body, session) {
  const status = String(body?.status || '').toLowerCase();
  if (status !== 'active' && status !== 'inactive') {
    throw forumError('Set the group to active or inactive');
  }

  const before = await getModeratorForumGroupDetail(groupId);
  if (!before) throw forumError('Group not found', 404);
  if (before.status === status) {
    throw forumError(status === 'active' ? 'This group is already active' : 'This group is already archived', 409);
  }

  await setForumGroupStatus(groupId, status);
  const after = await getModeratorForumGroupDetail(groupId);

  await logForumAction({
    accountId: before.owner?.accountId || null,
    action:
      status === 'inactive'
        ? `Archived forum group “${before.name}”`
        : `Reactivated forum group “${before.name}”`,
    eventCode: status === 'inactive' ? 'FORUM_GROUP_ARCHIVED' : 'FORUM_GROUP_REACTIVATED',
    referenceTable: 'forum_groups',
    referencePrefix: 'GRP',
    referenceId: before.id,
    session,
    metadata: {
      groupId: before.id,
      groupName: before.name,
      previousStatus: before.status,
      status,
      memberCount: before.memberCount,
      discussionCount: before.discussionCount,
      reason: String(body?.reason || '').trim() || null,
    },
  });

  return after;
}

async function banForumGroupMember(groupId, memberId, body, session) {
  if (body?.isBanned == null) throw forumError('Say whether the member is banned');
  const isBanned = Boolean(body.isBanned);

  const before = await getModeratorForumGroupDetail(groupId);
  if (!before) throw forumError('Group not found', 404);
  const member = before.members.find((row) => String(row.userId) === String(memberId));
  if (!member) throw forumError('Group member not found', 404);
  if (member.isBanned === isBanned) {
    throw forumError(isBanned ? 'This member is already banned' : 'This member is not banned', 409);
  }

  const result = await updateForumGroupMember(groupId, memberId, {
    is_banned: isBanned,
    banned_at: isBanned ? new Date() : null,
  });
  if (!result?.matchedCount) throw forumError('Group member not found', 404);

  try {
    emitForumEvent(isBanned ? 'group.member_banned' : 'group.member_unbanned', { groupId, memberId });
  } catch (err) {
    console.error('Forum member update saved without realtime delivery:', err.message);
  }

  await logForumAction({
    accountId: member.accountId,
    action: isBanned
      ? `Banned ${member.name} from forum group “${before.name}”`
      : `Unbanned ${member.name} in forum group “${before.name}”`,
    eventCode: isBanned ? 'FORUM_MEMBER_BANNED' : 'FORUM_MEMBER_UNBANNED',
    referenceTable: 'forum_groups',
    referencePrefix: 'GRP',
    referenceId: before.id,
    session,
    metadata: {
      groupId: before.id,
      groupName: before.name,
      memberId: String(memberId),
      memberName: member.name,
      memberHandle: member.handle,
      groupRole: member.role,
      reason: String(body?.reason || '').trim() || null,
    },
  });

  return getModeratorForumGroupDetail(groupId);
}

async function listForumDiscussionsForStaff({ groupId, search, status } = {}) {
  return getModeratorForumDiscussions({
    groupId: groupId || undefined,
    search: search ? escapeRegex(search) : undefined,
    status,
  });
}

async function getForumDiscussionForStaff(discussionId) {
  return getModeratorForumDiscussionDetail(discussionId);
}

/** The state changes this patch makes, as audit events. */
function discussionChangeEvents(before, body) {
  const events = [];
  if (body?.status != null) {
    const status = String(body.status).toLowerCase();
    if (status !== before.status) {
      events.push(
        status === 'removed'
          ? { eventCode: 'FORUM_DISCUSSION_REMOVED', verb: 'Removed' }
          : { eventCode: 'FORUM_DISCUSSION_RESTORED', verb: 'Restored' }
      );
    }
  }
  if (body?.isLocked != null && Boolean(body.isLocked) !== before.isLocked) {
    events.push(
      body.isLocked
        ? { eventCode: 'FORUM_DISCUSSION_LOCKED', verb: 'Locked replies on' }
        : { eventCode: 'FORUM_DISCUSSION_UNLOCKED', verb: 'Unlocked replies on' }
    );
  }
  if (body?.isSticky != null && Boolean(body.isSticky) !== before.isSticky) {
    events.push(
      body.isSticky
        ? { eventCode: 'FORUM_DISCUSSION_PINNED', verb: 'Pinned' }
        : { eventCode: 'FORUM_DISCUSSION_UNPINNED', verb: 'Unpinned' }
    );
  }
  return events;
}

async function setForumDiscussionState(discussionId, body, session) {
  const changes = {};
  if (body?.status != null) changes.status = String(body.status).toLowerCase();
  if (body?.isLocked != null) changes.isLocked = Boolean(body.isLocked);
  if (body?.isSticky != null) changes.isSticky = Boolean(body.isSticky);
  if (!Object.keys(changes).length) throw forumError('No moderation fields provided');

  const before = await getModeratorForumDiscussionDetail(discussionId);
  if (!before) throw forumError('Discussion not found', 404);

  const events = discussionChangeEvents(before, body);
  const detail = await setForumDiscussionStatus(discussionId, changes);

  const reason = String(body?.reason || '').trim() || null;
  for (const event of events) {
    await logForumAction({
      accountId: before.author?.accountId || null,
      action: `${event.verb} discussion “${before.title}”`,
      eventCode: event.eventCode,
      referenceTable: 'forum_discussions',
      referencePrefix: 'DSC',
      referenceId: before.id,
      session,
      metadata: {
        discussionId: before.id,
        discussionTitle: before.title,
        groupId: before.groupId,
        groupName: before.groupName,
        authorHandle: before.author?.handle || null,
        previousStatus: before.status,
        wasLocked: before.isLocked,
        wasPinned: before.isSticky,
        commentCount: before.commentCount,
        reason,
      },
    });
  }

  return detail;
}

async function removeForumComment(discussionId, commentId, session) {
  const before = await getModeratorForumDiscussionDetail(discussionId);
  if (!before) throw forumError('Discussion not found', 404);
  const comment = before.comments.find((row) => String(row.commentId) === String(commentId));
  if (!comment) throw forumError('Comment not found', 404);
  if (comment.isDeleted) throw forumError('This comment is already removed', 409);

  const detail = await removeForumDiscussionComment(discussionId, commentId);

  await logForumAction({
    accountId: comment.author?.accountId || null,
    action: `Removed a comment by ${comment.author?.name || 'a member'} in “${before.title}”`,
    eventCode: 'FORUM_COMMENT_REMOVED',
    referenceTable: 'forum_discussions',
    referencePrefix: 'DSC',
    referenceId: before.id,
    session,
    metadata: {
      discussionId: before.id,
      discussionTitle: before.title,
      groupId: before.groupId,
      groupName: before.groupName,
      commentId: String(commentId),
      authorHandle: comment.author?.handle || null,
      // The removed text is kept so a reviewer can judge the call afterwards.
      removedComment: String(comment.comment || '').slice(0, 500) || null,
      likeCount: comment.likeCount,
      replyCount: comment.replyCount,
      postedAt: comment.createdAt || null,
    },
  });

  return detail;
}

module.exports = {
  listForumGroupsForStaff,
  getForumGroupForStaff,
  setForumGroupVisibility,
  banForumGroupMember,
  listForumDiscussionsForStaff,
  getForumDiscussionForStaff,
  setForumDiscussionState,
  removeForumComment,
};
