/**
 * Extra questions on the member ticket form.
 * Answers are stored as a JSON list on the ticket. Shared subject,
 * description, and files stay on the ticket and its chat.
 */

const {
  BUG_REPORT_TYPE_BY_CATEGORY,
  BUG_BLOCKING_OPTIONS,
  BUG_FREQUENCY_OPTIONS,
} = require('./TicketBugReports');

const LOGGED_OUT_TICKET_TYPES = Object.freeze([
  'Sign-in and password',
  'Account compromised',
]);

function text(key, label, extra = {}) {
  return { key, label, kind: 'text', required: true, ...extra };
}
function optionalText(key, label, extra = {}) {
  return text(key, label, { required: false, ...extra });
}
function area(key, label, extra = {}) {
  return { key, label, kind: 'textarea', required: true, ...extra };
}
function select(key, label, options, extra = {}) {
  return { key, label, kind: 'select', required: true, options, ...extra };
}
function multi(key, label, options, extra = {}) {
  return { key, label, kind: 'multiselect', required: true, options, ...extra };
}
function check(key, label, extra = {}) {
  return { key, label, kind: 'checkbox', required: true, ...extra };
}
function whenEquals(key, equals) {
  return { when: { key, equals } };
}
function whenOneOf(key, oneOf) {
  return { when: { key, oneOf } };
}

/**
 * Pickers name the record a ticket is about. List pickers (`project`, `listing`, `order`,
 * `contract`, `job`) offer the member's own records, including ones posted as a team they own
 * (`GET /api/users/ticket-context`). Search pickers find a record by name or pasted link:
 * `team` (`/ticket-teams`), and `asset` / `posting` (`/ticket-search`) for marketplace assets
 * and jobs or gigs. `pickerScope: 'others'` leaves out what the member posted (reports).
 * The member may still type a name or link when the record is not listed (not for `team`).
 * The server stores the record's name and id, and refuses an id the member cannot pick.
 */
/** Marketplace decisions a member can appeal; the listing ones ask which listing. */
const MARKETPLACE_LISTING_ACTIONS = Object.freeze([
  'Listing rejected',
  'Listing permanently rejected',
  'Listing delisted',
]);
const MARKETPLACE_APPEAL_ACTIONS = Object.freeze([
  ...MARKETPLACE_LISTING_ACTIONS,
  'Selling restricted',
  'Other',
]);

/**
 * Bug report questions, the same for every category: where it happened (that category's own
 * areas), the page, steps, expected versus actual, how often, whether it blocks the member and
 * the error. `record` is an optional picker for the item the bug showed up on. The browser,
 * device and the page the member came from are saved with every ticket already.
 */
function bugReportFields(areas, record = []) {
  return [
    select('bug_area', 'Where it happened', [...areas, 'Somewhere else']),
    ...record,
    optionalText('page_link', 'Link to the page', {
      hint: "Copy the address from your browser's address bar while you are on that page.",
    }),
    area('steps', 'Steps to make it happen', {
      hint: 'What you clicked or typed, in order, starting from a page we can open.',
    }),
    area('expected_vs_actual', 'What you expected, and what happened instead'),
    select('frequency', 'How often does it happen?', [...BUG_FREQUENCY_OPTIONS]),
    select('blocking', 'Can you still finish what you were doing?', [...BUG_BLOCKING_OPTIONS]),
    optionalText('error_message', 'Error message shown, if any'),
  ];
}

const project = [text('project', 'Project', { picker: 'project' })];
const listing = [text('listing', 'Listing', { picker: 'listing' })];
const order = [text('order', 'Order', { picker: 'order' })];
const contract = [text('contract_or_order', 'Contract or order', { picker: 'contract' })];

