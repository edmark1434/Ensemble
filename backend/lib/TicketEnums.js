/**
 * Ticket catalogs for staff desks.
 * Member intake still accepts the previous labels; they map onto these types.
 */

const SUPPORT_GROUPS = Object.freeze([
  {
    label: 'Account',
    types: Object.freeze([
      ['Sign-in and password', 'The member cannot sign in, the password reset fails, or the session keeps ending.'],
      ['Account compromised', 'Someone else may be using the account, or the member sees sign-ins they do not recognize.'],
      ['Identity verification', 'The identity check is pending, rejected, or unclear. This is not the check to sell on the marketplace.'],
      ['Profile and settings', 'The profile, photo, banner, email, or account settings will not save or look wrong.'],
      ['Teams', 'A team invite, role, removal, or a suspended team membership is stuck or wrong.'],
      ['Delete account or export data', 'The member wants their data exported or the account deleted.'],
    ]),
  },
  {
    label: 'Billing',
    types: Object.freeze([
      ['Subscriptions and plans', 'The plan, renewal, upgrade, or cancellation is wrong.'],
      ['Credits and balance', 'Bought credits did not arrive, or the balance does not match what they paid.'],
      ['Payouts and withdrawals', 'A cash-out or earnings payout is missing, delayed, or rejected.'],
      ['Charges and receipts', 'A card charge, invoice, or receipt looks wrong. Not a missing asset and not a missing gig delivery.'],
    ]),
  },
  {
    label: 'Video Editing Platform',
    types: Object.freeze([
      ['Editor problems', 'The editor crashes, will not open, or a tool inside it fails.'],
      ['Export and rendering', 'An export fails, stalls, or the rendered file is wrong.'],
      ['Uploads and storage', 'An upload fails, or stored media is missing or over the limit.'],
      ['Project files', 'A project is missing, corrupted, or will not open.'],
      ['Sharing and collaboration', 'A project invite, member, or shared edit is stuck or wrong.'],
    ]),
  },
  {
    label: 'Messaging',
    types: Object.freeze([
      ['Inbox, chat, and calls', 'A message, conversation, or call is missing, stuck, or failed.'],
      ['Notifications and email', 'Alerts or email are missing, duplicated, or sent to the wrong place.'],
    ]),
  },
  {
    label: 'Safety and appeals',
    types: Object.freeze([
      ['Report a user', 'The member is reporting another account for abuse or a rule break.'],
      ['Copyright claim', 'A member says their work was copied, or they received a copyright notice.'],
      ['Appeal an account penalty', 'The member wants a warning, suspension, lock, or ban reviewed.'],
    ]),
  },
  {
    label: 'General',
    types: Object.freeze([
      ['Other', 'None of the support types fit, and it is not a forum, marketplace, or jobs problem.'],
    ]),
  },
]);

const FORUM_GROUP = Object.freeze({
  label: 'Forum',
  types: Object.freeze([
    ['Posts and replies', 'A discussion, post, or reply is missing, stuck, or showing the wrong content.'],
    ['Forum groups', 'A group, its membership, or its settings is wrong.'],
    ['Report a post or member', 'The member is reporting a forum post, reply, or member.'],
    ['Appeal a forum action', 'The member wants a removed post, locked discussion, or group ban reviewed.'],
  ]),
});

const MARKETPLACE_GROUP = Object.freeze({
  label: 'Marketplace',
  types: Object.freeze([
    ['Seller verification', 'The check that allows someone to sell is stuck or unclear.'],
    ['Listing review', 'A listing is stuck in review, was rejected, or should be taken down.'],
    ['Asset purchase and download', 'The buyer paid for an asset and did not get the file, or the download failed.'],
    ['File is wrong or broken', 'The file arrived, but it is incomplete, damaged, or not what the listing promised.'],
    ['Marketplace refunds', 'The buyer wants the credits from an asset purchase returned.'],
    ['Report a listing or seller', 'The member is reporting a listing or a seller.'],
    ['Asset reviews', 'A review on an asset is missing, wrong, or abusive.'],
    ['Appeal a marketplace action', 'The member wants a rejected listing, delist, or seller restriction reviewed.'],
  ]),
});

