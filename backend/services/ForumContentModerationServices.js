const {
  getModeratorForumGroups,
  getModeratorForumGroupDetail,
  setForumGroupStatus,
  getModeratorForumDiscussions,
  getModeratorForumDiscussionDetail,
  setForumDiscussionStatus,
  setForumDiscussionCommentHidden,
} = require('../repositories/ForumModeratorRepositories');
const { updateForumGroupMember } = require('../repositories/ForumGroupRepositories');
const { getForumDiscussionById: getPublicForumDiscussion } = require('../repositories/ForumDiscussionRepositories');
const { recordAccountActivity } = require('../repositories/AccountActivityRepositories');
const { resolveStaffForSession } = require('../lib/StaffSession');
const { emitForumEvent } = require('../lib/WebSocket');

/**
 * Forum content moderation shared by the admin console (Moderation →
 * Management → Forum) and the Forum Moderator desk (Forum Control). Both
 * consoles get the same validation, the same already-in-that-state guards and
 * the same audit trail; route-level middleware is what decides who may call in.
 *
 * Nothing here deletes forum content. Every removal is a hide that the same
 * desk can undo; only content a member deleted themselves stays down.
 */

const REASON_MAX_LENGTH = 500;

function forumError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanReason(body) {
  const reason = String(body?.reason || '').trim();
  return reason ? reason.slice(0, REASON_MAX_LENGTH) : null;
}

/** A moderation flag must be a real boolean: `"false"` used to lock a discussion. */
function optionalBoolean(body, field) {
  if (body?.[field] == null) return undefined;
  if (typeof body[field] !== 'boolean') throw forumError(`${field} must be true or false`);
  return body[field];
}

async function staffForSession(session) {
  try {
    return await resolveStaffForSession(session);
  } catch (err) {
    console.error('Could not resolve the staff member for a forum action:', err.message);
    return null;
  }
}

/** Realtime is best effort: the change is already saved and a reload shows it. */
function broadcast(type, payload) {
  try {
    emitForumEvent(type, payload);
  } catch (err) {
    console.error(`Forum ${type} saved without realtime delivery:`, err.message);
  }
}

