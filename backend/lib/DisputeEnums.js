/**
 * Dispute enums — Title Case labels for dispute.type.
 * Workflow status remains snake_case tokens used by the dispute desk.
 */

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
  gig: 'Gig',
  job: 'Job',
  jobs: 'Job',
  marketplace: 'Marketplace',
  asset: 'Marketplace',
  listing: 'Marketplace',
  feedback: 'Feedback',
  forum: 'Forum',
  forums: 'Forum',
  transaction: 'Transaction',
  payment: 'Transaction',
  credit: 'Transaction',
  team: 'Team',
  general: 'General',
  other: 'General',
});

function titleCaseKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function normalizeDisputeType(value, fallback = 'General') {
  if (value == null || value === '') return fallback;
  const raw = String(value).trim();
  if (DISPUTE_TYPES.includes(raw)) return raw;
  const mapped = LEGACY_TYPE_MAP[titleCaseKey(raw)];
  if (mapped) return mapped;
  const exact = DISPUTE_TYPES.find((t) => t.toLowerCase() === raw.toLowerCase());
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

/**
 * Default dispute title: "{Disputee} v {Disputer} {Type} Dispute"
 * Disputee = respondent (accused / opposing party)
 * Disputer = initiator (who filed)
 * Type comes from dispute.type (Feedback, Contract, Transaction, …)
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
  const kind = normalizeDisputeType(type, 'General');
  return `${disputee} v ${disputer} ${kind} Dispute`;
}

module.exports = {
  DISPUTE_TYPES,
  DISPUTE_STATUSES,
  DISPUTE_PRIORITIES,
  normalizeDisputeType,
  normalizeDisputePriority,
  normalizeDisputeStatus,
  buildDefaultDisputeTitle,
};
