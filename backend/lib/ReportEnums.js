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
]);

const REPORT_QUEUE_SCOPES = Object.freeze({
  forum: FORUM_REPORT_TYPES,
  marketplace: MARKETPLACE_REPORT_TYPES,
  jobs: JOBS_REPORT_TYPES,
});

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
  REPORT_QUEUE_SCOPES,
  normalizeReportTargetType,
  isReportTypeInScope,
};
