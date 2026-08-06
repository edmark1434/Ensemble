/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createTable('tickets', {
    ticket_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    type: { type: 'varchar(50)', notNull: true },
    reason: { type: 'varchar(255)', notNull: true },
    status: { type: 'varchar(50)', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    resolved_at: { type: 'timestamp without time zone' },
    deleted_at: { type: 'timestamp without time zone' },
    account_id: { type: 'uuid', notNull: true },
    escalated_by_staff_id: { type: 'uuid' },
    handled_by_staff_id: { type: 'uuid' },
    ticket_number: { type: 'varchar(20)', notNull: true, unique: true },
    priority: { type: 'varchar(20)', notNull: true, default: 'Medium' },
    channel: { type: 'varchar(50)', notNull: true, default: 'web' },
    related_report_id: { type: 'uuid' },
    related_dispute_id: { type: 'uuid' },
    message_count: { type: 'integer', notNull: true, default: 0 },
    last_message_at: { type: 'timestamptz' },
    last_message_author_type: { type: 'varchar(20)' },
    escalated_to_role: { type: 'varchar(80)' },
  });

  pgm.addConstraint('tickets', 'tickets_account_id_fkey', 'FOREIGN KEY (account_id) REFERENCES accounts(account_id)');
  pgm.addConstraint('tickets', 'tickets_escalated_by_staff_id_fkey', 'FOREIGN KEY (escalated_by_staff_id) REFERENCES staff(staff_id)');
  pgm.addConstraint('tickets', 'tickets_handled_by_staff_id_fkey', 'FOREIGN KEY (handled_by_staff_id) REFERENCES staff(staff_id)');
  pgm.addConstraint('tickets', 'tickets_related_report_id_fkey', 'FOREIGN KEY (related_report_id) REFERENCES reports(report_id)');
  pgm.addConstraint('tickets', 'tickets_related_dispute_id_fkey', 'FOREIGN KEY (related_dispute_id) REFERENCES disputes(dispute_id)');
  pgm.createIndex('tickets', 'type', { name: 'idx_tickets_type' });
  pgm.createIndex('tickets', 'status', { name: 'idx_tickets_status' });
  pgm.createIndex('tickets', 'priority', { name: 'idx_tickets_priority' });
  pgm.createIndex('tickets', 'escalated_to_role', { name: 'idx_tickets_escalated_to_role' });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('tickets', { ifExists: true });
};
