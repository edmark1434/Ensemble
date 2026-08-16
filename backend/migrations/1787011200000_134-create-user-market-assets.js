/**
 * Durable user entitlement for purchased or claimed marketplace assets.
 * Financial movements remain recorded in credit_transactions.
 *
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('user_market_assets', {
    user_id: { type: 'uuid', notNull: true },
    market_asset_id: { type: 'uuid', notNull: true },
    price: { type: 'integer', notNull: true, check: 'price >= 0' },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'active',
      check: "status IN ('active', 'refunded')",
    },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    deleted_at: { type: 'timestamp without time zone' },
  });

  pgm.addConstraint(
    'user_market_assets',
    'user_market_assets_pkey',
    'PRIMARY KEY (user_id, market_asset_id)'
  );
  pgm.addConstraint(
    'user_market_assets',
    'user_market_assets_user_id_fkey',
    'FOREIGN KEY (user_id) REFERENCES users(user_id)'
  );
  pgm.addConstraint(
    'user_market_assets',
    'user_market_assets_market_asset_id_fkey',
    'FOREIGN KEY (market_asset_id) REFERENCES market_assets(market_asset_id)'
  );
  pgm.createIndex('user_market_assets', ['market_asset_id', 'status', 'deleted_at'], {
    name: 'idx_user_market_assets_asset_status',
  });
  pgm.createIndex('user_market_assets', ['user_id', 'status', 'created_at'], {
    name: 'idx_user_market_assets_user_status_created',
  });

  pgm.sql(`
    INSERT INTO user_market_assets (
      user_id,
      market_asset_id,
      price,
      status,
      created_at,
      deleted_at
    )
    SELECT DISTINCT ON (buyer_user.user_id, purchase.reference_id)
      buyer_user.user_id,
      purchase.reference_id,
      purchase.amount_credits,
      'active',
      purchase.created_at,
      NULL
    FROM credit_transactions purchase
    JOIN account_wallets buyer_wallet
      ON buyer_wallet.wallet_id = purchase.source_wallet_id
    JOIN users buyer_user
      ON buyer_user.account_id = buyer_wallet.account_id
    JOIN market_assets asset
      ON asset.market_asset_id = purchase.reference_id
    WHERE purchase.type = 'Asset Purchase'
      AND LOWER(purchase.status) = 'completed'
      AND LOWER(COALESCE(purchase.reference_table, '')) IN ('market_assets', 'assets')
      AND NOT EXISTS (
        SELECT 1
        FROM credit_transactions refund
        JOIN account_wallets refund_wallet
          ON refund_wallet.wallet_id = refund.destination_wallet_id
        WHERE refund.type = 'Asset Refund'
          AND LOWER(refund.status) = 'completed'
          AND refund.reference_id = purchase.reference_id
          AND LOWER(COALESCE(refund.reference_table, '')) IN ('market_assets', 'assets')
          AND refund_wallet.account_id = buyer_wallet.account_id
          AND refund.created_at >= purchase.created_at
      )
    ORDER BY buyer_user.user_id, purchase.reference_id, purchase.created_at DESC
    ON CONFLICT (user_id, market_asset_id) DO NOTHING;
  `);
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.dropTable('user_market_assets', { ifExists: true, cascade: true });
};
