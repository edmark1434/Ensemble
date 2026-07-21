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
  // Function: create_account_wallet
  pgm.createFunction(
    'create_account_wallet',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true,
    },
    `
    DECLARE
        v_account_wallet_id UUID;
        v_escrow_wallet_id  UUID;
    BEGIN
        INSERT INTO wallets (type,status, created_at) 
        VALUES ('account wallets','active',CURRENT_TIMESTAMP)
        RETURNING wallet_id INTO v_account_wallet_id;

        INSERT INTO account_wallets (account_id, wallet_id)
        VALUES (NEW.account_id, v_account_wallet_id);

        INSERT INTO wallets (type,status, created_at) 
        VALUES ('escrow wallets','active', CURRENT_TIMESTAMP)
        RETURNING wallet_id INTO v_escrow_wallet_id;

        INSERT INTO account_wallets (account_id, wallet_id)
        VALUES (NEW.account_id, v_escrow_wallet_id);

        RETURN NEW; 
    END;
    `
  );

  // Function: create_default_subscription
  pgm.createFunction(
    'create_default_subscription',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true,
    },
    `
    BEGIN
        INSERT INTO subscriptions (
            subscription_id,
            user_id,
            xendit_plan_id,
            status,
            created_at,
            current_period_start,
            current_period_end,
            trial_ends_at,
            canceled_at,
            plan_id
        )
        VALUES (
            gen_random_uuid(),
            NEW.user_id,
            NULL,
            'ACTIVE',
            NOW(),
            NULL,
            NULL,
            NULL,
            NULL,
            (
                SELECT plan_id
                FROM plans
                WHERE amount_php_cents = 0
                LIMIT 1
            )
        );

        RETURN NEW;
    END;
    `
  );

  // Function: fn_payment_insert_topup
  pgm.createFunction(
    'fn_payment_insert_topup',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true,
    },
    `
    BEGIN
        IF NEW.PAYMENT_TYPE = 'TOPUP' THEN
            INSERT INTO TOPUPS (
                TOPUP_ID,
                XENDIT_PAYMENT_ID,
                XENDIT_CHANNEL_CODE,
                AMOUNT_PHP_CENTS,
                CREDITS_GRANTED,
                STATUS,
                CREATED_AT,
                UPDATED_AT,
                USER_ID
            )
            VALUES (
                NEW.REFERENCE_ID,
                NEW.PAYMENT_ID,
                NEW.CHANNEL_CODE,
                NEW.AMOUNT,
                NEW.CREDITS,
                NEW.STATUS,
                NEW.CREATED_AT,
                NEW.UPDATED_AT,
                NEW.USER_ID
            );
        END IF;

        RETURN NEW;
    END;
    `
  );

  // Function: fn_payment_update_topup
  pgm.createFunction(
    'fn_payment_update_topup',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true,
    },
    `
    BEGIN
        IF NEW.PAYMENT_TYPE = 'TOPUP' THEN
            UPDATE TOPUPS
            SET
                XENDIT_CHANNEL_CODE = NEW.CHANNEL_CODE,
                AMOUNT_PHP_CENTS = NEW.AMOUNT,
                CREDITS_GRANTED = NEW.CREDITS,
                STATUS = NEW.STATUS,
                UPDATED_AT = NOW(),
                USER_ID = NEW.USER_ID
            WHERE XENDIT_PAYMENT_ID = NEW.PAYMENT_ID;
        END IF;

        RETURN NEW;
    END;
    `
  );

  // Function: fn_update_timestamp
  pgm.createFunction(
    'fn_update_timestamp',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true,
    },
    `
    BEGIN
        NEW.UPDATED_AT = NOW();
        RETURN NEW;
    END;
    `
  );

  // Function: insert_verifications
  pgm.createFunction(
    'insert_verifications',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true,
    },
    `
    BEGIN
        INSERT INTO account_verification(account_id, status, created_at)
        VALUES (NEW.account_id, 'unverified', NOW());
        RETURN NEW;
    END;
    `
  );

  // Function: update_modified_column
  pgm.createFunction(
    'update_modified_column',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true,
    },
    `
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    `
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropFunction('create_account_wallet', []);
  pgm.dropFunction('create_default_subscription', []);
  pgm.dropFunction('fn_payment_insert_topup', []);
  pgm.dropFunction('fn_payment_update_topup', []);
  pgm.dropFunction('fn_update_timestamp', []);
  pgm.dropFunction('insert_verifications', []);
  pgm.dropFunction('update_modified_column', []);
};
