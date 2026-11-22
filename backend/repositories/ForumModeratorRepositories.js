const { ObjectId } = require('mongodb');
const { pool } = require('../lib/Database');
const { getMongoClient } = require('../lib/MongoDb');
const {
  fetchScopedTickets,
  scopedTicketCounts,
  scopedTicketCategoryBreakdown,
  fetchScopedReports,
  scopedReportCounts,
  toCategoryChart,
  ticketStatusChart,
} = require('./ModeratorSharedRepositories');
const { fetchStaffWorkload } = require('./AdminTicketsRepositories');
const { QUEUE_SCOPES, normalizeTicketType } = require('../lib/TicketEnums');
const { FORUM_REPORT_TYPES } = require('../lib/ReportEnums');

function forumDb() {
  const client = getMongoClient();
  return client ? client.db('ensemble') : null;
}

function mongoConnected() {
  return Boolean(getMongoClient());
}

const FORUM_TICKET_SCOPE = QUEUE_SCOPES.forums;

// Forum moderation covers Forums tickets and reports about forum content.

async function getForumTickets({ status } = {}) {
  return fetchScopedTickets({ ...FORUM_TICKET_SCOPE, status });
}

async function getForumReports({ status } = {}) {
  return fetchScopedReports({ targetTypesIn: [...FORUM_REPORT_TYPES], status });
}

// ─── Forum content moderation (MongoDB) ─────────────────────────────────

/** Staff search text is user input: never let it reach Mongo as a pattern. */
function escapeMongoRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Group member roles, strongest first — the Admin of a group is its owner. */
const GROUP_ROLE_ORDER = { Admin: 0, Moderator: 1, Member: 2 };

// Staff restore puts back what moderation took down. It never revives what a
// member deleted themselves (same rule as owner-deleted projects).
function discussionRestoreBlock(doc) {
  if (doc?.removed_by === 'author') {
    return 'The author deleted this discussion. Staff can only restore discussions that moderation removed.';
  }
  return null;
}

function groupReactivateBlock(group) {
  if (group?.archived_by === 'owner') {
    return 'The owner deleted this group. Staff can only reactivate groups that staff archived.';
  }
  return null;
}

function commentRestoreBlock(comment) {
  if (!comment?.deleted_at) return null;
  if (comment.removed_by === 'author') return 'The author deleted this comment.';
  // Every removal before hide-and-restore overwrote the text with a placeholder.
  if (!comment.removed_by) return 'Removed before restore was supported, so the original text was not kept.';
  return null;
}

/** A discussion counts as removed when it is soft-deleted or marked removed. */
const REMOVED_DISCUSSION_EXPR = {
  $or: [{ $ne: [{ $ifNull: ['$deleted_at', null] }, null] }, { $eq: ['$status', 'removed'] }],
};

const REMOVED_COMMENTS_EXPR = {
  $size: {
    $filter: {
      input: { $ifNull: ['$comments', []] },
      as: 'comment',
      cond: { $ne: [{ $ifNull: ['$$comment.deleted_at', null] }, null] },
    },
  },
};

/** The identity lookup reads at most this many ids per call. */
const IDENTITY_CHUNK = 500;

/** Resolves forum user ids to the account identity shown on staff desks. */
async function resolveForumIdentities(userIds) {
  const { getPublicForumUserIdentities } = require('./UserRepositories');
  const ids = [...new Set((userIds || []).filter((id) => id !== null && id !== undefined).map(String))];
  if (!ids.length) return new Map();
  const chunks = [];
  for (let i = 0; i < ids.length; i += IDENTITY_CHUNK) chunks.push(ids.slice(i, i + IDENTITY_CHUNK));
  const rows = (await Promise.all(chunks.map((chunk) => getPublicForumUserIdentities(chunk)))).flat();
  return new Map(rows.map((row) => [String(row.user_id), row]));
}

/**
 * The person as members see them on the forum: name, handle, avatar (a storage path the
 * console resolves like the member site does), verification and plan.
 */
function identityPerson(userId, identities) {
  const identity = identities.get(String(userId ?? ''));
  return {
    userId: userId ?? null,
    accountId: identity?.account_id || null,
    name: identity?.display_name || null,
    handle: identity?.handle || null,
    avatarUrl: identity?.avatar_preset_url || null,
    isVerified: Boolean(identity?.is_verified),
    subscriptionPlan: identity?.subscription_plan || null,
  };
}

/** Image paths on a post or comment, in the order the member forum shows them. */
function contentImages(doc) {
  const attachments = Array.isArray(doc?.attachments) ? doc.attachments : [];
  const keys = Array.isArray(doc?.imageKeys) ? doc.imageKeys : [];
  return [
    ...attachments.map((attachment) => (typeof attachment === 'string' ? attachment : attachment?.file_path)),
    ...keys,
  ].filter((path) => typeof path === 'string' && path.trim() !== '');
}

/** A comment's earlier versions, oldest first (see `comments[].revisions`). */
function commentRevisions(comment, identities) {
  const list = Array.isArray(comment?.revisions) ? comment.revisions : [];
  return list
    .filter((revision) => revision && typeof revision === 'object')
    .map((revision) => ({
      kind: revision.kind === 'deleted' ? 'deleted' : 'edited',
      comment: typeof revision.comment === 'string' ? revision.comment : null,
      images: contentImages(revision),
      by: revision.by_user_id != null ? identityPerson(revision.by_user_id, identities) : null,
      recordedAt: revision.recorded_at || null,
    }))
    .sort((a, b) => new Date(a.recordedAt || 0) - new Date(b.recordedAt || 0));
}

/** How many members a group card previews (owner first). */
const MEMBER_PREVIEW_SIZE = 5;