const JOBS_GROUP = Object.freeze({
  label: 'Jobs and Gigs',
  types: Object.freeze([
    ['Job and gig listings', 'A job or gig listing is missing, stuck, or showing the wrong details.'],
    ['Proposals and hiring', 'A proposal or application was not received, or hiring the person did not go through.'],
    ['Contracts, milestones, and orders', 'The agreement, escrow, a milestone payment, or a gig order is stuck or wrong.'],
    ['Delivery and disputes', 'Work was delivered and the parties disagree, or the delivery never arrived.'],
    ['Cancellations and refunds', 'A job or gig was cancelled and the refund or escrow release is stuck.'],
    ['Report a listing or user', 'The member is reporting a job, gig, or the other party.'],
    ['Gig reviews', 'A review on a gig order is missing, wrong, or abusive.'],
    ['Appeal a jobs action', 'The member wants a removed listing, cancelled order, or hiring block reviewed.'],
  ]),
});

function labelsFrom(group) {
  return group.types.map(([label]) => label);
}

const SUPPORT_TYPES = Object.freeze(SUPPORT_GROUPS.flatMap(labelsFrom));
const FORUM_TYPES = Object.freeze(labelsFrom(FORUM_GROUP));
const MARKETPLACE_TYPES = Object.freeze(labelsFrom(MARKETPLACE_GROUP));
const JOBS_TYPES = Object.freeze(labelsFrom(JOBS_GROUP));

const TICKET_TYPES = Object.freeze([
  ...SUPPORT_TYPES,
  ...FORUM_TYPES,
  ...MARKETPLACE_TYPES,
  ...JOBS_TYPES,
]);

const SPECIALIST_TYPES = Object.freeze([...FORUM_TYPES, ...MARKETPLACE_TYPES, ...JOBS_TYPES]);

const TICKET_STATUSES = Object.freeze([
  'Open',
  'In Progress',
  'Escalated to Dev',
  'Resolved',
  'Closed',
]);
const TICKET_PRIORITIES = Object.freeze(['Low', 'Medium', 'High']);

const HIGH_PRIORITY_TYPES = new Set([
  'Account compromised',
  'Payouts and withdrawals',
  'Copyright claim',
  'Delivery and disputes',
]);
const LOW_PRIORITY_TYPES = new Set(['Notifications and email']);

const QUEUE_SCOPES = Object.freeze({
  support: { typesIn: [...SUPPORT_TYPES], typesNotIn: [...SPECIALIST_TYPES] },
  forums: { typesIn: [...FORUM_TYPES] },
  marketplace: { typesIn: [...MARKETPLACE_TYPES] },
  jobs: { typesIn: [...JOBS_TYPES] },
});

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

const ROLE_TO_TICKET_TYPE = Object.freeze(
  Object.fromEntries(
    Object.entries(ROLE_TO_TICKET_TYPES).map(([role, types]) => [role, types[0]])
  )
);

const TYPE_META = new Map();
for (const group of SUPPORT_GROUPS) {
  for (const [label, description] of group.types) {
    TYPE_META.set(label, {
      label,
      description,
      group: 'Support',
      subgroup: group.label,
      queueRole: 'Support Moderator',
    });
  }
}
for (const [label, description] of FORUM_GROUP.types) {
  TYPE_META.set(label, {
    label,
    description,
    group: 'Forums',
    subgroup: 'Forum',
    queueRole: 'Forum Moderator',
  });
}
for (const [label, description] of MARKETPLACE_GROUP.types) {
  TYPE_META.set(label, {
    label,
    description,
    group: 'Marketplace',
    subgroup: 'Marketplace',
    queueRole: 'Marketplace Moderator',
  });
}
for (const [label, description] of JOBS_GROUP.types) {
  TYPE_META.set(label, {
    label,
    description,
    group: 'Jobs and Gigs',
    subgroup: 'Jobs and Gigs',
    queueRole: 'Jobs N Gigs Moderator',
  });
}

