/**
 * Canonical ticket type / status / priority catalogs + escalate queue → type map.
 * Seeds all Ensemble ticket enums and remaps legacy ticket.type values.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable(
    'ticket_type_catalog',
    {
      type_label: { type: 'varchar(80)', primaryKey: true },
      queue_role: { type: 'varchar(80)', notNull: true },
      sort_order: { type: 'integer', notNull: true, default: 0 },
      is_active: { type: 'boolean', notNull: true, default: true },
      description: { type: 'text' },
    },
    { ifNotExists: true }
  );

  pgm.createTable(
    'ticket_status_catalog',
    {
      status_label: { type: 'varchar(40)', primaryKey: true },
      sort_order: { type: 'integer', notNull: true, default: 0 },
      is_closed: { type: 'boolean', notNull: true, default: false },
      is_active: { type: 'boolean', notNull: true, default: true },
    },
    { ifNotExists: true }
  );

  pgm.createTable(
    'ticket_priority_catalog',
    {
      priority_label: { type: 'varchar(20)', primaryKey: true },
      sort_order: { type: 'integer', notNull: true, default: 0 },
      is_active: { type: 'boolean', notNull: true, default: true },
    },
    { ifNotExists: true }
  );

  // Support queue types
  pgm.sql(`
    INSERT INTO ticket_type_catalog (type_label, queue_role, sort_order, description) VALUES
      ('Account Access', 'Support Moderator', 10, 'Login, password reset, locked accounts'),
      ('Account Verification', 'Support Moderator', 20, 'Identity / KYC verification'),
      ('Subscriptions and Plans', 'Support Moderator', 30, 'Plan changes, billing cycles, renewals'),
      ('Credit Top-ups', 'Support Moderator', 40, 'Purchasing or missing credits'),
      ('Withdrawing Earnings', 'Support Moderator', 50, 'Payouts and withdrawal issues'),
      ('Video Editor', 'Support Moderator', 60, 'Editor tool bugs and access'),
      ('Other', 'Support Moderator', 70, 'General support not covered elsewhere'),
      ('Forums', 'Forum Moderator', 80, 'Forum posts, groups, moderation'),
      ('Asset Marketplace', 'Marketplace Moderator', 90, 'Listings, purchases, marketplace disputes'),
      ('Jobs and Gigs', 'Jobs N Gigs Moderator', 100, 'Job posts, gigs, hiring issues')
    ON CONFLICT (type_label) DO UPDATE SET
      queue_role = EXCLUDED.queue_role,
      sort_order = EXCLUDED.sort_order,
      description = EXCLUDED.description,
      is_active = TRUE
  `);

  pgm.sql(`
    INSERT INTO ticket_status_catalog (status_label, sort_order, is_closed) VALUES
      ('Open', 10, FALSE),
      ('In Progress', 20, FALSE),
      ('Resolved', 30, TRUE),
      ('Closed', 40, TRUE)
    ON CONFLICT (status_label) DO UPDATE SET
      sort_order = EXCLUDED.sort_order,
      is_closed = EXCLUDED.is_closed,
      is_active = TRUE
  `);

  pgm.sql(`
    INSERT INTO ticket_priority_catalog (priority_label, sort_order) VALUES
      ('Low', 10),
      ('Medium', 20),
      ('High', 30)
    ON CONFLICT (priority_label) DO UPDATE SET
      sort_order = EXCLUDED.sort_order,
      is_active = TRUE
  `);

  // Normalize existing ticket rows onto catalog labels
  pgm.sql(`
    UPDATE tickets SET type = CASE lower(btrim(COALESCE(type, '')))
      WHEN 'account' THEN 'Account Access'
      WHEN 'account access' THEN 'Account Access'
      WHEN 'security' THEN 'Account Verification'
      WHEN 'account verification' THEN 'Account Verification'
      WHEN 'billing' THEN 'Credit Top-ups'
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
      ELSE type
    END
    WHERE deleted_at IS NULL
  `);

  pgm.sql(`
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
    WHERE deleted_at IS NULL
  `);

  pgm.sql(`
    UPDATE tickets SET priority = CASE lower(btrim(COALESCE(priority, '')))
      WHEN 'low' THEN 'Low'
      WHEN 'medium' THEN 'Medium'
      WHEN 'high' THEN 'High'
      ELSE priority
    END
    WHERE deleted_at IS NULL
  `);

  // Fallback unknowns onto Other / Open / Medium
  pgm.sql(`
    UPDATE tickets t
    SET type = 'Other'
    WHERE t.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM ticket_type_catalog c WHERE c.type_label = t.type AND c.is_active
      )
  `);

  pgm.sql(`
    UPDATE tickets t
    SET status = 'Open'
    WHERE t.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM ticket_status_catalog c WHERE c.status_label = t.status AND c.is_active
      )
  `);

  pgm.sql(`
    UPDATE tickets t
    SET priority = 'Medium'
    WHERE t.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM ticket_priority_catalog c WHERE c.priority_label = t.priority AND c.is_active
      )
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('ticket_priority_catalog', { ifExists: true });
  pgm.dropTable('ticket_status_catalog', { ifExists: true });
  pgm.dropTable('ticket_type_catalog', { ifExists: true });
};