function previewMembers(members) {
  const list = (Array.isArray(members) ? members : []).filter((member) => member && !member.is_banned);
  return [...list]
    .sort((a, b) => (GROUP_ROLE_ORDER[a.role] ?? 9) - (GROUP_ROLE_ORDER[b.role] ?? 9))
    .slice(0, MEMBER_PREVIEW_SIZE);
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function latestDate(...values) {
  const dates = values.map(toDate).filter(Boolean);
  if (!dates.length) return null;
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

/** Per-group discussion, comment and engagement counts in one pass. */
async function discussionStatsByGroup(db) {
  const rows = await db
    .collection('forum_discussions')
    .aggregate([
      {
        $group: {
          _id: { $toString: '$forum_group_id' },
          total: { $sum: 1 },
          removed: { $sum: { $cond: [REMOVED_DISCUSSION_EXPR, 1, 0] } },
          locked: { $sum: { $cond: [{ $eq: ['$is_locked', true] }, 1, 0] } },
          pinned: { $sum: { $cond: [{ $eq: ['$is_sticky', true] }, 1, 0] } },
          comments: { $sum: { $size: { $ifNull: ['$comments', []] } } },
          removedComments: { $sum: REMOVED_COMMENTS_EXPR },
          likes: { $sum: { $size: { $ifNull: ['$likes', []] } } },
          lastActivityAt: { $max: { $ifNull: ['$updated_at', '$created_at'] } },
        },
      },
    ])
    .toArray();

  const map = new Map();
  for (const row of rows) {
    map.set(String(row._id), {
      total: row.total || 0,
      removed: row.removed || 0,
      active: Math.max(0, (row.total || 0) - (row.removed || 0)),
      locked: row.locked || 0,
      pinned: row.pinned || 0,
      comments: Math.max(0, (row.comments || 0) - (row.removedComments || 0)),
      removedComments: row.removedComments || 0,
      likes: row.likes || 0,
      lastActivityAt: row.lastActivityAt || null,
    });
  }
  return map;
}

const EMPTY_GROUP_STATS = {
  total: 0,
  removed: 0,
  active: 0,
  locked: 0,
  pinned: 0,
  comments: 0,
  removedComments: 0,
  likes: 0,
  lastActivityAt: null,
};

function mapGroupMembers(members, identities) {
  return (Array.isArray(members) ? members : [])
    .map((member) => ({
      ...identityPerson(member.userId, identities),
      name: identities.get(String(member.userId ?? ''))?.display_name || 'Unknown member',
      role: member.role || 'Member',
      isBanned: Boolean(member.is_banned),
      bannedAt: member.banned_at || null,
      joinedAt: member.joined_at || member.created_at || null,
    }))
    .sort((a, b) => {
      const byRole = (GROUP_ROLE_ORDER[a.role] ?? 9) - (GROUP_ROLE_ORDER[b.role] ?? 9);
      if (byRole !== 0) return byRole;
      return String(a.name).localeCompare(String(b.name));
    });
}

function summariseMembers(members) {
  const list = Array.isArray(members) ? members : [];
  return {
    memberCount: list.length,
    bannedMemberCount: list.filter((member) => member.is_banned || member.isBanned).length,
    adminCount: list.filter((member) => (member.role || 'Member') === 'Admin').length,
    moderatorCount: list.filter((member) => (member.role || 'Member') === 'Moderator').length,
  };
}

/**
 * Platform-wide forum counts for the management header. Returned with both the
 * group list and the discussion list so the header never needs its own request.
 */
async function getForumModerationStats(connected = null) {
  const db = connected || forumDb();
  if (!db) return null;

  const [groupRows, discussionRows] = await Promise.all([
    db
      .collection('forum_groups')
      .aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            members: { $sum: { $size: { $ifNull: ['$members', []] } } },
            banned: {
              $sum: {
                $size: {
                  $filter: {
                    input: { $ifNull: ['$members', []] },
                    as: 'member',
                    cond: { $eq: ['$$member.is_banned', true] },
                  },
                },
              },
            },
          },
        },
      ])
      .toArray(),
    db
      .collection('forum_discussions')
      .aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            removed: { $sum: { $cond: [REMOVED_DISCUSSION_EXPR, 1, 0] } },
            locked: { $sum: { $cond: [{ $eq: ['$is_locked', true] }, 1, 0] } },
            pinned: { $sum: { $cond: [{ $eq: ['$is_sticky', true] }, 1, 0] } },
            comments: { $sum: { $size: { $ifNull: ['$comments', []] } } },
            removedComments: { $sum: REMOVED_COMMENTS_EXPR },
            lastActivityAt: { $max: { $ifNull: ['$updated_at', '$created_at'] } },
          },
        },
      ])
      .toArray(),
  ]);

  const g = groupRows[0] || { total: 0, active: 0, members: 0, banned: 0 };
  const d = discussionRows[0] || {
    total: 0,
    removed: 0,
    locked: 0,
    pinned: 0,
    comments: 0,
    removedComments: 0,
    lastActivityAt: null,
  };

  return {
    groups: {
      total: g.total || 0,
      active: g.active || 0,
      archived: Math.max(0, (g.total || 0) - (g.active || 0)),
    },
    members: { total: g.members || 0, banned: g.banned || 0 },
    discussions: {
      total: d.total || 0,
      removed: d.removed || 0,
      active: Math.max(0, (d.total || 0) - (d.removed || 0)),
      locked: d.locked || 0,
      pinned: d.pinned || 0,
    },
    comments: {
      total: d.comments || 0,
      removed: d.removedComments || 0,
      visible: Math.max(0, (d.comments || 0) - (d.removedComments || 0)),
    },
    lastActivityAt: d.lastActivityAt || null,
  };
}

/**
 * Forum groups for a staff desk, each with its moderation counts, its owner and
 * when the group last saw activity.
 *
 * @param options.search {string} matches name, description and tags
 * @param options.status {string} `active`, `inactive` or `all`
 */
async function getModeratorForumGroups({ search = '', status = 'all' } = {}) {
  const db = forumDb();
  if (!db) return { available: false, groups: [], stats: null };

  const filter = {};
  const normalizedStatus = String(status || 'all').toLowerCase();
  if (normalizedStatus === 'active') filter.status = 'active';
  else if (normalizedStatus === 'inactive') filter.status = { $ne: 'active' };

  const q = String(search || '').trim();
  if (q) {
    const regex = { $regex: escapeMongoRegex(q), $options: 'i' };
    filter.$or = [{ group_name: regex }, { description: regex }, { tags: regex }, { 'tags.tag_name': regex }];
  }

  const [groups, stats, platformStats] = await Promise.all([
    db.collection('forum_groups').find(filter).sort({ created_at: -1 }).limit(200).toArray(),
    discussionStatsByGroup(db),
    getForumModerationStats(db),
  ]);

  const owners = groups.map((group) =>
    (Array.isArray(group.members) ? group.members : []).find((member) => member.role === 'Admin')
  );
  const previews = groups.map((group) => previewMembers(group.members));
  const identities = await resolveForumIdentities([
    ...owners.map((owner) => owner?.userId),
    ...previews.flat().map((member) => member.userId),
  ]);

  return {
    available: true,
    stats: platformStats,
    groups: groups.map((group, index) => {
      const key = String(group._id);
      const groupStats = stats.get(key) || EMPTY_GROUP_STATS;
      const owner = owners[index];
      return {
        id: key,
        name: group.group_name || 'Untitled group',
        description: group.description || null,
        imageUrl: group.image_url || null,
        status: group.status || 'active',
        tags: Array.isArray(group.tags) ? group.tags : [],
        ...summariseMembers(group.members),
        members: (Array.isArray(group.members) ? group.members : []).map((member) => ({
          userId: member.userId,
          role: member.role || 'Member',
          isBanned: Boolean(member.is_banned),
        })),
        memberPreview: previews[index].map((member) => ({
          ...identityPerson(member.userId, identities),
          role: member.role || 'Member',
        })),
        owner: owner ? identityPerson(owner.userId, identities) : null,
        discussionCount: groupStats.total,
        activeDiscussionCount: groupStats.active,
        removedDiscussionCount: groupStats.removed,
        lockedDiscussionCount: groupStats.locked,
        pinnedDiscussionCount: groupStats.pinned,
        commentCount: groupStats.comments,
        removedCommentCount: groupStats.removedComments,
        likeCount: groupStats.likes,
        lastActivityAt: latestDate(groupStats.lastActivityAt, group.created_at),
        createdAt: group.created_at || null,
        deletedAt: group.deleted_at || null,
        ...groupArchiveState(group),
      };
    }),
  };
}

function groupArchiveState(group) {
  const archived = (group.status || 'active') !== 'active';
  const block = archived ? groupReactivateBlock(group) : null;
  return {
    archivedBy: archived ? group.archived_by || null : null,
    archiveReason: archived ? group.archive_reason || null : null,
    canReactivate: archived && !block,
    reactivateBlockedReason: block,
  };
}

/** One group with its full member roster and the discussions inside it. */
async function getModeratorForumGroupDetail(groupId) {
  const db = forumDb();
  if (!db) throw new Error('MongoDB is not connected');
  if (!ObjectId.isValid(String(groupId || ''))) return null;
  const group = await db.collection('forum_groups').findOne({ _id: new ObjectId(groupId) });
  if (!group) return null;

  const key = String(group._id);
  const groupFilter = { forum_group_id: { $in: [key, group._id] } };
  const members = Array.isArray(group.members) ? group.members : [];

  const [discussionDocs, stats] = await Promise.all([
    db
      .collection('forum_discussions')
      .find(groupFilter)
      .sort({ created_at: -1 })
      .limit(50)
      .toArray(),
    discussionStatsByGroup(db),
  ]);

  const identities = await resolveForumIdentities([
    ...members.map((member) => member.userId),
    ...discussionDocs.map((doc) => doc.user_id),
  ]);
  const groupStats = stats.get(key) || EMPTY_GROUP_STATS;
  const roster = mapGroupMembers(members, identities);

  return {
    id: key,
    name: group.group_name || 'Untitled group',
    description: group.description || null,
    imageUrl: group.image_url || null,
    status: group.status || 'active',
    tags: Array.isArray(group.tags) ? group.tags : [],
    ...summariseMembers(members),
    owner: roster.find((member) => member.role === 'Admin') || null,
    discussionCount: groupStats.total,
    activeDiscussionCount: groupStats.active,
    removedDiscussionCount: groupStats.removed,
    lockedDiscussionCount: groupStats.locked,
    pinnedDiscussionCount: groupStats.pinned,
    commentCount: groupStats.comments,
    removedCommentCount: groupStats.removedComments,
    likeCount: groupStats.likes,
    lastActivityAt: latestDate(groupStats.lastActivityAt, group.created_at),
    createdAt: group.created_at || null,
    deletedAt: group.deleted_at || null,
    ...groupArchiveState(group),
    members: roster,
    discussions: discussionDocs.map((doc) => mapDiscussionSummary(doc, identities, group)),
  };
}

