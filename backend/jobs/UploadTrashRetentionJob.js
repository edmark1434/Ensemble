const { pool } = require('../lib/Database');

async function purgeExpiredUploads() {
  // trashed_at is added by 1827700000000_media-asset-trash; older IDE schema snapshots omit it.
  // noinspection SqlResolve
  const result = await pool.query(`
    UPDATE media_assets
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE deleted_at IS NULL
      AND trashed_at <= CURRENT_TIMESTAMP - INTERVAL '30 days'
  `);
  return result.rowCount || 0;
}

module.exports = { purgeExpiredUploads };
