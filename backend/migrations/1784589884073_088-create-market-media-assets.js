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
  pgm.createTable('market_media_assets', {
    market_asset_id: { type: 'uuid', notNull: true },
    media_asset_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('market_media_assets', 'market_media_assets_pkey', 'PRIMARY KEY (market_asset_id, media_asset_id)');
  pgm.addConstraint('market_media_assets', 'market_media_assets_market_asset_id_fkey', 'FOREIGN KEY (market_asset_id) REFERENCES market_assets(market_asset_id)');
  pgm.addConstraint('market_media_assets', 'market_media_assets_media_asset_id_fkey', 'FOREIGN KEY (media_asset_id) REFERENCES media_assets(media_asset_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('market_media_assets', { ifExists: true });
};