/**
 * Archives or reactivates a group. Archiving is a soft delete: members,
 * discussions and comments stay stored, so reactivating brings them all back.
 *
 * The filter only matches a group still in the opposite state (and, for a
 * reactivation, one its owner did not delete), so a concurrent change returns
 * false instead of being overwritten.
 */
async function setForumGroupStatus(groupId, status, { staffId = null, reason = null } = {}) {
  const db = forumDb();
  if (!db) throw new Error('MongoDB is not connected');
  const allowed = ['active', 'inactive'];
  if (!allowed.includes(status)) throw new Error(`Invalid group status: ${status}`);

  const now = new Date();
  const update =
    status === 'inactive'
      ? {
          $set: {
            status,
            deleted_at: now,
            archived_by: 'staff',
            archived_by_staff_id: staffId,
            archive_reason: reason,
            updated_at: now,
          },
        }
      : {
          $set: { status, deleted_at: null, restored_at: now, updated_at: now },
          $unset: { archived_by: '', archived_by_user_id: '', archived_by_staff_id: '', archive_reason: '' },
        };
  const filter =
    status === 'inactive'
      ? // The desks show a group with no status as active.
        { _id: new ObjectId(groupId), status: { $in: ['active', null] } }
      : { _id: new ObjectId(groupId), status: { $nin: ['active', null] }, archived_by: { $ne: 'owner' } };

  const result = await db.collection('forum_groups').updateOne(filter, update);
  return result.matchedCount > 0;
}

function commentStats(comments) {
  const list = Array.isArray(comments) ? comments.filter(Boolean) : [];
  const removed = list.filter((comment) => comment.deleted_at).length;
  return {
    totalCommentCount: list.length,
    commentCount: list.length - removed,
    removedCommentCount: removed,
    lastCommentAt: latestDate(...list.map((comment) => comment.updated_at || comment.created_at)),
  };
}

/** List row for a discussion. `group` is optional and fills in group context. */
function mapDiscussionSummary(doc, identities, group = null) {
  const counts = commentStats(doc.comments);
  const removed = Boolean(doc.deleted_at) || doc.status === 'removed';
  const images = contentImages(doc);
  return {
    id: String(doc._id),
    title: doc.title || 'Untitled discussion',
    description: doc.description || null,
    // Posts store their body in `content`; older ones used `description`.
    excerpt: snippet(doc.content ?? doc.description ?? '', 320) || null,
    images: images.slice(0, 4),
    imageCount: images.length,
    groupId: doc.forum_group_id ? String(doc.forum_group_id) : null,
    groupName: group ? group.group_name || 'Untitled group' : null,
    groupStatus: group ? group.status || 'active' : null,
    groupImageUrl: group?.image_url || null,
    author: identityPerson(doc.user_id, identities),
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    attachmentCount: images.length,
    ...counts,
    likeCount: Array.isArray(doc.likes) ? doc.likes.length : 0,
    saveCount: Array.isArray(doc.saves) ? doc.saves.length : 0,
    status: removed ? 'removed' : 'active',
    isLocked: Boolean(doc.is_locked),
    isSticky: Boolean(doc.is_sticky),
    createdAt: doc.created_at || null,
    updatedAt: doc.updated_at || null,
    removedAt: doc.deleted_at || null,
    removedBy: removed ? doc.removed_by || null : null,
    removalReason: removed ? doc.removal_reason || null : null,
    canRestore: removed && !discussionRestoreBlock(doc),
    restoreBlockedReason: removed ? discussionRestoreBlock(doc) : null,
    lastActivityAt: latestDate(counts.lastCommentAt, doc.updated_at, doc.created_at),
  };
}

/**
 * Discussions for a staff desk with their group, author, engagement and state.
 *
 * @param options.search {string} matches title and body — callers escape it
 * @param options.status {string} `active`, `removed`, `locked`, `pinned` or `all`
 */
async function getModeratorForumDiscussions({ groupId, search, status = 'all' } = {}) {
  const db = forumDb();
  if (!db) return { available: false, discussions: [], stats: null };

  const filter = {};
  if (groupId) {
    filter.forum_group_id = ObjectId.isValid(String(groupId))
      ? { $in: [String(groupId), new ObjectId(String(groupId))] }
      : String(groupId);
  }
  if (search) {
    const regex = { $regex: String(search), $options: 'i' };
    filter.$or = [{ title: regex }, { description: regex }];
  }

  const normalizedStatus = String(status || 'all').toLowerCase();
  if (normalizedStatus === 'removed') {
    filter.$and = [{ $or: [{ deleted_at: { $ne: null } }, { status: 'removed' }] }];
  } else if (normalizedStatus === 'active') {
    filter.$and = [{ deleted_at: null }, { status: { $ne: 'removed' } }];
  } else if (normalizedStatus === 'locked') {
    filter.is_locked = true;
  } else if (normalizedStatus === 'pinned') {
    filter.is_sticky = true;
  }

  const discussions = await db
    .collection('forum_discussions')
    .find(filter)
    .sort({ created_at: -1 })
    .limit(200)
    .toArray();

  const groupIds = [...new Set(discussions.map((d) => String(d.forum_group_id)).filter(Boolean))];
  const groupDocs = groupIds.length
    ? await db
        .collection('forum_groups')
        .find({ _id: { $in: groupIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id)) } })
        .toArray()
    : [];
  const groupsById = new Map(groupDocs.map((group) => [String(group._id), group]));

  const [identities, platformStats] = await Promise.all([
    resolveForumIdentities(discussions.map((d) => d.user_id)),
    getForumModerationStats(db),
  ]);

  return {
    available: true,
    stats: platformStats,
    discussions: discussions.map((doc) =>
      mapDiscussionSummary(doc, identities, groupsById.get(String(doc.forum_group_id)) || null)
    ),
  };
}

/** One discussion with its full comment thread, including removed comments. */
async function getModeratorForumDiscussionDetail(discussionId) {
  const db = forumDb();
  if (!db) throw new Error('MongoDB is not connected');
  if (!ObjectId.isValid(String(discussionId || ''))) return null;

  const doc = await db.collection('forum_discussions').findOne({ _id: new ObjectId(discussionId) });
  if (!doc) return null;

  const comments = Array.isArray(doc.comments) ? doc.comments.filter((c) => c && c.comment_id) : [];
  const group =
    doc.forum_group_id && ObjectId.isValid(String(doc.forum_group_id))
      ? await db.collection('forum_groups').findOne({ _id: new ObjectId(String(doc.forum_group_id)) })
      : null;

  const revisionAuthors = comments.flatMap((c) =>
    (Array.isArray(c.revisions) ? c.revisions : []).map((revision) => revision?.by_user_id)
  ).filter((id) => id != null);
  const identities = await resolveForumIdentities([
    doc.user_id,
    ...comments.map((c) => c.user_id),
    ...revisionAuthors,
  ]);
  const replyCounts = new Map();
  for (const comment of comments) {
    const parent = comment.comment_reference_id;
    if (!parent) continue;
    replyCounts.set(String(parent), (replyCounts.get(String(parent)) || 0) + 1);
  }

  return {
    ...mapDiscussionSummary(doc, identities, group),
    // The post body as written (kept on removal), so staff evidence can quote it.
    content: typeof doc.content === 'string' ? doc.content : null,
    images: contentImages(doc),
    comments: comments
      .map((comment) => ({
        commentId: comment.comment_id,
        comment: comment.comment,
        replyToCommentId: comment.comment_reference_id || null,
        replyCount: replyCounts.get(String(comment.comment_id)) || 0,
        author: identityPerson(comment.user_id, identities),
        likeCount: Array.isArray(comment.likes)
          ? comment.likes.filter((like) => like && like.user_id).length
          : 0,
        images: contentImages(comment),
        attachmentCount: contentImages(comment).length,
        isEdited: Boolean(comment.is_edited),
        // Staff-only history: the text before each edit, and what an author deleted.
        revisions: commentRevisions(comment, identities),
        isDeleted: Boolean(comment.deleted_at),
        deletedAt: comment.deleted_at || null,
        removedBy: comment.deleted_at ? comment.removed_by || null : null,
        removalReason: comment.deleted_at ? comment.removal_reason || null : null,
        canRestore: Boolean(comment.deleted_at) && !commentRestoreBlock(comment),
        restoreBlockedReason: commentRestoreBlock(comment),
        createdAt: comment.created_at || null,
        updatedAt: comment.updated_at || null,
      }))
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)),
  };
}

