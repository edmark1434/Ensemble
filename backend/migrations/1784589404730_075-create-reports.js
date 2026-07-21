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
  pgm.createTable('reports', {
    report_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    is_created_by_bot: { type: 'boolean', notNull: true, default: false },
    type: { type: 'varchar(50)', notNull: true },
    reference_table: { type: 'varchar(50)', notNull: true },
    reference_prefix: { type: 'varchar(50)', notNull: true },
    reference_id: { type: 'varchar(50)', notNull: true },
    status: { type: 'varchar(50)', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    deleted_at: { type: 'timestamp without time zone' },
    by_account_id: { type: 'uuid' },
    for_account_id: { type: 'uuid', notNull: true },
    violation_id: { type: 'uuid' },
  });

  pgm.addConstraint('reports', 'reports_by_account_id_fkey', 'FOREIGN KEY (by_account_id) REFERENCES accounts(account_id)');
  pgm.addConstraint('reports', 'reports_for_account_id_fkey', 'FOREIGN KEY (for_account_id) REFERENCES accounts(account_id)');
  pgm.addConstraint('reports', 'reports_violation_id_fkey', 'FOREIGN KEY (violation_id) REFERENCES violations(violation_id)');
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('reports', { ifExists: true });
};

