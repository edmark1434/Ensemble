/**
 * Report target-type scopes by platform queue.
 * Specialist mods only see their platform; Support + Admin see all.
 */

const FORUM_REPORT_TYPES = Object.freeze([
  'discussion',
  'comment',
  'post',
  'forum',
  'thread',
  'group',
  'member',
]);

const MARKETPLACE_REPORT_TYPES = Object.freeze([
  'listing',
  'asset',
  'seller',
  'marketplace',
  'purchase',
  'order',
]);

const JOBS_REPORT_TYPES = Object.freeze([
  'job',
  'gig',
  'contract',
  'application',
  'proposal',
  'jobs',
  'gigs',
  'feedback',
  'team_project',
]);

/**
 * Everything that is nobody else's platform: accounts, direct messages, teams and the
 * technical problems raised from a ticket. Support still has an "all platform" view — this is
 * the default scope for its desk, not a hard permission boundary.
 */
const SUPPORT_REPORT_TYPES = Object.freeze([
  'user',
  'account',
  'profile',
  'chat_message',
  'message',
  'technical_problem',
  'team',
  'team_member',
  'appeal',
  'other',
]);

const REPORT_QUEUE_SCOPES = Object.freeze({
  forum: FORUM_REPORT_TYPES,
  marketplace: MARKETPLACE_REPORT_TYPES,
  jobs: JOBS_REPORT_TYPES,
  support: SUPPORT_REPORT_TYPES,
});

const CLOSED_REPORT_STATUSES = Object.freeze([
  'resolved',
  'closed',
  'dismissed',
  'denied',
  'archived',
  'sanctioned',
]);

function closedReportStatusListSql() {
  return CLOSED_REPORT_STATUSES.map((status) => `'${status}'`).join(', ');
}

function normalizeReportTargetType(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function isReportTypeInScope(targetType, scopeTypes) {
  if (!scopeTypes?.length) return true;
  const normalized = normalizeReportTargetType(targetType);
  const allowed = new Set(scopeTypes.map(normalizeReportTargetType));
  // Treat "member" vs display labels carefully — scopes store lowercase tokens.
  return allowed.has(normalized) || allowed.has(normalized.replace(/_/g, ' '));
}

module.exports = {
  FORUM_REPORT_TYPES,
  MARKETPLACE_REPORT_TYPES,
  JOBS_REPORT_TYPES,
  SUPPORT_REPORT_TYPES,
  REPORT_QUEUE_SCOPES,
  CLOSED_REPORT_STATUSES,
  closedReportStatusListSql,
  normalizeReportTargetType,
  isReportTypeInScope,
};
