/**
 * What a ban closed, so it can be put back.
 *
 * The ban clean-up (backend/services/BanCleanupServices.js) closes the member's open jobs and
 * gigs and delists their marketplace listings. Each one it closes is recorded here with the
 * status it had, so that when the ban was wrong (an accepted appeal) or staff decide so (unban
 * with "restore"), the item returns to exactly where it was — never further.
 *
 * - `item_type`: 'job' | 'gig' | 'listing'. `item_id` is the job, gig or listing id (text, so
 *   one column fits every table). `market_asset_id` + `previous_asset_status` belong to listings.
 * - `restored_at` / `restore_source` ('appeal' | 'staff') / `restored_by_staff_id`: the restore.
 * - `skipped_reason`: why the last restore attempt left it closed (changed since, window ended).
 *
 * Proposals, offers and orders the ban withdrew are not recorded: other people moved on and
 * their credits were already returned.
 * Logic: backend/services/BanRestoreServices.js, backend/repositories/BanCleanupRepositories.js.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = async (pgm) => {
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS ban_cleanup_items (
      ban_cleanup_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id uuid NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
      item_type varchar(10) NOT NULL,
      item_id text NOT NULL,
      title text NULL,
      previous_status varchar(40) NOT NULL,
      market_asset_id uuid NULL,
      previous_asset_status varchar(40) NULL,
      closed_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      closed_by_staff_id uuid NULL,
      restored_at timestamp without time zone NULL,
      restore_source varchar(10) NULL,
      restored_by_staff_id uuid NULL,
      skipped_reason varchar(40) NULL,
      CONSTRAINT ban_cleanup_items_type_check CHECK (item_type IN ('job', 'gig', 'listing')),
      CONSTRAINT ban_cleanup_items_source_check CHECK (restore_source IS NULL OR restore_source IN ('appeal', 'staff'))
    )
  `);
  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS idx_ban_cleanup_items_open
      ON ban_cleanup_items (account_id, closed_at)
      WHERE restored_at IS NULL
  `);
  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS idx_ban_cleanup_items_item
      ON ban_cleanup_items (item_type, item_id)
  `);
};

exports.down = async (pgm) => {
  await pgm.db.query(`DROP TABLE IF EXISTS ban_cleanup_items`);
};
