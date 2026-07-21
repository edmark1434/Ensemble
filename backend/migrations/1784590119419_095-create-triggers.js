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
  // after_account_created
  pgm.createTrigger('accounts', 'after_account_created', {
    when: 'AFTER',
    operation: 'INSERT',
    function: 'insert_verifications',
    level: 'ROW',
  });

  // trg_after_account_insert
  pgm.createTrigger('accounts', 'trg_after_account_insert', {
    when: 'AFTER',
    operation: 'INSERT',
    function: 'create_account_wallet',
    level: 'ROW',
    condition: "NEW.type::text = 'User'::text",
  });

  // trg_create_default_subscription
  pgm.createTrigger('users', 'trg_create_default_subscription', {
    when: 'AFTER',
    operation: 'INSERT',
    function: 'create_default_subscription',
    level: 'ROW',
  });

  // trg_payment_insert_topup
  pgm.createTrigger('payments', 'trg_payment_insert_topup', {
    when: 'AFTER',
    operation: 'INSERT',
    function: 'fn_payment_insert_topup',
    level: 'ROW',
  });

  // trg_payment_update_topup
  pgm.createTrigger('payments', 'trg_payment_update_topup', {
    when: 'AFTER',
    operation: 'UPDATE',
    function: 'fn_payment_update_topup',
    level: 'ROW',
  });

  // trg_payments_updated_at
  pgm.createTrigger('payments', 'trg_payments_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'fn_update_timestamp',
    level: 'ROW',
  });

  // trg_topups_updated_at
  pgm.createTrigger('topups', 'trg_topups_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'fn_update_timestamp',
    level: 'ROW',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTrigger('payments', 'trg_payments_updated_at');
  pgm.dropTrigger('payments', 'trg_payment_update_topup');
  pgm.dropTrigger('payments', 'trg_payment_insert_topup');
  pgm.dropTrigger('users', 'trg_create_default_subscription');
  pgm.dropTrigger('accounts', 'trg_after_account_insert');
  pgm.dropTrigger('accounts', 'after_account_created');
  pgm.dropTrigger('topups', 'trg_topups_updated_at');
};
