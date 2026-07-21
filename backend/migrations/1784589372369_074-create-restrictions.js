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
  pgm.createTable('restrictions', {
    restriction_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    type: { type: 'varchar(50)', notNull: true },
    module: { type: 'varchar(50)' },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    starts_at: { type: 'timestamp without time zone', notNull: true },
    ends_at: { type: 'timestamp without time zone' },
    violation_id: { type: 'uuid', notNull: true },
    staff_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('restrictions', 'restrictions_violation_id_fkey', 'FOREIGN KEY (violation_id) REFERENCES violations(violation_id)');
  pgm.addConstraint('restrictions', 'restrictions_staff_id_fkey', 'FOREIGN KEY (staff_id) REFERENCES staff(staff_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('restrictions', { ifExists: true });
};
