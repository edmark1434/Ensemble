/**
 * Extra questions on the member ticket form.
 * One ticket_form_values row per answer. Shared subject, description,
 * and files stay on the ticket and its chat.
 */

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

const project = [text('project', 'Project', { picker: 'project' })];
const listing = [text('listing', 'Listing', { picker: 'listing' })];
const order = [text('order', 'Order', { picker: 'order' })];
const contract = [text('contract_or_order', 'Contract or order', { picker: 'contract' })];

const TICKET_FORM_FIELDS = Object.freeze({
  'Sign-in and password': [
    text('email_or_username', 'Email or username'),
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
    text('email_or_username', 'Email or username'),
    text('contact_email', 'A contact email you currently control'),
    multi('what_changed', 'What changed', ['Email', 'Password', 'Payout details', 'Posts or messages', 'Purchases']),
    text('when_noticed', 'When you noticed'),
    select('still_has_access', 'Do you still have access?', ['Yes', 'No']),
  ],
  'Identity verification': [
    optionalText('submission_date', 'Submission date'),
    optionalText('rejection_reason', 'Rejection reason shown, if any'),
  ],
  'Profile and settings': [
    select('which_setting', 'Which setting', ['Profile info', 'Photo', 'Banner', 'Email', 'Privacy', 'Other']),
    optionalText('error_message', 'Error message shown'),
  ],
  Teams: [
    text('team_name', 'Team name'),
    select('issue', 'Issue', ['Invite', 'Role', 'Removal', 'Suspended membership']),
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
  'Charges and receipts': [
    text('transaction_id', 'Transaction ID'),
    text('amount', 'Amount'),
    text('event_date', 'Date'),
    select('issue', 'Issue', ['Unrecognized', 'Charged twice', 'Wrong amount', 'Receipt missing or wrong']),
    optionalText('card_last4', 'Last 4 digits of the card'),
  ],
  'Editor problems': [
    ...project,
    select('issue', 'Issue', ['Crash', 'Freeze', 'Lag', 'Tool not working']),
    optionalText('tool', 'Which tool or feature'),
    area('steps', 'Steps to reproduce'),
  ],
  'Export and rendering': [
    ...project,
    text('export_settings', 'Export settings (resolution, format, fps)'),
    select('issue', 'Issue', ['Failed', 'Stuck', 'Wrong output']),
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
    select('issue', 'Issue', ['Missing', "Won't open", 'Lost content']),
    text('last_worked', 'When it last worked'),
  ],
  'Sharing and collaboration': [
    ...project,
    select('issue', 'Issue', ['Invite', 'Permission', 'Sync', 'Lost edits']),
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
    select('where_it_happened', 'Where it happened', ['DM', 'Call', 'Profile']),
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
  'Appeal an account penalty': [
    text('case_id', 'Case ID'),
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
    text('case_id', 'Case ID'),
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
    select('issue', 'Issue', ['Not received', 'Download fails']),
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
    text('listing_or_seller', 'Listing link or seller username'),
    select('reason', 'Reason', ['Scam', 'Misleading', 'Prohibited', 'Stolen asset']),
    area('evidence', 'Evidence', { required: false }),
  ],
  'Asset reviews': [
    text('review_link', 'Review link'),
    select('reason', 'Reason', ['Fake', 'Abusive', 'Unfair']),
    area('explanation', 'Explanation'),
  ],
  'Appeal a marketplace action': [
    text('case_id', 'Case ID'),
    area('explanation', 'Explanation'),
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
  'Delivery and disputes': [
    ...contract,
    select('role', 'Your role', ['Client', 'Freelancer']),
    select('issue', 'Issue', ['Not delivered', "Doesn't match", 'Disagreement']),
    area('agreed_versus_happened', 'What was agreed versus what happened'),
    area('evidence', 'Evidence'),
    select('desired_outcome', 'Desired outcome', ['Full refund', 'Partial refund', 'Revision', 'Release payment']),
  ],
  'Cancellations and refunds': [
    ...contract,
    select('request', 'Request', ['Cancel', 'Refund escrow', 'Both']),
    area('reason', 'Reason'),
    select('other_party_agreed', 'Has the other party agreed?', ['Yes', 'No', 'Not asked']),
  ],
  'Report a listing or user': [
    text('link_or_username', 'Link or username'),
    text('reason', 'Reason'),
    area('evidence', 'Evidence', { required: false }),
  ],
  'Gig reviews': [
    text('review_link', 'Review link'),
    text('reason', 'Reason'),
    area('explanation', 'Explanation'),
  ],
  'Appeal a jobs action': [
    text('case_id', 'Case ID'),
    area('explanation', 'Explanation'),
  ],
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

function sanitizeTicketFormValues(type, input) {
  const definitions = TICKET_FORM_FIELDS[type] || [];
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const rows = [];

  for (const field of definitions) {
    if (!fieldIsVisible(field, source)) continue;
    const answer = readAnswer(field, source);
    const value = Array.isArray(answer) ? answer.join(', ') : answer;
    if (!value) {
      if (field.required) throw new Error(`${field.label} is required`);
      continue;
    }
    if (field.kind === 'select' && !field.options.includes(value)) {
      throw new Error(`${field.label} is not a valid choice`);
    }
    if (field.kind === 'multiselect') {
      const invalid = answer.find((part) => !field.options.includes(part));
      if (invalid) throw new Error(`${field.label} is not a valid choice`);
    }
    if (field.kind === 'checkbox' && field.required && value !== 'yes') {
      throw new Error(`${field.label} is required`);
    }
    if (field.key === 'card_last4' && !/^\d{4}$/.test(value)) {
      throw new Error('Enter only the last 4 digits of the card');
    }
    rows.push({
      field_key: field.key,
      field_label: field.label,
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
