/**
 * Add ordered public thumbnails and protected project-link deliverables for
 * template marketplace assets.
 *
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('media_asset_thumbnails', {
    media_asset_thumbnail_id: {
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
    'media_asset_thumbnails',
    'media_asset_thumbnails_media_asset_id_fkey',
    'FOREIGN KEY (media_asset_id) REFERENCES media_assets(media_asset_id)'
  );
  pgm.addConstraint(
    'media_asset_thumbnails',
    'media_asset_thumbnails_file_id_fkey',
    'FOREIGN KEY (file_id) REFERENCES files(file_id)'
  );
  pgm.addConstraint(
    'media_asset_thumbnails',
    'media_asset_thumbnails_media_file_key',
    'UNIQUE (media_asset_id, file_id)'
  );
  pgm.addConstraint(
    'media_asset_thumbnails',
    'media_asset_thumbnails_media_position_key',
    'UNIQUE (media_asset_id, position)'
  );
  pgm.createIndex('media_asset_thumbnails', ['media_asset_id', 'deleted_at', 'position'], {
    name: 'idx_media_asset_thumbnails_media_active_position',
  });
  pgm.createIndex('media_asset_thumbnails', ['file_id'], {
    name: 'idx_media_asset_thumbnails_file_id',
  });
  pgm.sql(`
    INSERT INTO media_asset_thumbnails (media_asset_id, file_id, position, created_at)
    SELECT media_asset_id, thumbnail_file_id, 0, created_at
    FROM media_assets
    WHERE deleted_at IS NULL;
  `);

  pgm.createTable('media_asset_project_links', {
    media_asset_project_link_id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    media_asset_id: { type: 'uuid', notNull: true },
    label: { type: 'varchar(100)', notNull: true },
    provider: { type: 'varchar(50)', notNull: true },
    url: { type: 'text', notNull: true },
    position: { type: 'integer', notNull: true, default: 0, check: 'position >= 0' },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    deleted_at: { type: 'timestamp without time zone' },
  });
  pgm.addConstraint(
    'media_asset_project_links',
    'media_asset_project_links_media_asset_id_fkey',
    'FOREIGN KEY (media_asset_id) REFERENCES media_assets(media_asset_id)'
  );
  pgm.addConstraint(
    'media_asset_project_links',
    'media_asset_project_links_media_position_key',
    'UNIQUE (media_asset_id, position)'
  );
  pgm.addConstraint(
    'media_asset_project_links',
    'media_asset_project_links_label_length_check',
    'CHECK (char_length(btrim(label)) BETWEEN 1 AND 100)'
  );
  pgm.addConstraint(
    'media_asset_project_links',
    'media_asset_project_links_provider_length_check',
    'CHECK (char_length(btrim(provider)) BETWEEN 1 AND 50)'
  );
  pgm.addConstraint(
    'media_asset_project_links',
    'media_asset_project_links_url_length_check',
    'CHECK (char_length(url) BETWEEN 8 AND 2048)'
  );
  pgm.createIndex('media_asset_project_links', ['media_asset_id', 'deleted_at', 'position'], {
    name: 'idx_media_asset_project_links_media_active_position',
  });
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.dropTable('media_asset_project_links');
  pgm.dropTable('media_asset_thumbnails');
};

