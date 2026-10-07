const {
  TICKET_TYPES,
  TICKET_STATUSES,
  TICKET_PRIORITIES,
} = require('../lib/TicketEnums');

function sqlInList(values) {
  return values.map((value) => `'${String(value).replace(/'/g, "''")}'`).join(', ');
}

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = async (pgm) => {
  await pgm.db.query(`
    UPDATE tickets SET type = CASE lower(btrim(COALESCE(type, '')))
      WHEN 'account' THEN 'Account Access'
      WHEN 'account access' THEN 'Account Access'
      WHEN 'security' THEN 'Account Verification'
      WHEN 'account verification' THEN 'Account Verification'
      WHEN 'billing' THEN 'Billing and Payments'
      WHEN 'credit top-ups' THEN 'Credit Top-ups'
      WHEN 'credit topups' THEN 'Credit Top-ups'
      WHEN 'subscriptions and plans' THEN 'Subscriptions and Plans'
      WHEN 'withdrawing earnings' THEN 'Withdrawing Earnings'
      WHEN 'video editor' THEN 'Video Editor'
      WHEN 'forum' THEN 'Forums'
      WHEN 'forums' THEN 'Forums'
      WHEN 'community' THEN 'Forums'
      WHEN 'marketplace' THEN 'Asset Marketplace'
      WHEN 'asset marketplace' THEN 'Asset Marketplace'
      WHEN 'jobs' THEN 'Jobs and Gigs'
      WHEN 'gigs' THEN 'Jobs and Gigs'
      WHEN 'job' THEN 'Jobs and Gigs'
      WHEN 'gig' THEN 'Jobs and Gigs'
      WHEN 'jobs and gigs' THEN 'Jobs and Gigs'
      WHEN 'general' THEN 'Other'
      WHEN 'other' THEN 'Other'
      WHEN 'dispute' THEN 'Other'
      WHEN 'profile' THEN 'Profile and Settings'
      WHEN 'settings' THEN 'Profile and Settings'
      WHEN 'technical' THEN 'Technical Issue'
      WHEN 'bug' THEN 'Technical Issue'
      WHEN 'notifications' THEN 'Notifications and Email'
      ELSE type
    END
  `);

  await pgm.db.query(`
    UPDATE tickets SET status = CASE lower(replace(btrim(COALESCE(status, '')), '_', ' '))
      WHEN 'open' THEN 'Open'
      WHEN 'in progress' THEN 'In Progress'
      WHEN 'escalated' THEN 'In Progress'
      WHEN 'under review' THEN 'In Progress'
      WHEN 'in review' THEN 'In Progress'
      WHEN 'resolved' THEN 'Resolved'
      WHEN 'closed' THEN 'Closed'
      ELSE status
    END
  `);

  await pgm.db.query(`
    UPDATE tickets SET priority = CASE lower(btrim(COALESCE(priority, '')))
      WHEN 'low' THEN 'Low'
      WHEN 'medium' THEN 'Medium'
      WHEN 'high' THEN 'High'
      ELSE priority
    END
  `);

  await pgm.db.query(
    `UPDATE tickets SET type = 'Other' WHERE type IS NULL OR type NOT IN (${sqlInList(TICKET_TYPES)})`
  );
  await pgm.db.query(
    `UPDATE tickets SET status = 'Open' WHERE status IS NULL OR status NOT IN (${sqlInList(TICKET_STATUSES)})`
  );
  await pgm.db.query(
    `UPDATE tickets SET priority = 'Medium' WHERE priority IS NULL OR priority NOT IN (${sqlInList(TICKET_PRIORITIES)})`
  );

  pgm.addConstraint(
    'tickets',
    'tickets_type_enum',
    `CHECK (type IN (${sqlInList(TICKET_TYPES)}))`
  );
  pgm.addConstraint(
    'tickets',
    'tickets_status_enum',
    `CHECK (status IN (${sqlInList(TICKET_STATUSES)}))`
  );
  pgm.addConstraint(
    'tickets',
    'tickets_priority_enum',
    `CHECK (priority IN (${sqlInList(TICKET_PRIORITIES)}))`
  );

  await pgm.db.query(`
    DELETE FROM ticket_chats a
    USING ticket_chats b
    WHERE a.ctid < b.ctid
      AND a.ticket_id = b.ticket_id
      AND a.chat_id = b.chat_id
  `);

  pgm.dropConstraint('ticket_chats', 'ticket_chats_pkey', { ifExists: true });
  pgm.addConstraint('ticket_chats', 'ticket_chats_pkey', 'PRIMARY KEY (ticket_id, chat_id)');
  pgm.addConstraint('ticket_chats', 'ticket_chats_ticket_id_key', 'UNIQUE (ticket_id)');

  pgm.dropTable('ticket_priority_catalog', { ifExists: true });
  pgm.dropTable('ticket_status_catalog', { ifExists: true });
  pgm.dropTable('ticket_type_catalog', { ifExists: true });
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.dropConstraint('tickets', 'tickets_type_enum', { ifExists: true });
  pgm.dropConstraint('tickets', 'tickets_status_enum', { ifExists: true });
  pgm.dropConstraint('tickets', 'tickets_priority_enum', { ifExists: true });

  pgm.dropConstraint('ticket_chats', 'ticket_chats_ticket_id_key', { ifExists: true });
  pgm.dropConstraint('ticket_chats', 'ticket_chats_pkey', { ifExists: true });
  pgm.addConstraint('ticket_chats', 'ticket_chats_pkey', 'PRIMARY KEY (ticket_id)');

  pgm.createTable('ticket_type_catalog', {
    type_label: { type: 'varchar(80)', primaryKey: true },
    queue_role: { type: 'varchar(80)', notNull: true },
    sort_order: { type: 'integer', notNull: true, default: 0 },
    is_active: { type: 'boolean', notNull: true, default: true },
    description: { type: 'text' },
  });
  pgm.createTable('ticket_status_catalog', {
    status_label: { type: 'varchar(40)', primaryKey: true },
    sort_order: { type: 'integer', notNull: true, default: 0 },
    is_closed: { type: 'boolean', notNull: true, default: false },
    is_active: { type: 'boolean', notNull: true, default: true },
  });
  pgm.createTable('ticket_priority_catalog', {
    priority_label: { type: 'varchar(20)', primaryKey: true },
    sort_order: { type: 'integer', notNull: true, default: 0 },
    is_active: { type: 'boolean', notNull: true, default: true },
  });

  pgm.sql(`
    INSERT INTO ticket_type_catalog (type_label, queue_role, sort_order, description) VALUES
      ('Account Access', 'Support Moderator', 10, 'Login, password reset, locked accounts'),
      ('Account Verification', 'Support Moderator', 20, 'Identity / KYC verification'),
      ('Profile and Settings', 'Support Moderator', 25, 'Profile, privacy, and account settings'),
      ('Subscriptions and Plans', 'Support Moderator', 30, 'Plan changes, renewals, cancellations'),
      ('Credit Top-ups', 'Support Moderator', 40, 'Purchasing or missing credits'),
      ('Withdrawing Earnings', 'Support Moderator', 50, 'Payouts and withdrawal issues'),
      ('Billing and Payments', 'Support Moderator', 55, 'Payment methods, invoices, charges'),
      ('Video Editor', 'Support Moderator', 60, 'Editor tool bugs and access'),
      ('Notifications and Email', 'Support Moderator', 65, 'Email, push, and in-app alerts'),
      ('Technical Issue', 'Support Moderator', 68, 'Site bugs and performance issues'),
      ('Other', 'Support Moderator', 70, 'General support not covered elsewhere'),
      ('Forums', 'Forum Moderator', 80, 'General forum help'),
      ('Forum Posts', 'Forum Moderator', 81, 'Discussion posts and threads'),
      ('Forum Groups', 'Forum Moderator', 82, 'Groups, membership, ownership'),
      ('Forum Comments', 'Forum Moderator', 83, 'Comments and replies'),
      ('Forum Reports', 'Forum Moderator', 84, 'User reports in forums'),
      ('Asset Marketplace', 'Marketplace Moderator', 90, 'General marketplace issues'),
      ('Listing Issues', 'Marketplace Moderator', 91, 'Listing create, edit, rejection'),
      ('Purchase and Delivery', 'Marketplace Moderator', 92, 'Purchases, downloads, delivery'),
      ('Seller Verification', 'Marketplace Moderator', 93, 'Seller onboarding and verification'),
      ('Marketplace Refunds', 'Marketplace Moderator', 94, 'Refunds and chargebacks'),
      ('Asset Quality', 'Marketplace Moderator', 95, 'Broken or misrepresented assets'),
      ('Jobs and Gigs', 'Jobs N Gigs Moderator', 100, 'General jobs and gigs help'),
      ('Job Posts', 'Jobs N Gigs Moderator', 101, 'Job listings and hiring posts'),
      ('Gig Posts', 'Jobs N Gigs Moderator', 102, 'Gig packages and offers'),
      ('Applications and Hiring', 'Jobs N Gigs Moderator', 103, 'Applications, proposals, hiring'),
      ('Contracts and Milestones', 'Jobs N Gigs Moderator', 104, 'Contracts, milestones, delivery')
  `);
  pgm.sql(`
    INSERT INTO ticket_status_catalog (status_label, sort_order, is_closed) VALUES
      ('Open', 10, FALSE),
      ('In Progress', 20, FALSE),
      ('Resolved', 30, TRUE),
      ('Closed', 40, TRUE)
  `);
  pgm.sql(`
    INSERT INTO ticket_priority_catalog (priority_label, sort_order) VALUES
      ('Low', 10),
      ('Medium', 20),
      ('High', 30)
  `);
};
