/**
 * Soft delete / trash support for marketplace assets:
 * - `market_assets.trashed_at`: tracks when an asset was soft deleted/moved to trash.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('market_assets', {
    trashed_at: { type: 'timestamp without time zone' },
  }, { ifNotExists: true });

  pgm.createIndex('market_assets', ['trashed_at'], {
    name: 'market_assets_trash_date_idx',
    where: 'deleted_at IS NULL',
    ifNotExists: true,
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('market_assets', ['trashed_at'], { name: 'market_assets_trash_date_idx', ifExists: true });
  pgm.dropColumn('market_assets', 'trashed_at', { ifExists: true });
};
