/**
 * Drop duplicate user_reports table; extend existing reports for portal use.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  // Portal fields on the existing reports table
  pgm.addColumns('reports', {
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

  pgm.addConstraint(
    'reports',
    'reports_assigned_staff_id_fkey',
    'FOREIGN KEY (assigned_staff_id) REFERENCES staff(staff_id)'
  );

  // Copy any seeded portal rows, then drop user_reports
  pgm.sql(`
    INSERT INTO reports (
      report_id, report_number, by_account_id, for_account_id,
      target_type, target_id, target_label, reason, description,
      status, priority, assigned_staff_id, created_at, updated_at, resolved_at,
      type, reference_table, reference_prefix, reference_id, is_created_by_bot
    )
    SELECT
      ur.report_id,
      ur.report_number,
      ur.reporter_account_id,
      COALESCE(ur.reporter_account_id, (SELECT account_id FROM accounts LIMIT 1)),
      ur.target_type,
      ur.target_id,
      ur.target_label,
      ur.reason,
      ur.description,
      ur.status,
      ur.priority,
      ur.assigned_staff_id,
      ur.created_at,
      ur.updated_at,
      ur.resolved_at,
      COALESCE(ur.target_type, 'member'),
      COALESCE(ur.target_type, 'member'),
      COALESCE(LEFT(ur.target_id, 50), 'id'),
      COALESCE(LEFT(ur.target_id, 50), 'unknown'),
      false
    FROM user_reports ur
    ON CONFLICT (report_id) DO NOTHING
  `);

  // Retarget support_tickets FK from user_reports -> reports
  pgm.sql(`
    ALTER TABLE support_tickets
      DROP CONSTRAINT IF EXISTS support_tickets_related_report_id_fkey
  `);
  pgm.sql(`
    ALTER TABLE support_tickets
      ADD CONSTRAINT support_tickets_related_report_id_fkey
      FOREIGN KEY (related_report_id) REFERENCES reports(report_id)
  `);

  pgm.dropIndex('user_reports', 'status', { name: 'idx_user_reports_status', ifExists: true });
  pgm.dropTable('user_reports', { ifExists: true, cascade: true });

  pgm.createIndex('reports', 'status', { name: 'idx_reports_status_portal' });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropIndex('reports', 'status', { name: 'idx_reports_status_portal', ifExists: true });

  // Recreate user_reports shell (data not restored)
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

  pgm.sql(`
    ALTER TABLE support_tickets
      DROP CONSTRAINT IF EXISTS support_tickets_related_report_id_fkey
  `);
  pgm.sql(`
    ALTER TABLE support_tickets
      ADD CONSTRAINT support_tickets_related_report_id_fkey
      FOREIGN KEY (related_report_id) REFERENCES user_reports(report_id)
  `);

  pgm.dropConstraint('reports', 'reports_assigned_staff_id_fkey', { ifExists: true });
  pgm.dropColumns('reports', [
    'report_number',
    'target_type',
    'target_id',
    'target_label',
    'reason',
    'description',
    'priority',
    'assigned_staff_id',
    'updated_at',
    'resolved_at',
  ], { ifExists: true });
};
