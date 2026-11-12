/**
 * Catalog for `account_activity` rows.
 *
 * One ordered list of category rules drives both the JavaScript classification
 * and the SQL predicate used to filter a category, so a filtered page and an
 * unfiltered page always agree on which category a row belongs to.
 *
 * Nothing here reads the database. Keep it free of secrets: every value may be
 * sent to a staff console.
 */

/** Ordered: the first rule whose pattern matches the event code wins. */
const CATEGORY_RULES = [
  { id: 'report', label: 'Reports', patterns: ['REPORT'] },
  { id: 'dispute', label: 'Disputes', patterns: ['DISPUTE'] },
  { id: 'appeal', label: 'Appeals', patterns: ['APPEAL'] },
  {
    id: 'conduct',
    label: 'Conduct',
    patterns: ['VIOLATION', 'WARN', 'PARDON', 'RESTRICTION', 'TIMEOUT'],
  },
  { id: 'forum', label: 'Forum', patterns: ['FORUM'] },
  { id: 'video', label: 'Video', patterns: ['VIDEO', 'PROJECT'] },
  { id: 'marketplace', label: 'Marketplace', patterns: ['LISTING', 'MARKET'] },
  { id: 'jobs', label: 'Jobs & gigs', patterns: ['JOBS', 'GIG', 'POSTING', 'PROPOSAL'] },
  { id: 'economy', label: 'Economy', patterns: ['CREDIT', 'WALLET', 'PAYOUT'] },
  { id: 'account', label: 'Account', patterns: ['ACCOUNT', 'STATUS', 'VERIFI'] },
  { id: 'moderation', label: 'Moderation', patterns: null },
];

const CATEGORY_LABELS = Object.fromEntries(CATEGORY_RULES.map((r) => [r.id, r.label]));

/** Event codes whose effect `reverseModerationActivity` knows how to undo. */
const REVERSIBLE_EVENT_CODES = new Set([
  'ACCOUNT_STATUS_CHANGED',
  'ACCOUNT_WARNED',
  'VIOLATION_ISSUED',
  'RESTRICTION_ISSUED',
  'CREDITS_FROZEN',
]);

/**
 * Per-event display data. `label` is the plain-language name of the event,
 * `impact` says what the action did to the account, and `severity` drives the
 * colour of the badge in the activity log.
 */
