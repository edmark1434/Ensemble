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
  pgm.createTable('gig_tier_features', {
    gig_tier_id: { type: 'uuid', notNull: true },
    gig_feature_id: { type: 'uuid', notNull: true },
    is_included: { type: 'boolean', notNull: true, default: true },
  });

  pgm.addConstraint('gig_tier_features', 'gig_tier_features_pkey', 'PRIMARY KEY (gig_tier_id, gig_feature_id)');
  pgm.addConstraint('gig_tier_features', 'gig_tier_features_gig_tier_id_fkey', 'FOREIGN KEY (gig_tier_id) REFERENCES gig_tiers(gig_tier_id)');
  pgm.addConstraint('gig_tier_features', 'gig_tier_features_gig_feature_id_fkey', 'FOREIGN KEY (gig_feature_id) REFERENCES gig_features(gig_feature_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('gig_tier_features', { ifExists: true });
};

