/**
 * Track which moderator queue a ticket was escalated TO (not who clicked escalate).
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.addColumns('tickets', {
    escalated_to_role: { type: 'varchar(80)' },
  });

  pgm.createIndex('tickets', 'escalated_to_role', {
    name: 'idx_tickets_escalated_to_role',
    ifNotExists: true,
  });

  // Backfill: if already escalated, infer target queue from ticket type catalog.
  pgm.sql(`
    UPDATE tickets t
    SET escalated_to_role = c.queue_role
    FROM ticket_type_catalog c
    WHERE t.escalated_by_staff_id IS NOT NULL
      AND t.escalated_to_role IS NULL
      AND c.type_label = t.type
      AND c.is_active = TRUE
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropIndex('tickets', 'escalated_to_role', {
    name: 'idx_tickets_escalated_to_role',
    ifExists: true,
  });
  pgm.dropColumns('tickets', ['escalated_to_role'], { ifExists: true });
};