function conflictError(message) {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
}

/**
 * Remove or restore a whole discussion, and set its lock and pin flags.
 *
 * Removal is a soft delete: `deleted_at` and `status` both mark it removed (the
 * member forum checks both), and nothing in the document is cleared. Restore
 * clears both, and only matches a discussion its author did not delete.
 */
async function setForumDiscussionStatus(discussionId, changes = {}, { staffId = null, reason = null } = {}) {
  const db = forumDb();
  if (!db) throw new Error('MongoDB is not connected');
  const now = new Date();
  const set = { updated_at: now };
  const unset = {};
  const filter = { _id: new ObjectId(discussionId) };

  if (changes.status != null) {
    if (!['active', 'removed'].includes(changes.status)) throw new Error(`Invalid discussion status: ${changes.status}`);
    if (changes.status === 'removed') {
      Object.assign(set, {
        deleted_at: now,
        status: 'removed',
        removed_by: 'staff',
        removed_by_staff_id: staffId,
        removal_reason: reason,
      });
      filter.deleted_at = null;
      filter.status = { $ne: 'removed' };
    } else {
      Object.assign(set, { deleted_at: null, status: 'active', restored_at: now });
      Object.assign(unset, { removed_by: '', removed_by_user_id: '', removed_by_staff_id: '', removal_reason: '' });
      filter.$or = [{ deleted_at: { $ne: null } }, { status: 'removed' }];
      filter.removed_by = { $ne: 'author' };
    }
  }
  if (changes.isLocked != null) set.is_locked = Boolean(changes.isLocked);
  if (changes.isSticky != null) set.is_sticky = Boolean(changes.isSticky);
  if (Object.keys(set).length === 1) throw new Error('No moderation fields provided');

  const update = Object.keys(unset).length ? { $set: set, $unset: unset } : { $set: set };
  const result = await db.collection('forum_discussions').updateOne(filter, update);
  if (!result.matchedCount) {
    const exists = await db.collection('forum_discussions').countDocuments({ _id: filter._id }, { limit: 1 });
    if (!exists) {
      const error = new Error('Discussion not found');
      error.statusCode = 404;
      throw error;
    }
    throw conflictError('This discussion changed while you were working on it. Reload and try again.');
  }
  return getModeratorForumDiscussionDetail(discussionId);
}

/**
 * Hide or restore one comment (staff action). Hiding never touches the text or
 * attachments: member reads mask a hidden comment, and restore shows it again.
 *
 * The filter only matches the comment in the expected state (and, for restore,
 * one hidden by moderation), so a concurrent change returns a conflict.
 */
async function setForumDiscussionCommentHidden(
  discussionId,
  commentId,
  hidden,
  { staffId = null, reason = null } = {}
) {
  const db = forumDb();
  if (!db) throw new Error('MongoDB is not connected');
  const now = new Date();

  const match = hidden
    ? { comment_id: commentId, deleted_at: null }
    : { comment_id: commentId, deleted_at: { $ne: null }, removed_by: { $nin: [null, 'author'] } };
  const update = hidden
    ? {
        $set: {
          'comments.$.deleted_at': now,
          'comments.$.removed_by': 'staff',
          'comments.$.removed_by_staff_id': staffId,
          'comments.$.removal_reason': reason,
          'comments.$.updated_at': now,
          updated_at: now,
        },
      }
    : {
        $set: { 'comments.$.deleted_at': null, 'comments.$.updated_at': now, updated_at: now },
        $unset: {
          'comments.$.removed_by': '',
          'comments.$.removed_by_user_id': '',
          'comments.$.removed_by_staff_id': '',
          'comments.$.removal_reason': '',
        },
      };

  const result = await db
    .collection('forum_discussions')
    .updateOne({ _id: new ObjectId(discussionId), comments: { $elemMatch: match } }, update);
  if (!result.matchedCount) {
    throw conflictError('This comment changed while you were working on it. Reload and try again.');
  }
  return getModeratorForumDiscussionDetail(discussionId);
}

async function getForumContentStats() {
  const db = forumDb();
  if (!db) return { available: false };

  const [groupCount, activeGroupCount, inactiveGroupCount, discussionDocs, recentGroups, recentDiscussions] =
    await Promise.all([
      db.collection('forum_groups').countDocuments({}),
      db.collection('forum_groups').countDocuments({ status: 'active' }),
      db.collection('forum_groups').countDocuments({ status: { $ne: 'active' } }),
      db
        .collection('forum_discussions')
        .aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              removed: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $ifNull: ['$deleted_at', false] },
                        { $eq: ['$status', 'removed'] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              locked: { $sum: { $cond: [{ $eq: ['$is_locked', true] }, 1, 0] } },
              sticky: { $sum: { $cond: [{ $eq: ['$is_sticky', true] }, 1, 0] } },
              comments: { $sum: { $size: { $ifNull: ['$comments', []] } } },
            },
          },
        ])
        .toArray(),
      db
        .collection('forum_groups')
        .aggregate([
          { $sort: { created_at: -1 } },
          { $limit: 6 },
          {
            $project: {
              group_name: 1,
              image_url: 1,
              status: 1,
              created_at: 1,
              memberCount: { $size: { $cond: [{ $isArray: '$members' }, '$members', []] } },
            },
          },
        ])
        .toArray(),
      db
        .collection('forum_discussions')
        .aggregate([
          { $sort: { updated_at: -1, created_at: -1 } },
          { $limit: 8 },
          {
            $project: {
              title: 1,
              user_id: 1,
              forum_group_id: 1,
              status: 1,
              deleted_at: 1,
              is_locked: 1,
              is_sticky: 1,
              updated_at: 1,
              created_at: 1,
              commentCount: { $size: { $cond: [{ $isArray: '$comments' }, '$comments', []] } },
            },
          },
        ])
        .toArray(),
    ]);

  const d = discussionDocs[0] || { total: 0, removed: 0, locked: 0, sticky: 0, comments: 0 };
  const groupIds = [
    ...new Set(recentDiscussions.map((x) => x.forum_group_id).filter(Boolean).map(String)),
  ];
  const groupNameMap = {};
  const groupImageMap = {};
  const [linked, identities] = await Promise.all([
    groupIds.length
      ? db
          .collection('forum_groups')
          .find({ _id: { $in: groupIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id)) } })
          .project({ group_name: 1, image_url: 1 })
          .toArray()
      : [],
    resolveForumIdentities(recentDiscussions.map((x) => x.user_id)),
  ]);
  for (const g of linked) {
    groupNameMap[String(g._id)] = g.group_name || 'Untitled group';
    groupImageMap[String(g._id)] = g.image_url || null;
  }

  return {
    available: true,
    totalGroups: groupCount,
    activeGroups: activeGroupCount,
    inactiveGroups: inactiveGroupCount,
    totalDiscussions: d.total,
    removedDiscussions: d.removed,
    lockedDiscussions: d.locked,
    stickyDiscussions: d.sticky,
    totalComments: d.comments,
    recentGroups: recentGroups.map((g) => ({
      id: String(g._id),
      name: g.group_name || 'Untitled group',
      imageUrl: g.image_url || null,
      status: g.status || 'active',
      memberCount: g.memberCount || 0,
      createdAt: g.created_at || null,
    })),
    recentDiscussions: recentDiscussions.map((x) => ({
      id: String(x._id),
      title: x.title || 'Untitled discussion',
      author: identityPerson(x.user_id, identities),
      groupId: x.forum_group_id ? String(x.forum_group_id) : null,
      groupName: x.forum_group_id ? groupNameMap[String(x.forum_group_id)] || null : null,
      groupImageUrl: x.forum_group_id ? groupImageMap[String(x.forum_group_id)] || null : null,
      commentCount: x.commentCount || 0,
      status: x.deleted_at || x.status === 'removed' ? 'removed' : x.status || 'active',
      isLocked: Boolean(x.is_locked),
      isSticky: Boolean(x.is_sticky),
      updatedAt: x.updated_at || x.created_at || null,
    })),
  };
}

