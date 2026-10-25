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
  pgm.createTable('media_asset_jobs', {
    media_asset_job_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    media_asset_id: { type: 'uuid', notNull: true, unique: true, references: 'media_assets' },
    market_asset_id: { type: 'uuid', notNull: true, references: 'market_assets' },
    kind: { type: 'text', notNull: true, check: "kind IN ('video', 'audio')" },
    status: {
      type: 'text', notNull: true, default: 'pending',
      check: "status IN ('pending', 'running', 'done', 'failed')",
    },
    // status to give the listing once every job of it is done (null = leave the listing alone)
    publish_status: { type: 'text' },
    attempts: { type: 'integer', notNull: true, default: 0 },
    error: { type: 'text' },
    locked_at: { type: 'timestamp' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    finished_at: { type: 'timestamp' },
  });
  pgm.createIndex('media_asset_jobs', ['status', 'created_at']);
  pgm.createIndex('media_asset_jobs', 'market_asset_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('media_asset_jobs');
};
