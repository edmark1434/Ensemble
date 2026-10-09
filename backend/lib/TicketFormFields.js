/**
 * Extra questions asked on the member ticket form.
 * One stored row per answer in ticket_form_values.
 */

function text(key, label, extra = {}) {
  return { key, label, kind: 'text', required: true, ...extra };
}

function select(key, label, options, extra = {}) {
  return { key, label, kind: 'select', required: true, options, ...extra };
}

const listingName = [text('listing_name', 'Listing name')];
const listingAndDate = [
  text('listing_name', 'Listing name'),
  text('date_paid', 'Date you paid'),
];
const jobTitle = [text('job_title', 'Job or gig title')];

const TICKET_FORM_FIELDS = Object.freeze({
  'Sign-in and password': [
    text('email_tried', 'Email you tried'),
    select('sign_in_method', 'How you tried to sign in', ['Password', 'Google']),
    select('what_failed', 'What failed', ['Cannot sign in', 'Reset failed', 'Signed out']),
  ],
  'Account compromised': [
    select('can_still_sign_in', 'Can you still sign in?', ['Yes', 'No']),
    select('what_changed', 'What changed', ['Password', 'Email', 'Two-factor', 'Not sure']),
    text('last_sign_in', 'When you last signed in yourself'),
  ],
  'Identity verification': [
    select('verification_status', 'What the verification page shows', ['Pending', 'Rejected', 'Unclear']),
  ],
  'Profile and settings': [
    select('which_part', 'Which part', ['Profile', 'Photo', 'Banner', 'Email', 'Other settings']),
  ],
  Teams: [
    text('team_name', 'Team name'),
    select('what_broke', 'What broke', ['Invite', 'Role', 'Removal', 'Suspended membership']),
  ],
  'Delete account or export data': [
    select('request_kind', 'What do you need?', ['Delete the account', 'Send a copy of my data']),
  ],
  'Subscriptions and plans': [
    text('plan_name', 'Plan name'),
    select('what_tried', 'What you tried', ['Renew', 'Upgrade', 'Downgrade', 'Cancel']),
  ],
  'Credits and balance': [
    text('amount', 'Approximate amount'),
    text('when_happened', 'When it happened'),
  ],
  'Payouts and withdrawals': [
    text('amount', 'Amount'),
    text('date_requested', 'Date you requested it'),
  ],
  'Charges and receipts': [
    text('amount', 'Amount'),
    text('charge_date', 'Date of the charge'),
    text('card_last4', 'Last four digits of the card', { required: false }),
  ],
  'Editor problems': [
    text('project_name', 'Project name'),
    text('browser', 'Browser'),
  ],
  'Export and rendering': [
    text('project_name', 'Project name'),
    text('export_format', 'Export format'),
  ],
  'Uploads and storage': [text('project_or_file', 'Project name or file name')],
  'Project files': [text('project_name', 'Project name')],
  'Sharing and collaboration': [
    text('project_name', 'Project name'),
    text('other_person', "Other person's name"),
  ],
  'Inbox, chat, and calls': [
    text('other_person', "Other person's name"),
    select('message_or_call', 'Message or call', ['Message', 'Call']),
  ],
  'Notifications and email': [
    select('channel', 'Where it should have arrived', ['In-app', 'Email']),
    select('what_happened', 'What happened', ['Missing', 'Duplicated', 'Sent to the wrong place']),
  ],
  'Report a user': [text('username', "Other person's username")],
  'Copyright claim': [
    text('where_it_appears', 'Where the work appears'),
    select('your_role', 'Your role', ['I own it', 'I received a notice']),
  ],
  'Appeal an account penalty': [
    select('penalty', 'Which penalty', ['Warning', 'Suspension', 'Ban', 'Payout hold']),
  ],
  'Posts and replies': [text('forum_link', 'Forum link')],
  'Forum groups': [text('group_name', 'Group name')],
  'Report a post or member': [text('link_or_username', 'Link or username')],
  'Appeal a forum action': [text('what_was_restricted', 'What was removed or restricted')],
  'Seller verification': [
    select('seller_check', 'What the seller check shows', ['Pending', 'Rejected', 'Unclear']),
  ],
  'Listing review': listingName,
  'Asset purchase and download': listingAndDate,
  'File is wrong or broken': listingAndDate,
  'Marketplace refunds': listingAndDate,
  'Report a listing or seller': [text('listing_or_seller', "Listing name or seller's username")],
  'Asset reviews': listingName,
  'Appeal a marketplace action': listingName,
  'Job and gig listings': jobTitle,
  'Proposals and hiring': jobTitle,
  'Contracts, milestones, and orders': [
    text('contract_name', 'Contract or order name'),
    text('milestone', 'Which milestone'),
  ],
  'Delivery and disputes': [text('contract_name', 'Contract or order name')],
  'Cancellations and refunds': [text('contract_name', 'Contract or order name')],
  'Report a listing or user': [text('title_or_username', "Listing title or the other person's username")],
  'Gig reviews': jobTitle,
  'Appeal a jobs action': jobTitle,
});

function fieldsForType(type) {
  return (TICKET_FORM_FIELDS[type] || []).map((field) => ({ ...field }));
}

function sanitizeTicketFormValues(type, input) {
  const definitions = TICKET_FORM_FIELDS[type] || [];
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const rows = [];

  for (const field of definitions) {
    const raw = source[field.key];
    const value = raw == null ? '' : String(raw).trim().slice(0, 500);
    if (!value) {
      if (field.required) throw new Error(`${field.label} is required`);
      continue;
    }
    if (field.kind === 'select' && !field.options.includes(value)) {
      throw new Error(`${field.label} is not a valid choice`);
    }
    rows.push({ field_key: field.key, field_label: field.label, value });
  }

  return rows;
}

module.exports = {
  TICKET_FORM_FIELDS,
  fieldsForType,
  sanitizeTicketFormValues,
};
