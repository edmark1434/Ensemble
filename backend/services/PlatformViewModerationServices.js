const redisClient = require('../lib/Redis');
const { resolveStaffForSession } = require('../lib/StaffSession');
const permissions = require('../lib/UserTeamPermissions');
const { REPORT_QUEUE_SCOPES, normalizeReportTargetType } = require('../lib/ReportEnums');
const { describeEvent } = require('../lib/ActivityCatalog');
const repo = require('../repositories/PlatformViewModerationRepositories');

/**
 * Moderation from platform view: the staff console shows a member page in a frame, and this
 * service tells the console what that page is about and what this staff member may do there.
 *
 * Nothing is trusted from the frame or the console beyond a member path and an item key. The
 * item, its owner, its state and the evidence saved with an action are all read here, again,
 * when the action is taken. Actions run through the same desk paths as everywhere else
 * (`warnAccount`, `updateAccountStatus`, forum / listing / posting moderation), so their role
 * rules, notices, realtime events and audit rows all still apply; this service adds the
 * on-the-spot rules: evidence, desk area, a duplicate check and a per-account lock.
 */

const PATH_MAX_LENGTH = 512;
const TOKEN_RE = /^[A-Za-z0-9_-]{1,64}$/;
const REASON_MIN_LENGTH = 10;
const REASON_MAX_LENGTH = 500;
const EXCERPT_MAX_LENGTH = 1000;
/** Another staff action on the same account this recently needs an explicit "act anyway". */
const RECENT_ACTION_WINDOW_MS = 10 * 60 * 1000;
/** One quick action per account at a time, across every console. */
const ACTION_LOCK_TTL_MS = 30 * 1000;

const ACCOUNT_ACTIONS = Object.freeze(['warn', 'timeout', 'suspend', 'lock', 'ban']);
const ACCOUNT_ACTION_LABELS = Object.freeze({
  warn: 'Warning',
  timeout: 'Forum timeout',
  suspend: 'Suspension',
  lock: 'Lock',
  ban: 'Ban',
});

/** Standing events that count as "someone just acted on this account". */
const ACCOUNT_GUARD_EVENTS = new Set([
  'ACCOUNT_WARNED',
  'ACCOUNT_STATUS_CHANGED',
  'ACCOUNT_PARDONED',
  'WARNING_RESCINDED',
  'FORUM_TIMEOUT',
  'FORUM_TIMEOUT_CLEARED',
  'TEAM_LEADER_WARNED',
  'TEAM_LEADER_TIMEOUT',
]);

const DESK_LABELS = Object.freeze({
  admin: 'Admin',
  support: 'Support',
  forum: 'Forum',
  marketplace: 'Marketplace',
  jobs: 'Jobs & Gigs',
});

/**
 * Content actions per area. Who may run each one matches the desk routes that already exist
 * for it (Forum Control, Marketplace Control, Jobs & Gigs Control): Admin plus that desk.
 */
const CONTENT_ACTIONS = Object.freeze({
  hide_comment: {
    area: 'forum',
    label: 'Hide comment',
    done: 'Comment hidden',
    hint: 'Members see a placeholder instead. Forum Control can restore it.',
  },
  remove_discussion: {
    area: 'forum',
    label: 'Remove discussion',
    done: 'Discussion removed',
    hint: 'Takes the post and its replies off the forum. Forum Control can restore it.',
  },
  lock_discussion: {
    area: 'forum',
    label: 'Lock replies',
    done: 'Replies locked',
    hint: 'The post stays up, but nobody can reply.',
  },
  archive_group: {
    area: 'forum',
    label: 'Archive group',
    done: 'Group archived',
    hint: 'The group and its discussions leave the forum. Forum Control can reactivate it.',
  },
  delist_listing: {
    area: 'marketplace',
    label: 'Delist listing',
    done: 'Listing delisted',
    hint: 'Takes the asset out of the catalog. The seller is told why.',
  },
  rereview_listing: {
    area: 'marketplace',
    label: 'Send back for review',
    done: 'Listing sent back for review',
    hint: 'Pulls the asset from the catalog until a moderator approves it again (the copyright path).',
  },
  pause_posting: {
    area: 'jobs',
    label: 'Pause posting',
    done: 'Posting paused',
    hint: 'Hidden from the board until it is reopened from Jobs & Gigs Control.',
  },
  close_posting: {
    area: 'jobs',
    label: 'Close posting',
    done: 'Posting closed',
    hint: 'No new applications or orders. Live contracts continue.',
  },
});

const POSTING_RESERVED_IDS = new Set(['choose', 'create', 'edit', 'proposals', 'applied', 'saved-posts', 'my-job-post', 'info']);
const ASSET_RESERVED_IDS = new Set(['owned', 'seller', 'purchased', 'saved', 'liked', 'trash']);
const TEAM_RESERVED_IDS = new Set(['join', 'invite']);

function serviceError(message, statusCode = 400, code = null, details = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  if (details) error.details = details;
  return error;
}

function plainText(value, max) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/[#*_`>~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function postingStatus(rawStatus, deletedAt) {
  if (deletedAt) return 'archived';
  const s = String(rawStatus || '').trim().toLowerCase();
  if (s === 'open' || s === 'active') return 'active';
  if (s === 'pause') return 'paused';
  if (s === 'close') return 'closed';
  return s || 'active';
}

function iso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function whenLabel(value) {
  const at = iso(value);
  if (!at) return '';
  return ` until ${new Date(at).toUTCString().replace(/:\d\d GMT$/, ' UTC')}`;
}

/* ------------------------------------------------------------------ */
/* What the page is about                                              */
/* ------------------------------------------------------------------ */