const EVENT_CATALOG = {
  ACCOUNT_STATUS_CHANGED: {
    label: 'Account status changed',
    targetType: 'Account',
    severity: 'critical',
    impact: 'Changed whether the account can sign in and use the platform.',
  },
  ACCOUNT_ACTION_REVERSED: {
    label: 'Moderation action reversed',
    targetType: 'Account',
    severity: 'info',
    impact: 'Undid an earlier moderation action and restored the previous state.',
  },
  ACCOUNT_WARNED: {
    label: 'Warning issued',
    targetType: 'Account',
    severity: 'high',
    impact: 'Added active warning points, which lower Platform Merit.',
  },
  ACCOUNT_PARDONED: {
    label: 'Account pardoned',
    targetType: 'Account',
    severity: 'info',
    impact: 'Cleared active warnings and restrictions on the account.',
  },
  VIOLATION_ISSUED: {
    label: 'Violation recorded',
    targetType: 'Account',
    severity: 'high',
    impact: 'Recorded a policy violation against the account.',
  },
  WARNING_RESCINDED: {
    label: 'Warning rescinded',
    targetType: 'Account',
    severity: 'info',
    impact: 'Removed warning points previously applied to the account.',
  },
  RESTRICTION_ISSUED: {
    label: 'Restriction applied',
    targetType: 'Account',
    severity: 'high',
    impact: 'Blocked part of the platform for this account until the end date.',
  },
  FORUM_TIMEOUT: {
    label: 'Forum timeout applied',
    targetType: 'Account',
    severity: 'medium',
    impact: 'Stopped the account from posting in the forums until it expires.',
  },
  FORUM_TIMEOUT_CLEARED: {
    label: 'Forum timeout cleared',
    targetType: 'Account',
    severity: 'info',
    impact: 'Returned forum posting access to the account.',
  },
  CREDITS_FROZEN: {
    label: 'Credits frozen',
    targetType: 'Wallet',
    severity: 'critical',
    impact: 'Moved the wallet balance into a frozen balance the member cannot spend.',
  },
  CREDITS_UNFROZEN: {
    label: 'Credits released',
    targetType: 'Wallet',
    severity: 'info',
    impact: 'Returned frozen credits to the spendable balance.',
  },
  APPEAL_DECISION: {
    label: 'Appeal decided',
    targetType: 'Appeal',
    severity: 'medium',
    impact: 'Recorded the outcome of a member appeal.',
  },
  REPORT_CREATED: {
    label: 'Report filed',
    targetType: 'Report',
    severity: 'medium',
    impact: 'Opened a report in the moderation queue.',
  },
  REPORT_ASSIGNED: {
    label: 'Report assigned',
    targetType: 'Report',
    severity: 'low',
    impact: 'Gave a report an owner on the moderation desk.',
  },
  REPORT_UNASSIGNED: {
    label: 'Report unassigned',
    targetType: 'Report',
    severity: 'low',
    impact: 'Returned a report to the unassigned queue.',
  },
  LISTING_REVIEWED: {
    label: 'Marketplace listing reviewed',
    targetType: 'Marketplace listing',
    severity: 'medium',
    impact: 'Approved or rejected a listing, which controls its visibility in the marketplace.',
  },
  DISPUTE_APPROVED: { label: 'Dispute approved', targetType: 'Dispute', severity: 'medium' },
  DISPUTE_DISMISSED: { label: 'Dispute dismissed', targetType: 'Dispute', severity: 'medium' },
  DISPUTE_RESOLVED: { label: 'Dispute resolved', targetType: 'Dispute', severity: 'medium' },
  DISPUTE_SANCTIONED: { label: 'Dispute sanctioned', targetType: 'Dispute', severity: 'high' },
  DISPUTE_REOPENED: { label: 'Dispute reopened', targetType: 'Dispute', severity: 'medium' },
  DISPUTE_HIDDEN: { label: 'Dispute hidden', targetType: 'Dispute', severity: 'low' },
  DISPUTE_UPDATED: { label: 'Dispute updated', targetType: 'Dispute', severity: 'low' },
  DISPUTE_PARTIES_SWAPPED: {
    label: 'Dispute parties swapped',
    targetType: 'Dispute',
    severity: 'low',
  },
  DISPUTE_ESCROW_SETTLED: {
    label: 'Dispute escrow settled',
    targetType: 'Dispute',
    severity: 'high',
    impact: 'Split a contract’s frozen escrow between the client and the freelancer.',
  },
  DISPUTE_TRANSACTION_REVERSED: {
    label: 'Dispute transaction reversed',
    targetType: 'Dispute',
    severity: 'high',
    impact: 'Took credits back from one account and scheduled them for another.',
  },
  DISPUTE_PAYOUT_RELEASED: {
    label: 'Dispute payout released',
    targetType: 'Dispute',
    severity: 'medium',
    impact: 'Paid a dispute ruling’s credits into the recipient’s Account Wallet.',
  },
  DISPUTE_PAYOUT_RESCHEDULED: {
    label: 'Dispute payout rescheduled',
    targetType: 'Dispute',
    severity: 'low',
    impact: 'Changed when a dispute ruling’s credits are paid out.',
  },
  DISPUTE_PAYOUT_CANCELLED: {
    label: 'Dispute ruling withdrawn',
    targetType: 'Dispute',
    severity: 'high',
    impact: 'Cancelled an unpaid money ruling and returned any credits it had taken back.',
  },
  VIDEO_PROJECT_FROZEN: {
    label: 'Video project frozen',
    targetType: 'Video project',
    severity: 'high',
    impact: 'Blocked new edits on the project while leaving it viewable.',
  },
  VIDEO_PROJECT_UNFROZEN: {
    label: 'Video project unfrozen',
    targetType: 'Video project',
    severity: 'info',
    impact: 'Returned editing access to the project members.',
  },
  VIDEO_PROJECT_REMOVED: {
    label: 'Video project removed',
    targetType: 'Video project',
    severity: 'critical',
    impact: 'Hid the project from its owner and collaborators. Edit history is kept.',
  },
  VIDEO_PROJECT_RESTORED: {
    label: 'Video project restored',
    targetType: 'Video project',
    severity: 'info',
    impact: 'Returned the project to the owner library.',
  },
  JOBS_POSTING_STATUS_CHANGED: {
    label: 'Job or gig posting moderated',
    targetType: 'Posting',
    severity: 'medium',
    impact: 'Changed whether the posting is open to applicants.',
  },
  JOBS_POSTING_ARCHIVED: {
    label: 'Job or gig posting archived',
    targetType: 'Posting',
    severity: 'high',
    impact: 'Took the posting off the jobs board. It can be reopened.',
  },
  FORUM_GROUP_ARCHIVED: {
    label: 'Forum group archived',
    targetType: 'Forum group',
    severity: 'high',
    impact: 'Took the group and its discussions out of the public forums.',
  },
  FORUM_GROUP_REACTIVATED: {
    label: 'Forum group reactivated',
    targetType: 'Forum group',
    severity: 'info',
    impact: 'Published the group back to the forums.',
  },
  FORUM_MEMBER_BANNED: {
    label: 'Forum member banned from group',
    targetType: 'Forum group member',
    severity: 'high',
    impact: 'Stopped this member from posting or commenting in the group.',
  },
  FORUM_MEMBER_UNBANNED: {
    label: 'Forum member unbanned',
    targetType: 'Forum group member',
    severity: 'info',
    impact: 'Returned the member’s access to the group.',
  },
  FORUM_DISCUSSION_REMOVED: {
    label: 'Discussion removed',
    targetType: 'Forum discussion',
    severity: 'high',
    impact: 'Hid the discussion from the forums. It stays stored for audit.',
  },
  FORUM_DISCUSSION_RESTORED: {
    label: 'Discussion restored',
    targetType: 'Forum discussion',
    severity: 'info',
    impact: 'Published the discussion back to the forums.',
  },
  FORUM_DISCUSSION_LOCKED: {
    label: 'Discussion locked',
    targetType: 'Forum discussion',
    severity: 'medium',
    impact: 'Stopped new replies while keeping the discussion readable.',
  },
  FORUM_DISCUSSION_UNLOCKED: {
    label: 'Discussion unlocked',
    targetType: 'Forum discussion',
    severity: 'info',
    impact: 'Allowed replies on the discussion again.',
  },
  FORUM_DISCUSSION_PINNED: {
    label: 'Discussion pinned',
    targetType: 'Forum discussion',
    severity: 'low',
    impact: 'Kept the discussion at the top of its group.',
  },
  FORUM_DISCUSSION_UNPINNED: {
    label: 'Discussion unpinned',
    targetType: 'Forum discussion',
    severity: 'low',
    impact: 'Returned the discussion to normal ordering.',
  },
  FORUM_COMMENT_REMOVED: {
    label: 'Comment removed',
    targetType: 'Forum comment',
    severity: 'medium',
    impact: 'Replaced the comment body with a moderator placeholder.',
  },
};

