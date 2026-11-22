/**
 * Ticket catalogs for staff desks.
 * Member intake still accepts the previous labels; they map onto these types.
 *
 * Every category has its own bug report type (lib/TicketBugReports.js); the labels below must
 * match `BUG_REPORT_TYPE_BY_CATEGORY`.
 */
const { BUG_REPORT_TYPES, BUG_REPORT_TYPE_BY_CATEGORY, isBugReportType, bugReportPriority } = require('./TicketBugReports');

const SUPPORT_GROUPS = Object.freeze([
  {
    label: 'Account',
    types: Object.freeze([
      ['Sign-in and password', 'The member cannot sign in, reset their password, or stay logged in.'],
      ['Account compromised', 'Suspicious logins, unauthorized account changes, or two-factor authentication issues.'],
      ['Identity verification', 'The account identity check is pending, rejected, or unclear. This is different from seller verification.'],
      ['Business verification', 'A team\'s business verification is pending, rejected, or its verified badge is missing. This is different from identity verification.'],
      ['Profile and settings', 'Issues with the profile, photo, banner, badges, email, or account settings.'],
      ['Teams', 'Problems with team invitations, join requests, roles, removals, ownership, or suspended team memberships.'],
      ['Delete account or export data', 'Requests to delete an account or obtain a copy of personal data.'],
      ['Account bug report', 'Something on sign-in, sign-up, onboarding, profile, settings, verification, or team pages does not work as it should.'],
    ]),
  },
  {
    label: 'Billing',
    types: Object.freeze([
      ['Subscriptions and plans', 'Issues with plans, renewals, upgrades, downgrades, or cancellations.'],
      ['Credits and balance', 'Missing credits, duplicate deductions, early expiration, or an incorrect balance.'],
      ['Payouts and withdrawals', 'Missing, delayed, held, or rejected earnings payouts.'],
      ['Charges and receipts', 'Incorrect charges, invoices, or receipts.'],
      ['Team funds and distributions', 'Adding funds to a team wallet, or a distribution to team members that is missing, wrong, or stuck.'],
      ['Billing bug report', 'Something on the credits shop, checkout, subscriptions, wallet, transaction history, or cash-out pages does not work as it should.'],
    ]),
  },
  {
    label: 'Video Editing Platform',
    types: Object.freeze([
      ['Editor problems', 'The editor crashes, freezes, or runs slowly on a project.'],
      ['Export and rendering', 'Failed exports, unfinished rendering, watermarks, or incorrect output.'],
      ['Uploads and storage', 'Failed or stuck uploads, or incorrect storage quotas.'],
      ['Project files', 'Missing projects, projects that will not open, trash and restore, templates, or lost content.'],
      ['Sharing and collaboration', 'Problems with project invitations, permissions, comments, syncing, or lost edits.'],
      ['Video editor bug report', 'A tool, panel, or page of the editor or the Projects page does not work as it should.'],
    ]),
  },
  {
    label: 'Messaging',
    types: Object.freeze([
      ['Inbox, chat, and calls', 'Missing messages, broken conversations, or failed calls.'],
      ['Notifications and email', 'Missing, duplicated, or incorrectly delivered alerts and emails.'],
      ['Messaging bug report', 'Something in the inbox, chat, calls, or notifications does not work as it should.'],
    ]),
  },
  {
    label: 'Safety and appeals',
    types: Object.freeze([
      ['Report a user', 'Harassment, impersonation, or scams outside the forum, marketplace, or jobs sections.'],
      ['Copyright claim', 'Someone is using or selling the member\'s work without permission anywhere on Ensemble.'],
      ['Appeal an account penalty', 'One appeal per penalty: a ban, lock, suspension, forum timeout, warning, automatic punishment, or credit hold. Filed from the account standing page.'],
      ['Safety tools bug report', 'A report form, the account standing page, an appeal, or Cases does not work as it should.'],
    ]),
  },
  {
    label: 'General',
    types: Object.freeze([
      ['Website bug report', 'Something elsewhere on Ensemble (home, navigation, search, discovery, dashboard, support pages) does not work as it should.'],
      ['Other', 'Any issue that does not fit the available types.'],
    ]),
  },
]);

