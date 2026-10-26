/** One purchased use, optionally and permanently assigned to one project. */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE market_asset_licenses (
      market_asset_license_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      buyer_user_id uuid NOT NULL REFERENCES users(user_id),
      market_asset_id uuid NOT NULL REFERENCES market_assets(market_asset_id),
      project_id uuid REFERENCES projects(project_id),
      credit_transaction_id uuid UNIQUE REFERENCES credit_transactions(credit_transaction_id),
      price_credits integer NOT NULL CHECK (price_credits >= 0),
      status varchar(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'refunded')),
      purchased_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      assigned_at timestamp without time zone,
      deleted_at timestamp without time zone,
      CONSTRAINT market_asset_license_assignment CHECK (
        (project_id IS NULL AND assigned_at IS NULL) OR
        (project_id IS NOT NULL AND assigned_at IS NOT NULL)
      )
    );
    CREATE UNIQUE INDEX market_asset_licenses_available
      ON market_asset_licenses (buyer_user_id, market_asset_id)
      WHERE project_id IS NULL AND status = 'active' AND deleted_at IS NULL;
    CREATE UNIQUE INDEX market_asset_licenses_project
      ON market_asset_licenses (project_id, market_asset_id)
      WHERE project_id IS NOT NULL AND status = 'active' AND deleted_at IS NULL;
    CREATE INDEX market_asset_licenses_buyer ON market_asset_licenses
      (buyer_user_id, purchased_at DESC, market_asset_license_id DESC);
    CREATE INDEX market_asset_licenses_asset ON market_asset_licenses
      (market_asset_id, status, deleted_at);

    INSERT INTO market_asset_licenses
      (buyer_user_id, market_asset_id, price_credits, status, purchased_at, deleted_at,
       credit_transaction_id)
    SELECT old.user_id, old.market_asset_id, old.price, old.status, old.created_at,
           old.deleted_at, purchase.credit_transaction_id
    FROM user_market_assets old
    JOIN users buyer ON buyer.user_id = old.user_id
    LEFT JOIN LATERAL (
      SELECT tx.credit_transaction_id
      FROM credit_transactions tx
      JOIN account_wallets wallet ON wallet.wallet_id = tx.source_wallet_id
      WHERE wallet.account_id = buyer.account_id
        AND tx.type = 'Asset Purchase' AND LOWER(tx.status) = 'completed'
        AND LOWER(COALESCE(tx.reference_table, '')) IN ('market_assets', 'assets')
        AND tx.reference_id = old.market_asset_id
        AND tx.amount_credits = old.price
        AND tx.created_at <= old.created_at
      ORDER BY tx.created_at DESC, tx.credit_transaction_id DESC
      LIMIT 1
    ) purchase ON TRUE;

    DROP TABLE user_market_assets;

    CREATE FUNCTION prevent_market_asset_license_reassignment() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      IF OLD.project_id IS NOT NULL AND
         (NEW.project_id IS DISTINCT FROM OLD.project_id OR
          NEW.assigned_at IS DISTINCT FROM OLD.assigned_at) THEN
        RAISE EXCEPTION 'A market asset license cannot be reassigned';
      END IF;
      IF NEW.buyer_user_id IS DISTINCT FROM OLD.buyer_user_id OR
         NEW.market_asset_id IS DISTINCT FROM OLD.market_asset_id OR
         NEW.credit_transaction_id IS DISTINCT FROM OLD.credit_transaction_id OR
         NEW.price_credits IS DISTINCT FROM OLD.price_credits OR
         NEW.purchased_at IS DISTINCT FROM OLD.purchased_at THEN
        RAISE EXCEPTION 'Market asset license purchase details are immutable';
      END IF;
      RETURN NEW;
    END;
    $$;
    CREATE TRIGGER market_asset_license_immutable
      BEFORE UPDATE ON market_asset_licenses FOR EACH ROW
      EXECUTE FUNCTION prevent_market_asset_license_reassignment();
  `);
};

exports.down = (pgm) => {
  // The old composite key cannot represent multiple purchases or project grants.
  // Refuse a lossy rollback after the new licensing model has been used.
  pgm.sql(`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM market_asset_licenses WHERE project_id IS NOT NULL)
         OR EXISTS (SELECT 1 FROM market_asset_licenses
                    GROUP BY buyer_user_id, market_asset_id HAVING COUNT(*) > 1) THEN
        RAISE EXCEPTION 'Cannot roll back project licenses without losing purchase history';
      END IF;
    END $$;
    CREATE TABLE user_market_assets (
      user_id uuid NOT NULL REFERENCES users(user_id),
      market_asset_id uuid NOT NULL REFERENCES market_assets(market_asset_id),
      price integer NOT NULL CHECK (price >= 0),
      status varchar(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'refunded')),
      created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at timestamp without time zone,
      PRIMARY KEY (user_id, market_asset_id)
    );
    CREATE INDEX idx_user_market_assets_asset_status
      ON user_market_assets (market_asset_id, status, deleted_at);
    CREATE INDEX idx_user_market_assets_user_status_created
      ON user_market_assets (user_id, status, created_at);
    INSERT INTO user_market_assets (user_id, market_asset_id, price, status, created_at, deleted_at)
      SELECT buyer_user_id, market_asset_id, price_credits, status, purchased_at, deleted_at
      FROM market_asset_licenses;
    DROP TABLE market_asset_licenses;
    DROP FUNCTION prevent_market_asset_license_reassignment();
  `);
};
