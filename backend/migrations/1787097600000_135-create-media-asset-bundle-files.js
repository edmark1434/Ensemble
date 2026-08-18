/**
 * Replace the single media_assets.original_file_id relationship with an
 * ordered collection of protected original files.
 *
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('media_asset_bundle_files', {
    media_asset_bundle_file_id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    media_asset_id: { type: 'uuid', notNull: true },
    file_id: { type: 'uuid', notNull: true },
    position: { type: 'integer', notNull: true, default: 0, check: 'position >= 0' },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    deleted_at: { type: 'timestamp without time zone' },
  });

  pgm.addConstraint(
    'media_asset_bundle_files',
    'media_asset_bundle_files_media_asset_id_fkey',
    'FOREIGN KEY (media_asset_id) REFERENCES media_assets(media_asset_id)'
  );
  pgm.addConstraint(
    'media_asset_bundle_files',
    'media_asset_bundle_files_file_id_fkey',
    'FOREIGN KEY (file_id) REFERENCES files(file_id)'
  );
  pgm.addConstraint(
    'media_asset_bundle_files',
    'media_asset_bundle_files_media_file_key',
    'UNIQUE (media_asset_id, file_id)'
  );
  pgm.addConstraint(
    'media_asset_bundle_files',
    'media_asset_bundle_files_media_position_key',
    'UNIQUE (media_asset_id, position)'
  );
  pgm.createIndex('media_asset_bundle_files', ['media_asset_id', 'deleted_at', 'position'], {
    name: 'idx_media_asset_bundle_files_media_active_position',
  });
  pgm.createIndex('media_asset_bundle_files', ['file_id'], {
    name: 'idx_media_asset_bundle_files_file_id',
  });

  pgm.sql(`
    INSERT INTO media_asset_bundle_files (media_asset_id, file_id, position, created_at)
    SELECT media_asset_id, original_file_id, 0, created_at
    FROM media_assets
    ORDER BY media_asset_id;
  `);

  pgm.dropConstraint('media_assets', 'media_assets_original_file_id_fkey');
  pgm.dropColumn('media_assets', 'original_file_id');
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.addColumn('media_assets', {
    original_file_id: { type: 'uuid' },
  });
  pgm.sql(`
    UPDATE media_assets media
    SET original_file_id = (
      SELECT bundle.file_id
      FROM media_asset_bundle_files bundle
      WHERE bundle.media_asset_id = media.media_asset_id
      ORDER BY (bundle.deleted_at IS NULL) DESC, bundle.position, bundle.created_at,
               bundle.media_asset_bundle_file_id
      LIMIT 1
    );

    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM media_assets WHERE original_file_id IS NULL) THEN
        RAISE EXCEPTION 'Cannot restore media_assets.original_file_id: a media asset has no bundle file';
      END IF;
    END $$;
  `);
  pgm.alterColumn('media_assets', 'original_file_id', { notNull: true });
  pgm.addConstraint(
    'media_assets',
    'media_assets_original_file_id_fkey',
    'FOREIGN KEY (original_file_id) REFERENCES files(file_id)'
  );
  pgm.dropTable('media_asset_bundle_files');
};