const FORUM_GROUP = Object.freeze({
  label: 'Forum',
  types: Object.freeze([
    ['Posts and replies', 'Missing discussions, posts, or replies, or content displaying incorrectly.'],
    ['Forum groups', 'Problems with groups, memberships, or settings.'],
    ['Report a post or member', 'Reports involving forum posts, replies, groups, or members breaking the rules.'],
    ['Appeal a forum action', 'Appeals for removed content or restrictions on forum participation.'],
    ['Forum bug report', 'Something on the forum feed, groups, discussions, or comments does not work as it should.'],
  ]),
});

const MARKETPLACE_GROUP = Object.freeze({
  label: 'Marketplace',
  types: Object.freeze([
    ['Seller verification', 'The eligibility check required to sell is pending, rejected, or unclear. This is different from account identity verification.'],
    ['Listing review', 'The member\'s listing is stuck in review or was rejected.'],
    ['Asset purchase and download', 'The buyer paid but did not receive the file, the download failed, or the license is not on their project.'],
    ['File is wrong or broken', 'The delivered file is damaged, incomplete, or different from what was advertised.'],
    ['Marketplace refunds', 'The buyer wants credits from an asset purchase returned.'],
    ['Report a listing or seller', 'Reports involving scams, misleading listings, or rule violations.'],
    ['Asset reviews', 'Reports about fake, abusive, or unfair reviews of an asset or seller.'],
    ['Appeal a marketplace action', 'Appeals for removed listings or restrictions on selling.'],
    ['Marketplace bug report', 'Something on the Asset Library, an asset page, checkout, or the listing editor does not work as it should.'],
  ]),
});