const TICKET_FORM_FIELDS = Object.freeze({
  'Sign-in and password': [
    select('whats_happening', "What's happening", [
      'Wrong password',
      'Reset email not arriving',
      'Reset link expired',
      'Keeps logging out',
      '2FA issue',
    ]),
    select('sign_in_method', 'Sign-in method', ['Email', 'Google', 'Other'], { required: false }),
  ],
  'Account compromised': [
    optionalText('contact_email', 'Alternate contact email (if different from account email)'),
    multi('what_changed', 'What changed', ['Email', 'Password', 'Payout details', 'Posts or messages', 'Purchases']),
    text('when_noticed', 'When you noticed'),
    select('still_has_access', 'Do you still have access?', ['Yes', 'No']),
  ],
  'Identity verification': [
    optionalText('submission_date', 'Submission date'),
    optionalText('rejection_reason', 'Rejection reason shown, if any'),
  ],
  // Business verification is per team; documents stay on the verification desk, never here.
  'Business verification': [
    text('team_name', 'Team', { picker: 'team' }),
    select('issue', 'Issue', ['Pending too long', 'Rejected', 'Verified badge missing', 'Cannot submit']),
    optionalText('submission_date', 'Submission date'),
    optionalText('rejection_reason', 'Rejection reason shown, if any'),
  ],
  'Profile and settings': [
    select('which_setting', 'Which setting', ['Profile info', 'Photo', 'Banner', 'Badges', 'Email', 'Privacy', 'Other']),
    optionalText('error_message', 'Error message shown'),
  ],
  Teams: [
    text('team_name', 'Team', { picker: 'team' }),
    select('issue', 'Issue', ['Invite', 'Join request', 'Role', 'Removal', 'Ownership transfer', 'Suspended membership']),
    optionalText('affected_username', "Affected member's username"),
  ],
  'Delete account or export data': [
    select('request_type', 'Request type', ['Delete', 'Export']),
    optionalText('reason', 'Reason'),
    check(
      'confirm_delete',
      'I understand deletion removes my projects, credits, and pending payouts',
      whenEquals('request_type', 'Delete')
    ),
  ],
  'Subscriptions and plans': [
    select('issue', 'Issue', ['Renewal', 'Upgrade', 'Downgrade', 'Cancellation', 'Wrong plan']),
    optionalText('reference_id', 'Transaction or reference ID'),
    optionalText('event_date', 'Date'),
  ],
  'Credits and balance': [
    select('issue', 'Issue', ['Not added', 'Deducted twice', 'Expired early', 'Wrong balance']),
    text('transaction_id', 'Transaction ID'),
    text('expected_amount', 'Expected amount'),
    text('event_date', 'Date'),
    select('payment_method', 'Payment method', ['Card', 'GCash', 'Maya', 'Bank']),
  ],
  'Payouts and withdrawals': [
    text('payout_reference', 'Payout reference'),
    text('amount', 'Amount'),
    text('date_requested', 'Date requested'),
    text('payout_method', 'Payout method'),
    text('status_shown', 'Status shown'),
  ],
  'Team funds and distributions': [
    text('team_name', 'Team', { picker: 'team' }),
    select('issue', 'Issue', ['Adding funds', 'Distribution missing', 'Distribution amount wrong', 'Team balance wrong']),
    optionalText('amount', 'Amount'),
    optionalText('event_date', 'Date'),
    optionalText('affected_username', "Affected member's username"),
  ],
  'Charges and receipts': [
    text('transaction_id', 'Transaction ID'),
    text('amount', 'Amount'),
    text('event_date', 'Date'),
    select('issue', 'Issue', ['Unrecognized', 'Charged twice', 'Wrong amount', 'Receipt missing or wrong']),
    optionalText('card_last4', 'Last 4 digits of the card'),
  ],
  // A tool that behaves wrong is a "Video editor bug report"; this type is crashes and slowness.
  'Editor problems': [
    ...project,
    select('issue', 'Issue', ['Crash', 'Freeze', 'Lag', 'Playback stutters']),
    optionalText('tool', 'What you were doing when it happened'),
    area('steps', 'Steps to reproduce'),
  ],
  'Export and rendering': [
    ...project,
    text('export_settings', 'Export settings (resolution, format, fps)'),
    select('issue', 'Issue', ['Failed', 'Stuck', 'Wrong output', 'Unexpected watermark or plan limit']),
    optionalText('error_message', 'Error message'),
  ],
  'Uploads and storage': [
    select('issue', 'Issue', ['Upload failed', 'Upload stuck', 'Quota wrong', 'Storage full']),
    text('file_name', 'File name', whenOneOf('issue', ['Upload failed', 'Upload stuck'])),
    text('file_size', 'File size', whenOneOf('issue', ['Upload failed', 'Upload stuck'])),
    text('file_format', 'File format', whenOneOf('issue', ['Upload failed', 'Upload stuck'])),
  ],
  'Project files': [
    ...project,
    select('issue', 'Issue', ['Missing', "Won't open", 'Lost content', 'Trash or restore', 'Template did not create a project']),
    text('last_worked', 'When it last worked'),
  ],
  'Sharing and collaboration': [
    ...project,
    select('issue', 'Issue', ['Invite', 'Permission', 'Comments and mentions', 'Sync', 'Lost edits']),
    optionalText('collaborator', "Affected collaborator's username"),
    optionalText('lost_edit_time', 'Approximate time of the lost edits', whenEquals('issue', 'Lost edits')),
  ],
  'Inbox, chat, and calls': [
    select('message_type', 'Type', ['Message', 'Conversation', 'Call']),
    text('other_username', "The other person's username"),
    text('approximate_time', 'Approximate time'),
  ],
  'Notifications and email': [
    text('notification_type', 'Notification type'),
    select('issue', 'Issue', ['Missing', 'Duplicated', 'Wrong place']),
    select('channel', 'Channel', ['In-app', 'Email', 'Push']),
  ],
  'Report a user': [
    text('reported_username', 'Reported username'),
    select('reason', 'Reason', ['Harassment', 'Impersonation', 'Scam', 'Other']),
    select('where_it_happened', 'Where it happened', ['DM', 'Call', 'Profile', 'Team', 'Video project', 'Other']),
    area('evidence', 'Evidence'),
  ],
  'Copyright claim': [
    area('ownership_proof', 'Proof of ownership, or a link to the original'),
    area('infringing_links', 'Link or links to the infringing content'),
    text('claimant_name', 'Your full name'),
    text('claimant_contact', 'Contact email'),
    select('relationship', 'Relationship', ['Owner', 'Authorized agent']),
    check('good_faith', 'I have a good-faith belief this use is not authorized'),
    check('accuracy', 'The information in this claim is accurate'),
    text('signature', 'Type your full name as a signature'),
  ],
  // Filed per penalty from /account/appeal; the server fills "Case ID" with the penalty named.
  'Appeal an account penalty': [
    optionalText('case_id', 'Penalty or case ID'),
    area('why_reverse', 'Why it should be reversed'),
    area('evidence', 'Supporting evidence', { required: false }),
  ],
  'Posts and replies': [
    text('post_link', 'Link to the post'),
    select('issue', 'Issue', ['Missing', 'Stuck', 'Wrong content']),
  ],
  'Forum groups': [
    text('group_name', 'Group'),
    select('issue', 'Issue', ['Membership', 'Settings', 'Missing group']),
  ],
  'Report a post or member': [
    text('link_or_username', 'Link or username'),
    text('reason', 'Reason'),
    area('evidence', 'Evidence', { required: false }),
  ],
  'Appeal a forum action': [
    optionalText('case_id', 'Warning or report number, if you were given one'),
    area('explanation', 'Explanation'),
  ],
  'Seller verification': [
    optionalText('submission_date', 'Submission date'),
    optionalText('rejection_reason', 'Rejection reason shown'),
  ],
  'Listing review': [
    ...listing,
    select('status', 'Status', ['Stuck', 'Rejected']),
    optionalText('rejection_reason', 'Rejection reason shown'),
  ],
  'Asset purchase and download': [
    ...order,
    select('issue', 'Issue', ['Not received', 'Download fails', 'License not on my project']),
    optionalText('error_message', 'Error message'),
  ],
  'File is wrong or broken': [
    ...order,
    select('issue', 'Issue', ['Damaged', 'Incomplete', 'Not as described']),
    area('whats_wrong', "What's wrong"),
    area('evidence', 'Evidence'),
    select('contacted_seller', 'Have you contacted the seller?', ['Yes', 'No']),
  ],
  'Marketplace refunds': [
    ...order,
    text('reason', 'Reason'),
    area('details', 'Details'),
    select('contacted_seller', 'Have you contacted the seller?', ['Yes', 'No']),
  ],
  'Report a listing or seller': [
    select('report_target', 'What are you reporting?', ['A listing', 'A seller']),
    text('listing', 'Listing', {
      picker: 'asset',
      pickerScope: 'others',
      ...whenEquals('report_target', 'A listing'),
    }),
    text('seller_username', "Seller's username", whenEquals('report_target', 'A seller')),
    select('reason', 'Reason', ['Scam', 'Misleading', 'Prohibited', 'Stolen asset']),
    area('evidence', 'Evidence', { required: false }),
  ],
  'Asset reviews': [
    text('listing', 'Asset the review is on', { picker: 'asset' }),
    optionalText('reviewer_username', "Reviewer's username"),
    select('reason', 'Reason', ['Fake', 'Abusive', 'Unfair']),
    area('explanation', 'Explanation'),
  ],
  // Members are never given a case ID for marketplace decisions, so the listing names the case.
  // `case_id` stays an optional lookup for a warning or report number the member was sent.
  'Appeal a marketplace action': [
    select('action_taken', 'What happened', MARKETPLACE_APPEAL_ACTIONS),
    text('listing', 'Listing the action was on', {
      picker: 'listing',
      ...whenOneOf('action_taken', MARKETPLACE_LISTING_ACTIONS),
    }),
    optionalText('case_id', 'Warning or report number, if you were given one'),
    area('explanation', 'Why it should be reversed'),
  ],
  'Job and gig listings': [
    text('listing', 'Listing', { picker: 'job' }),
    select('issue', 'Issue', ['Missing', 'Stuck', 'Wrong details']),
  ],
  'Proposals and hiring': [
    text('listing', 'Listing', { picker: 'job' }),
    select('role', 'Your role', ['Client', 'Freelancer']),
    text('issue', 'Issue'),
    optionalText('proposal_id', 'Proposal ID'),
  ],
  'Contracts, milestones, and orders': [
    ...contract,
    select('issue', 'Issue', ['Escrow', 'Milestone payment', 'Order stuck']),
    optionalText('milestone', 'Milestone'),
    optionalText('amount', 'Amount'),
  ],
  // Staff rule on delivery through a dispute filed from the contract; this ticket helps around it.
  'Delivery and disputes': [
    ...contract,
    select('dispute_filed', 'Have you filed a dispute on this contract?', ['Yes, it is open', 'Not yet'], {
      hint: 'To have staff rule on it and hold the escrow, file a dispute from the contract page.',
    }),
    select('role', 'Your role', ['Client', 'Freelancer']),
    select('issue', 'Issue', ['Not delivered', "Doesn't match", 'Disagreement']),
    area('agreed_versus_happened', 'What was agreed versus what happened'),
    area('evidence', 'Evidence'),
    select('desired_outcome', 'Desired outcome', ['Full refund', 'Partial refund', 'Revision', 'Release payment']),
  ],
  'Workspaces and team projects': [
    ...contract,
    select('issue', 'Issue', [
      'Workspace missing',
      'Taskboard',
      'Submissions',
      'Members or subcontractors',
      'Workspace chat',
      'Linked video project',
    ]),
    optionalText('affected_username', "Affected member's username"),
  ],
  'Cancellations and refunds': [
    ...contract,
    select('request', 'Request', ['Cancel', 'Refund escrow', 'Both']),
    area('reason', 'Reason'),
    select('other_party_agreed', 'Has the other party agreed?', ['Yes', 'No', 'Not asked']),
  ],
  'Report a listing or user': [
    select('report_target', 'What are you reporting?', ['A job or gig', 'A user']),
    text('listing', 'Job or gig', {
      picker: 'posting',
      pickerScope: 'others',
      ...whenEquals('report_target', 'A job or gig'),
    }),
    text('reported_username', "User's username", whenEquals('report_target', 'A user')),
    text('reason', 'Reason'),
    area('evidence', 'Evidence', { required: false }),
  ],
  // Job and gig reviews are left on a contract, so the contract names the review.
  'Gig reviews': [
    text('contract_or_order', 'Contract or order the review is on', { picker: 'contract' }),
    text('reason', 'Reason'),
    area('explanation', 'Explanation'),
  ],
  'Appeal a jobs action': [
    optionalText('case_id', 'Warning or report number, if you were given one'),
    optionalText('listing', 'Job or gig the action was on, if any', { picker: 'job' }),
    area('explanation', 'Explanation'),
  ],

  [BUG_REPORT_TYPE_BY_CATEGORY.Account]: bugReportFields([
    'Sign-in or sign-up',
    'Onboarding',
    'Profile page',
    'Account settings',
    'Identity or business verification',
    'Teams',
  ]),
  [BUG_REPORT_TYPE_BY_CATEGORY.Billing]: bugReportFields([
    'Credits shop and checkout',
    'Subscriptions page',
    'Wallet and transaction history',
    'Cash-out',
    'Team wallet',
  ]),
  [BUG_REPORT_TYPE_BY_CATEGORY['Video Editing Platform']]: bugReportFields(
    [
      'Timeline and editing tools',
      'Preview and playback',
      'Uploads and media',
      'Export and rendering',
      'Collaboration and comments',
      'Templates',
      'Marketplace assets in the editor',
      'Projects page',
    ],
    [optionalText('project', 'Project, if any', { picker: 'project' })]
  ),
  [BUG_REPORT_TYPE_BY_CATEGORY.Messaging]: bugReportFields([
    'Inbox and chat',
    'Calls and meetings',
    'In-app notifications',
    'Email',
  ]),
  [BUG_REPORT_TYPE_BY_CATEGORY['Safety and appeals']]: bugReportFields([
    'Report forms',
    'Account standing page',
    'Appeals',
    'Cases',
  ]),
  [BUG_REPORT_TYPE_BY_CATEGORY.General]: bugReportFields([
    'Home and navigation',
    'Search and discovery',
    'Dashboard',
    'Support pages and ticket form',
    'Theme and display',
  ]),
  [BUG_REPORT_TYPE_BY_CATEGORY.Forum]: bugReportFields(
    ['Forum feed', 'Groups', 'Discussions and comments', 'Saved discussions', 'Live updates'],
    [optionalText('post_link', 'Link to the post or group, if any')]
  ),
  [BUG_REPORT_TYPE_BY_CATEGORY.Marketplace]: bugReportFields(
    [
      'Browsing and search',
      'Asset page',
      'Purchase and checkout',
      'Downloads and licenses',
      'Listing editor and uploads',
      'Reviews and comments',
    ],
    [optionalText('listing', 'Asset, if any', { picker: 'asset' })]
  ),
  [BUG_REPORT_TYPE_BY_CATEGORY['Jobs and Gigs']]: bugReportFields(
    [
      'Browsing and search',
      'Posting a job or gig',
      'Proposals and orders',
      'Contracts and milestones',
      'Dashboard tasks and reviews',
      'Workspaces and team projects',
      'Disputes',
    ],
    [optionalText('listing', 'Job or gig, if any', { picker: 'posting' })]
  ),
});

