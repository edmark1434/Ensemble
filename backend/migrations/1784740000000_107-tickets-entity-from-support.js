/**
 * Move portal tickets onto the canonical `tickets` entity.
 * Fold desk fields from support_tickets, retarget ticket_chats → tickets,
 * drop support_tickets. Enums remain strings (validated in backend).
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  // Enrich tickets with desk columns folded from support_tickets.
  pgm.addColumns('tickets', {
    ticket_number: { type: 'varchar(20)', unique: true },
    priority: { type: 'varchar(20)', notNull: true, default: 'Medium' },
    channel: { type: 'varchar(50)', notNull: true, default: 'web' },
    related_report_id: { type: 'uuid' },
    related_dispute_id: { type: 'uuid' },
    message_count: { type: 'integer', notNull: true, default: 0 },
    last_message_at: { type: 'timestamptz' },
  });

  pgm.sql(`
    ALTER TABLE tickets
      ALTER COLUMN reason TYPE varchar(255)
  `);

  pgm.createIndex('tickets', 'type', { name: 'idx_tickets_type' });
  pgm.createIndex('tickets', 'status', { name: 'idx_tickets_status' });
  pgm.createIndex('tickets', 'priority', { name: 'idx_tickets_priority' });

  pgm.sql(`
    ALTER TABLE tickets
      ADD CONSTRAINT tickets_related_report_id_fkey
      FOREIGN KEY (related_report_id) REFERENCES reports(report_id)
  `);
  pgm.sql(`
    ALTER TABLE tickets
      ADD CONSTRAINT tickets_related_dispute_id_fkey
      FOREIGN KEY (related_dispute_id) REFERENCES disputes(dispute_id)
  `);

  // Clear chats that pointed at support_tickets ids (FK will move back to tickets).
  pgm.sql(`
    ALTER TABLE ticket_chats
      DROP CONSTRAINT IF EXISTS ticket_chats_ticket_id_fkey
  `);
  pgm.sql(`DELETE FROM ticket_chats`);

  // Migrate support_tickets → tickets (same ticket_id so future links stay stable).
  pgm.sql(`
    INSERT INTO tickets (
      ticket_id,
      ticket_number,
      type,
      reason,
      status,
      priority,
      channel,
      account_id,
      handled_by_staff_id,
      escalated_by_staff_id,
      related_report_id,
      related_dispute_id,
      message_count,
      last_message_at,
      created_at,
      updated_at,
      resolved_at,
      deleted_at
    )
    SELECT
      st.ticket_id,
      st.ticket_number,
      CASE LOWER(TRIM(st.category))
        WHEN 'billing' THEN 'Credit Top-ups'
        WHEN 'account' THEN 'Account Access'
        WHEN 'security' THEN 'Account Verification'
        WHEN 'community' THEN 'Forums'
        WHEN 'forum' THEN 'Forums'
        WHEN 'marketplace' THEN 'Asset Marketplace'
        WHEN 'jobs' THEN 'Jobs and Gigs'
        WHEN 'gigs' THEN 'Jobs and Gigs'
        WHEN 'job' THEN 'Jobs and Gigs'
        WHEN 'gig' THEN 'Jobs and Gigs'
        WHEN 'dispute' THEN 'Other'
        WHEN 'general' THEN 'Other'
        ELSE 'Other'
      END,
      LEFT(COALESCE(NULLIF(TRIM(st.subject), ''), 'Support ticket'), 255),
      CASE LOWER(TRIM(st.status))
        WHEN 'open' THEN 'Open'
        WHEN 'in_progress' THEN 'In Progress'
        WHEN 'resolved' THEN 'Resolved'
        WHEN 'closed' THEN 'Closed'
        WHEN 'escalated' THEN 'In Progress'
        ELSE 'Open'
      END,
      CASE LOWER(TRIM(st.priority))
        WHEN 'low' THEN 'Low'
        WHEN 'high' THEN 'High'
        ELSE 'Medium'
      END,
      COALESCE(NULLIF(TRIM(st.channel), ''), 'web'),
      st.requester_account_id,
      st.assigned_staff_id,
      NULL,
      st.related_report_id,
      st.related_dispute_id,
      COALESCE(st.message_count, 0),
      st.last_message_at,
      COALESCE(st.created_at, NOW()),
      COALESCE(st.updated_at, NOW()),
      st.closed_at,
      NULL
    FROM support_tickets st
    WHERE st.requester_account_id IS NOT NULL
    ON CONFLICT (ticket_id) DO UPDATE SET
      ticket_number = EXCLUDED.ticket_number,
      type = EXCLUDED.type,
      reason = EXCLUDED.reason,
      status = EXCLUDED.status,
      priority = EXCLUDED.priority,
      channel = EXCLUDED.channel,
      account_id = EXCLUDED.account_id,
      handled_by_staff_id = EXCLUDED.handled_by_staff_id,
      related_report_id = EXCLUDED.related_report_id,
      related_dispute_id = EXCLUDED.related_dispute_id,
      message_count = EXCLUDED.message_count,
      last_message_at = EXCLUDED.last_message_at,
      updated_at = EXCLUDED.updated_at,
      resolved_at = EXCLUDED.resolved_at
  `);

  // Normalize any pre-existing lean tickets rows.
  pgm.sql(`
    UPDATE tickets SET
      status = CASE LOWER(TRIM(status))
        WHEN 'open' THEN 'Open'
        WHEN 'in_progress' THEN 'In Progress'
        WHEN 'in progress' THEN 'In Progress'
        WHEN 'resolved' THEN 'Resolved'
        WHEN 'closed' THEN 'Closed'
        ELSE status
      END,
      priority = CASE
        WHEN priority IS NULL OR BTRIM(priority) = '' THEN 'Medium'
        WHEN LOWER(TRIM(priority)) = 'low' THEN 'Low'
        WHEN LOWER(TRIM(priority)) = 'high' THEN 'High'
        WHEN LOWER(TRIM(priority)) = 'medium' THEN 'Medium'
        ELSE priority
      END,
      ticket_number = COALESCE(
        ticket_number,
        'TKT-' || LPAD((FLOOR(EXTRACT(EPOCH FROM created_at))::bigint % 100000)::text, 5, '0')
      )
  `);

  pgm.sql(`
    ALTER TABLE tickets
      ALTER COLUMN ticket_number SET NOT NULL
  `);

  pgm.addConstraint(
    'ticket_chats',
    'ticket_chats_ticket_id_fkey',
    'FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE'
  );

  // Drop support_tickets (portal table retired).
  pgm.sql(`
    ALTER TABLE support_tickets
      DROP CONSTRAINT IF EXISTS support_tickets_related_report_id_fkey
  `);
  pgm.sql(`
    ALTER TABLE support_tickets
      DROP CONSTRAINT IF EXISTS support_tickets_related_dispute_id_fkey
  `);
  pgm.sql(`
    ALTER TABLE support_tickets
      DROP CONSTRAINT IF EXISTS support_tickets_requester_account_id_fkey
  `);
  pgm.sql(`
    ALTER TABLE support_tickets
      DROP CONSTRAINT IF EXISTS support_tickets_assigned_staff_id_fkey
  `);
  pgm.dropTable('support_tickets', { ifExists: true, cascade: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
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
    message_count: { type: 'integer', notNull: true, default: 0 },
    last_message_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', default: pgm.func('NOW()') },
    closed_at: { type: 'timestamptz' },
  });

  pgm.sql(`
    INSERT INTO support_tickets (
      ticket_id, ticket_number, subject, category, priority, status, channel,
      requester_account_id, assigned_staff_id, related_report_id, related_dispute_id,
      message_count, last_message_at, created_at, updated_at, closed_at
    )
    SELECT
      ticket_id,
      ticket_number,
      reason,
      CASE type
        WHEN 'Asset Marketplace' THEN 'marketplace'
        WHEN 'Forums' THEN 'community'
        WHEN 'Jobs and Gigs' THEN 'jobs'
        WHEN 'Credit Top-ups' THEN 'billing'
        WHEN 'Account Access' THEN 'account'
        WHEN 'Account Verification' THEN 'security'
        ELSE 'general'
      END,
      LOWER(priority),
      CASE status
        WHEN 'Open' THEN 'open'
        WHEN 'In Progress' THEN 'in_progress'
        WHEN 'Resolved' THEN 'resolved'
        WHEN 'Closed' THEN 'closed'
        ELSE 'open'
      END,
      channel,
      account_id,
      handled_by_staff_id,
      related_report_id,
      related_dispute_id,
      message_count,
      last_message_at,
      created_at,
      updated_at,
      resolved_at
    FROM tickets
    WHERE ticket_number IS NOT NULL
  `);

  pgm.sql(`
    ALTER TABLE ticket_chats DROP CONSTRAINT IF EXISTS ticket_chats_ticket_id_fkey
  `);
  pgm.sql(`DELETE FROM ticket_chats`);
  pgm.addConstraint(
    'ticket_chats',
    'ticket_chats_ticket_id_fkey',
    'FOREIGN KEY (ticket_id) REFERENCES support_tickets(ticket_id) ON DELETE CASCADE'
  );

  pgm.sql(`ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_related_report_id_fkey`);
  pgm.sql(`ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_related_dispute_id_fkey`);
  pgm.dropIndex('tickets', 'type', { name: 'idx_tickets_type', ifExists: true });
  pgm.dropIndex('tickets', 'status', { name: 'idx_tickets_status', ifExists: true });
  pgm.dropIndex('tickets', 'priority', { name: 'idx_tickets_priority', ifExists: true });
  pgm.dropColumns(
    'tickets',
    [
      'ticket_number',
      'priority',
      'channel',
      'related_report_id',
      'related_dispute_id',
      'message_count',
      'last_message_at',
    ],
    { ifExists: true }
  );
};
