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
  // 1. market_media_assets gets an order
  pgm.addColumns('market_media_assets', {
    position: { type: 'integer', notNull: true, default: 0 },
  });
  pgm.addConstraint('market_media_assets', 'market_media_assets_position_check', {
    check: '"position" >= 0',
  });
  pgm.createIndex('market_media_assets', ['market_asset_id', 'position']);
  pgm.createIndex('market_media_assets', 'media_asset_id');

  // 2. thumbnails are media assets, mapped exactly like market_media_assets
  pgm.createTable('market_asset_thumbnails', {
    market_asset_id: { type: 'uuid', notNull: true, references: 'market_assets' },
    media_asset_id: { type: 'uuid', notNull: true, references: 'media_assets' },
    position: { type: 'integer', notNull: true, default: 0 },
  });
  pgm.addConstraint('market_asset_thumbnails', 'market_asset_thumbnails_pkey', {
    primaryKey: ['market_asset_id', 'media_asset_id'],
  });
  pgm.addConstraint('market_asset_thumbnails', 'market_asset_thumbnails_position_check', {
    check: '"position" >= 0',
  });
  pgm.createIndex('market_asset_thumbnails', ['market_asset_id', 'position']);
  pgm.createIndex('market_asset_thumbnails', 'media_asset_id');

  // 3. templates point at one ydoc snapshot
  pgm.createTable('market_ydoc_assets', {
    market_asset_id: { type: 'uuid', primaryKey: true, references: 'market_assets' },
    yjs_snapshot_id: { type: 'bigint', notNull: true, unique: true, references: 'yjs_snapshots' },
  });

  // 4. carry existing data over before the old tables go away
  // content order comes from the old bundle position
  pgm.sql(`
    UPDATE market_media_assets link
    SET position = bundle.position
    FROM media_asset_bundle_files bundle
    WHERE bundle.media_asset_id = link.media_asset_id
      AND bundle.deleted_at IS NULL;
  `);

  // content media assets are named after the listing plus their number
  pgm.sql(`
    UPDATE media_assets media
    SET name = market.name || ' - ' || (link.position + 1)
    FROM market_media_assets link
    JOIN market_assets market ON market.market_asset_id = link.market_asset_id
    WHERE link.media_asset_id = media.media_asset_id;
  `);

  // content proxy = the old bundle preview
  pgm.sql(`
    UPDATE media_assets media
    SET proxy_file_id = bundle.preview_file_id
    FROM media_asset_bundle_files bundle
    WHERE bundle.media_asset_id = media.media_asset_id
      AND bundle.deleted_at IS NULL;
  `);

  // every old thumbnail row becomes its own media asset + mapping row
  pgm.sql(`
    WITH source AS MATERIALIZED (
      SELECT gen_random_uuid() AS media_asset_id,
             link.market_asset_id,
             thumb.file_id,
             thumb.position,
             market.name AS market_name,
             media.owner_user_id
      FROM media_asset_thumbnails thumb
      JOIN market_media_assets link ON link.media_asset_id = thumb.media_asset_id
      JOIN market_assets market ON market.market_asset_id = link.market_asset_id
      JOIN media_assets media ON media.media_asset_id = thumb.media_asset_id
      WHERE thumb.deleted_at IS NULL
    ), inserted AS (
      INSERT INTO media_assets
        (media_asset_id, name, type, is_marketed, owner_user_id,
         original_file_id, proxy_file_id, thumbnail_file_id)
      SELECT media_asset_id, market_name || ' - Thumbnail ' || (position + 1), 'image', TRUE,
             owner_user_id, file_id, file_id, file_id
      FROM source
      RETURNING media_asset_id
    )
    INSERT INTO market_asset_thumbnails (market_asset_id, media_asset_id, position)
    SELECT source.market_asset_id, source.media_asset_id, source.position
    FROM source
    JOIN inserted USING (media_asset_id);
  `);

  // the old "primary" media asset of a listing with no content files (templates)
  // only existed to hold thumbnails; it is not content, so unlink and retire it
  pgm.sql(`
    WITH removed AS (
      DELETE FROM market_media_assets link
      WHERE NOT EXISTS (
        SELECT 1 FROM media_asset_bundle_files bundle
        WHERE bundle.media_asset_id = link.media_asset_id
          AND bundle.deleted_at IS NULL
      )
      RETURNING media_asset_id
    )
    UPDATE media_assets
    SET is_marketed = FALSE, deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP)
    WHERE media_asset_id IN (SELECT media_asset_id FROM removed);
  `);

  // 5. drop the wrong tables
  pgm.dropTable('market_project_assets', { ifExists: true });
  pgm.dropTable('media_asset_project_links', { ifExists: true });
  pgm.dropTable('media_asset_thumbnails');
  pgm.dropTable('media_asset_bundle_files');
};

/**
 * Restores structure only (the carried-over rows are not moved back).
 * media_asset_project_links is not recreated: its DDL wasn't provided.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.createTable('media_asset_bundle_files', {
    media_asset_bundle_file_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    media_asset_id: { type: 'uuid', notNull: true, references: 'media_assets' },
    file_id: { type: 'uuid', notNull: true, references: 'files' },
    position: { type: 'integer', notNull: true, default: 0, check: '"position" >= 0' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    deleted_at: { type: 'timestamp' },
    preview_file_id: { type: 'uuid', notNull: true, references: 'files' },
  });
  pgm.addConstraint('media_asset_bundle_files', 'media_asset_bundle_files_media_file_key', { unique: ['media_asset_id', 'file_id'] });
  pgm.addConstraint('media_asset_bundle_files', 'media_asset_bundle_files_media_position_key', { unique: ['media_asset_id', 'position'] });
  pgm.createIndex('media_asset_bundle_files', ['media_asset_id', 'deleted_at', 'position'], { name: 'idx_media_asset_bundle_files_media_active_position' });
  pgm.createIndex('media_asset_bundle_files', 'file_id', { name: 'idx_media_asset_bundle_files_file_id' });
  pgm.createIndex('media_asset_bundle_files', 'preview_file_id', { name: 'idx_media_asset_bundle_files_preview_file_id' });

  pgm.createTable('media_asset_thumbnails', {
    media_asset_thumbnail_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    media_asset_id: { type: 'uuid', notNull: true, references: 'media_assets' },
    file_id: { type: 'uuid', notNull: true, references: 'files' },
    position: { type: 'integer', notNull: true, default: 0, check: '"position" >= 0' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    deleted_at: { type: 'timestamp' },
  });
  pgm.addConstraint('media_asset_thumbnails', 'media_asset_thumbnails_media_file_key', { unique: ['media_asset_id', 'file_id'] });
  pgm.addConstraint('media_asset_thumbnails', 'media_asset_thumbnails_media_position_key', { unique: ['media_asset_id', 'position'] });
  pgm.createIndex('media_asset_thumbnails', ['media_asset_id', 'deleted_at', 'position'], { name: 'idx_media_asset_thumbnails_media_active_position' });
  pgm.createIndex('media_asset_thumbnails', 'file_id', { name: 'idx_media_asset_thumbnails_file_id' });

  pgm.createTable('market_project_assets', {
    market_asset_id: { type: 'uuid', notNull: true, references: 'market_assets' },
    project_id: { type: 'uuid', notNull: true, references: 'projects' },
  });
  pgm.addConstraint('market_project_assets', 'market_project_assets_pkey', { primaryKey: ['market_asset_id', 'project_id'] });

  pgm.dropTable('market_ydoc_assets');
  pgm.dropTable('market_asset_thumbnails');
  pgm.dropColumns('market_media_assets', ['position']);
};
