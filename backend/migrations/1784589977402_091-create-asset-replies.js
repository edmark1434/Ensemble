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
  pgm.createTable('asset_replies', {
    asset_reply_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    reply: { type: 'text', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    deleted_at: { type: 'timestamp without time zone' },
    asset_comment_id: { type: 'uuid', notNull: true },
    account_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('asset_replies', 'asset_replies_asset_comment_id_fkey', 'FOREIGN KEY (asset_comment_id) REFERENCES asset_comments(asset_comment_id)');
  pgm.addConstraint('asset_replies', 'asset_replies_account_id_fkey', 'FOREIGN KEY (account_id) REFERENCES accounts(account_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('asset_replies', { ifExists: true });
};