/** Metadata keys that are shown in their own part of the UI, not the detail grid. */
const INTERNAL_METADATA_KEYS = new Set([
  'reversed',
  'reversedAt',
  'reversedByStaffId',
  'reverseNote',
]);

/** Friendly labels for the metadata keys written across the backend. */
const METADATA_LABELS = {
  accountId: 'Account ID',
  action: 'Action key',
  activeWarnings: 'Active warning points',
  amount: 'Amount',
  appealId: 'Appeal ID',
  appealNumber: 'Appeal number',
  banEndsAt: 'Ban ends',
  bannedAt: 'Banned at',
  commentId: 'Comment ID',
  decision: 'Decision',
  discussionId: 'Discussion ID',
  discussionTitle: 'Discussion',
  disputeId: 'Dispute ID',
  disputeNumber: 'Dispute number',
  durationDays: 'Duration (days)',
  endsAt: 'Ends',
  expiresAt: 'Expires',
  frozenCredits: 'Frozen credits',
  groupId: 'Group ID',
  groupName: 'Group',
  listingId: 'Listing ID',
  listingNumber: 'Listing number',
  lockEndsAt: 'Lock ends',
  maxWarningsBeforeSuspend: 'Auto-suspend threshold',
  memberId: 'Member ID',
  module: 'Module',
  note: 'Note',
  originalAction: 'Original action',
  originalEventCode: 'Original event code',
  points: 'Warning points',
  postingTitle: 'Posting',
  postingType: 'Posting type',
  previousStatus: 'Previous status',
  projectId: 'Project ID',
  projectName: 'Project',
  reason: 'Reason',
  reportId: 'Report ID',
  reportNumber: 'Report number',
  restrictionId: 'Restriction ID',
  startsAt: 'Starts',
  status: 'New status',
  suspensionEndsAt: 'Suspension ends',
  type: 'Type',
  violationId: 'Violation ID',
  violationNumber: 'Violation number',
  warningId: 'Warning ID',
};

/** Keys read first so the most useful details sit at the top of the grid. */
const METADATA_PRIORITY = [
  'reason',
  'note',
  'type',
  'decision',
  'status',
  'previousStatus',
  'points',
  'durationDays',
  'startsAt',
  'endsAt',
  'expiresAt',
  'suspensionEndsAt',
  'banEndsAt',
  'lockEndsAt',
  'module',
  'amount',
  'frozenCredits',
];

function codeOf(eventCode) {
  return String(eventCode || '').toUpperCase();
}

/** The category rule an event code falls under. */
function categoryRuleFor(eventCode) {
  const code = codeOf(eventCode);
  for (const rule of CATEGORY_RULES) {
    if (!rule.patterns) return rule;
    if (rule.patterns.some((pattern) => code.includes(pattern))) return rule;
  }
  return CATEGORY_RULES[CATEGORY_RULES.length - 1];
}

