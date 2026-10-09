/**
 * Staff ticket catalog: support subgroups, specialist types, dev escalation, reply guides.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
const {
  TICKET_TYPES,
  TICKET_STATUSES,
  CANNED_REPLIES,
  STORED_TYPE_REMAP,
} = require('../lib/TicketEnums');

function sqlInList(values) {
  return values.map((value) => `'${String(value).replace(/'/g, "''")}'`).join(', ');
}

function remapCase(column) {
  const lines = Object.entries(STORED_TYPE_REMAP).map(
    ([from, to]) => `WHEN '${from.replace(/'/g, "''")}' THEN '${to.replace(/'/g, "''")}'`
  );
  return `CASE ${column} ${lines.join(' ')} ELSE ${column} END`;
}

const PREVIOUS_TYPES = [
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
  'Forums',
  'Forum Posts',
  'Forum Groups',
  'Forum Comments',
  'Forum Reports',
  'Asset Marketplace',
  'Listing Issues',
  'Purchase and Delivery',
  'Seller Verification',
  'Marketplace Refunds',
  'Asset Quality',
  'Jobs and Gigs',
  'Job Posts',
  'Gig Posts',
  'Applications and Hiring',
  'Contracts and Milestones',
];

const PREVIOUS_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

exports.up = async (pgm) => {
  await pgm.db.query(`ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_type_enum`);
  await pgm.db.query(`ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_enum`);

  await pgm.db.query(`UPDATE tickets SET type = ${remapCase('type')}`);
  await pgm.db.query(
    `UPDATE tickets SET type = 'Other' WHERE type IS NULL OR type NOT IN (${sqlInList(TICKET_TYPES)})`
  );
  await pgm.db.query(`UPDATE ticket_articles SET ticket_type = ${remapCase('ticket_type')} WHERE deleted_at IS NULL`);

  await pgm.db.query(`
    ALTER TABLE tickets ADD CONSTRAINT tickets_type_enum
    CHECK (type IN (${sqlInList(TICKET_TYPES)}))
  `);
  await pgm.db.query(`
    ALTER TABLE tickets ADD CONSTRAINT tickets_status_enum
    CHECK (status IN (${sqlInList(TICKET_STATUSES)}))
  `);

  for (const reply of CANNED_REPLIES) {
    await pgm.db.query(
      `INSERT INTO ticket_articles (ticket_type, title, body)
       SELECT $1, $2, $3
       WHERE NOT EXISTS (
         SELECT 1 FROM ticket_articles existing
         WHERE existing.ticket_type = $1
           AND existing.title = $2
           AND existing.deleted_at IS NULL
       )`,
      [reply.type, reply.title, reply.body]
    );
  }
};

exports.down = async (pgm) => {
  const reverse = {};
  for (const [from, to] of Object.entries(STORED_TYPE_REMAP)) {
    if (!reverse[to]) reverse[to] = from;
  }
  const lines = Object.entries(reverse).map(
    ([from, to]) => `WHEN '${from.replace(/'/g, "''")}' THEN '${to.replace(/'/g, "''")}'`
  );
  await pgm.db.query(`ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_type_enum`);
  await pgm.db.query(`ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_enum`);
  await pgm.db.query(`UPDATE tickets SET status = 'In Progress' WHERE status = 'Escalated to Dev'`);
  await pgm.db.query(`UPDATE tickets SET type = CASE type ${lines.join(' ')} ELSE type END`);
  await pgm.db.query(
    `UPDATE tickets SET type = 'Other' WHERE type IS NULL OR type NOT IN (${sqlInList(PREVIOUS_TYPES)})`
  );
  await pgm.db.query(`
    ALTER TABLE tickets ADD CONSTRAINT tickets_type_enum
    CHECK (type IN (${sqlInList(PREVIOUS_TYPES)}))
  `);
  await pgm.db.query(`
    ALTER TABLE tickets ADD CONSTRAINT tickets_status_enum
    CHECK (status IN (${sqlInList(PREVIOUS_STATUSES)}))
  `);
};