/** The member-facing discussion (hidden comments masked), or null when members cannot see it. */
async function publicDiscussion(discussionId) {
  try {
    return await getPublicForumDiscussion(discussionId);
  } catch (err) {
    console.error('Could not read the public discussion for a forum event:', err.message);
    return null;
  }
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
  staff,
  metadata,
}) {
  if (!accountId) return;
  try {
    const actor = staff === undefined ? await resolveStaffForSession(session) : staff;
    await recordAccountActivity({
      accountId,
      action,
      eventCode,
      referenceTable,
      referencePrefix,
      referenceId,
      actorStaffId: actor?.staff_id || null,
      actorAccountId: actor?.account_id || session?.account_id || session?.accountId || null,
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
  if (status === 'active' && !before.canReactivate) {
    throw forumError(before.reactivateBlockedReason || 'This group cannot be reactivated', 403);
  }

  const reason = cleanReason(body);
  const staff = await staffForSession(session);
  const changed = await setForumGroupStatus(groupId, status, { staffId: staff?.staff_id || null, reason });
  if (!changed) {
    throw forumError('This group changed while you were working on it. Reload and try again.', 409);
  }
  const after = await getModeratorForumGroupDetail(groupId);

  broadcast(status === 'inactive' ? 'group.deleted' : 'group.restored', { groupId: before.id });

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
    staff,
    metadata: {
      groupId: before.id,
      groupName: before.name,
      previousStatus: before.status,
      previousArchivedBy: before.archivedBy,
      status,
      memberCount: before.memberCount,
      discussionCount: before.discussionCount,
      reason,
    },
  });

  return after;
}

async function banForumGroupMember(groupId, memberId, body, session) {
  const isBanned = optionalBoolean(body, 'isBanned');
  if (isBanned === undefined) throw forumError('Say whether the member is banned');

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

  broadcast(isBanned ? 'group.member_banned' : 'group.member_unbanned', { groupId, memberId });

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
      reason: cleanReason(body),
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

/** The state changes this patch makes, as audit events. `changes` holds real changes only. */
function discussionChangeEvents(changes) {
  const events = [];
  if (changes.status != null) {
    events.push(
      changes.status === 'removed'
        ? { eventCode: 'FORUM_DISCUSSION_REMOVED', verb: 'Removed' }
        : { eventCode: 'FORUM_DISCUSSION_RESTORED', verb: 'Restored' }
    );
  }
  if (changes.isLocked != null) {
    events.push(
      changes.isLocked
        ? { eventCode: 'FORUM_DISCUSSION_LOCKED', verb: 'Locked replies on' }
        : { eventCode: 'FORUM_DISCUSSION_UNLOCKED', verb: 'Unlocked replies on' }
    );
  }
  if (changes.isSticky != null) {
    events.push(
      changes.isSticky
        ? { eventCode: 'FORUM_DISCUSSION_PINNED', verb: 'Pinned' }
        : { eventCode: 'FORUM_DISCUSSION_UNPINNED', verb: 'Unpinned' }
    );
  }
  return events;
}

async function setForumDiscussionState(discussionId, body, session) {
  const requested = {};
  if (body?.status != null) {
    const status = String(body.status).toLowerCase();
    if (status !== 'active' && status !== 'removed') {
      throw forumError('Set the discussion to active or removed');
    }
    requested.status = status;
  }
  const isLocked = optionalBoolean(body, 'isLocked');
  const isSticky = optionalBoolean(body, 'isSticky');
  if (isLocked !== undefined) requested.isLocked = isLocked;
  if (isSticky !== undefined) requested.isSticky = isSticky;
  if (!Object.keys(requested).length) throw forumError('No moderation fields provided');

  const before = await getModeratorForumDiscussionDetail(discussionId);
  if (!before) throw forumError('Discussion not found', 404);

  // Only what actually changes: re-removing used to re-stamp the removal date.
  const changes = {};
  if (requested.status != null && requested.status !== before.status) changes.status = requested.status;
  if (requested.isLocked != null && requested.isLocked !== before.isLocked) changes.isLocked = requested.isLocked;
  if (requested.isSticky != null && requested.isSticky !== before.isSticky) changes.isSticky = requested.isSticky;
  if (!Object.keys(changes).length) {
    throw forumError('Nothing to change: the discussion is already in that state', 409);
  }
  if (changes.status === 'active' && !before.canRestore) {
    throw forumError(before.restoreBlockedReason || 'This discussion cannot be restored', 403);
  }

  const reason = cleanReason(body);
  const staff = await staffForSession(session);
  const detail = await setForumDiscussionStatus(discussionId, changes, {
    staffId: staff?.staff_id || null,
    reason,
  });

  // Members see the committed result: removal drops the post from open feeds and
  // pages, restore and lock/pin changes replace it in place.
  const scope = { groupId: before.groupId, discussionId: before.id };
  if (changes.status === 'removed') {
    broadcast('discussion.deleted', scope);
  } else {
    const discussion = await publicDiscussion(before.id);
    if (discussion) {
      broadcast(changes.status === 'active' ? 'discussion.restored' : 'discussion.updated', {
        ...scope,
        discussion,
      });
    }
  }

  for (const event of discussionChangeEvents(changes)) {
    await logForumAction({
      accountId: before.author?.accountId || null,
      action: `${event.verb} discussion “${before.title}”`,
      eventCode: event.eventCode,
      referenceTable: 'forum_discussions',
      referencePrefix: 'DSC',
      referenceId: before.id,
      session,
      staff,
      metadata: {
        discussionId: before.id,
        discussionTitle: before.title,
        groupId: before.groupId,
        groupName: before.groupName,
        authorHandle: before.author?.handle || null,
        previousStatus: before.status,
        previousRemovedBy: before.removedBy,
        wasLocked: before.isLocked,
        wasPinned: before.isSticky,
        commentCount: before.commentCount,
        reason,
      },
    });
  }

  return detail;
}

/**
 * Hides (`hidden: true`) or restores (`hidden: false`) one comment. Hiding keeps
 * the text and attachments; member reads show a placeholder until it is restored.
 */
async function setForumCommentVisibility(discussionId, commentId, body, session) {
  const hidden = optionalBoolean(body, 'hidden');
  if (hidden === undefined) throw forumError('Say whether the comment is hidden');

  const before = await getModeratorForumDiscussionDetail(discussionId);
  if (!before) throw forumError('Discussion not found', 404);
  const comment = before.comments.find((row) => String(row.commentId) === String(commentId));
  if (!comment) throw forumError('Comment not found', 404);
  if (hidden && comment.isDeleted) throw forumError('This comment is already removed', 409);
  if (!hidden && !comment.isDeleted) throw forumError('This comment is not removed', 409);
  if (!hidden && !comment.canRestore) {
    throw forumError(comment.restoreBlockedReason || 'This comment cannot be restored', 403);
  }

  const reason = cleanReason(body);
  const staff = await staffForSession(session);
  const detail = await setForumDiscussionCommentHidden(before.id, comment.commentId, hidden, {
    staffId: staff?.staff_id || null,
    reason,
  });

  const discussion = await publicDiscussion(before.id);
  if (discussion) {
    const kind = comment.replyToCommentId ? 'reply' : 'comment';
    broadcast(`${kind}.${hidden ? 'deleted' : 'updated'}`, {
      groupId: before.groupId,
      discussionId: before.id,
      commentId: comment.commentId,
      discussion,
    });
  }

  const author = comment.author?.name || 'a member';
  await logForumAction({
    accountId: comment.author?.accountId || null,
    action: hidden
      ? `Removed a comment by ${author} in “${before.title}”`
      : `Restored a comment by ${author} in “${before.title}”`,
    eventCode: hidden ? 'FORUM_COMMENT_REMOVED' : 'FORUM_COMMENT_RESTORED',
    referenceTable: 'forum_discussions',
    referencePrefix: 'DSC',
    referenceId: before.id,
    session,
    staff,
    metadata: {
      discussionId: before.id,
      discussionTitle: before.title,
      groupId: before.groupId,
      groupName: before.groupName,
      commentId: String(comment.commentId),
      authorHandle: comment.author?.handle || null,
      // A snapshot of the text, so the log still reads on its own.
      comment: String(comment.comment || '').slice(0, 500) || null,
      previousRemovedBy: comment.removedBy,
      likeCount: comment.likeCount,
      replyCount: comment.replyCount,
      postedAt: comment.createdAt || null,
      reason,
    },
  });

  return detail;
}

/** Kept for the `DELETE …/comments/:commentId` routes: it hides, it does not delete. */
async function removeForumComment(discussionId, commentId, session, body = {}) {
  return setForumCommentVisibility(discussionId, commentId, { ...body, hidden: true }, session);
}

module.exports = {
  listForumGroupsForStaff,
  getForumGroupForStaff,
  setForumGroupVisibility,
  banForumGroupMember,
  listForumDiscussionsForStaff,
  getForumDiscussionForStaff,
  setForumDiscussionState,
  setForumCommentVisibility,
  removeForumComment,
};