function categoryFromEventCode(eventCode) {
  return categoryRuleFor(eventCode).id;
}

function categoryLabel(categoryId) {
  return CATEGORY_LABELS[categoryId] || 'Moderation';
}

/**
 * SQL that matches only the rows in one category, mirroring `categoryRuleFor`:
 * the row must match this rule and none of the earlier ones.
 *
 * @param categoryId {string} category id from CATEGORY_RULES
 * @param nextParamIndex {number} 1-based index of the next free bind parameter
 * @returns {{ sql: string, params: string[] } | null} null when the id is unknown
 */
function categoryPredicate(categoryId, nextParamIndex) {
  const index = CATEGORY_RULES.findIndex((rule) => rule.id === categoryId);
  if (index === -1) return null;

  const params = [];
  const clauses = [];
  let paramIndex = nextParamIndex;

  const matchClause = (patterns) => {
    const parts = patterns.map((pattern) => {
      params.push(`%${pattern}%`);
      return `UPPER(aa.event_code) LIKE $${paramIndex++}`;
    });
    return `(${parts.join(' OR ')})`;
  };

  const rule = CATEGORY_RULES[index];
  if (rule.patterns) clauses.push(matchClause(rule.patterns));

  const earlier = CATEGORY_RULES.slice(0, index)
    .filter((r) => r.patterns)
    .flatMap((r) => r.patterns);
  if (earlier.length) clauses.push(`NOT ${matchClause(earlier)}`);

  return { sql: clauses.length ? clauses.join(' AND ') : 'TRUE', params };
}

function targetTypeFromEventCode(eventCode) {
  const known = EVENT_CATALOG[codeOf(eventCode)];
  if (known?.targetType) return known.targetType;
  const code = codeOf(eventCode);
  if (code.includes('LISTING')) return 'Marketplace listing';
  if (code.includes('REPORT')) return 'Report';
  if (code.includes('DISPUTE')) return 'Dispute';
  if (code.includes('PROJECT') || code.includes('VIDEO')) return 'Video project';
  if (code.includes('FORUM')) return 'Forum content';
  if (code.includes('WALLET') || code.includes('CREDIT')) return 'Wallet';
  return 'Account';
}

/** Turns `SOME_EVENT_CODE` into `Some event code` when the catalog has no label. */
function titleFromEventCode(eventCode) {
  const code = codeOf(eventCode);
  if (!code) return 'Moderation action';
  const words = code.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Turns `previousStatus` into `Previous status` when no label is registered. */
function humanizeKey(key) {
  const label = METADATA_LABELS[key];
  if (label) return label;
  const spaced = String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Label, severity, target type and impact for one event code. */
function describeEvent(eventCode) {
  const code = codeOf(eventCode);
  const known = EVENT_CATALOG[code] || {};
  const rule = categoryRuleFor(code);
  return {
    eventCode: code || null,
    eventLabel: known.label || titleFromEventCode(code),
    category: rule.id,
    categoryLabel: rule.label,
    targetType: targetTypeFromEventCode(code),
    severity: known.severity || 'low',
    impact: known.impact || null,
    reversible: REVERSIBLE_EVENT_CODES.has(code),
  };
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}|$)/;

function detailType(key, value) {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string' && ISO_DATE_RE.test(value)) return 'date';
  if (value instanceof Date) return 'date';
  if (/(^|[a-z])Id$/.test(key) || key === 'accountId') return 'id';
  if (key === 'reason' || key === 'note') return 'text';
  return 'string';
}

function normalizeDetailValue(value) {
  if (value instanceof Date) return value.toISOString();
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

/**
 * Flattens activity metadata into ordered `{ key, label, value, type }` rows
 * for the detail grid. Empty values and reversal bookkeeping are dropped.
 */
function buildDetailPairs(metadata) {
  if (!metadata || typeof metadata !== 'object') return [];
  const keys = Object.keys(metadata).filter(
    (key) => !INTERNAL_METADATA_KEYS.has(key) && metadata[key] !== null && metadata[key] !== undefined && metadata[key] !== ''
  );
  const ordered = [
    ...METADATA_PRIORITY.filter((key) => keys.includes(key)),
    ...keys.filter((key) => !METADATA_PRIORITY.includes(key)).sort((a, b) => a.localeCompare(b)),
  ];
  return ordered.map((key) => ({
    key,
    label: humanizeKey(key),
    value: normalizeDetailValue(metadata[key]),
    type: detailType(key, metadata[key]),
  }));
}

module.exports = {
  CATEGORY_RULES,
  EVENT_CATALOG,
  REVERSIBLE_EVENT_CODES,
  buildDetailPairs,
  categoryFromEventCode,
  categoryLabel,
  categoryPredicate,
  describeEvent,
  humanizeKey,
  targetTypeFromEventCode,
};
