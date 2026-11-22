const { pool } = require('../lib/Database');

/**
 * Conversation between a seller and the marketplace staff on one listing
 * (`marketplace_listing_messages`, migration 1830400000000).
 *
 * Entries are decisions (`approved`, `scheduled`, `rejected`, `delisted`, `rereview`),
 * submissions (`submitted`, `resubmitted`), plain `reply` messages and the automatic
 * `published` go-live. The listing row keeps only the current state; the thread keeps history.
 */

const THREAD_KINDS = Object.freeze([
  'submitted',
  'resubmitted',
  'reply',
  'approved',
  'scheduled',
  'published',
  'rejected',
  'delisted',
  'rereview',
]);
const THREAD_KIND_SET = new Set(THREAD_KINDS);

/** Longest message either side can write (the column check allows 4000). */
const LISTING_MESSAGE_MAX_LENGTH = 2000;

/** Sellers see staff as one team, never a staff member's name. */
const SELLER_FACING_STAFF_NAME = 'Marketplace review team';

function mapThreadMessage(row, viewer) {
  const isStaffAuthor = row.author_type === 'staff';
  const isSellerAuthor = row.author_type === 'seller';
  let authorName = 'Ensemble';
  if (isSellerAuthor) authorName = row.seller_name || 'Seller';
  if (isStaffAuthor) {
    authorName = viewer === 'staff' ? row.staff_name || 'Staff' : SELLER_FACING_STAFF_NAME;
  }
  return {
    id: row.message_id,
    kind: row.kind,
    authorType: row.author_type,
    authorName,
    // Staff role is for the staff desks only.
    authorRole: viewer === 'staff' && isStaffAuthor ? row.staff_role || null : null,
    body: row.body || null,
    publishAt: row.publish_at || null,
    createdAt: row.created_at,
  };
}

/**
 * Add one entry. Pass a transaction client when the entry belongs to a status change, so the
 * two are saved together.
 */
async function insertListingMessage(
  db,
  { listingId, kind, authorType, authorAccountId = null, authorStaffId = null, body = null, publishAt = null }
) {
  if (!THREAD_KIND_SET.has(kind)) throw new Error(`Unknown listing message kind: ${kind}`);
  const text = body == null ? null : String(body).trim().slice(0, 4000) || null;
  const result = await (db || pool).query(
    `INSERT INTO marketplace_listing_messages
       (listing_id, kind, author_type, author_account_id, author_staff_id, body, publish_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING message_id, created_at`,
    [listingId, kind, authorType, authorAccountId, authorStaffId, text, publishAt]
  );
  return result.rows[0];
}

/** The whole thread, oldest first. `viewer` decides how staff authors are named. */
async function listListingMessages(listingId, { viewer = 'seller', db = pool } = {}) {
  const result = await db.query(
    `SELECT
       m.message_id, m.kind, m.author_type, m.body, m.publish_at, m.created_at,
       COALESCE(staff_account.display_name, s.first_name || ' ' || s.last_name) AS staff_name,
       s.role::text AS staff_role,
       COALESCE(seller_account.display_name, seller_user.first_name || ' ' || seller_user.last_name) AS seller_name
     FROM marketplace_listing_messages m
     LEFT JOIN staff s ON s.staff_id = m.author_staff_id
     LEFT JOIN accounts staff_account ON staff_account.account_id = s.account_id
     LEFT JOIN accounts seller_account ON seller_account.account_id = m.author_account_id
     LEFT JOIN users seller_user ON seller_user.account_id = seller_account.account_id
     WHERE m.listing_id = $1
     ORDER BY m.created_at, m.message_id
     LIMIT 500`,
    [listingId]
  );
  return result.rows.map((row) => mapThreadMessage(row, viewer));
}

async function countListingMessages(db, listingId) {
  const result = await (db || pool).query(
    `SELECT COUNT(*)::int AS count FROM marketplace_listing_messages WHERE listing_id = $1`,
    [listingId]
  );
  return Number(result.rows[0]?.count || 0);
}

/**
 * The asset's latest listing — the one that decides who owns it (docs/database.md) — with the
 * asset state a seller action depends on. `lock` holds the listing row for a status change.
 */
async function getLatestListingForAsset(db, marketAssetId, { lock = false } = {}) {
  const result = await (db || pool).query(
    `SELECT
       l.listing_id, l.listing_number, l.title, l.status, l.rejection_reason, l.moderation_note,
       l.publish_at, l.reviewed_at, l.created_at, l.updated_at, l.submitted_by_account_id,
       l.market_asset_id,
       ma.status AS asset_status, ma.trashed_at, ma.deleted_at
     FROM marketplace_listings l
     JOIN market_assets ma ON ma.market_asset_id = l.market_asset_id
     WHERE l.market_asset_id = $1
     ORDER BY l.created_at DESC, l.listing_id DESC
     LIMIT 1
     ${lock ? 'FOR UPDATE OF l' : ''}`,
    [marketAssetId]
  );
  return result.rows[0] || null;
}

/** Basic listing facts for a staff reply (who to notify, which asset). */
async function getListingForStaffMessage(listingId) {
  const result = await pool.query(
    `SELECT listing_id, listing_number, title, status, submitted_by_account_id, market_asset_id
     FROM marketplace_listings WHERE listing_id = $1`,
    [listingId]
  );
  return result.rows[0] || null;
}

/**
 * Seller resubmission: back to the review queue from `fromStatus`. The old reason and the
 * last review are cleared from the row; the thread keeps them.
 */
async function moveListingBackToReview(db, listingId, fromStatus) {
  const result = await db.query(
    `UPDATE marketplace_listings
     SET status = 'pending',
         rejection_reason = NULL,
         moderation_note = NULL,
         reviewed_by_staff_id = NULL,
         reviewed_at = NULL,
         publish_at = NULL,
         updated_at = NOW()
     WHERE listing_id = $1 AND status = $2`,
    [listingId, fromStatus]
  );
  return result.rowCount > 0;
}

/**
 * Publish the oldest scheduled listing whose time has come, in its own transaction, and
 * return it (null when none is due). The listing, the asset and the `published` entry are
 * saved together; notifying the seller is the caller's job, after the commit.
 */
async function publishNextDueScheduledListing() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const due = await client.query(
      `SELECT listing_id, listing_number, title, submitted_by_account_id, market_asset_id, publish_at
       FROM marketplace_listings
       WHERE status = 'scheduled' AND publish_at IS NOT NULL AND publish_at <= NOW()
       ORDER BY publish_at, listing_id
       LIMIT 1
       FOR UPDATE SKIP LOCKED`
    );
    const row = due.rows[0];
    if (!row) {
      await client.query('COMMIT');
      return null;
    }
    await client.query(
      `UPDATE marketplace_listings SET status = 'approved', updated_at = NOW() WHERE listing_id = $1`,
      [row.listing_id]
    );
    if (row.market_asset_id) {
      await client.query(
        `UPDATE market_assets SET status = 'published', updated_at = NOW()
         WHERE market_asset_id = $1 AND deleted_at IS NULL`,
        [row.market_asset_id]
      );
    }
    await insertListingMessage(client, {
      listingId: row.listing_id,
      kind: 'published',
      authorType: 'system',
      publishAt: row.publish_at,
    });
    await client.query('COMMIT');
    return row;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  THREAD_KINDS,
  LISTING_MESSAGE_MAX_LENGTH,
  SELLER_FACING_STAFF_NAME,
  insertListingMessage,
  listListingMessages,
  countListingMessages,
  getLatestListingForAsset,
  getListingForStaffMessage,
  moveListingBackToReview,
  publishNextDueScheduledListing,
};
