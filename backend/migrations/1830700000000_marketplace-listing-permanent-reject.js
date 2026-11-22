/**
 * Permanent rejection for marketplace listings.
 *
 * - `marketplace_listings.permanently_rejected_at`: set when staff reject a listing for good
 *   (status stays `rejected`, so every rejected filter and count keeps working). While it is
 *   set the seller cannot resubmit the asset, from the asset page or by saving edits. Any later
 *   staff decision (approve, send back for review) clears it.
 * - Thread kind `rejected_final`: the decision entry the seller reads.
 * Logic: backend/repositories/MarketplaceModeratorRepositories.js (`reviewMarketplaceListing`),
 * backend/services/MarketplaceListingReviewServices.js, backend/lib/ModerationPolicy.js.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE marketplace_listings
      ADD COLUMN IF NOT EXISTS permanently_rejected_at timestamptz NULL
  `);
  await pgm.db.query(`
    ALTER TABLE marketplace_listing_messages
      DROP CONSTRAINT IF EXISTS marketplace_listing_messages_kind_check
  `);
  await pgm.db.query(`
    ALTER TABLE marketplace_listing_messages
      ADD CONSTRAINT marketplace_listing_messages_kind_check CHECK (kind IN (
        'submitted', 'resubmitted', 'reply',
        'approved', 'scheduled', 'published',
        'rejected', 'rejected_final', 'delisted', 'rereview'
      ))
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`
    UPDATE marketplace_listing_messages SET kind = 'rejected' WHERE kind = 'rejected_final'
  `);
  await pgm.db.query(`
    ALTER TABLE marketplace_listing_messages
      DROP CONSTRAINT IF EXISTS marketplace_listing_messages_kind_check
  `);
  await pgm.db.query(`
    ALTER TABLE marketplace_listing_messages
      ADD CONSTRAINT marketplace_listing_messages_kind_check CHECK (kind IN (
        'submitted', 'resubmitted', 'reply',
        'approved', 'scheduled', 'published',
        'rejected', 'delisted', 'rereview'
      ))
  `);
  await pgm.db.query(`ALTER TABLE marketplace_listings DROP COLUMN IF EXISTS permanently_rejected_at`);
};