/** Previous catalog labels, stored tickets, and the current member form. */
const LEGACY_TYPE_MAP = Object.freeze({
  billing: 'Charges and receipts',
  account: 'Sign-in and password',
  security: 'Identity verification',
  general: 'Other',
  community: 'Posts and replies',
  forum: 'Posts and replies',
  forums: 'Posts and replies',
  marketplace: 'Listing review',
  'asset marketplace': 'Listing review',
  jobs: 'Job and gig listings',
  gigs: 'Job and gig listings',
  job: 'Job and gig listings',
  gig: 'Job and gig listings',
  'jobs and gigs': 'Job and gig listings',
  dispute: 'Delivery and disputes',
  other: 'Other',
  'account access': 'Sign-in and password',
  'account verification': 'Identity verification',
  'profile and settings': 'Profile and settings',
  'subscriptions and plans': 'Subscriptions and plans',
  'credit top-ups': 'Credits and balance',
  'credit topups': 'Credits and balance',
  'withdrawing earnings': 'Payouts and withdrawals',
  'billing and payments': 'Charges and receipts',
  'video editor': 'Editor problems',
  'notifications and email': 'Notifications and email',
  'technical issue': 'Other',
  'listing issues': 'Listing review',
  'purchase and delivery': 'Asset purchase and download',
  'seller verification': 'Seller verification',
  'marketplace refunds': 'Marketplace refunds',
  'asset quality': 'File is wrong or broken',
  'forum posts': 'Posts and replies',
  'forum groups': 'Forum groups',
  'forum comments': 'Posts and replies',
  'forum reports': 'Report a post or member',
  'job posts': 'Job and gig listings',
  'gig posts': 'Job and gig listings',
  'applications and hiring': 'Proposals and hiring',
  'contracts and milestones': 'Contracts, milestones, and orders',
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
  'escalated to dev': 'Escalated to Dev',
});

const LEGACY_PRIORITY_MAP = Object.freeze({
  low: 'Low',
  medium: 'Medium',
  high: 'High',
});

const SPECIFIC_REPLIES = Object.freeze({
  'Sign-in and password': 'Try a password reset from the login page, then sign in with the same email. If Google is tied to a different email, send us that address and we will match it.',
  'Account compromised': 'Change the password if you still can, and tell us the last time you signed in yourself. We will check recent sessions and lock the account if the activity is not yours.',
  'Identity verification': 'Open the verification status page and tell us what it shows. We review the submission from this ticket. Approval is one year from the day it is accepted.',
  'Payouts and withdrawals': 'Tell us the amount and the date you requested the payout. We check the cash-out status on this ticket before changing anything. Pending payouts are not paid until the provider succeeds.',
  'Credits and balance': 'Send the time of the payment and the last four digits or the receipt id. We match it to the credit transaction before adding a balance.',
  'Charges and receipts': 'Send the receipt amount, date, and what you expected to be charged. We do not treat a missing asset or a gig delivery as a card charge.',
  'Editor problems': 'Tell us the project name, the browser, and what you clicked just before it failed. A screenshot on this ticket is enough for the first look.',
  'Export and rendering': 'Tell us the export format and how far the render got. If it finished but the file is wrong, describe what you expected to see.',
  'Copyright claim': 'Name the work, where it appears on Ensemble, and whether you are the owner or you received a notice. Do not post private legal documents in the public reply.',
  'Appeal an account penalty': 'Say which restriction you are appealing and what happened in your own words. We read the violation record on the account before changing the standing.',
  'Inbox, chat, and calls': 'Name the other person and whether this is a message or a call. Tell us the time it failed and what you saw on screen.',
  'Posts and replies': 'Paste the forum link and say whether the post or the reply is missing, hidden, or wrong. We can remove, restore, lock, or pin from the forum desk.',
  'Report a post or member': 'This ticket records your report. Include the link and what rule you believe was broken. A report is not the same as a ban.',
  'Seller verification': 'Tell us what the seller check currently shows. This is separate from identity verification.',
  'Asset purchase and download': 'Send the listing name and the time you paid. We check that the purchase exists and that the file is still available before asking you to buy again.',
  'Marketplace refunds': 'Name the asset and why you want the credits returned. We do not return credits until the purchase is confirmed on the account.',
  'File is wrong or broken': 'Describe what the listing promised and what the file actually contains. Attach a screenshot of the broken file if you can.',
  'Contracts, milestones, and orders': 'Name the contract or order and which milestone is stuck. We look at escrow before moving credits.',
  'Delivery and disputes': 'Say what was delivered, what was agreed, and what you want to happen next. This stays open while the two sides disagree.',
  'Cancellations and refunds': 'Say who cancelled and whether escrow should be released or returned. We do not move credits until that is confirmed.',
});

const CANNED_REPLIES = Object.freeze(
  TICKET_TYPES.map((label) => {
    const meta = TYPE_META.get(label);
    const specific = SPECIFIC_REPLIES[label];
    return {
      type: label,
      title: specific ? label : `First reply: ${label}`,
      body: specific
        ? `Thanks for writing in. ${specific}`
        : `Thanks for writing in about ${label}. ${meta.description} Reply here with the page you were on and what you expected to happen.`,
    };
  })
);

