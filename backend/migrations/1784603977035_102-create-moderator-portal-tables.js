/**
 * Moderator / admin portal tables used by seed + staff dashboards.
 * Uses UUID FKs to match the existing accounts/staff schema.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  // User-submitted reports (portal)
  pgm.createTable('user_reports', {
    report_id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    report_number: { type: 'varchar(20)', notNull: true, unique: true },
    reporter_account_id: { type: 'uuid' },
    target_type: { type: 'varchar(50)', notNull: true },
    target_id: { type: 'varchar(100)' },
    target_label: { type: 'varchar(255)' },
    reason: { type: 'varchar(100)', notNull: true },
    description: { type: 'text' },
    status: { type: 'varchar(50)', notNull: true, default: 'open' },
    priority: { type: 'varchar(20)', notNull: true, default: 'medium' },
    assigned_staff_id: { type: 'uuid' },
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', default: pgm.func('NOW()') },
    resolved_at: { type: 'timestamptz' },
  });

  pgm.addConstraint(
    'user_reports',
    'user_reports_reporter_account_id_fkey',
    'FOREIGN KEY (reporter_account_id) REFERENCES accounts(account_id)'
  );
  pgm.addConstraint(
    'user_reports',
    'user_reports_assigned_staff_id_fkey',
    'FOREIGN KEY (assigned_staff_id) REFERENCES staff(staff_id)'
  );

  // Support tickets (portal) — separate from legacy "tickets" table
  pgm.createTable('support_tickets', {
    ticket_id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    ticket_number: { type: 'varchar(20)', notNull: true, unique: true },
    subject: { type: 'varchar(255)', notNull: true },
    category: { type: 'varchar(50)', notNull: true },
    priority: { type: 'varchar(20)', notNull: true, default: 'medium' },
    status: { type: 'varchar(50)', notNull: true, default: 'open' },
    channel: { type: 'varchar(50)', notNull: true, default: 'web' },
    requester_account_id: { type: 'uuid' },
    assigned_staff_id: { type: 'uuid' },
    assigned_role: { type: 'varchar(50)' },
    related_report_id: { type: 'uuid' },
    related_dispute_id: { type: 'uuid' },
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', default: pgm.func('NOW()') },
    closed_at: { type: 'timestamptz' },
  });

  pgm.addConstraint(
    'support_tickets',
    'support_tickets_requester_account_id_fkey',
    'FOREIGN KEY (requester_account_id) REFERENCES accounts(account_id)'
  );
  pgm.addConstraint(
    'support_tickets',
    'support_tickets_assigned_staff_id_fkey',
    'FOREIGN KEY (assigned_staff_id) REFERENCES staff(staff_id)'
  );
  pgm.addConstraint(
    'support_tickets',
    'support_tickets_related_report_id_fkey',
    'FOREIGN KEY (related_report_id) REFERENCES user_reports(report_id)'
  );

  // Ticket conversation thread
  pgm.createTable('ticket_messages', {
    message_id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    ticket_id: { type: 'uuid', notNull: true },
    author_account_id: { type: 'uuid' },
    author_type: { type: 'varchar(20)', notNull: true, default: 'user' },
    author_name: { type: 'varchar(100)' },
    body: { type: 'text', notNull: true },
    is_internal: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'ticket_messages',
    'ticket_messages_ticket_id_fkey',
    'FOREIGN KEY (ticket_id) REFERENCES support_tickets(ticket_id) ON DELETE CASCADE'
  );
  pgm.addConstraint(
    'ticket_messages',
    'ticket_messages_author_account_id_fkey',
    'FOREIGN KEY (author_account_id) REFERENCES accounts(account_id)'
  );

  // Marketplace listing queue
  pgm.createTable('marketplace_listings', {
    listing_id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    listing_number: { type: 'varchar(20)', notNull: true, unique: true },
    submitted_by_account_id: { type: 'uuid' },
    title: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    category: { type: 'varchar(50)' },
    price_credits: { type: 'integer', notNull: true, default: 0 },
    thumbnail_url: { type: 'text' },
    status: { type: 'varchar(50)', notNull: true, default: 'pending' },
    rejection_reason: { type: 'text' },
    reviewed_by_staff_id: { type: 'uuid' },
    reviewed_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'marketplace_listings',
    'marketplace_listings_submitted_by_account_id_fkey',
    'FOREIGN KEY (submitted_by_account_id) REFERENCES accounts(account_id)'
  );
  pgm.addConstraint(
    'marketplace_listings',
    'marketplace_listings_reviewed_by_staff_id_fkey',
    'FOREIGN KEY (reviewed_by_staff_id) REFERENCES staff(staff_id)'
  );

  // Extend existing disputes so portal seed/repos can use them
  pgm.sql(`ALTER TABLE disputes ALTER COLUMN reason TYPE text`);
  pgm.addColumns('disputes', {
    dispute_number: { type: 'varchar(20)', unique: true },
    title: { type: 'varchar(255)' },
    priority: { type: 'varchar(20)', default: 'high' },
    initiator_account_id: { type: 'uuid' },
    respondent_account_id: { type: 'uuid' },
    related_entity_type: { type: 'varchar(50)' },
    related_entity_id: { type: 'varchar(100)' },
    assigned_staff_id: { type: 'uuid' },
    credit_amount_involved: { type: 'integer', default: 0 },
    opened_at: { type: 'timestamptz', default: pgm.func('NOW()') },
    resolution_notes: { type: 'text' },
  });

  // Extend existing violations for portal seed/repos
  pgm.addColumns('violations', {
    violation_number: { type: 'varchar(20)', unique: true },
    account_id: { type: 'uuid' },
    title: { type: 'varchar(255)' },
    reason: { type: 'text' },
    points: { type: 'integer', default: 0 },
    issued_by_staff_id: { type: 'uuid' },
  });

  pgm.createIndex('user_reports', 'status', { name: 'idx_user_reports_status' });
  pgm.createIndex('support_tickets', 'status', { name: 'idx_support_tickets_status' });
  pgm.createIndex('support_tickets', 'assigned_staff_id', { name: 'idx_support_tickets_assigned' });
  pgm.createIndex('marketplace_listings', 'status', { name: 'idx_marketplace_listings_status' });
  pgm.createIndex('ticket_messages', 'ticket_id', { name: 'idx_ticket_messages_ticket' });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropIndex('ticket_messages', 'ticket_id', { name: 'idx_ticket_messages_ticket', ifExists: true });
  pgm.dropIndex('marketplace_listings', 'status', { name: 'idx_marketplace_listings_status', ifExists: true });
  pgm.dropIndex('support_tickets', 'assigned_staff_id', { name: 'idx_support_tickets_assigned', ifExists: true });
  pgm.dropIndex('support_tickets', 'status', { name: 'idx_support_tickets_status', ifExists: true });
  pgm.dropIndex('user_reports', 'status', { name: 'idx_user_reports_status', ifExists: true });

  pgm.dropColumns('violations', [
    'violation_number',
    'account_id',
    'title',
    'reason',
    'points',
    'issued_by_staff_id',
  ], { ifExists: true });

  pgm.dropColumns('disputes', [
    'dispute_number',
    'title',
    'priority',
    'initiator_account_id',
    'respondent_account_id',
    'related_entity_type',
    'related_entity_id',
    'assigned_staff_id',
    'credit_amount_involved',
    'opened_at',
    'resolution_notes',
  ], { ifExists: true });

  pgm.dropTable('marketplace_listings', { ifExists: true });
  pgm.dropTable('ticket_messages', { ifExists: true });
  pgm.dropTable('support_tickets', { ifExists: true });
  pgm.dropTable('user_reports', { ifExists: true });
};
