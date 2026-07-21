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
  pgm.createTable('plan_features', {
    plan_id: { type: 'uuid' },
    feature_id: { type: 'uuid' },
    value: { type: 'varchar(100)' },
  });

  pgm.addConstraint('plan_features', 'plan_features_plan_id_fkey', 'FOREIGN KEY (plan_id) REFERENCES plans(plan_id) ON UPDATE CASCADE ON DELETE CASCADE');
  pgm.addConstraint('plan_features', 'plan_features_feature_id_fkey', 'FOREIGN KEY (feature_id) REFERENCES features(feature_id) ON UPDATE CASCADE ON DELETE CASCADE');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('plan_features', { ifExists: true });
};
