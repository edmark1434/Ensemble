/**
 * Ticket enums — canonical Title Case labels for Ensemble.
 * Each type is owned by one moderator queue (see ROLE_TO_TICKET_TYPES).
 */

const SUPPORT_TYPES = Object.freeze([
  'Account Access',
  'Account Verification',
  'Profile and Settings',
  'Subscriptions and Plans',
  'Credit Top-ups',
  'Withdrawing Earnings',
  'Billing and Payments',
  'Video Editor',
  'Notifications and Email',
  'Technical Issue',
  'Other',
]);

const MARKETPLACE_TYPES = Object.freeze([
  'Asset Marketplace',
  'Listing Issues',
  'Purchase and Delivery',
  'Seller Verification',
  'Marketplace Refunds',
  'Asset Quality',
]);

const FORUM_TYPES = Object.freeze([
  'Forums',
  'Forum Posts',
  'Forum Groups',
  'Forum Comments',
  'Forum Reports',
]);

const JOBS_TYPES = Object.freeze([
  'Jobs and Gigs',
  'Job Posts',
  'Gig Posts',
  'Applications and Hiring',
  'Contracts and Milestones',
]);

const TICKET_TYPES = Object.freeze([
  ...SUPPORT_TYPES,
  ...FORUM_TYPES,
  ...MARKETPLACE_TYPES,
  ...JOBS_TYPES,
]);

const SPECIALIST_TYPES = Object.freeze([...FORUM_TYPES, ...MARKETPLACE_TYPES, ...JOBS_TYPES]);

const TICKET_STATUSES = Object.freeze(['Open', 'In Progress', 'Resolved', 'Closed']);
const TICKET_PRIORITIES = Object.freeze(['Low', 'Medium', 'High']);

const QUEUE_SCOPES = Object.freeze({
  support: { typesIn: [...SUPPORT_TYPES], typesNotIn: [...SPECIALIST_TYPES] },
  forums: { typesIn: [...FORUM_TYPES] },
  marketplace: { typesIn: [...MARKETPLACE_TYPES] },
  jobs: { typesIn: [...JOBS_TYPES] },
});

/** Role label → allowed ticket types when escalating into that queue */
const ROLE_TO_TICKET_TYPES = Object.freeze({
  'Support Moderator': [...SUPPORT_TYPES],
  'Marketplace Moderator': [...MARKETPLACE_TYPES],
  'Forum Moderator': [...FORUM_TYPES],
  'Forums Moderator': [...FORUM_TYPES],
  'Jobs Moderator': [...JOBS_TYPES],
  'Jobs N Gigs Moderator': [...JOBS_TYPES],
  'Jobs & Gigs Moderator': [...JOBS_TYPES],
  Administrator: [...TICKET_TYPES],
  Admin: [...TICKET_TYPES],
});

/** @deprecated prefer ROLE_TO_TICKET_TYPES */
const ROLE_TO_TICKET_TYPE = Object.freeze(
  Object.fromEntries(
    Object.entries(ROLE_TO_TICKET_TYPES).map(([role, types]) => [role, types[0]])
  )
);

function getEscalateTypesForRole(role) {
  if (!role) return [];
  return ROLE_TO_TICKET_TYPES[role] ? [...ROLE_TO_TICKET_TYPES[role]] : [];
}

function isTypeAllowedForRole(role, type) {
  const allowed = ROLE_TO_TICKET_TYPES[role];
  if (!allowed) return false;
  return allowed.includes(normalizeTicketType(type));
}

