/** Create both standard wallets for every new Team account and repair existing Teams. */
exports.up = (pgm) => {
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_after_account_insert ON accounts;
    CREATE TRIGGER trg_after_account_insert
      AFTER INSERT ON accounts
      FOR EACH ROW
      WHEN (NEW.type::text IN ('User', 'Team'))
      EXECUTE FUNCTION create_account_wallet();

    DO $$
    DECLARE
      team_account RECORD;
      v_wallet_id UUID;
    BEGIN
      FOR team_account IN
        SELECT a.account_id
        FROM accounts a
        JOIN teams t ON t.account_id = a.account_id
        WHERE a.type = 'Team' AND t.deleted_at IS NULL
      LOOP
        IF NOT EXISTS (
          SELECT 1
          FROM account_wallets aw
          JOIN wallets w ON w.wallet_id = aw.wallet_id
          WHERE aw.account_id = team_account.account_id
            AND w.type = 'account wallets'
        ) THEN
          INSERT INTO wallets (type, status, created_at)
          VALUES ('account wallets', 'active', CURRENT_TIMESTAMP)
          RETURNING wallet_id INTO v_wallet_id;
          INSERT INTO account_wallets (account_id, wallet_id)
          VALUES (team_account.account_id, v_wallet_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM account_wallets aw
          JOIN wallets w ON w.wallet_id = aw.wallet_id
          WHERE aw.account_id = team_account.account_id
            AND w.type = 'escrow wallets'
        ) THEN
          INSERT INTO wallets (type, status, created_at)
          VALUES ('escrow wallets', 'active', CURRENT_TIMESTAMP)
          RETURNING wallet_id INTO v_wallet_id;
          INSERT INTO account_wallets (account_id, wallet_id)
          VALUES (team_account.account_id, v_wallet_id);
        END IF;
      END LOOP;
    END $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_after_account_insert ON accounts;
    CREATE TRIGGER trg_after_account_insert
      AFTER INSERT ON accounts
      FOR EACH ROW
      WHEN (NEW.type::text = 'User')
      EXECUTE FUNCTION create_account_wallet();
  `);
};
