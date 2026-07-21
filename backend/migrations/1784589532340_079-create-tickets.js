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
    reason: { type: 'varchar(50)', notNull: true },
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
  });

  pgm.addConstraint('tickets', 'tickets_account_id_fkey', 'FOREIGN KEY (account_id) REFERENCES accounts(account_id)');
  pgm.addConstraint('tickets', 'tickets_escalated_by_staff_id_fkey', 'FOREIGN KEY (escalated_by_staff_id) REFERENCES staff(staff_id)');
  pgm.addConstraint('tickets', 'tickets_handled_by_staff_id_fkey', 'FOREIGN KEY (handled_by_staff_id) REFERENCES staff(staff_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('tickets', { ifExists: true });
};