const JOBS_GROUP = Object.freeze({
  label: 'Jobs and Gigs',
  types: Object.freeze([
    ['Job and gig listings', 'Missing listings, stuck submissions, or incorrect listing details.'],
    ['Proposals and hiring', 'Missing proposals, applications, invitations, or gig order requests, or hiring steps that fail.'],
    ['Contracts, milestones, and orders', 'Problems with agreements, escrow, milestone payments, or gig orders.'],
    ['Workspaces and team projects', 'Problems with a contract workspace or team project: taskboard, submissions, members, subcontractors, chat, or linked video projects.'],
    ['Delivery and disputes', 'Work was not delivered or does not match the agreement. Staff rule on it through a dispute filed from the contract; this ticket is for help before or around one.'],
    ['Cancellations and refunds', 'Requests to cancel a contract or gig order, or return escrowed funds.'],
    ['Report a listing or user', 'Reports involving scams or rule violations by jobs, gigs, clients, or freelancers.'],
    ['Gig reviews', 'Reports about fake, abusive, or unfair reviews left on a job contract or gig order.'],
    ['Appeal a jobs action', 'Appeals for removed listings or restrictions on Jobs & Gigs.'],
    ['Jobs and gigs bug report', 'Something on job or gig pages, proposals, orders, contracts, the dashboard, or workspaces does not work as it should.'],
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
  bug: 'Website bug report',
  'bug report': 'Website bug report',
  'report a bug': 'Website bug report',
  'business verification': 'Business verification',
  workspaces: 'Workspaces and team projects',
  'team projects': 'Workspaces and team projects',
  'team wallet': 'Team funds and distributions',
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
  in_progress: 'In Progress',
  'in progress': 'In Progress',
  resolved: 'Closed',
  closed: 'Closed',
  escalated: 'In Progress',
  under_review: 'In Progress',
  in_review: 'In Progress',
  'escalated to dev': 'In Progress',
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
  'Appeal an account penalty': 'This appeal is about one penalty, shown at the top of the ticket. Tell us what happened in your own words. We read the record before deciding, and the decision only changes that penalty.',
  'Inbox, chat, and calls': 'Name the other person and whether this is a message or a call. Tell us the time it failed and what you saw on screen.',
  'Posts and replies': 'Paste the forum link and say whether the post or the reply is missing, hidden, or wrong. We can remove, restore, lock, or pin from the forum desk.',
  'Report a post or member': 'This ticket records your report. Include the link and what rule you believe was broken. A report is not the same as a ban.',
  'Seller verification': 'Tell us what the seller check currently shows. This is separate from identity verification.',
  'Asset purchase and download': 'Send the listing name and the time you paid. We check that the purchase exists and that the file is still available before asking you to buy again.',
  'Marketplace refunds': 'Name the asset and why you want the credits returned. We do not return credits until the purchase is confirmed on the account.',
  'File is wrong or broken': 'Describe what the listing promised and what the file actually contains. Attach a screenshot of the broken file if you can.',
  'Contracts, milestones, and orders': 'Name the contract or order and which milestone is stuck. We look at escrow before moving credits.',
  'Cancellations and refunds': 'Say who cancelled and whether escrow should be released or returned. We do not move credits until that is confirmed.',
  'Business verification': 'Tell us which team this is for and what the business verification page shows. We review it from the verification desk; documents stay there, not on this ticket.',
  'Team funds and distributions': 'Name the team, the amount, and when you added funds or ran the distribution. We check the team wallet and what it still owes members before moving anything.',
  'Workspaces and team projects': 'Name the contract and what in the workspace is not working (taskboard, submissions, members, chat, or a linked video project).',
  'Delivery and disputes': 'Say what was delivered, what was agreed, and what you want to happen next. If you want staff to rule and hold escrow, file a dispute from the contract page; this ticket helps around it.',
});

/** One shared first reply for every bug report type. */
const BUG_REPORT_REPLY = 'Thanks for reporting this bug. We try it ourselves from the steps you gave. If you can, reply with a screenshot or screen recording and tell us whether it still happens after a page refresh.';

const CANNED_REPLIES = Object.freeze(
  TICKET_TYPES.map((label) => {
    const meta = TYPE_META.get(label);
    const specific = SPECIFIC_REPLIES[label];
    if (BUG_REPORT_TYPES.includes(label)) {
      return { type: label, title: label, body: BUG_REPORT_REPLY };
    }
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

function normalizeTicketStatus(value, fallback = 'In Progress') {
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
  return normalizeTicketStatus(status) === 'Closed';
}

/**
 * The category a ticket type is filed under on the member form: the support area for support
 * types (Account, Billing, …), else Forum, Marketplace or Jobs and Gigs. Open-ticket limits count
 * per category. Unknown types return null.
 */
function ticketCategoryOf(type) {
  return TYPE_META.get(type)?.subgroup || null;
}

function getPublicTicketTypeDetails() {
  const { fieldsForType } = require('./TicketFormFields');
  return TICKET_TYPES.map((label) => {
    const meta = TYPE_META.get(label);
    return {
      label,
      queueRole: meta?.queueRole || 'Support Moderator',
      description: meta?.description || null,
      group: meta?.group || null,
      subgroup: meta?.subgroup || null,
      fields: fieldsForType(label),
    };
  });
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
  ROLE_TO_TICKET_TYPES,
  BUG_REPORT_TYPES,
  BUG_REPORT_TYPE_BY_CATEGORY,
  CANNED_REPLIES,
  STORED_TYPE_REMAP,
  getEscalateTypesForRole,
  isTypeAllowedForRole,
  normalizeTicketType,
  normalizeTicketStatus,
  normalizeTicketPriority,
  defaultPriorityForType,
  resolveTicketPriority,
  isBugReportType,
  bugReportPriority,
  ticketTypeMeta,
  isValidTicketType,
  isValidTicketStatus,
  isValidTicketPriority,
  isClosedStatus,
  getPublicTicketTypeDetails,
  ticketCategoryOf,
  fieldsForType: require('./TicketFormFields').fieldsForType,
  sanitizeTicketFormValues: require('./TicketFormFields').sanitizeTicketFormValues,
};
