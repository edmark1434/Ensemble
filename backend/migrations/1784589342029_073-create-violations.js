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
  pgm.createTable('violations', {
    violation_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    type: { type: 'varchar(50)', notNull: true },
    status: { type: 'varchar(50)', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    deleted_at: { type: 'timestamp without time zone' },
    staff_id: { type: 'uuid', notNull: true },
    violation_number: { type: 'varchar(20)', unique: true },
    account_id: { type: 'uuid' },
    title: { type: 'varchar(255)' },
    reason: { type: 'text' },
    points: { type: 'integer', default: 0 },
    issued_by_staff_id: { type: 'uuid' },
  });

  pgm.addConstraint('violations', 'violations_staff_id_fkey', 'FOREIGN KEY (staff_id) REFERENCES staff(staff_id)');
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('violations', { ifExists: true });
};