const LEGACY_TYPE_MAP = Object.freeze({
  billing: 'Billing and Payments',
  account: 'Account Access',
  security: 'Account Verification',
  general: 'Other',
  community: 'Forums',
  forum: 'Forums',
  forums: 'Forums',
  marketplace: 'Asset Marketplace',
  'asset marketplace': 'Asset Marketplace',
  jobs: 'Jobs and Gigs',
  gigs: 'Jobs and Gigs',
  job: 'Jobs and Gigs',
  gig: 'Jobs and Gigs',
  'jobs and gigs': 'Jobs and Gigs',
  dispute: 'Other',
  other: 'Other',
  'account access': 'Account Access',
  'account verification': 'Account Verification',
  'subscriptions and plans': 'Subscriptions and Plans',
  'credit top-ups': 'Credit Top-ups',
  'credit topups': 'Credit Top-ups',
  'withdrawing earnings': 'Withdrawing Earnings',
  'video editor': 'Video Editor',
  'profile and settings': 'Profile and Settings',
  'notifications and email': 'Notifications and Email',
  'technical issue': 'Technical Issue',
  'billing and payments': 'Billing and Payments',
  'listing issues': 'Listing Issues',
  'purchase and delivery': 'Purchase and Delivery',
  'seller verification': 'Seller Verification',
  'marketplace refunds': 'Marketplace Refunds',
  'asset quality': 'Asset Quality',
  'forum posts': 'Forum Posts',
  'forum groups': 'Forum Groups',
  'forum comments': 'Forum Comments',
  'forum reports': 'Forum Reports',
  'job posts': 'Job Posts',
  'gig posts': 'Gig Posts',
  'applications and hiring': 'Applications and Hiring',
  'contracts and milestones': 'Contracts and Milestones',
});

const LEGACY_STATUS_MAP = Object.freeze({
  open: 'Open',
  in_progress: 'In Progress',
  'in progress': 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  escalated: 'In Progress',
  under_review: 'In Progress',
  in_review: 'In Progress',
});

const LEGACY_PRIORITY_MAP = Object.freeze({
  low: 'Low',
  medium: 'Medium',
  high: 'High',
});

function titleCaseKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function normalizeTicketType(value, fallback = 'Other') {
  if (value == null || value === '') return fallback;
  const raw = String(value).trim();
  if (TICKET_TYPES.includes(raw)) return raw;
  const mapped = LEGACY_TYPE_MAP[titleCaseKey(raw)];
  if (mapped) return mapped;
  const exact = TICKET_TYPES.find((t) => t.toLowerCase() === raw.toLowerCase());
  return exact || fallback;
}

function normalizeTicketStatus(value, fallback = 'Open') {
  if (value == null || value === '') return fallback;
  const raw = String(value).trim();
  if (TICKET_STATUSES.includes(raw)) return raw;
  const mapped = LEGACY_STATUS_MAP[titleCaseKey(raw)];
  if (mapped) return mapped;
  const exact = TICKET_STATUSES.find((s) => s.toLowerCase() === raw.toLowerCase());
  return exact || fallback;
}

function normalizeTicketPriority(value, fallback = 'Medium') {
  if (value == null || value === '') return fallback;
  const raw = String(value).trim();
  if (TICKET_PRIORITIES.includes(raw)) return raw;
  const mapped = LEGACY_PRIORITY_MAP[titleCaseKey(raw)];
  if (mapped) return mapped;
  const exact = TICKET_PRIORITIES.find((p) => p.toLowerCase() === raw.toLowerCase());
  return exact || fallback;
}

function isValidTicketType(value) {
  return TICKET_TYPES.includes(normalizeTicketType(value, null));
}

function isValidTicketStatus(value) {
  return TICKET_STATUSES.includes(normalizeTicketStatus(value, null));
}

function isValidTicketPriority(value) {
  return TICKET_PRIORITIES.includes(normalizeTicketPriority(value, null));
}

function isClosedStatus(status) {
  const s = normalizeTicketStatus(status);
  return s === 'Resolved' || s === 'Closed';
}

module.exports = {
  TICKET_TYPES,
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  SUPPORT_TYPES,
  MARKETPLACE_TYPES,
  FORUM_TYPES,
  JOBS_TYPES,
  SPECIALIST_TYPES,
  QUEUE_SCOPES,
  ROLE_TO_TICKET_TYPE,
  ROLE_TO_TICKET_TYPES,
  getEscalateTypesForRole,
  isTypeAllowedForRole,
  normalizeTicketType,
  normalizeTicketStatus,
  normalizeTicketPriority,
  isValidTicketType,
  isValidTicketStatus,
  isValidTicketPriority,
  isClosedStatus,
};