async function getForumReportBreakdown(targetTypesIn) {
  const params = [targetTypesIn];
  const [result, typeResult] = await Promise.all([
  pool.query(
    `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE LOWER(status) IN ('open', 'pending'))::int AS open_status,
      COUNT(*) FILTER (WHERE LOWER(status) IN ('in_review', 'in review', 'in_progress', 'in progress'))::int AS in_review,
      COUNT(*) FILTER (WHERE LOWER(status) IN ('resolved', 'closed'))::int AS resolved,
      COUNT(*) FILTER (WHERE LOWER(status) = 'dismissed')::int AS dismissed,
      COUNT(*) FILTER (
        WHERE LOWER(status) NOT IN ('resolved', 'closed', 'dismissed', 'denied', 'archived', 'sanctioned')
          AND assigned_staff_id IS NULL
      )::int AS unassigned,
      COUNT(*) FILTER (
        WHERE LOWER(priority) = 'high'
          AND LOWER(status) NOT IN ('resolved', 'closed', 'dismissed', 'denied', 'archived', 'sanctioned')
      )::int AS high_priority
    FROM reports
    WHERE deleted_at IS NULL
      AND LOWER(COALESCE(target_type, type)) = ANY($1)
    `,
    params
  ),
  pool.query(
    `
    SELECT LOWER(COALESCE(target_type, type)) AS target_type, COUNT(*)::int AS count
    FROM reports
    WHERE deleted_at IS NULL
      AND LOWER(COALESCE(target_type, type)) = ANY($1)
    GROUP BY 1
    ORDER BY count DESC
    `,
    params
  ),
  ]);
  const c = result.rows[0] || {};
  return {
    counts: {
      total: Number(c.total || 0),
      openStatus: Number(c.open_status || 0),
      inReview: Number(c.in_review || 0),
      resolved: Number(c.resolved || 0),
      dismissed: Number(c.dismissed || 0),
      unassigned: Number(c.unassigned || 0),
      highPriority: Number(c.high_priority || 0),
      openCount:
        Number(c.open_status || 0) + Number(c.in_review || 0),
    },
    byType: typeResult.rows.map((r) => ({
      label: String(r.target_type || 'other')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (ch) => ch.toUpperCase()),
      value: Number(r.count),
    })),
  };
}

function buildAlerts(tc, rc, reportBreakdown, contentStats) {
  const alerts = [];
  const openTickets = Number(tc.open_count) + Number(tc.in_progress) + Number(tc.escalated_dev || 0);

  if (Number(tc.unassigned) > 0) {
    alerts.push({
      id: 'unassigned',
      message: `${tc.unassigned} forum ticket(s) have no assignee.`,
      severity: 'warning',
      action: { tab: 'ticket-management', ticketFilters: { assignee: 'unassigned' } },
    });
  }
  if (Number(tc.high_priority) > 0) {
    alerts.push({
      id: 'high-priority',
      message: `${tc.high_priority} high-priority forum ticket(s) need attention.`,
      severity: 'error',
      action: { tab: 'ticket-management', ticketFilters: { priority: 'High', flag: 'open_only' } },
    });
  }
  if (Number(tc.awaiting_reply) > 0) {
    alerts.push({
      id: 'awaiting-reply',
      message: `${tc.awaiting_reply} forum ticket(s) awaiting a staff reply.`,
      severity: 'warning',
      action: { tab: 'ticket-management', ticketFilters: { flag: 'awaiting' } },
    });
  }
  if (Number(tc.escalated) > 0) {
    alerts.push({
      id: 'escalated',
      message: `${tc.escalated} escalated forum ticket(s) need a handoff.`,
      severity: 'error',
      action: { tab: 'ticket-management', ticketFilters: { flag: 'escalated' } },
    });
  }
  if (Number(rc.open_count) > 0) {
    alerts.push({
      id: 'flagged-content',
      message: `${rc.open_count} flagged forum item(s) awaiting review.`,
      severity: 'error',
      action: { tab: 'reports' },
    });
  }
  if (reportBreakdown?.counts?.unassigned > 0) {
    alerts.push({
      id: 'unassigned-reports',
      message: `${reportBreakdown.counts.unassigned} forum report(s) are unassigned.`,
      severity: 'warning',
      action: { tab: 'reports' },
    });
  }
  if (contentStats?.available && Number(contentStats.removedDiscussions) > 0) {
    alerts.push({
      id: 'removed-discussions',
      message: `${contentStats.removedDiscussions} discussion(s) are currently removed.`,
      severity: 'info',
      action: { tab: 'forum-control' },
    });
  }
  if (openTickets > 0) {
    alerts.push({
      id: 'open-tickets',
      message: `${openTickets} forum ticket(s) open.`,
      severity: 'info',
      action: { tab: 'ticket-management' },
    });
  }
  if (!alerts.length) {
    alerts.push({ id: 'clear', message: 'Forum queues are clear.', severity: 'success' });
  }
  return alerts;
}

async function getForumOverview() {
  const forumTypes = [...FORUM_REPORT_TYPES];
  const [
    ticketCounts,
    categoryRows,
    reportCounts,
    tickets,
    reports,
    contentStats,
    reportBreakdown,
    staffWorkload,
  ] = await Promise.all([
    scopedTicketCounts(FORUM_TICKET_SCOPE),
    scopedTicketCategoryBreakdown(FORUM_TICKET_SCOPE),
    scopedReportCounts({ targetTypesIn: forumTypes }),
    getForumTickets(),
    getForumReports(),
    getForumContentStats(),
    getForumReportBreakdown(forumTypes),
    // Powers the "assign to" pickers and filters on this desk's queues.
    fetchStaffWorkload(),
  ]);

  const tc = ticketCounts;
  const rc = reportCounts;
  const rb = reportBreakdown.counts;

  const reportStatusMix = [
    { label: 'Open', value: rb.openStatus, color: '#f87171' },
    { label: 'In review', value: rb.inReview, color: '#fbbf24' },
    { label: 'Resolved', value: rb.resolved, color: '#34d399' },
    { label: 'Dismissed', value: rb.dismissed, color: '#a1a1aa' },
  ].filter((x) => x.value > 0);

  return {
    lastUpdated: new Date().toISOString(),
    summary: {
      openTickets: Number(tc.open_count) + Number(tc.in_progress) + Number(tc.escalated_dev || 0),
      totalTickets: Number(tc.total),
      unassignedTickets: Number(tc.unassigned),
      highPriorityTickets: Number(tc.high_priority),
      awaitingReplyTickets: Number(tc.awaiting_reply),
      escalatedTickets: Number(tc.escalated),
      inProgressTickets: Number(tc.in_progress),
      flaggedContent: Number(rc.open_count),
      totalReports: Number(rc.total),
      unassignedReports: rb.unassigned,
      highPriorityReports: rb.highPriority,
      resolvedTickets: Number(tc.resolved),
      resolvedReports: rb.resolved,
    },
    forumContent: contentStats,
    charts: {
      ticketStatusMix: ticketStatusChart(tc),
      ticketCategories: toCategoryChart(categoryRows),
      reportStatusMix,
      reportTypes: reportBreakdown.byType.map((row, i) => ({
        ...row,
        color: ['#a78bfa', '#818cf8', '#c084fc', '#f0abfc', '#67e8f9', '#94a3b8'][i % 6],
      })),
    },
    recentTickets: tickets.slice(0, 10),
    flaggedReports: reports.slice(0, 10),
    staffWorkload,
    alerts: buildAlerts(tc, rc, reportBreakdown, contentStats),
    notice: mongoConnected()
      ? null
      : 'MongoDB is not connected — forum groups, discussions and comment moderation are unavailable. Set MONGODB_URI in backend/.env to enable them. Ticket and report queues below always work.',
    dataSources: {
      tables: ['tickets', 'reports', 'forum_groups (mongo)', 'forum_discussions (mongo)'],
      persisted: true,
    },
  };
}

