/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  // 1. 2FA authenticator secrets table
  pgm.createTable('account_authentication_secrets', {
    account_id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      references: 'accounts(account_id)',
      onDelete: 'CASCADE'
    },
    secret: {
      type: 'text',
      notNull: true
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });

  // 2. 2FA recovery codes table
  pgm.createTable('account_authentication_recovery_codes', {
    recovery_code_id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()')
    },
    account_id: {
      type: 'uuid',
      notNull: true,
      references: 'accounts(account_id)',
      onDelete: 'CASCADE'
    },
    recovery_code: {
      type: 'varchar(255)',
      notNull: true
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'active'
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });

  pgm.createIndex('account_authentication_recovery_codes', ['account_id', 'status']);
  pgm.createIndex('account_authentication_recovery_codes', ['account_id', 'recovery_code']);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('account_authentication_recovery_codes');
  pgm.dropTable('account_authentication_secrets');
};
