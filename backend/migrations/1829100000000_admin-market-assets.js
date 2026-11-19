/**
 * Admin-uploaded marketplace assets:
 * - `market_assets.is_admin_asset` flags official platform assets uploaded from
 *   Admin Console -> Moderation -> Management -> Marketplace (0% fee deduction,
 *   100% of purchase credits routed directly to the platform wallet).
 * - `media_assets.owner_user_id` becomes nullable because staff accounts live in
 *   `accounts` + `staff` rather than `users`.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('market_assets', {
    is_admin_asset: { type: 'boolean', notNull: true, default: false },
  }, { ifNotExists: true });

  pgm.alterColumn('media_assets', 'owner_user_id', {
    notNull: false,
  });

  pgm.sql(`
    UPDATE market_assets ma
    SET is_admin_asset = TRUE
    WHERE EXISTS (
      SELECT 1
      FROM marketplace_listings ml
      JOIN accounts a ON a.account_id = ml.submitted_by_account_id
      WHERE ml.market_asset_id = ma.market_asset_id
        AND a.type = 'Staff'
    );
  `);
};

exports.down = (pgm) => {
  pgm.dropColumn('market_assets', 'is_admin_asset', { ifExists: true });
  pgm.sql(`DELETE FROM media_assets WHERE owner_user_id IS NULL;`);
  pgm.alterColumn('media_assets', 'owner_user_id', {
    notNull: true,
  });
};
