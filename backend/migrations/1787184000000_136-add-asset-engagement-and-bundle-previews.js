/**
 * Add a safe public derivative for each protected bundle original and durable
 * marketplace engagement/review records.
 *
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.addColumn('media_asset_bundle_files', {
    preview_file_id: { type: 'uuid' },
  });
  pgm.sql(`
    UPDATE media_asset_bundle_files bundle
    SET preview_file_id = media.thumbnail_file_id
    FROM media_assets media
    WHERE media.media_asset_id = bundle.media_asset_id;
  `);
  pgm.alterColumn('media_asset_bundle_files', 'preview_file_id', { notNull: true });
  pgm.addConstraint(
    'media_asset_bundle_files',
    'media_asset_bundle_files_preview_file_id_fkey',
    'FOREIGN KEY (preview_file_id) REFERENCES files(file_id)'
  );
  pgm.createIndex('media_asset_bundle_files', ['preview_file_id'], {
    name: 'idx_media_asset_bundle_files_preview_file_id',
  });

  pgm.createTable('asset_likes', {
    asset_like_id: {
      type: 'uuid', primaryKey: true, notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    market_asset_id: { type: 'uuid', notNull: true },
    account_id: { type: 'uuid', notNull: true },
    created_at: {
      type: 'timestamp without time zone', notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    deleted_at: { type: 'timestamp without time zone' },
  });
  pgm.addConstraint('asset_likes', 'asset_likes_market_asset_id_fkey',
    'FOREIGN KEY (market_asset_id) REFERENCES market_assets(market_asset_id)');
  pgm.addConstraint('asset_likes', 'asset_likes_account_id_fkey',
    'FOREIGN KEY (account_id) REFERENCES accounts(account_id)');
  pgm.addConstraint('asset_likes', 'asset_likes_market_account_key',
    'UNIQUE (market_asset_id, account_id)');
  pgm.createIndex('asset_likes', ['market_asset_id', 'deleted_at'], {
    name: 'idx_asset_likes_asset_active',
  });
  pgm.createIndex('asset_likes', ['account_id', 'deleted_at'], {
    name: 'idx_asset_likes_account_active',
  });

  pgm.createTable('asset_saves', {
    asset_save_id: {
      type: 'uuid', primaryKey: true, notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    market_asset_id: { type: 'uuid', notNull: true },
    account_id: { type: 'uuid', notNull: true },
    created_at: {
      type: 'timestamp without time zone', notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    deleted_at: { type: 'timestamp without time zone' },
  });
  pgm.addConstraint('asset_saves', 'asset_saves_market_asset_id_fkey',
    'FOREIGN KEY (market_asset_id) REFERENCES market_assets(market_asset_id)');
  pgm.addConstraint('asset_saves', 'asset_saves_account_id_fkey',
    'FOREIGN KEY (account_id) REFERENCES accounts(account_id)');
  pgm.addConstraint('asset_saves', 'asset_saves_market_account_key',
    'UNIQUE (market_asset_id, account_id)');
  pgm.createIndex('asset_saves', ['market_asset_id', 'deleted_at'], {
    name: 'idx_asset_saves_asset_active',
  });
  pgm.createIndex('asset_saves', ['account_id', 'deleted_at'], {
    name: 'idx_asset_saves_account_active',
  });

  pgm.createTable('asset_reviews', {
    asset_review_id: {
      type: 'uuid', primaryKey: true, notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    market_asset_id: { type: 'uuid', notNull: true },
    account_id: { type: 'uuid', notNull: true },
    rating: { type: 'smallint', notNull: true },
    review: { type: 'text', notNull: true },
    created_at: {
      type: 'timestamp without time zone', notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamp without time zone', notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    deleted_at: { type: 'timestamp without time zone' },
  });
  pgm.addConstraint('asset_reviews', 'asset_reviews_market_asset_id_fkey',
    'FOREIGN KEY (market_asset_id) REFERENCES market_assets(market_asset_id)');
  pgm.addConstraint('asset_reviews', 'asset_reviews_account_id_fkey',
    'FOREIGN KEY (account_id) REFERENCES accounts(account_id)');
  pgm.addConstraint('asset_reviews', 'asset_reviews_market_account_key',
    'UNIQUE (market_asset_id, account_id)');
  pgm.addConstraint('asset_reviews', 'asset_reviews_rating_check',
    'CHECK (rating BETWEEN 1 AND 5)');
  pgm.addConstraint('asset_reviews', 'asset_reviews_text_length_check',
    'CHECK (char_length(btrim(review)) BETWEEN 1 AND 2000)');
  pgm.createIndex('asset_reviews', ['market_asset_id', 'deleted_at', 'created_at'], {
    name: 'idx_asset_reviews_asset_active_created',
  });
  pgm.createIndex('asset_reviews', ['account_id', 'deleted_at'], {
    name: 'idx_asset_reviews_account_active',
  });
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.dropTable('asset_reviews');
  pgm.dropTable('asset_saves');
  pgm.dropTable('asset_likes');
  pgm.dropIndex('media_asset_bundle_files', ['preview_file_id'], {
    name: 'idx_media_asset_bundle_files_preview_file_id',
  });
  pgm.dropConstraint(
    'media_asset_bundle_files',
    'media_asset_bundle_files_preview_file_id_fkey'
  );
  pgm.dropColumn('media_asset_bundle_files', 'preview_file_id');
};