function fieldIsVisible(field, source) {
  if (!field.when) return true;
  const current = source?.[field.when.key];
  const value = Array.isArray(current) ? current.join(', ') : String(current || '');
  if (field.when.equals) return value === field.when.equals;
  if (Array.isArray(field.when.oneOf)) return field.when.oneOf.includes(value);
  return true;
}

function fieldsForType(type) {
  return (TICKET_FORM_FIELDS[type] || []).map((field) => ({ ...field, options: field.options ? [...field.options] : undefined }));
}

function readAnswer(field, source) {
  const raw = source[field.key];
  if (field.kind === 'multiselect') {
    const parts = Array.isArray(raw)
      ? raw
      : String(raw || '').split(',');
    return parts.map((part) => String(part).trim()).filter(Boolean);
  }
  if (field.kind === 'checkbox') {
    return raw === true || raw === 'yes' || raw === 'Yes' ? 'yes' : '';
  }
  return raw == null ? '' : String(raw).trim();
}

/** A bad answer is the member's to fix, so it carries a 400. */
function answerError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function sanitizeTicketFormValues(type, input) {
  const definitions = TICKET_FORM_FIELDS[type] || [];
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const rows = [];

  for (const field of definitions) {
    if (!fieldIsVisible(field, source)) continue;
    const answer = readAnswer(field, source);
    const value = Array.isArray(answer) ? answer.join(', ') : answer;
    if (!value) {
      if (field.required) throw answerError(`${field.label} is required`);
      continue;
    }
    if (field.kind === 'select' && !field.options.includes(value)) {
      throw answerError(`${field.label} is not a valid choice`);
    }
    if (field.kind === 'multiselect') {
      const invalid = answer.find((part) => !field.options.includes(part));
      if (invalid) throw answerError(`${field.label} is not a valid choice`);
    }
    if (field.kind === 'checkbox' && field.required && value !== 'yes') {
      throw answerError(`${field.label} is required`);
    }
    if (field.key === 'card_last4' && !/^\d{4}$/.test(value)) {
      throw answerError('Enter only the last 4 digits of the card');
    }
    rows.push({
      key: field.key,
      label: field.label,
      value: value.slice(0, 2000),
    });
  }

  return rows;
}

module.exports = {
  LOGGED_OUT_TICKET_TYPES,
  TICKET_FORM_FIELDS,
  fieldsForType,
  fieldIsVisible,
  sanitizeTicketFormValues,
};
