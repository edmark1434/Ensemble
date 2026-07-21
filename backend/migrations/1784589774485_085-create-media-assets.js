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
  pgm.createTable('media_assets', {
    media_asset_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    name: { type: 'varchar(50)', notNull: true },
    type: { type: 'varchar(50)', notNull: true },
    width: { type: 'integer' },
    height: { type: 'integer' },
    duration_seconds: { type: 'integer' },
    is_marketed: { type: 'boolean', notNull: true, default: false },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    deleted_at: { type: 'timestamp without time zone' },
    owner_user_id: { type: 'uuid', notNull: true },
    original_file_id: { type: 'uuid', notNull: true },
    proxy_file_id: { type: 'uuid', notNull: true },
    thumbnail_file_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('media_assets', 'media_assets_owner_user_id_fkey', 'FOREIGN KEY (owner_user_id) REFERENCES users(user_id)');
  pgm.addConstraint('media_assets', 'media_assets_original_file_id_fkey', 'FOREIGN KEY (original_file_id) REFERENCES files(file_id)');
  pgm.addConstraint('media_assets', 'media_assets_proxy_file_id_fkey', 'FOREIGN KEY (proxy_file_id) REFERENCES files(file_id)');
  pgm.addConstraint('media_assets', 'media_assets_thumbnail_file_id_fkey', 'FOREIGN KEY (thumbnail_file_id) REFERENCES files(file_id)');
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('media_assets', { ifExists: true });
};
