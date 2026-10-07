/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.addColumn('marketplace_listings', {
    market_asset_id: {
      type: 'uuid',
      references: 'market_assets(market_asset_id)',
      onDelete: 'CASCADE',
    },
  });

  pgm.createIndex('marketplace_listings', 'market_asset_id', {
    name: 'idx_marketplace_listings_market_asset_id',
  });

  pgm.sql(`
    UPDATE marketplace_listings ml
    SET market_asset_id = ma.market_asset_id
    FROM market_assets ma
    JOIN market_media_assets mma ON mma.market_asset_id = ma.market_asset_id
    JOIN media_assets m ON m.media_asset_id = mma.media_asset_id
    JOIN users u ON u.user_id = m.owner_user_id
    WHERE ml.market_asset_id IS NULL
      AND ml.submitted_by_account_id = u.account_id
      AND ml.title = ma.name
      AND ma.deleted_at IS NULL
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropIndex('marketplace_listings', 'market_asset_id', {
    name: 'idx_marketplace_listings_market_asset_id',
    ifExists: true,
  });
  pgm.dropColumn('marketplace_listings', 'market_asset_id', { ifExists: true });
};
