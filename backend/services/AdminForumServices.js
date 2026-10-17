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
const { getPublicForumUserIdentities } = require('../repositories/UserRepositories');
const { emitForumEvent } = require('../lib/WebSocket');

function forumError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function withAuthorNames(detail) {
  if (!detail) return null;
  const ids = [detail.author?.userId, ...(detail.comments || []).map((comment) => comment.author?.userId)];
  const identities = await getPublicForumUserIdentities(ids);
  const byId = new Map(identities.map((row) => [String(row.user_id), row]));
  const fill = (author) => {
    const identity = byId.get(String(author?.userId ?? ''));
    if (!identity) return author;
    return {
      ...author,
      accountId: identity.account_id,
      name: identity.display_name,
      handle: identity.handle,
    };
  };
  return {
    ...detail,
    author: fill(detail.author),
    comments: (detail.comments || []).map((comment) => ({ ...comment, author: fill(comment.author) })),
  };
}

async function listAdminForumGroups() {
  return getModeratorForumGroups();
}

async function getAdminForumGroup(groupId) {
  return getModeratorForumGroupDetail(groupId);
}

async function updateAdminForumGroup(groupId, body) {
  const status = String(body?.status || '').toLowerCase();
  if (status !== 'active' && status !== 'inactive') {
    throw forumError('Set the group to active or inactive');
  }
  await setForumGroupStatus(groupId, status);
  return getModeratorForumGroupDetail(groupId);
}

async function updateAdminForumMember(groupId, memberId, body) {
  if (body?.isBanned == null) throw forumError('Say whether the member is banned');
  const isBanned = Boolean(body.isBanned);
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
  return getModeratorForumGroupDetail(groupId);
}

async function listAdminForumDiscussions({ groupId, search }) {
  return getModeratorForumDiscussions({
    groupId: groupId || undefined,
    search: search ? escapeRegex(search) : undefined,
  });
}

async function getAdminForumDiscussion(discussionId) {
  return withAuthorNames(await getModeratorForumDiscussionDetail(discussionId));
}

async function updateAdminForumDiscussion(discussionId, body) {
  const changes = {};
  if (body?.status != null) changes.status = String(body.status).toLowerCase();
  if (body?.isLocked != null) changes.isLocked = Boolean(body.isLocked);
  if (body?.isSticky != null) changes.isSticky = Boolean(body.isSticky);
  const detail = await setForumDiscussionStatus(discussionId, changes);
  return withAuthorNames(detail);
}

async function removeAdminForumComment(discussionId, commentId) {
  return withAuthorNames(await removeForumDiscussionComment(discussionId, commentId));
}

module.exports = {
  listAdminForumGroups,
  getAdminForumGroup,
  updateAdminForumGroup,
  updateAdminForumMember,
  listAdminForumDiscussions,
  getAdminForumDiscussion,
  updateAdminForumDiscussion,
  removeAdminForumComment,
};