// ─── Trends (Forum dashboard, one date range) ──────────────────────────

const DAY_MS = 86_400_000;

function utcDay(day) {
  return new Date(`${day}T00:00:00Z`);
}

function dayString(date) {
  return date.toISOString().slice(0, 10);
}

function shiftDay(day, n) {
  return dayString(new Date(utcDay(day).getTime() + n * DAY_MS));
}

/** First day of the chart bucket `day` falls in. Matches Postgres `date_trunc` (weeks start Monday). */
function bucketStart(day, bucket) {
  if (bucket === 'day') return day;
  if (bucket === 'month') return `${day.slice(0, 7)}-01`;
  const sinceMonday = (utcDay(day).getUTCDay() + 6) % 7;
  return shiftDay(day, -sinceMonday);
}

function bucketLastDay(start, bucket) {
  if (bucket === 'day') return start;
  if (bucket === 'week') return shiftDay(start, 6);
  const d = utcDay(start);
  return dayString(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
}

/** Buckets covering `from`–`to`; `partial` marks one that runs past either end. */
function trendSpine(from, to, bucket) {
  const spine = [];
  let start = bucketStart(from, bucket);
  while (start <= to) {
    const end = bucketLastDay(start, bucket);
    spine.push({ start, end, partial: start < from || end > to });
    start = shiftDay(end, 1);
  }
  return spine;
}

/** Staff forum actions in `account_activity`, grouped the way the dashboard shows them. */
const FORUM_ACTION_KINDS = [
  { key: 'removed', label: 'Posts removed', color: '#f87171', codes: ['FORUM_DISCUSSION_REMOVED'] },
  { key: 'hidden', label: 'Comments hidden', color: '#fb923c', codes: ['FORUM_COMMENT_REMOVED'] },
  { key: 'locked', label: 'Threads locked', color: '#fbbf24', codes: ['FORUM_DISCUSSION_LOCKED'] },
  { key: 'pinned', label: 'Threads pinned', color: '#a78bfa', codes: ['FORUM_DISCUSSION_PINNED'] },
  { key: 'banned', label: 'Group bans', color: '#f472b6', codes: ['FORUM_MEMBER_BANNED'] },
  { key: 'archived', label: 'Groups archived', color: '#e879f9', codes: ['FORUM_GROUP_ARCHIVED'] },
  { key: 'timeout', label: 'Forum timeouts', color: '#38bdf8', codes: ['FORUM_TIMEOUT'] },
  {
    key: 'reversed',
    label: 'Restores and undos',
    color: '#34d399',
    codes: [
      'FORUM_DISCUSSION_RESTORED',
      'FORUM_COMMENT_RESTORED',
      'FORUM_DISCUSSION_UNLOCKED',
      'FORUM_DISCUSSION_UNPINNED',
      'FORUM_MEMBER_UNBANNED',
      'FORUM_GROUP_REACTIVATED',
    ],
  },
];

function actionKindFor(eventCode) {
  const code = String(eventCode || '').toUpperCase();
  return FORUM_ACTION_KINDS.find((kind) => kind.codes.includes(code)) || { key: 'other', label: 'Other', color: '#a1a1aa' };
}

/** Same groupings as `getForumReportBreakdown` and `ticketStatusChart`. */
function reportStatusGroup(status) {
  const s = String(status || 'open').toLowerCase();
  if (['open', 'pending'].includes(s)) return 'Open';
  if (['in_review', 'in review', 'in_progress', 'in progress', 'under_review', 'escalated'].includes(s)) return 'In review';
  if (['resolved', 'closed', 'sanctioned'].includes(s)) return 'Resolved';
  if (['dismissed', 'denied', 'archived'].includes(s)) return 'Dismissed';
  return 'Open';
}

const REPORT_STATUS_COLORS = { Open: '#f87171', 'In review': '#fbbf24', Resolved: '#34d399', Dismissed: '#a1a1aa' };

function ticketStatusGroup(status) {
  if (status === 'Open') return 'Open';
  if (['Resolved', 'Closed'].includes(status)) return 'Closed';
  return 'In progress';
}

const TICKET_STATUS_COLORS = { Open: '#fb7185', 'In progress': '#fbbf24', Closed: '#a1a1aa' };

const TARGET_COLORS = ['#a78bfa', '#818cf8', '#c084fc', '#f0abfc', '#67e8f9', '#94a3b8'];

function labelWords(value) {
  return String(value || 'other')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function toMix(map, colors) {
  return [...map.entries()]
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({
      label,
      value,
      color: Array.isArray(colors) ? colors[i % colors.length] : colors[label] || '#a1a1aa',
    }));
}

/** Forum tickets, forum reports and staff forum actions per day across `since`–`to`. */
async function fetchForumCaseDays(since, to) {
  const range = 'created_at >= $1::date AND created_at < ($2::date + 1)';
  const ticketTypes = FORUM_TICKET_SCOPE.typesIn.map((t) => normalizeTicketType(t));
  const [tickets, reports, actions] = await Promise.all([
    pool.query(
      `
      SELECT (created_at::timestamp)::date::text AS day, status, COUNT(*)::int AS n
      FROM tickets
      WHERE deleted_at IS NULL AND type = ANY($3) AND ${range}
      GROUP BY 1, 2
      `,
      [since, to, ticketTypes]
    ),
    pool.query(
      `
      SELECT
        (created_at::timestamp)::date::text AS day,
        LOWER(COALESCE(target_type, type)) AS target,
        LOWER(COALESCE(status, 'open')) AS status,
        COUNT(*)::int AS n
      FROM reports
      WHERE deleted_at IS NULL AND LOWER(COALESCE(target_type, type)) = ANY($3) AND ${range}
      GROUP BY 1, 2, 3
      `,
      [since, to, [...FORUM_REPORT_TYPES]]
    ),
    pool.query(
      `
      SELECT (created_at::timestamp)::date::text AS day, event_code, COUNT(*)::int AS n
      FROM account_activity
      WHERE actor_staff_id IS NOT NULL AND LEFT(event_code, 6) = 'FORUM_' AND ${range}
      GROUP BY 1, 2
      `,
      [since, to]
    ),
  ]);
  return { tickets: tickets.rows, reports: reports.rows, actions: actions.rows };
}

/**
 * New discussions, comments and groups per day (with the group and member behind each
 * post), and content moderation took down, across `since`–`to`. Days are UTC.
 */
async function fetchForumCommunityDays(db, since, to) {
  const between = { $gte: utcDay(since), $lt: utcDay(shiftDay(to, 1)) };
  const day = (path) => ({ $dateToString: { format: '%Y-%m-%d', date: path } });
  const byDayGroupMember = { $group: { _id: { day: day('$d'), g: '$g', u: '$u' }, n: { $sum: 1 } } };
  const byDay = { $group: { _id: day('$d'), n: { $sum: 1 } } };

  const [posts, comments, groups, removedPosts, removedComments] = await Promise.all([
    db
      .collection('forum_discussions')
      .aggregate([
        {
          $project: {
            d: toDateExpression('$created_at'),
            g: { $toString: '$forum_group_id' },
            u: { $toString: '$user_id' },
          },
        },
        { $match: { d: between } },
        byDayGroupMember,
      ])
      .toArray(),
    db
      .collection('forum_discussions')
      .aggregate([
        { $match: { 'comments.0': { $exists: true } } },
        { $project: { g: { $toString: '$forum_group_id' }, comments: 1 } },
        { $unwind: '$comments' },
        {
          $project: {
            g: 1,
            u: { $toString: '$comments.user_id' },
            d: toDateExpression('$comments.created_at'),
          },
        },
        { $match: { d: between } },
        byDayGroupMember,
      ])
      .toArray(),
    db
      .collection('forum_groups')
      .aggregate([{ $project: { d: toDateExpression('$created_at') } }, { $match: { d: between } }, byDay])
      .toArray(),
    db
      .collection('forum_discussions')
      .aggregate([
        {
          $project: {
            d: toDateExpression('$deleted_at'),
            mod: removedByModerationExpression('$deleted_at', '$removed_by'),
          },
        },
        { $match: { mod: true, d: between } },
        byDay,
      ])
      .toArray(),
    db
      .collection('forum_discussions')
      .aggregate([
        { $match: { comments: { $elemMatch: { deleted_at: { $ne: null } } } } },
        { $project: { comments: 1 } },
        { $unwind: '$comments' },
        {
          $project: {
            d: toDateExpression('$comments.deleted_at'),
            mod: removedByModerationExpression('$comments.deleted_at', '$comments.removed_by'),
          },
        },
        { $match: { mod: true, d: between } },
        byDay,
      ])
      .toArray(),
  ]);
  return { posts, comments, groups, removedPosts, removedComments };
}

const TOP_LIST_SIZE = 6;

function topEntries(map, size = TOP_LIST_SIZE) {
  return [...map.entries()]
    .filter(([id]) => id && id !== 'null')
    .sort((a, b) => b[1].posts + b[1].comments - (a[1].posts + a[1].comments))
    .slice(0, size);
}

/**
 * Everything the Forum dashboard's Trends section draws for one range: a series per bucket,
 * totals for the range and the period before it, status and target mixes for cases filed in
 * the range, staff actions by kind, and the busiest groups and members. Either store failing
 * leaves its half empty with a note instead of failing the whole response.
 *
 * @param range {{ from, to, bucket, previous }} from `resolveRange` (inclusive YYYY-MM-DD days)
 */
async function getForumTrends({ from, to, bucket, previous }) {
  const since = previous?.from || from;
  const spine = trendSpine(from, to, bucket);
  const index = new Map(spine.map((point, i) => [point.start, i]));
  const empty = () => spine.map(() => 0);
  const series = {
    discussions: empty(),
    comments: empty(),
    groups: empty(),
    activeMembers: empty(),
    takedowns: empty(),
    reports: empty(),
    tickets: empty(),
    actions: empty(),
  };
  const totals = Object.fromEntries(Object.keys(series).map((key) => [key, 0]));
  const previousTotals = Object.fromEntries(Object.keys(series).map((key) => [key, 0]));
  const notes = [];

  /** Adds `n` on `day` to a metric: the range's bucket, or the previous period's total. */
  const add = (metric, day, n) => {
    if (!day || n <= 0) return;
    if (day < from) {
      previousTotals[metric] += n;
      return;
    }
    if (day > to) return;
    const i = index.get(bucketStart(day, bucket));
    if (i == null) return;
    series[metric][i] += n;
    totals[metric] += n;
  };

  const ticketStatus = new Map();
  const reportStatus = new Map();
  const reportTargets = new Map();
  const actionKinds = new Map();

  let casesAvailable = true;
  try {
    const cases = await fetchForumCaseDays(since, to);
    for (const row of cases.tickets) {
      add('tickets', row.day, Number(row.n));
      if (row.day >= from) {
        const label = ticketStatusGroup(row.status);
        ticketStatus.set(label, (ticketStatus.get(label) || 0) + Number(row.n));
      }
    }
    for (const row of cases.reports) {
      add('reports', row.day, Number(row.n));
      if (row.day >= from) {
        const status = reportStatusGroup(row.status);
        reportStatus.set(status, (reportStatus.get(status) || 0) + Number(row.n));
        const target = labelWords(row.target);
        reportTargets.set(target, (reportTargets.get(target) || 0) + Number(row.n));
      }
    }
    for (const row of cases.actions) {
      add('actions', row.day, Number(row.n));
      if (row.day >= from) {
        const kind = actionKindFor(row.event_code);
        const current = actionKinds.get(kind.key) || { label: kind.label, color: kind.color, value: 0 };
        current.value += Number(row.n);
        actionKinds.set(kind.key, current);
      }
    }
  } catch (err) {
    console.error('Forum trends: ticket, report and action series failed:', err.message);
    casesAvailable = false;
    notes.push('Ticket, report and staff action trends could not be read just now.');
  }

  const db = forumDb();
  let communityAvailable = Boolean(db);
  let topGroups = [];
  let topMembers = [];
  if (!db) {
    notes.push('MongoDB is not connected, so discussion, comment and group trends are unavailable.');
  } else {
    try {
      const community = await fetchForumCommunityDays(db, since, to);
      const groupTotals = new Map();
      const memberTotals = new Map();
      const membersByBucket = spine.map(() => new Set());
      const membersNow = new Set();
      const membersBefore = new Set();

      const tally = (rows, metric) => {
        for (const row of rows) {
          const { day: rowDay, g, u } = row._id || {};
          const n = Number(row.n || 0);
          add(metric, rowDay, n);
          if (!rowDay || rowDay > to) continue;
          if (rowDay < from) {
            if (u) membersBefore.add(u);
            continue;
          }
          if (u) {
            membersNow.add(u);
            const i = index.get(bucketStart(rowDay, bucket));
            if (i != null) membersByBucket[i].add(u);
            const member = memberTotals.get(u) || { posts: 0, comments: 0 };
            member[metric === 'discussions' ? 'posts' : 'comments'] += n;
            memberTotals.set(u, member);
          }
          if (g) {
            const group = groupTotals.get(g) || { posts: 0, comments: 0 };
            group[metric === 'discussions' ? 'posts' : 'comments'] += n;
            groupTotals.set(g, group);
          }
        }
      };
      tally(community.posts, 'discussions');
      tally(community.comments, 'comments');
      for (const row of community.groups) add('groups', row._id, Number(row.n || 0));
      for (const row of [...community.removedPosts, ...community.removedComments]) {
        add('takedowns', row._id, Number(row.n || 0));
      }
      series.activeMembers = membersByBucket.map((set) => set.size);
      totals.activeMembers = membersNow.size;
      previousTotals.activeMembers = membersBefore.size;

      const groupTop = topEntries(groupTotals);
      const memberTop = topEntries(memberTotals);
      const groupIds = groupTop.map(([id]) => id).filter((id) => ObjectId.isValid(id));
      const [groupDocs, identities] = await Promise.all([
        groupIds.length
          ? db
              .collection('forum_groups')
              .find({ _id: { $in: groupIds.map((id) => new ObjectId(id)) } })
              .project({ group_name: 1, image_url: 1, status: 1, members: 1 })
              .toArray()
          : [],
        resolveForumIdentities(memberTop.map(([id]) => id)),
      ]);
      const groupsById = new Map(groupDocs.map((group) => [String(group._id), group]));
      topGroups = groupTop
        .filter(([id]) => groupsById.has(id))
        .map(([id, counts]) => {
          const group = groupsById.get(id);
          return {
            id,
            name: group.group_name || 'Untitled group',
            imageUrl: group.image_url || null,
            status: group.status || 'active',
            memberCount: Array.isArray(group.members) ? group.members.length : 0,
            posts: counts.posts,
            comments: counts.comments,
          };
        });
      topMembers = memberTop.map(([id, counts]) => ({
        ...identityPerson(id, identities),
        name: identities.get(String(id))?.display_name || 'Forum member',
        posts: counts.posts,
        comments: counts.comments,
      }));
    } catch (err) {
      console.error('Forum trends: community series failed:', err.message);
      communityAvailable = false;
      notes.push('Discussion, comment and group trends could not be read just now.');
    }
  }

  return {
    points: spine.map((point, i) => ({
      ...point,
      ...Object.fromEntries(Object.entries(series).map(([key, values]) => [key, values[i]])),
    })),
    totals,
    previousTotals: previous ? previousTotals : null,
    mix: {
      ticketStatus: toMix(ticketStatus, TICKET_STATUS_COLORS),
      reportStatus: toMix(reportStatus, REPORT_STATUS_COLORS),
      reportTargets: toMix(reportTargets, TARGET_COLORS),
      actionKinds: [...actionKinds.values()].sort((a, b) => b.value - a.value),
    },
    topGroups,
    topMembers,
    available: { cases: casesAvailable, community: communityAvailable },
    notes,
  };
}

// ─── Member footprint (report cases) ───────────────────────────────────

/** `created_at` is a Date on some documents and an ISO string on others. */
function toDateExpression(path) {
  return { $convert: { input: path, to: 'date', onError: null, onNull: null } };
}

function isSetExpression(path) {
  return { $ne: [{ $ifNull: [path, null] }, null] };
}

/** Taken down by moderation (staff, a group moderator, the discussion owner), not by its author. */
function removedByModerationExpression(deletedPath, removedByPath) {
  return { $and: [isSetExpression(deletedPath), { $ne: [{ $ifNull: [removedByPath, 'author'] }, 'author'] }] };
}

function snippet(value, max = 240) {
  const text = String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_`>~[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * One member's forum footprint for a staff report case: their latest discussions and
 * comments (including ones moderation took down), totals, and the groups they belong to,
 * own, or are banned from. Staff-only — hidden comment text is included for review.
 * Returns null when MongoDB is not connected or the member has no user id.
 */
async function getForumMemberFootprint(userId, { limit = 5 } = {}) {
  const db = forumDb();
  if (!db || !userId) return null;
  const id = String(userId);
  const take = Math.min(Math.max(Number(limit) || 5, 1), 10);
  const discussions = db.collection('forum_discussions');
  const discussionRemoved = {
    $or: [isSetExpression('$deleted_at'), { $eq: ['$status', 'removed'] }],
  };

  const [discussionFacet, commentFacet, groupRows] = await Promise.all([
    discussions
      .aggregate([
        { $match: { user_id: id } },
        { $addFields: { createdAtDate: toDateExpression('$created_at') } },
        {
          $facet: {
            recent: [
              { $sort: { createdAtDate: -1 } },
              { $limit: take },
              {
                $project: {
                  title: 1,
                  forum_group_id: 1,
                  status: 1,
                  deleted_at: 1,
                  removed_by: 1,
                  created_at: 1,
                  commentCount: { $size: { $ifNull: ['$comments', []] } },
                },
              },
            ],
            totals: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  removed: { $sum: { $cond: [discussionRemoved, 1, 0] } },
                  moderated: {
                    $sum: {
                      $cond: [
                        { $and: [discussionRemoved, { $ne: [{ $ifNull: ['$removed_by', 'author'] }, 'author'] }] },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      ])
      .toArray(),
    discussions
      .aggregate([
        { $match: { 'comments.user_id': id } },
        { $project: { title: 1, forum_group_id: 1, comments: 1 } },
        { $unwind: '$comments' },
        { $match: { 'comments.user_id': id } },
        { $addFields: { createdAtDate: toDateExpression('$comments.created_at') } },
        {
          $facet: {
            recent: [
              { $sort: { createdAtDate: -1 } },
              { $limit: take },
              {
                $project: {
                  title: 1,
                  forum_group_id: 1,
                  commentId: '$comments.comment_id',
                  comment: '$comments.comment',
                  replyTo: '$comments.comment_reference_id',
                  deletedAt: '$comments.deleted_at',
                  removedBy: '$comments.removed_by',
                  createdAt: '$comments.created_at',
                },
              },
            ],
            totals: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  removed: { $sum: { $cond: [isSetExpression('$comments.deleted_at'), 1, 0] } },
                  moderated: {
                    $sum: {
                      $cond: [removedByModerationExpression('$comments.deleted_at', '$comments.removed_by'), 1, 0],
                    },
                  },
                },
              },
            ],
          },
        },
      ])
      .toArray(),
    db
      .collection('forum_groups')
      .aggregate([
        { $match: { 'members.userId': id } },
        {
          $project: {
            group_name: 1,
            status: 1,
            deleted_at: 1,
            member: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: { $ifNull: ['$members', []] },
                    as: 'm',
                    cond: { $eq: [{ $toString: '$$m.userId' }, id] },
                  },
                },
                0,
              ],
            },
          },
        },
      ])
      .toArray(),
  ]);

  const recentDiscussions = discussionFacet[0]?.recent || [];
  const recentComments = commentFacet[0]?.recent || [];
  const groupIds = [
    ...new Set(
      [...recentDiscussions, ...recentComments]
        .map((row) => String(row.forum_group_id || ''))
        .filter((value) => ObjectId.isValid(value))
    ),
  ];
  const groupNames = new Map(groupRows.map((group) => [String(group._id), group.group_name || 'Untitled group']));
  const missing = groupIds.filter((value) => !groupNames.has(value));
  if (missing.length) {
    const extra = await db
      .collection('forum_groups')
      .find({ _id: { $in: missing.map((value) => new ObjectId(value)) } }, { projection: { group_name: 1 } })
      .toArray();
    for (const group of extra) groupNames.set(String(group._id), group.group_name || 'Untitled group');
  }
  const groupName = (value) => (value ? groupNames.get(String(value)) || null : null);

  const liveGroups = groupRows.filter(
    (group) => group.member && !group.deleted_at && (!group.status || group.status === 'active')
  );
  const dTotals = discussionFacet[0]?.totals?.[0] || {};
  const cTotals = commentFacet[0]?.totals?.[0] || {};

  return {
    available: true,
    totals: {
      discussions: Number(dTotals.total || 0),
      removedDiscussions: Number(dTotals.removed || 0),
      moderatedDiscussions: Number(dTotals.moderated || 0),
      comments: Number(cTotals.total || 0),
      removedComments: Number(cTotals.removed || 0),
      moderatedComments: Number(cTotals.moderated || 0),
    },
    groups: {
      joined: liveGroups.filter((group) => !group.member.is_banned).length,
      owned: liveGroups.filter((group) => group.member.role === 'Admin' && !group.member.is_banned).length,
      bannedFrom: liveGroups.filter((group) => group.member.is_banned).length,
      list: liveGroups.slice(0, 6).map((group) => ({
        id: String(group._id),
        name: group.group_name || 'Untitled group',
        role: group.member.role || 'Member',
        banned: Boolean(group.member.is_banned),
      })),
    },
    recentDiscussions: recentDiscussions.map((doc) => {
      const removed = Boolean(doc.deleted_at) || doc.status === 'removed';
      return {
        id: String(doc._id),
        title: doc.title || 'Untitled discussion',
        groupId: doc.forum_group_id ? String(doc.forum_group_id) : null,
        groupName: groupName(doc.forum_group_id),
        status: removed ? 'removed' : 'active',
        removedBy: removed ? doc.removed_by || null : null,
        commentCount: Number(doc.commentCount || 0),
        createdAt: doc.created_at || null,
      };
    }),
    recentComments: recentComments.map((row) => ({
      discussionId: String(row._id),
      discussionTitle: row.title || 'Untitled discussion',
      groupName: groupName(row.forum_group_id),
      commentId: row.commentId || null,
      isReply: Boolean(row.replyTo),
      // An author's own delete wipes the text; a moderation removal keeps it for review.
      snippet: snippet(row.comment),
      removed: Boolean(row.deletedAt),
      removedBy: row.deletedAt ? row.removedBy || 'author' : null,
      createdAt: row.createdAt || null,
    })),
  };
}

module.exports = {
  getForumOverview,
  getForumTrends,
  getForumTickets,
  getForumReports,
  getModeratorForumGroups,
  getModeratorForumGroupDetail,
  setForumGroupStatus,
  getModeratorForumDiscussions,
  getModeratorForumDiscussionDetail,
  setForumDiscussionStatus,
  setForumDiscussionCommentHidden,
  getForumModerationStats,
  getForumMemberFootprint,
};
