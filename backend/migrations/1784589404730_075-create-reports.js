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
    report_number: { type: 'varchar(20)', unique: true },
    target_type: { type: 'varchar(50)' },
    target_id: { type: 'varchar(100)' },
    target_label: { type: 'varchar(255)' },
    reason: { type: 'varchar(100)' },
    description: { type: 'text' },
    priority: { type: 'varchar(20)', default: 'medium' },
    assigned_staff_id: { type: 'uuid' },
    updated_at: { type: 'timestamptz', default: pgm.func('NOW()') },
    resolved_at: { type: 'timestamptz' },
  });

  pgm.addConstraint('reports', 'reports_by_account_id_fkey', 'FOREIGN KEY (by_account_id) REFERENCES accounts(account_id)');
  pgm.addConstraint('reports', 'reports_for_account_id_fkey', 'FOREIGN KEY (for_account_id) REFERENCES accounts(account_id)');
  pgm.addConstraint('reports', 'reports_violation_id_fkey', 'FOREIGN KEY (violation_id) REFERENCES violations(violation_id)');
  pgm.addConstraint('reports', 'reports_assigned_staff_id_fkey', 'FOREIGN KEY (assigned_staff_id) REFERENCES staff(staff_id)');
  pgm.createIndex('reports', 'status', { name: 'idx_reports_status_portal' });
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('reports', { ifExists: true });
};
