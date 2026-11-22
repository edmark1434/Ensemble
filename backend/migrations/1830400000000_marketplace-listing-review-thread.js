/**
 * Marketplace submission review loop.
 *
 * - `marketplace_listings.publish_at`: when an approved listing goes live. Staff can approve for
 *   now, in 24 hours, in 7 days or on a chosen date; until then the listing has status
 *   `scheduled` and its asset stays out of the catalog. A background job publishes it when
 *   `publish_at` passes. The value is kept after publishing as the go-live time.
 * - `marketplace_listing_messages`: one conversation per listing between the seller and staff.
 *   Every decision (approve, schedule, reject, delist, re-review), every submission and
 *   resubmission, plain replies and the automatic go-live are entries, so a listing that goes
 *   back and forth keeps its whole history instead of overwriting `rejection_reason`.
 *
 * Existing rejected / delisted / sent-back listings get one entry from their stored reason so
 * sellers still see why.
 * Logic: backend/repositories/MarketplaceListingThreadRepositories.js,
 * backend/repositories/MarketplaceModeratorRepositories.js (`reviewMarketplaceListing`).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE marketplace_listings
      ADD COLUMN IF NOT EXISTS publish_at timestamptz NULL
  `);
  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS idx_marketplace_listings_scheduled_publish
      ON marketplace_listings (publish_at)
      WHERE status = 'scheduled'
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS marketplace_listing_messages (
      message_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      listing_id uuid NOT NULL REFERENCES marketplace_listings(listing_id) ON DELETE CASCADE,
      kind varchar(20) NOT NULL,
      author_type varchar(10) NOT NULL,
      author_account_id uuid NULL REFERENCES accounts(account_id) ON DELETE SET NULL,
      author_staff_id uuid NULL REFERENCES staff(staff_id) ON DELETE SET NULL,
      body text NULL,
      publish_at timestamptz NULL,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      CONSTRAINT marketplace_listing_messages_kind_check CHECK (kind IN (
        'submitted', 'resubmitted', 'reply',
        'approved', 'scheduled', 'published',
        'rejected', 'delisted', 'rereview'
      )),
      CONSTRAINT marketplace_listing_messages_author_check CHECK (author_type IN ('seller', 'staff', 'system')),
      CONSTRAINT marketplace_listing_messages_body_length CHECK (body IS NULL OR char_length(body) <= 4000)
    )
  `);
  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS idx_marketplace_listing_messages_listing
      ON marketplace_listing_messages (listing_id, created_at, message_id)
  `);

  // One entry per listing from the reason it already carries, so the thread is not empty.
  await pgm.db.query(`
    INSERT INTO marketplace_listing_messages (listing_id, kind, author_type, author_staff_id, body, created_at)
    SELECT
      l.listing_id,
      CASE l.status WHEN 'rejected' THEN 'rejected' WHEN 'delisted' THEN 'delisted' ELSE 'rereview' END,
      'staff',
      l.reviewed_by_staff_id,
      LEFT(BTRIM(CASE WHEN l.status = 'rejected' THEN l.rejection_reason ELSE l.moderation_note END), 4000),
      COALESCE(l.reviewed_at, l.updated_at, NOW())
    FROM marketplace_listings l
    WHERE (
        (l.status = 'rejected' AND NULLIF(BTRIM(l.rejection_reason), '') IS NOT NULL)
        OR (l.status IN ('delisted', 'pending') AND NULLIF(BTRIM(l.moderation_note), '') IS NOT NULL)
      )
      AND NOT EXISTS (
        SELECT 1 FROM marketplace_listing_messages m WHERE m.listing_id = l.listing_id
      )
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  // A scheduled listing was approved but never went live: put it back in the queue.
  await pgm.db.query(`
    UPDATE marketplace_listings
    SET status = 'pending', updated_at = NOW()
    WHERE status = 'scheduled'
  `);
  await pgm.db.query(`DROP TABLE IF EXISTS marketplace_listing_messages`);
  await pgm.db.query(`DROP INDEX IF EXISTS idx_marketplace_listings_scheduled_publish`);
  await pgm.db.query(`ALTER TABLE marketplace_listings DROP COLUMN IF EXISTS publish_at`);
};