/** Exact stored labels from the previous catalog, for the database remap. */
const STORED_TYPE_REMAP = Object.freeze({
  'Account Access': 'Sign-in and password',
  'Account Verification': 'Identity verification',
  'Profile and Settings': 'Profile and settings',
  'Subscriptions and Plans': 'Subscriptions and plans',
  'Credit Top-ups': 'Credits and balance',
  'Withdrawing Earnings': 'Payouts and withdrawals',
  'Billing and Payments': 'Charges and receipts',
  'Video Editor': 'Editor problems',
  'Notifications and Email': 'Notifications and email',
  'Technical Issue': 'Other',
  Forums: 'Posts and replies',
  'Forum Posts': 'Posts and replies',
  'Forum Groups': 'Forum groups',
  'Forum Comments': 'Posts and replies',
  'Forum Reports': 'Report a post or member',
  'Asset Marketplace': 'Listing review',
  'Listing Issues': 'Listing review',
  'Purchase and Delivery': 'Asset purchase and download',
  'Seller Verification': 'Seller verification',
  'Marketplace Refunds': 'Marketplace refunds',
  'Asset Quality': 'File is wrong or broken',
  'Jobs and Gigs': 'Job and gig listings',
  'Job Posts': 'Job and gig listings',
  'Gig Posts': 'Job and gig listings',
  'Applications and Hiring': 'Proposals and hiring',
  'Contracts and Milestones': 'Contracts, milestones, and orders',
});

function titleCaseKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function getEscalateTypesForRole(role) {
  if (!role) return [];
  return ROLE_TO_TICKET_TYPES[role] ? [...ROLE_TO_TICKET_TYPES[role]] : [];
}

function isTypeAllowedForRole(role, type) {
  const allowed = ROLE_TO_TICKET_TYPES[role];
  if (!allowed) return false;
  return allowed.includes(normalizeTicketType(type));
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

function defaultPriorityForType(type) {
  const label = normalizeTicketType(type);
  if (HIGH_PRIORITY_TYPES.has(label)) return 'High';
  if (LOW_PRIORITY_TYPES.has(label)) return 'Low';
  return 'Medium';
}

function resolveTicketPriority(type, requested) {
  const fallback = defaultPriorityForType(type);
  if (requested == null || String(requested).trim() === '') return fallback;
  const normalized = normalizeTicketPriority(requested);
  if (normalized === 'Medium' && fallback !== 'Medium') return fallback;
  return normalized;
}

function ticketTypeMeta(label) {
  return TYPE_META.get(normalizeTicketType(label)) || null;
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

/** Previous member-facing groups. The public form keeps these until that page is redesigned. */
const PUBLIC_TICKET_GROUPS = Object.freeze([
  {
    label: 'Support',
    queueRole: 'Support Moderator',
    types: [
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
    ],
  },
  {
    label: 'Forums',
    queueRole: 'Forum Moderator',
    types: ['Forums', 'Forum Posts', 'Forum Groups', 'Forum Comments', 'Forum Reports'],
  },
  {
    label: 'Marketplace',
    queueRole: 'Marketplace Moderator',
    types: [
      'Asset Marketplace',
      'Listing Issues',
      'Purchase and Delivery',
      'Seller Verification',
      'Marketplace Refunds',
      'Asset Quality',
    ],
  },
  {
    label: 'Jobs and Gigs',
    queueRole: 'Jobs N Gigs Moderator',
    types: ['Jobs and Gigs', 'Job Posts', 'Gig Posts', 'Applications and Hiring', 'Contracts and Milestones'],
  },
]);

function getPublicTicketTypeDetails() {
  return PUBLIC_TICKET_GROUPS.flatMap((group) =>
    group.types.map((label) => ({
      label,
      queueRole: group.queueRole,
      description: null,
    }))
  );
}

module.exports = {
  TICKET_TYPES,
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  SUPPORT_TYPES,
  SUPPORT_GROUPS,
  MARKETPLACE_TYPES,
  FORUM_TYPES,
  JOBS_TYPES,
  SPECIALIST_TYPES,
  QUEUE_SCOPES,
  ROLE_TO_TICKET_TYPE,
  ROLE_TO_TICKET_TYPES,
  CANNED_REPLIES,
  STORED_TYPE_REMAP,
  getEscalateTypesForRole,
  isTypeAllowedForRole,
  normalizeTicketType,
  normalizeTicketStatus,
  normalizeTicketPriority,
  defaultPriorityForType,
  resolveTicketPriority,
  ticketTypeMeta,
  isValidTicketType,
  isValidTicketStatus,
  isValidTicketPriority,
  isClosedStatus,
  getPublicTicketTypeDetails,
};
