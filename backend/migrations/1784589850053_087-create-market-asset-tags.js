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
  pgm.createTable('market_asset_tags', {
    market_asset_id: { type: 'uuid', notNull: true },
    tag_id: { type: 'uuid', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    deleted_at: { type: 'timestamp without time zone' },
  });

  pgm.addConstraint('market_asset_tags', 'market_asset_tags_pkey', 'PRIMARY KEY (market_asset_id, tag_id)');
  pgm.addConstraint('market_asset_tags', 'market_asset_tags_market_asset_id_fkey', 'FOREIGN KEY (market_asset_id) REFERENCES market_assets(market_asset_id)');
  pgm.addConstraint('market_asset_tags', 'market_asset_tags_tag_id_fkey', 'FOREIGN KEY (tag_id) REFERENCES tags(tag_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('market_asset_tags', { ifExists: true });
};