function safeSegment(value) {
  try {
    const decoded = decodeURIComponent(value);
    return TOKEN_RE.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

/**
 * A member-site path → what it shows. Only member paths are accepted (the same rules platform
 * view itself uses); anything else is a page with no single subject.
 */
function parseMemberPath(rawPath) {
  const raw = String(rawPath || '').trim();
  if (!raw || raw.length > PATH_MAX_LENGTH || !raw.startsWith('/') || raw.startsWith('//')
    || raw.includes('://') || raw.includes('\\')) {
    throw serviceError('Open a member page in platform view first.');
  }
  const pathname = raw.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  const match = (pattern) => pathname.match(pattern);
  let m;

  if ((m = match(/^\/profile\/([^/]+)$/i))) {
    const id = safeSegment(m[1]);
    return { path: raw, kind: 'profile', label: 'Profile', target: id ? { kind: 'profile', id } : null, pickable: false };
  }
  if ((m = match(/^\/teams\/([^/]+)$/i)) && !TEAM_RESERVED_IDS.has(m[1].toLowerCase())) {
    const id = safeSegment(m[1]);
    return { path: raw, kind: 'team', label: 'Team', target: id ? { kind: 'team', id } : null, pickable: false };
  }
  if ((m = match(/^\/forums\/group\/([^/]+)$/i))) {
    const id = safeSegment(m[1]);
    return { path: raw, kind: 'forum_group', label: 'Forum group', target: id ? { kind: 'forum_group', id } : null, pickable: true };
  }
  if ((m = match(/^\/forums\/discussion\/([^/]+)$/i))) {
    const id = safeSegment(m[1]);
    return { path: raw, kind: 'forum_discussion', label: 'Discussion', target: id ? { kind: 'forum_discussion', id } : null, pickable: true };
  }
  if (pathname === '/forums') {
    return { path: raw, kind: 'forum_feed', label: 'Forums', target: null, pickable: true };
  }
  if ((m = match(/^\/jobs\/postings\/([^/]+)(?:\/page)?$/i) || match(/^\/jobs\/([^/]+)\/page$/i))
    && !POSTING_RESERVED_IDS.has(m[1].toLowerCase())) {
    const id = safeSegment(m[1]);
    return { path: raw, kind: 'job', label: 'Job posting', target: id ? { kind: 'job', id } : null, pickable: false };
  }
  if ((m = match(/^\/gigs\/services\/([^/]+)(?:\/page)?$/i)) && !POSTING_RESERVED_IDS.has(m[1].toLowerCase())) {
    const id = safeSegment(m[1]);
    return { path: raw, kind: 'gig', label: 'Gig', target: id ? { kind: 'gig', id } : null, pickable: false };
  }
  if ((m = match(/^\/assets\/([^/]+)$/i)) && !ASSET_RESERVED_IDS.has(m[1].toLowerCase())) {
    const id = safeSegment(m[1]);
    return { path: raw, kind: 'asset', label: 'Marketplace asset', target: id ? { kind: 'asset', id } : null, pickable: false };
  }
  if ((m = match(/^\/disputes\/([^/]+)$/i))) {
    const id = safeSegment(m[1]);
    return { path: raw, kind: 'dispute', label: 'Dispute', target: id ? { kind: 'dispute', id } : null, pickable: false };
  }
  return { path: raw, kind: 'page', label: 'Member page', target: null, pickable: false };
}

/** An item picked on the page (`data-moderation-subject` in the member markup). */
function parsePick(rawPick) {
  const parts = String(rawPick || '').trim().split(':');
  if (parts.length < 2 || parts.length > 3 || !parts.every((part) => TOKEN_RE.test(part))) return null;
  const [kind, first, second] = parts;
  if (kind === 'forum_comment' && second) return { kind, id: first, commentId: second };
  if (parts.length !== 2) return null;
  if (kind === 'forum_discussion' || kind === 'forum_group') return { kind, id: first };
  if (kind === 'account') return { kind: 'profile', id: first };
  return null;
}

function missingSubject(kind, kindLabel, key, message) {
  return {
    key,
    kind,
    kindLabel,
    area: 'none',
    available: false,
    title: kindLabel,
    excerpt: null,
    href: null,
    status: 'missing',
    statusLabel: 'Not found',
    people: [],
    reportTargets: [],
    contentActionIds: [],
    content: {},
    facts: [],
    notes: [message],
    readOnly: null,
  };
}

async function forumDetail(discussionId) {
  const forum = require('./ForumContentModerationServices');
  try {
    return { detail: await forum.getForumDiscussionForStaff(discussionId), failed: false };
  } catch (err) {
    console.warn('Platform view could not read a forum discussion:', err.message);
    return { detail: null, failed: true };
  }
}

async function resolveForumComment(discussionId, commentId) {
  const key = `forum_comment:${discussionId}:${commentId}`;
  const { detail, failed } = await forumDetail(discussionId);
  if (failed) return missingSubject('forum_comment', 'Forum comment', key, 'Forum data could not be loaded right now. Try again in a moment.');
  if (!detail) return missingSubject('forum_comment', 'Forum comment', key, 'This discussion no longer exists.');
  const comment = (detail.comments || []).find((row) => String(row.commentId) === String(commentId));
  if (!comment) return missingSubject('forum_comment', 'Forum comment', key, 'This comment no longer exists.');
  const isReply = Boolean(comment.replyToCommentId);
  const byAuthor = comment.isDeleted && comment.removedBy === 'author';
  const status = !comment.isDeleted ? 'visible' : byAuthor ? 'deleted_by_author' : 'hidden';
  const notes = [];
  if (byAuthor) notes.push('The author deleted this comment, so its text is gone.');
  else if (comment.isDeleted) notes.push(`Already hidden by ${comment.removedBy === 'staff' ? 'staff' : 'a group moderator'}${comment.removalReason ? `: ${comment.removalReason}` : ''}.`);
  if (!comment.author?.accountId) notes.push('The author could not be matched to an account.');
  if (comment.attachmentCount) notes.push(`${comment.attachmentCount} attachment(s) are not part of the saved evidence; open Forum Control to review them.`);
  return {
    key,
    kind: 'forum_comment',
    kindLabel: isReply ? 'Forum reply' : 'Forum comment',
    area: 'forum',
    available: true,
    title: `${isReply ? 'Reply' : 'Comment'} by ${comment.author?.name || 'a member'} in “${detail.title}”`,
    excerpt: plainText(comment.comment, EXCERPT_MAX_LENGTH) || null,
    href: `/forums/discussion/${detail.id}`,
    status,
    statusLabel: { visible: 'Visible', hidden: 'Hidden', deleted_by_author: 'Deleted by the author' }[status],
    createdAt: iso(comment.createdAt),
    people: comment.author?.accountId ? [{ accountId: String(comment.author.accountId), relation: 'Author' }] : [],
    reportTargets: [{ targetType: 'comment', targetId: String(comment.commentId) }],
    contentActionIds: comment.isDeleted ? [] : ['hide_comment'],
    content: { discussionId: detail.id, commentId: String(comment.commentId) },
    facts: [
      { label: 'Group', value: detail.groupName || '—' },
      { label: 'Discussion', value: detail.title },
      { label: 'Likes', value: String(comment.likeCount || 0) },
      { label: 'Replies', value: String(comment.replyCount || 0) },
    ],
    notes,
    readOnly: null,
  };
}

async function resolveForumDiscussion(discussionId) {
  const key = `forum_discussion:${discussionId}`;
  const { detail, failed } = await forumDetail(discussionId);
  if (failed) return missingSubject('forum_discussion', 'Discussion', key, 'Forum data could not be loaded right now. Try again in a moment.');
  if (!detail) return missingSubject('forum_discussion', 'Discussion', key, 'This discussion no longer exists.');
  const removed = detail.status === 'removed';
  const byAuthor = removed && detail.removedBy === 'author';
  const status = byAuthor ? 'deleted_by_author' : removed ? 'removed' : detail.isLocked ? 'locked' : 'active';
  const notes = [];
  if (byAuthor) notes.push('The author deleted this discussion.');
  else if (removed) notes.push(`Already removed${detail.removalReason ? `: ${detail.removalReason}` : ''}.`);
  if (!detail.author?.accountId) notes.push('The author could not be matched to an account.');
  if (detail.groupStatus && detail.groupStatus !== 'active') notes.push('Its group is archived.');
  return {
    key,
    kind: 'forum_discussion',
    kindLabel: 'Discussion',
    area: 'forum',
    available: true,
    title: detail.title,
    excerpt: plainText(detail.content || detail.description, EXCERPT_MAX_LENGTH) || null,
    href: `/forums/discussion/${detail.id}`,
    status,
    statusLabel: { active: 'Live', locked: 'Live, replies locked', removed: 'Removed', deleted_by_author: 'Deleted by the author' }[status],
    createdAt: iso(detail.createdAt),
    people: detail.author?.accountId ? [{ accountId: String(detail.author.accountId), relation: 'Author' }] : [],
    reportTargets: [
      { targetType: 'discussion', targetId: String(detail.id) },
      { targetType: 'post', targetId: String(detail.id) },
    ],
    contentActionIds: removed ? [] : ['remove_discussion', ...(detail.isLocked ? [] : ['lock_discussion'])],
    content: { discussionId: detail.id },
    facts: [
      { label: 'Group', value: detail.groupName || '—' },
      { label: 'Comments', value: String(detail.commentCount ?? (detail.comments || []).length) },
      { label: 'Likes', value: String(detail.likeCount || 0) },
    ],
    notes,
    readOnly: null,
  };
}

async function resolveForumGroup(groupId) {
  const key = `forum_group:${groupId}`;
  const forum = require('./ForumContentModerationServices');
  let detail = null;
  try {
    detail = await forum.getForumGroupForStaff(groupId);
  } catch (err) {
    console.warn('Platform view could not read a forum group:', err.message);
    return missingSubject('forum_group', 'Forum group', key, 'Forum data could not be loaded right now. Try again in a moment.');
  }
  if (!detail) return missingSubject('forum_group', 'Forum group', key, 'This group no longer exists.');
  const active = detail.status === 'active';
  const ownerId = detail.owner?.accountId || null;
  return {
    key,
    kind: 'forum_group',
    kindLabel: 'Forum group',
    area: 'forum',
    available: true,
    title: detail.name,
    excerpt: plainText(detail.description, EXCERPT_MAX_LENGTH) || null,
    href: `/forums/group/${detail.id}`,
    status: active ? 'active' : 'archived',
    statusLabel: active ? 'Active' : 'Archived',
    createdAt: iso(detail.createdAt),
    people: ownerId ? [{ accountId: String(ownerId), relation: 'Group owner' }] : [],
    reportTargets: [{ targetType: 'group', targetId: String(detail.id) }],
    contentActionIds: active ? ['archive_group'] : [],
    content: { groupId: detail.id },
    facts: [
      { label: 'Members', value: String(detail.memberCount ?? '—') },
      { label: 'Discussions', value: String(detail.discussionCount ?? '—') },
    ],
    notes: ownerId ? [] : ['The group owner could not be matched to an account.'],
    readOnly: null,
  };
}

async function resolvePosting(type, id) {
  const key = `${type}:${id}`;
  const label = type === 'job' ? 'Job posting' : 'Gig';
  const row = type === 'job' ? await repo.getJobForModeration(id) : await repo.getGigForModeration(id);
  if (!row) return missingSubject(type, label, key, `This ${type} no longer exists.`);
  const status = postingStatus(row.status, row.deleted_at);
  const ownerId = type === 'job' ? row.client_account_id : row.freelancer_account_id;
  const postingId = type === 'job' ? row.job_id : row.gig_id;
  return {
    key,
    kind: type,
    kindLabel: label,
    area: 'jobs',
    available: true,
    title: row.title || label,
    excerpt: plainText(row.description, EXCERPT_MAX_LENGTH) || null,
    href: type === 'job' ? `/jobs/postings/${postingId}` : `/gigs/services/${postingId}`,
    status,
    statusLabel: { active: 'Open', paused: 'Paused', closed: 'Closed', archived: 'Archived' }[status] || status,
    createdAt: null,
    people: ownerId ? [{ accountId: String(ownerId), relation: type === 'job' ? 'Posted by' : 'Seller' }] : [],
    reportTargets: [{ targetType: type, targetId: String(postingId) }],
    contentActionIds: status === 'active' ? ['pause_posting', 'close_posting'] : status === 'paused' ? ['close_posting'] : [],
    content: { postingType: type, postingId: String(postingId) },
    facts: [{ label: 'Status', value: { active: 'Open', paused: 'Paused', closed: 'Closed', archived: 'Archived' }[status] || status }],
    notes: status === 'archived' ? ['This posting is archived.'] : [],
    readOnly: null,
  };
}

async function resolveAsset(id) {
  const key = `asset:${id}`;
  const row = await repo.getAssetForModeration(id);
  if (!row || row.deleted_at) return missingSubject('asset', 'Marketplace asset', key, 'This asset no longer exists.');
  const listingStatus = String(row.listing_status || '').toLowerCase() || null;
  const notes = [];
  let people = row.submitted_by_account_id ? [{ accountId: String(row.submitted_by_account_id), relation: 'Seller' }] : [];
  if (row.is_admin_asset) {
    people = [];
    notes.push('This is one of Ensemble’s own assets. Manage it from Marketplace Control.');
  }
  if (!row.listing_id) notes.push('No catalog listing was found for this asset.');
  else if (listingStatus === 'pending') notes.push('This listing is waiting for review in Marketplace Control.');
  return {
    key,
    kind: 'asset',
    kindLabel: 'Marketplace asset',
    area: 'marketplace',
    available: true,
    title: row.name || row.listing_title || 'Marketplace asset',
    excerpt: plainText(row.description, EXCERPT_MAX_LENGTH) || null,
    href: `/assets/${row.market_asset_id}`,
    status: listingStatus || 'unlisted',
    statusLabel: listingStatus ? listingStatus.charAt(0).toUpperCase() + listingStatus.slice(1) : 'No listing',
    createdAt: null,
    people,
    reportTargets: [
      { targetType: 'asset', targetId: String(row.market_asset_id) },
      ...(row.listing_id ? [{ targetType: 'listing', targetId: String(row.listing_id) }] : []),
    ],
    contentActionIds: !row.is_admin_asset && listingStatus === 'approved' ? ['delist_listing', 'rereview_listing'] : [],
    content: { listingId: row.listing_id ? String(row.listing_id) : null },
    facts: [
      { label: 'Listing', value: row.listing_number || '—' },
      { label: 'Listing status', value: listingStatus || '—' },
    ],
    notes,
    readOnly: null,
  };
}

async function resolveTeam(teamKey) {
  const key = `team:${teamKey}`;
  const team = await repo.getTeamForModeration(teamKey);
  if (!team || team.deleted_at) return missingSubject('team', 'Team', key, 'This team no longer exists.');
  return {
    key: `team:${team.account_id}`,
    kind: 'team',
    kindLabel: 'Team',
    area: 'account',
    available: true,
    title: team.display_name || team.handle || 'Team',
    excerpt: plainText([team.tagline, team.description].filter(Boolean).join(' — '), EXCERPT_MAX_LENGTH) || null,
    href: `/teams/${team.team_id}`,
    status: String(team.status || 'Active').toLowerCase(),
    statusLabel: team.status || 'Active',
    createdAt: null,
    people: [{ accountId: String(team.account_id), relation: 'Team' }],
    reportTargets: [
      { targetType: 'team', targetId: String(team.team_id) },
      { targetType: 'team', targetId: String(team.account_id) },
    ],
    contentActionIds: [],
    content: {},
    facts: [],
    notes: [],
    readOnly: null,
  };
}

async function resolveProfile(accountId) {
  const key = `account:${accountId}`;
  if (!repo.isUuid(accountId)) return missingSubject('profile', 'Profile', key, 'This profile does not exist.');
  const [row] = await repo.getAccountBasics([accountId]);
  if (!row || row.deleted_at) return missingSubject('profile', 'Profile', key, 'This account no longer exists.');
  if (String(row.type || '').toLowerCase() === 'team') return resolveTeam(row.account_id);
  return {
    key,
    kind: 'profile',
    kindLabel: 'Profile',
    area: 'account',
    available: true,
    title: row.display_name || (row.handle ? `@${row.handle}` : 'Member profile'),
    excerpt: plainText([row.tagline, row.description].filter(Boolean).join(' — '), EXCERPT_MAX_LENGTH) || null,
    href: `/profile/${row.account_id}`,
    status: String(row.status || 'Active').toLowerCase(),
    statusLabel: row.status || 'Active',
    createdAt: null,
    people: [{ accountId: String(row.account_id), relation: 'Profile' }],
    reportTargets: ['user', 'account', 'profile'].map((targetType) => ({ targetType, targetId: String(row.account_id) })),
    contentActionIds: [],
    content: {},
    facts: [],
    notes: row.staff_id ? ['This is a staff account.'] : [],
    readOnly: null,
  };
}

async function resolveDispute(idOrNumber) {
  const key = `dispute:${idOrNumber}`;
  const row = await repo.getDisputeForModeration(idOrNumber);
  if (!row || row.deleted_at) return missingSubject('dispute', 'Dispute', key, 'This dispute no longer exists.');
  return {
    key: `dispute:${row.dispute_id}`,
    kind: 'dispute',
    kindLabel: 'Dispute',
    area: 'dispute',
    available: true,
    title: row.dispute_number ? `Dispute ${row.dispute_number}` : 'Dispute',
    excerpt: null,
    href: `/disputes/${row.dispute_id}`,
    status: String(row.status || 'open').toLowerCase(),
    statusLabel: row.status || 'Open',
    createdAt: null,
    people: [
      ...(row.by_account_id ? [{ accountId: String(row.by_account_id), relation: 'Filed the dispute' }] : []),
      ...(row.for_account_id ? [{ accountId: String(row.for_account_id), relation: 'Respondent' }] : []),
    ],
    reportTargets: [],
    contentActionIds: [],
    content: {},
    facts: [],
    notes: [],
    // A penalty here would prejudge the case: the decision (and a conviction ban) belongs to it.
    readOnly: 'Penalties for the people in a dispute are decided in the dispute case, so a ruling and its ban stay together. Open it from Disputes.',
  };
}

async function resolveTarget(target) {
  if (!target) return null;
  switch (target.kind) {
    case 'forum_comment':
      return resolveForumComment(target.id, target.commentId);
    case 'forum_discussion':
      return resolveForumDiscussion(target.id);
    case 'forum_group':
      return resolveForumGroup(target.id);
    case 'job':
    case 'gig':
      return resolvePosting(target.kind, target.id);
    case 'asset':
      return resolveAsset(target.id);
    case 'team':
      return resolveTeam(target.id);
    case 'profile':
      return resolveProfile(target.id);
    case 'dispute':
      return resolveDispute(target.id);
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* What this staff member may do                                       */
/* ------------------------------------------------------------------ */

function viewerFor(session, staff) {
  const desk = permissions.deskForSession(session);
  return {
    role: staff?.role || session?.role || null,
    desk,
    deskLabel: DESK_LABELS[desk] || 'Staff',
    fullRole: desk === 'admin' || desk === 'support',
    staffAccountId: staff?.account_id ? String(staff.account_id) : null,
  };
}

/** Product pages belong to one desk; profiles and teams are account-level and open to every desk. */
function inDeskArea(viewer, subject) {
  if (!subject) return false;
  if (viewer.fullRole) return true;
  if (subject.area === 'account') return true;
  return subject.area === viewer.desk;
}

function outOfAreaMessage(area) {
  const label = DESK_LABELS[area] || 'another';
  return `This is the ${label} desk’s area, so quick actions here are for that desk, Support and Admin. If it needs action now, open the account in User & Team.`;
}

function canRunContentArea(session, area) {
  const role = String(session?.role || '');
  if (role === 'Admin') return true;
  if (area === 'forum') return permissions.isForumModerator(session);
  if (area === 'marketplace') return permissions.isMarketplaceModerator(session);
  if (area === 'jobs') return permissions.isJobsModerator(session);
  return false;
}

function allow(note = null) {
  return { allowed: true, reason: null, note };
}

function deny(reason) {
  return { allowed: false, reason, note: null };
}

function accountActionsFor({ session, viewer, row, summary, isTeam, team, leaderAccess, subject }) {
  const status = String(summary?.status || row.status || 'Active').toLowerCase();
  let common = null;
  if (row.deleted_at) common = 'This account was deleted.';
  else if (viewer.staffAccountId && viewer.staffAccountId === String(row.account_id)) common = 'This is your own account.';
  else if (row.staff_id && viewer.role !== 'Admin') common = 'Only an admin can act on a staff account.';
  else if (subject.readOnly) common = subject.readOnly;
  else if (!inDeskArea(viewer, subject)) common = outOfAreaMessage(subject.area);

  const statusActions = new Set(permissions.allowedStatusActions(session));
  const leader = team?.leader || null;
  const actions = {};
  for (const id of ACCOUNT_ACTIONS) {
    if (common) {
      actions[id] = deny(common);
      continue;
    }
    if (id === 'warn') {
      if (!permissions.canWarn(session)) actions[id] = deny('Your role cannot issue warnings.');
      else if (row.staff_id) actions[id] = deny('Staff accounts have no Platform Merit, so they cannot be warned.');
      else if (isTeam && !leader) actions[id] = deny('This team has no active leader to warn. Lock the team or assign an owner first.');
      else if (!isTeam && String(row.type || '').toLowerCase() !== 'user') actions[id] = deny('Only member accounts can be warned.');
      else actions[id] = allow(isTeam ? `Teams have no Platform Merit, so the warning goes to the team leader, ${leader.name}.` : null);
      continue;
    }
    if (!statusActions.has(id)) {
      actions[id] = deny(
        id === 'ban'
          ? 'Only Admin or Support can ban.'
          : id === 'timeout'
            ? 'Forum timeouts are for Forum moderators, Support and Admin.'
            : 'Your role cannot take this action.'
      );
      continue;
    }
    if (id === 'timeout') {
      if (isTeam && !leader) actions[id] = deny('This team has no active leader to time out.');
      else if (isTeam ? leaderAccess?.forumTimeout : summary?.forumTimeout) {
        const ends = isTeam ? leaderAccess?.forumTimeoutEndsAt : summary?.forumTimeoutEndsAt;
        actions[id] = deny(`${isTeam ? 'The team leader is' : 'Already'} timed out${whenLabel(ends)}. Change it in User & Team.`);
      } else actions[id] = allow(isTeam ? `Teams never post, so the timeout goes to the team leader, ${leader.name}.` : null);
      continue;
    }
    if (id === 'suspend') {
      if (status === 'suspended') actions[id] = deny(`Already suspended${whenLabel(summary?.statusEndsAt)}. Change the length in User & Team.`);
      else if (status === 'banned' || status === 'locked') actions[id] = deny(`This account is ${status}; a suspension would replace that stricter penalty.`);
      else actions[id] = allow();
      continue;
    }
    if (id === 'lock') {
      if (status === 'locked') actions[id] = deny('Already locked.');
      else if (status === 'banned') actions[id] = deny('This account is banned; a lock would replace the ban.');
      else actions[id] = allow();
      continue;
    }
    if (id === 'ban') {
      actions[id] = status === 'banned' ? deny(`Already banned${whenLabel(summary?.statusEndsAt)}.`) : allow();
    }
  }
  return actions;
}

async function buildAccounts({ session, viewer, subject }) {
  const people = subject?.people || [];
  if (!people.length) return [];
  const rows = await repo.getAccountBasics(people.map((person) => person.accountId));
  const byId = new Map(rows.map((row) => [String(row.account_id), row]));
  const { accountSummary } = require('../repositories/TicketCaseRepositories');
  const { describeTeamLeader } = require('./TeamSanctionServices');
  const { getAccountAccess } = require('../lib/AccountRestriction');

  return Promise.all(
    people.map(async (person) => {
      const row = byId.get(String(person.accountId));
      if (!row) {
        return {
          accountId: String(person.accountId),
          relation: person.relation,
          missing: true,
          name: 'Unknown account',
          handle: null,
          type: null,
          isTeam: false,
          isStaff: false,
          summary: null,
          team: null,
          actions: Object.fromEntries(ACCOUNT_ACTIONS.map((id) => [id, deny('This account no longer exists.')])),
        };
      }
      const isTeam = String(row.type || '').toLowerCase() === 'team';
      const [summary, team] = await Promise.all([
        accountSummary(row.account_id).catch(() => null),
        isTeam ? describeTeamLeader(row.account_id).catch(() => null) : null,
      ]);
      const leaderAccess = team?.leader ? await getAccountAccess(team.leader.accountId).catch(() => null) : null;
      return {
        accountId: String(row.account_id),
        relation: person.relation,
        missing: false,
        name: row.display_name || (row.handle ? `@${row.handle}` : 'Member'),
        handle: row.handle || null,
        type: row.type || null,
        isTeam,
        isStaff: Boolean(row.staff_id),
        staffRole: row.staff_role || null,
        summary,
        team: team
          ? {
              name: team.teamName,
              leader: team.leader
                ? {
                    ...team.leader,
                    forumTimeout: Boolean(leaderAccess?.forumTimeout),
                    forumTimeoutEndsAt: leaderAccess?.forumTimeoutEndsAt || null,
                  }
                : null,
            }
          : null,
        actions: accountActionsFor({ session, viewer, row, summary, isTeam, team, leaderAccess, subject }),
      };
    })
  );
}

function contentActionsFor({ session, viewer, subject }) {
  if (!subject?.available || subject.readOnly) return [];
  return (subject.contentActionIds || []).map((id) => {
    const def = CONTENT_ACTIONS[id];
    let reason = null;
    if (!inDeskArea(viewer, subject)) reason = outOfAreaMessage(subject.area);
    else if (!canRunContentArea(session, def.area)) reason = `${DESK_LABELS[def.area]} moderators and Admin take this action.`;
    return { id, label: def.label, hint: def.hint, allowed: !reason, reason };
  });
}

function reportDesk(targetType) {
  const type = normalizeReportTargetType(targetType);
  for (const [desk, types] of Object.entries(REPORT_QUEUE_SCOPES)) {
    if (types.includes(type)) return desk;
  }
  return 'support';
}

function sameSubject(subject, meta) {
  if (!subject || !meta) return false;
  if (meta.subjectKey && meta.subjectKey === subject.key) return true;
  if (subject.kind === 'forum_comment' && meta.commentId) return String(meta.commentId) === String(subject.content.commentId);
  return false;
}

/**
 * Everything the panel shows for one page (or one picked item on it). Built fresh on every
 * call, and again inside `performAction`, so an action never relies on what the console saw.
 */
async function buildContext(session, { path, pick } = {}, staffRow = undefined) {
  const staff = staffRow === undefined ? await resolveStaffForSession(session) : staffRow;
  if (!staff) throw serviceError('Could not match your login to a staff profile.', 403);
  const viewer = viewerFor(session, staff);
  const page = parseMemberPath(path);
  let target = page.target;
  if (pick) {
    const picked = parsePick(pick);
    if (!picked) throw serviceError('That item cannot be moderated from platform view.');
    target = picked;
  }

  const subject = await resolveTarget(target);
  const accounts = subject?.available ? await buildAccounts({ session, viewer, subject }) : [];
  const accountIds = accounts.filter((account) => !account.missing).map((account) => account.accountId);
  const watchIds = [
    ...accountIds,
    ...accounts.map((account) => account.team?.leader?.accountId).filter(Boolean),
  ];

  const [reportRows, recentRows] = subject?.available
    ? await Promise.all([
        repo.listOpenReports({ subjects: subject.reportTargets, accountIds }).catch((err) => {
          console.warn('Platform view could not load open reports:', err.message);
          return [];
        }),
        repo.listRecentStaffActions(watchIds, { hours: 24 }).catch((err) => {
          console.warn('Platform view could not load recent staff actions:', err.message);
          return [];
        }),
      ])
    : [[], []];

  const reports = reportRows.map((row) => ({
    id: String(row.report_id),
    number: row.report_number || null,
    status: row.status || 'open',
    priority: row.priority || null,
    type: row.type || null,
    targetType: row.target_type || null,
    accountId: row.for_account_id ? String(row.for_account_id) : null,
    onSubject: Boolean(row.on_subject),
    desk: reportDesk(row.target_type),
    createdAt: iso(row.created_at),
  }));

  const recentActions = recentRows.map((row) => {
    const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const event = describeEvent(row.event_code);
    return {
      id: String(row.account_activity_id),
      accountId: String(row.account_id),
      eventCode: event.eventCode,
      label: event.eventLabel,
      severity: event.severity,
      action: row.action || null,
      reason: meta.reason || meta.note || null,
      at: iso(row.created_at),
      actor: { name: row.actor_name || 'Staff', role: row.actor_role || 'Staff' },
      viaPlatformView: meta.source === 'platform_view',
      sameSubject: sameSubject(subject, meta),
    };
  });

  return {
    path: page.path,
    page: { kind: page.kind, label: page.label, pickable: page.pickable },
    picked: Boolean(pick),
    subject: subject
      ? {
          key: subject.key,
          kind: subject.kind,
          kindLabel: subject.kindLabel,
          area: subject.area,
          areaLabel: DESK_LABELS[subject.area] || null,
          available: subject.available,
          title: subject.title,
          excerpt: subject.excerpt,
          href: subject.href,
          status: subject.status,
          statusLabel: subject.statusLabel,
          createdAt: subject.createdAt || null,
          facts: subject.facts,
          notes: subject.notes,
          readOnly: subject.readOnly,
          inArea: inDeskArea(viewer, subject),
        }
      : null,
    accounts,
    contentActions: contentActionsFor({ session, viewer, subject }),
    reports,
    recentActions,
    viewer: {
      role: viewer.role,
      desk: viewer.desk,
      deskLabel: viewer.deskLabel,
      fullRole: viewer.fullRole,
      statusActions: permissions.allowedStatusActions(session),
      canWarn: permissions.canWarn(session),
    },
    limits: { reasonMin: REASON_MIN_LENGTH, reasonMax: REASON_MAX_LENGTH },
    // Kept server-side for `performAction`; stripped from the HTTP response.
    _internal: { subject, staff, viewer },
  };
}

function publicContext(context) {
  if (!context) return null;
  const { _internal, ...rest } = context;
  return rest;
}

async function getPlatformViewContext(session, query = {}) {
  return publicContext(await buildContext(session, { path: query.path, pick: query.pick || null }));
}

/* ------------------------------------------------------------------ */
/* Acting                                                              */
/* ------------------------------------------------------------------ */

function cleanReason(value) {
  const reason = String(value || '').replace(/\s+/g, ' ').trim();
  if (reason.length < REASON_MIN_LENGTH) {
    throw serviceError(`Write case notes of at least ${REASON_MIN_LENGTH} characters: what happened and why this action fits.`);
  }
  if (reason.length > REASON_MAX_LENGTH) {
    throw serviceError(`Keep the case notes under ${REASON_MAX_LENGTH} characters.`);
  }
  return reason;
}

function standingOptionsFrom(input = {}) {
  const custom = input.customDuration === true;
  return {
    punishmentId: input.punishmentId ? String(input.punishmentId).slice(0, 120) : undefined,
    customDuration: custom,
    duration: custom || input.duration ? (input.duration === 'permanent' ? 'permanent' : 'temporary') : undefined,
    endsAt: input.endsAt ? String(input.endsAt) : undefined,
    includeLeader: input.includeLeader === undefined ? undefined : input.includeLeader === true,
  };
}

/** Everything that would make the account action fail, checked before anything changes. */
async function prevalidateAccountAction(type, input, account, staff) {
  const actorRole = staff.role;
  const { assertCanSanctionTarget } = require('../lib/SuspendGuards');
  await assertCanSanctionTarget({
    actorStaffId: staff.staff_id,
    targetAccountId: account.isTeam && ['warn', 'timeout'].includes(type) ? account.team?.leader?.accountId : account.accountId,
    action: type === 'warn' ? 'warn' : type === 'timeout' ? 'timeout' : type,
  });
  if (type === 'warn') {
    const { resolveIssuedWarning } = require('./WarningDefServices');
    const warningId = String(input.warningId || '').trim();
    if (!warningId) throw serviceError('Pick a predefined warning. Points are locked to that warning.');
    await resolveIssuedWarning({ warningId, actorRole });
    return;
  }
  const { sanctionEndsAt } = require('../lib/AccountRestriction');
  const options = standingOptionsFrom(input);
  if (type === 'lock') {
    sanctionEndsAt(options, 'permanent');
    return;
  }
  if (!options.punishmentId) throw serviceError('Pick a predefined punishment.');
  const { resolveStandingOptions } = require('./PunishmentDefServices');
  const resolved = await resolveStandingOptions(type, { ...options, actorRole });
  sanctionEndsAt(resolved, type === 'ban' ? 'permanent' : 'temporary');
}

async function acquireActionLock(key, token) {
  try {
    const result = await redisClient.set(key, token, { NX: true, PX: ACTION_LOCK_TTL_MS });
    return result !== null && result !== undefined;
  } catch (err) {
    // Same policy as the rate limiter: a Redis outage must not stop moderation.
    console.warn('Platform view action lock unavailable, continuing without it:', err.message);
    return true;
  }
}

async function releaseActionLock(key, token) {
  try {
    if ((await redisClient.get(key)) === token) await redisClient.del(key);
  } catch {
    // The lock expires on its own.
  }
}

async function runContentAction(id, subject, reason, actorSession, audit) {
  const content = subject.content || {};
  const forum = require('./ForumContentModerationServices');
  switch (id) {
    case 'hide_comment':
      return forum.setForumCommentVisibility(content.discussionId, content.commentId, { hidden: true, reason }, actorSession, audit);
    case 'remove_discussion':
      return forum.setForumDiscussionState(content.discussionId, { status: 'removed', reason }, actorSession, audit);
    case 'lock_discussion':
      return forum.setForumDiscussionState(content.discussionId, { isLocked: true, reason }, actorSession, audit);
    case 'archive_group':
      return forum.setForumGroupVisibility(content.groupId, { status: 'inactive', reason }, actorSession, audit);
    case 'delist_listing':
    case 'rereview_listing': {
      const { reviewMarketplaceListing } = require('../repositories/MarketplaceModeratorRepositories');
      return reviewMarketplaceListing(
        content.listingId,
        { status: id === 'delist_listing' ? 'delisted' : 'pending', moderationNote: reason },
        actorSession,
        audit
      );
    }
    case 'pause_posting':
    case 'close_posting': {
      const { updateJobsGigsPosting } = require('../repositories/JobsModeratorRepositories');
      return updateJobsGigsPosting(
        content.postingType,
        content.postingId,
        { status: id === 'pause_posting' ? 'paused' : 'closed', reason },
        actorSession,
        audit
      );
    }
    default:
      throw serviceError('Unknown content action.');
  }
}

function accountResultMessage(type, data) {
  if (type === 'warn') {
    const started = Array.isArray(data?.punishmentsStarted) && data.punishmentsStarted.length
      ? ` It started: ${data.punishmentsStarted.map((p) => p.label || p.effect).filter(Boolean).join(', ')}.`
      : '';
    const to = data?.issuedTo ? ` to team leader ${data.issuedTo.name}` : '';
    return `Warning issued${to} (${data?.points ?? '?'} pt).${started}`;
  }
  if (data?.isTeam && data?.summary) return data.summary;
  if (type === 'timeout') return 'Forum timeout applied.';
  let message = `Account set to ${data?.status || type}.`;
  if (data?.banCleanup && 'jobsClosed' in data.banCleanup) {
    try {
      const { describeSummary } = require('./BanCleanupServices');
      message = `${message} ${describeSummary(data.banCleanup)}.`;
    } catch {
      // The ban stands; the clean-up summary is only extra detail.
    }
  }
  return message;
}

/**
 * One quick action from platform view: an account action, a content action, or both.
 * Order: re-read the page → check every rule → content action (the harm on screen stops first,
 * and it can be undone) → account action. If the content action fails nothing else happens; if
 * the account action fails afterwards, the response says exactly which half went through.
 */
async function performPlatformViewAction(session, body = {}) {
  const staff = await resolveStaffForSession(session);
  if (!staff?.staff_id) throw serviceError('Could not match your login to a staff profile.', 403);
  const reason = cleanReason(body.reason);

  const context = await buildContext(session, { path: body.path, pick: body.pick || null }, staff);
  const subject = context._internal.subject;
  if (!subject) throw serviceError('This page is not about one item. Open the item, or pick it on the page.');
  if (!subject.available) throw serviceError(subject.notes?.[0] || 'This item is no longer available.', 409, 'SUBJECT_UNAVAILABLE');
  if (body.subjectKey && String(body.subjectKey) !== subject.key) {
    throw serviceError('The page changed since you opened this action. Review it again before acting.', 409, 'SUBJECT_CHANGED');
  }

  const accountType = body.accountAction?.type ? String(body.accountAction.type).toLowerCase() : null;
  if (accountType && !ACCOUNT_ACTIONS.includes(accountType)) throw serviceError('Unknown account action.');
  const contentId = body.contentAction ? String(body.contentAction) : null;
  if (contentId && !CONTENT_ACTIONS[contentId]) throw serviceError('Unknown content action.');
  if (!accountType && !contentId) throw serviceError('Choose what to do.');

  let account = null;
  if (accountType) {
    account = context.accounts.find((row) => row.accountId === String(body.accountId || ''));
    if (!account) throw serviceError('Pick one of the accounts shown for this item.');
    const rule = account.actions[accountType];
    if (!rule?.allowed) throw serviceError(rule?.reason || 'You cannot take this action here.', 403, 'ACTION_NOT_ALLOWED');
  }
  let content = null;
  if (contentId) {
    content = context.contentActions.find((row) => row.id === contentId);
    if (!content) {
      throw serviceError('That action no longer applies to this item. It may already have been done.', 409, 'CONTENT_ACTION_STALE');
    }
    if (!content.allowed) throw serviceError(content.reason, 403, 'ACTION_NOT_ALLOWED');
  }

  if (account) await prevalidateAccountAction(accountType, body.accountAction || {}, account, staff);

  // Someone (anyone, from any console) acted on this account in the last few minutes, or
  // already acted on this exact item: show them before a second penalty lands.
  if (account && body.confirmRecent !== true) {
    const watched = new Set([account.accountId, account.team?.leader?.accountId].filter(Boolean));
    const now = Date.now();
    const recent = context.recentActions.filter(
      (row) =>
        watched.has(row.accountId)
        && ACCOUNT_GUARD_EVENTS.has(row.eventCode)
        && (row.sameSubject || now - new Date(row.at).getTime() < RECENT_ACTION_WINDOW_MS)
    );
    if (recent.length) {
      const first = recent[0];
      throw serviceError(
        first.sameSubject
          ? `${first.actor.name} already acted on this account for this item (${first.label}). Check it before adding another penalty.`
          : `${first.actor.name} acted on this account a few minutes ago (${first.label}). Check it before adding another penalty.`,
        409,
        'RECENT_ACTION',
        { recent }
      );
    }
  }

  const lockKey = `platform-view:act:${account ? account.accountId : subject.key}`;
  const lockToken = `${staff.staff_id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  if (!(await acquireActionLock(lockKey, lockToken))) {
    throw serviceError('Another staff member is acting on this right now. Wait a moment, then review it again.', 409, 'ACTION_IN_PROGRESS');
  }

  try {
    const reportsOnItem = context.reports.filter((row) => row.onSubject && row.number).map((row) => row.number);
    // Captured before anything changes, so the saved text is what the member actually posted.
    const evidence = {
      source: 'platform_view',
      sourcePage: context.path,
      subjectKey: subject.key,
      evidenceKind: subject.kindLabel,
      evidenceTitle: String(subject.title || '').slice(0, 200),
      evidenceExcerpt: subject.excerpt ? String(subject.excerpt).slice(0, EXCERPT_MAX_LENGTH) : null,
      evidenceHref: subject.href || null,
      evidenceStatus: subject.statusLabel || null,
      evidenceCapturedAt: new Date().toISOString(),
      relatedReports: reportsOnItem.length ? reportsOnItem.join(', ') : null,
    };
    // Moderator sessions can carry only an account id; the desk services record a real actor.
    const actorSession = { ...session, staff_id: staff.staff_id, staffId: staff.staff_id, account_id: staff.account_id };

    let contentResult = null;
    if (content) {
      await runContentAction(content.id, subject, reason, actorSession, {
        ...evidence,
        ...(account ? { pairedAction: `${ACCOUNT_ACTION_LABELS[accountType]} for ${account.name}` } : {}),
      });
      contentResult = { id: content.id, ok: true, message: CONTENT_ACTIONS[content.id].done };
    }

    let accountResult = null;
    if (account) {
      const activityContext = { ...evidence, ...(content ? { pairedAction: content.label } : {}) };
      try {
        const { warnAccount, updateAccountStatus } = require('../repositories/AdminUserTeamRepositories');
        const input = body.accountAction || {};
        const data = accountType === 'warn'
          ? await warnAccount(account.accountId, { warningId: String(input.warningId), reason, activityContext }, staff.staff_id)
          : await updateAccountStatus(account.accountId, accountType, staff.staff_id, {
              ...standingOptionsFrom(input),
              reason,
              actorAccountId: staff.account_id,
              activityContext,
            });
        accountResult = { type: accountType, ok: true, message: accountResultMessage(accountType, data) };
      } catch (err) {
        if (!contentResult) throw err;
        // The content action already went through; say so instead of reporting a plain failure.
        console.error('Platform view account action failed after its content action:', err.message);
        accountResult = {
          type: accountType,
          ok: false,
          message: err.statusCode && err.statusCode < 500 ? err.message : 'The account action could not be applied.',
        };
      }
    }

    const partial = Boolean(accountResult && !accountResult.ok);
    const message = [contentResult?.message, accountResult?.ok ? accountResult.message : null]
      .filter(Boolean)
      .join(' · ')
      + (partial ? `${contentResult ? '. ' : ''}The ${ACCOUNT_ACTION_LABELS[accountType].toLowerCase()} was not applied: ${accountResult.message}` : '');

    let refreshed = null;
    try {
      refreshed = publicContext(await buildContext(session, { path: body.path, pick: body.pick || null }, staff));
    } catch (err) {
      console.warn('Platform view context refresh after an action failed:', err.message);
    }

    return {
      partial,
      message,
      content: contentResult,
      account: accountResult,
      reportsOnItem,
      context: refreshed,
    };
  } finally {
    await releaseActionLock(lockKey, lockToken);
  }
}

module.exports = {
  ACCOUNT_ACTIONS,
  CONTENT_ACTIONS,
  parseMemberPath,
  parsePick,
  getPlatformViewContext,
  performPlatformViewAction,
};
