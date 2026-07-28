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
  pgm.createTable('verification_attachments', {
    account_verification_id: { type: 'uuid', notNull: true },
    file_id: { type: 'uuid', notNull: true },
    index: { type: 'integer', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
  });

  pgm.addConstraint(
    'verification_attachments',
    'verification_attachments_pkey',
    'PRIMARY KEY (account_verification_id, file_id)'
  );
  pgm.addConstraint(
    'verification_attachments',
    'verification_attachments_account_verification_id_fkey',
    'FOREIGN KEY (account_verification_id) REFERENCES account_verification(account_verification_id)'
  );
  pgm.addConstraint(
    'verification_attachments',
    'verification_attachments_file_id_fkey',
    'FOREIGN KEY (file_id) REFERENCES files(file_id)'
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('verification_attachments', { ifExists: true });
};
