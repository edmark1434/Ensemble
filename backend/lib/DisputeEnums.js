/**
 * Dispute enums — Title Case labels for dispute.type.
 * Workflow status remains snake_case tokens used by the dispute desk.
 * Product disputes are Contract or Transaction only. Older catalog labels
 * remain in DISPUTE_TYPES so already-applied enum migrations stay valid.
 */

const LIVE_DISPUTE_TYPES = Object.freeze(['Contract', 'Transaction']);

const DISPUTE_TYPES = Object.freeze([
  'Contract',
  'Gig',
  'Job',
  'Marketplace',
  'Feedback',
  'Forum',
  'Transaction',
  'Team',
  'General',
]);

const DISPUTE_TYPE = Object.freeze({
  CONTRACT: 'Contract',
  TRANSACTION: 'Transaction',
});

const DISPUTE_STATUSES = Object.freeze([
  'pending_review',
  'open',
  'awaiting_response',
  'under_review',
  'closed',
]);

const DISPUTE_PRIORITIES = Object.freeze(['Low', 'Medium', 'High']);

const LEGACY_TYPE_MAP = Object.freeze({
  contract: 'Contract',
  gig: 'Contract',
  job: 'Contract',
  jobs: 'Contract',
  team: 'Contract',
  marketplace: 'Transaction',
  asset: 'Transaction',
  listing: 'Transaction',
  feedback: 'Transaction',
  forum: 'Transaction',
  forums: 'Transaction',
  transaction: 'Transaction',
  payment: 'Transaction',
  credit: 'Transaction',
  general: 'Transaction',
  other: 'Transaction',
});

function titleCaseKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function normalizeDisputeType(value, fallback = 'Contract') {
  if (value == null || value === '') return fallback;
  const raw = String(value).trim();
  if (LIVE_DISPUTE_TYPES.includes(raw)) return raw;
  const mapped = LEGACY_TYPE_MAP[titleCaseKey(raw)];
  if (mapped) return mapped;
  const exact = LIVE_DISPUTE_TYPES.find((t) => t.toLowerCase() === raw.toLowerCase());
  return exact || fallback;
}

function normalizeDisputePriority(value, fallback = 'High') {
  if (value == null || value === '') return fallback;
  const raw = String(value).trim();
  if (DISPUTE_PRIORITIES.includes(raw)) return raw;
  const exact = DISPUTE_PRIORITIES.find((p) => p.toLowerCase() === raw.toLowerCase());
  return exact || fallback;
}

function normalizeDisputeStatus(value, fallback = 'pending_review') {
  if (value == null || value === '') return fallback;
  const raw = String(value).trim().toLowerCase().replace(/\s+/g, '_');
  if (DISPUTE_STATUSES.includes(raw)) return raw;
  if (['resolved', 'sanctioned', 'dismissed', 'withdrawn'].includes(raw)) return 'closed';
  return fallback;
}

/** true = visible; false = hidden (pending approval). */
function normalizeDisputeVisibility(value, fallback = false) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const raw = String(value).trim().toLowerCase();
  if (['true', 't', '1', 'yes', 'public', 'parties', 'visible'].includes(raw)) return true;
  if (['false', 'f', '0', 'no', 'pending', 'hidden', 'private'].includes(raw)) return false;
  return fallback;
}

/**
 * Default dispute title: "{Disputee} v {Disputer} {Type} Dispute"
 * Disputee = respondent (accused / opposing party)
 * Disputer = initiator (who filed)
 */
function buildDefaultDisputeTitle({
  disputeeName,
  disputerName,
  respondentName,
  initiatorName,
  type,
} = {}) {
  const disputee = String(disputeeName || respondentName || 'Disputee').trim() || 'Disputee';
  const disputer = String(disputerName || initiatorName || 'Disputer').trim() || 'Disputer';
  const kind = normalizeDisputeType(type, 'Contract');
  return `${disputee} v ${disputer} ${kind} Dispute`;
}

module.exports = {
  LIVE_DISPUTE_TYPES,
  DISPUTE_TYPES,
  DISPUTE_TYPE,
  DISPUTE_STATUSES,
  DISPUTE_PRIORITIES,
  normalizeDisputeType,
  normalizeDisputePriority,
  normalizeDisputeStatus,
  normalizeDisputeVisibility,
  buildDefaultDisputeTitle,
};
