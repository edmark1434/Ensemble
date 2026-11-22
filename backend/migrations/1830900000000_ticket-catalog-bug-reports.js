/**
 * Ticket catalog review: a bug report type in every category, plus Business verification,
 * Team funds and distributions, and Workspaces and team projects. Widens `tickets_type_enum`
 * and seeds a reply guide for each new type.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */

/** Added by this migration, with the existing type each one falls back to on `down`. */
const ADDED_TYPES = Object.freeze({
  'Account bug report': 'Other',
  'Billing bug report': 'Other',
  'Video editor bug report': 'Editor problems',
  'Messaging bug report': 'Inbox, chat, and calls',
  'Safety tools bug report': 'Other',
  'Website bug report': 'Other',
  'Forum bug report': 'Posts and replies',
  'Marketplace bug report': 'Listing review',
  'Jobs and gigs bug report': 'Job and gig listings',
  'Business verification': 'Teams',
  'Team funds and distributions': 'Payouts and withdrawals',
  'Workspaces and team projects': 'Contracts, milestones, and orders',
});

/** The catalog before this migration (1822700000000_ticket-catalog-v2). */
const PREVIOUS_TYPES = [
  'Sign-in and password',
  'Account compromised',
  'Identity verification',
  'Profile and settings',
  'Teams',
  'Delete account or export data',
  'Subscriptions and plans',
  'Credits and balance',
  'Payouts and withdrawals',
  'Charges and receipts',
  'Editor problems',
  'Export and rendering',
  'Uploads and storage',
  'Project files',
  'Sharing and collaboration',
  'Inbox, chat, and calls',
  'Notifications and email',
  'Report a user',
  'Copyright claim',
  'Appeal an account penalty',
  'Other',
  'Posts and replies',
  'Forum groups',
  'Report a post or member',
  'Appeal a forum action',
  'Seller verification',
  'Listing review',
  'Asset purchase and download',
  'File is wrong or broken',
  'Marketplace refunds',
  'Report a listing or seller',
  'Asset reviews',
  'Appeal a marketplace action',
  'Job and gig listings',
  'Proposals and hiring',
  'Contracts, milestones, and orders',
  'Delivery and disputes',
  'Cancellations and refunds',
  'Report a listing or user',
  'Gig reviews',
  'Appeal a jobs action',
];

function sqlInList(values) {
  return values.map((value) => `'${String(value).replace(/'/g, "''")}'`).join(', ');
}

exports.up = async (pgm) => {
  const types = [...PREVIOUS_TYPES, ...Object.keys(ADDED_TYPES)];
  await pgm.db.query(`ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_type_enum`);
  await pgm.db.query(`
    ALTER TABLE tickets ADD CONSTRAINT tickets_type_enum
    CHECK (type IN (${sqlInList(types)}))
  `);

  const { CANNED_REPLIES } = require('../lib/TicketEnums');
  for (const reply of CANNED_REPLIES.filter((item) => ADDED_TYPES[item.type])) {
    await pgm.db.query(
      `INSERT INTO ticket_articles (ticket_type, title, body)
       SELECT $1::varchar(80), $2::varchar(160), $3::text
       WHERE NOT EXISTS (
         SELECT 1 FROM ticket_articles existing
         WHERE existing.ticket_type = $1::varchar(80)
           AND existing.title = $2::varchar(160)
           AND existing.deleted_at IS NULL
       )`,
      [reply.type, reply.title, reply.body]
    );
  }
};

exports.down = async (pgm) => {
  const added = Object.keys(ADDED_TYPES);
  const lines = Object.entries(ADDED_TYPES).map(
    ([from, to]) => `WHEN '${from.replace(/'/g, "''")}' THEN '${to.replace(/'/g, "''")}'`
  );
  await pgm.db.query(`ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_type_enum`);
  await pgm.db.query(`UPDATE tickets SET type = CASE type ${lines.join(' ')} ELSE type END WHERE type IN (${sqlInList(added)})`);
  await pgm.db.query(
    `UPDATE ticket_articles SET deleted_at = NOW() WHERE deleted_at IS NULL AND ticket_type IN (${sqlInList(added)})`
  );
  await pgm.db.query(`
    ALTER TABLE tickets ADD CONSTRAINT tickets_type_enum
    CHECK (type IN (${sqlInList(PREVIOUS_TYPES)}))
  `);
};
