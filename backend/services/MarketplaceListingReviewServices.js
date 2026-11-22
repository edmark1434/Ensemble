const { pool } = require('../lib/Database');
const thread = require('../repositories/MarketplaceListingThreadRepositories');
const { recordAccountActivity } = require('../repositories/AccountActivityRepositories');
const { sendMarketplaceListingNotification } = require('../lib/ModerationPolicy');

/**
 * Submission review loop between a seller and the marketplace desk (docs/api.md
 * "Marketplace submission review").
 *
 * Seller side, on the asset they own (ownership = the asset's latest listing):
 * - `pending` / `scheduled`: plain replies.
 * - `rejected` / `delisted`: resubmit with a message (back to `pending`), here or by saving
 *   edits in the editor (`recordSellerSubmissionServices`).
 * Staff side: replies while the listing is pending, scheduled, rejected or delisted.
 * Decisions themselves go through `reviewMarketplaceListing`.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RESUBMIT_MIN_LENGTH = 5;
const SELLER_REPLY_STATUSES = new Set(['pending', 'scheduled']);
const SELLER_RESUBMIT_STATUSES = new Set(['rejected', 'delisted']);
const STAFF_REPLY_STATUSES = new Set(['pending', 'scheduled', 'rejected', 'delisted']);

class ListingReviewError extends Error {
  constructor(message, statusCode = 400, code = 'LISTING_REVIEW_ERROR') {
    super(message);
    this.name = 'ListingReviewError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function notFound() {
  return new ListingReviewError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
}

/** Trimmed message text; `min` applies only when a message is required. */
function cleanListingMessage(value, { required = true, min = 1, label = 'Message' } = {}) {
  if (value == null || value === '') {
    if (required) throw new ListingReviewError(`${label} is required.`, 400, 'MESSAGE_REQUIRED');
    return null;
  }
  if (typeof value !== 'string') throw new ListingReviewError(`${label} must be text.`, 400, 'VALIDATION_ERROR');
  const text = value.trim();
  if (!text) {
    if (required) throw new ListingReviewError(`${label} is required.`, 400, 'MESSAGE_REQUIRED');
    return null;
  }
  if (text.length < min) {
    throw new ListingReviewError(`${label} must be at least ${min} characters.`, 400, 'MESSAGE_TOO_SHORT');
  }
  if (text.length > thread.LISTING_MESSAGE_MAX_LENGTH) {
    throw new ListingReviewError(
      `${label} must not exceed ${thread.LISTING_MESSAGE_MAX_LENGTH} characters.`,
      400,
      'MESSAGE_TOO_LONG'
    );
  }
  return text;
}

function staffIdFromSession(session) {
  const raw = session?.staff_id || session?.staffId || null;
  return raw && UUID_PATTERN.test(String(raw)) ? raw : null;
}

function emitMarketplaceChange() {
  try {
    require('../lib/WebSocket').emitStaffDataChange(['marketplace']);
  } catch {
    /* Broadcast is best-effort; the desks also refresh on their own. */
  }
}

/** Rejected for good by staff: the seller can read the thread but never resubmit. */
function isPermanentlyRejected(listing) {
  return listing.status === 'rejected' && Boolean(listing.permanently_rejected_at);
}

function sellerActions(listing) {
  const blocked = Boolean(listing.trashed_at || listing.deleted_at);
  return {
    canResubmit: !blocked && !isPermanentlyRejected(listing) && SELLER_RESUBMIT_STATUSES.has(listing.status),
    canReply: !blocked && SELLER_REPLY_STATUSES.has(listing.status),
  };
}

async function loadSellerListing(db, assetId, accountId, { lock = false } = {}) {
  if (!UUID_PATTERN.test(String(assetId || ''))) throw notFound();
  const listing = await thread.getLatestListingForAsset(db, assetId, { lock });
  if (!listing || listing.deleted_at || String(listing.submitted_by_account_id) !== String(accountId)) {
    throw notFound();
  }
  return listing;
}

function shapeSellerThread(listing, messages) {
  const status = listing.status;
  return {
    listingId: listing.listing_id,
    number: listing.listing_number,
    status,
    // Go-live time for a scheduled listing, or when an approved one went live.
    publishAt: status === 'scheduled' || status === 'approved' ? listing.publish_at || null : null,
    rejectionReason: status === 'rejected' ? listing.rejection_reason || null : null,
    permanentlyRejected: isPermanentlyRejected(listing),
    moderationNote: status === 'delisted' || status === 'pending' ? listing.moderation_note || null : null,
    reviewedAt: listing.reviewed_at || null,
    submittedAt: listing.created_at,
    trashed: Boolean(listing.trashed_at),
    ...sellerActions(listing),
    messages,
  };
}

async function getSellerSubmissionThreadServices(assetId, accountId) {
  const listing = await loadSellerListing(pool, assetId, accountId);
  const messages = await thread.listListingMessages(listing.listing_id, { viewer: 'seller' });
  return shapeSellerThread(listing, messages);
}

function sellerStateConflict(status, wantsResubmit, permanentlyRejected = false) {
  if (permanentlyRejected) {
    return 'This asset was permanently rejected by the review team and cannot be resubmitted.';
  }
  if (wantsResubmit) {
    if (status === 'pending') return 'This asset is already waiting for review.';
    if (status === 'scheduled') return 'This asset is already approved and scheduled to go live.';
    if (status === 'approved') return 'This asset is live. Edit it to change the listing.';
    return 'Only a rejected or delisted asset can be resubmitted.';
  }
  if (SELLER_RESUBMIT_STATUSES.has(status)) {
    return 'Resubmit the asset with your message so the review team sees it in the queue.';
  }
  return 'Messages are open while the asset is under review or scheduled.';
}

/**
 * Seller message on their own submission. `resubmit: true` sends a rejected or delisted asset
 * back to the review queue with the message (at least 5 characters); otherwise it is a reply
 * on a pending or scheduled submission.
 */
async function postSellerSubmissionMessageServices(assetId, accountId, payload = {}) {
  const wantsResubmit = payload?.resubmit === true;
  const body = cleanListingMessage(payload?.body, {
    required: true,
    min: wantsResubmit ? RESUBMIT_MIN_LENGTH : 1,
    label: wantsResubmit ? 'A message to the review team' : 'Message',
  });

  if (wantsResubmit) {
    const { assertWarningAllows } = require('./WarningBandServices');
    try {
      await assertWarningAllows(accountId, 'publish_asset');
    } catch (err) {
      if (err.code === 'WARNING_RESTRICTED') throw new ListingReviewError(err.message, 403, err.code);
      throw err;
    }
  }

  const client = await pool.connect();
  let listing;
  try {
    await client.query('BEGIN');
    listing = await loadSellerListing(client, assetId, accountId, { lock: true });
    const actions = sellerActions(listing);
    if (listing.trashed_at) {
      throw new ListingReviewError('Restore this asset from Trash first.', 409, 'ASSET_TRASHED');
    }
    if (wantsResubmit ? !actions.canResubmit : !actions.canReply) {
      if (isPermanentlyRejected(listing)) {
        throw new ListingReviewError(
          sellerStateConflict(listing.status, wantsResubmit, true),
          409,
          'LISTING_PERMANENTLY_REJECTED'
        );
      }
      throw new ListingReviewError(sellerStateConflict(listing.status, wantsResubmit), 409, 'SUBMISSION_STATE_CONFLICT');
    }
    if (wantsResubmit) {
      const moved = await thread.moveListingBackToReview(client, listing.listing_id, listing.status);
      if (!moved) {
        throw new ListingReviewError('This submission changed. Reload and try again.', 409, 'SUBMISSION_STATE_CONFLICT');
      }
    }
    await thread.insertListingMessage(client, {
      listingId: listing.listing_id,
      kind: wantsResubmit ? 'resubmitted' : 'reply',
      authorType: 'seller',
      authorAccountId: accountId,
      body,
    });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  if (wantsResubmit) {
    await recordAccountActivity({
      accountId,
      action: `Listing ${listing.listing_number || listing.title || listing.listing_id} resubmitted for review`,
      eventCode: 'LISTING_RESUBMITTED',
      referenceTable: 'marketplace_listings',
      referencePrefix: 'LST',
      referenceId: listing.listing_id,
      actorAccountId: accountId,
      metadata: { status: 'pending', previousStatus: listing.status, title: listing.title, message: body },
    });
  }
  emitMarketplaceChange();
  return getSellerSubmissionThreadServices(assetId, accountId);
}

/**
 * Thread entry for a submission made by saving the asset (create or edit), after that save
 * succeeded. The first entry on a listing is `submitted`, later ones `resubmitted`.
 * Never throws: the asset save already happened.
 */
async function recordSellerSubmissionServices({ listingId, accountId, body = null }) {
  if (!listingId) return;
  try {
    const count = await thread.countListingMessages(pool, listingId);
    await thread.insertListingMessage(pool, {
      listingId,
      kind: count === 0 ? 'submitted' : 'resubmitted',
      authorType: 'seller',
      authorAccountId: accountId,
      body,
    });
    emitMarketplaceChange();
  } catch (err) {
    console.error('Listing thread entry skipped:', err.message);
  }
}

/** Staff reply on a listing thread. Returns the refreshed thread (staff view). */
async function postStaffListingMessageServices(listingId, staffSession, payload = {}) {
  if (!UUID_PATTERN.test(String(listingId || ''))) {
    throw new ListingReviewError('Listing not found', 404, 'LISTING_NOT_FOUND');
  }
  const body = cleanListingMessage(payload?.body, { required: true, min: 1 });
  const listing = await thread.getListingForStaffMessage(listingId);
  if (!listing) throw new ListingReviewError('Listing not found', 404, 'LISTING_NOT_FOUND');
  if (!STAFF_REPLY_STATUSES.has(String(listing.status || '').toLowerCase())) {
    throw new ListingReviewError(
      listing.status === 'approved'
        ? 'This listing is live. Delist it or send it back for re-approval to message the seller.'
        : 'This listing has not been submitted for review.',
      409,
      'LISTING_THREAD_CLOSED'
    );
  }
  const staffId = staffIdFromSession(staffSession);
  await thread.insertListingMessage(pool, {
    listingId,
    kind: 'reply',
    authorType: 'staff',
    authorStaffId: staffId,
    body,
  });

  await sendMarketplaceListingNotification({
    accountId: listing.submitted_by_account_id,
    marketAssetId: listing.market_asset_id,
    listingId,
    title: listing.title || 'Untitled Asset',
    status: 'message',
    messageBody: body,
  });
  await recordAccountActivity({
    accountId: listing.submitted_by_account_id,
    action: `Staff replied on listing ${listing.listing_number || listing.title || listingId}`,
    eventCode: 'LISTING_MESSAGE',
    referenceTable: 'marketplace_listings',
    referencePrefix: 'LST',
    referenceId: listingId,
    actorStaffId: staffId,
    metadata: { status: listing.status, moderationNote: body, title: listing.title },
  });
  emitMarketplaceChange();
  return { messages: await thread.listListingMessages(listingId, { viewer: 'staff' }) };
}

/**
 * Go-live job: publish every scheduled listing whose time has come (up to `limit` per run),
 * then tell each seller. Each listing commits on its own before its notice goes out.
 */
async function publishDueScheduledListingsServices({ limit = 50 } = {}) {
  let published = 0;
  for (let i = 0; i < limit; i += 1) {
    const row = await thread.publishNextDueScheduledListing();
    if (!row) break;
    published += 1;
    await sendMarketplaceListingNotification({
      accountId: row.submitted_by_account_id,
      marketAssetId: row.market_asset_id,
      listingId: row.listing_id,
      title: row.title || 'Untitled Asset',
      status: 'published',
      publishAt: row.publish_at,
    });
    await recordAccountActivity({
      accountId: row.submitted_by_account_id,
      action: `Listing ${row.listing_number || row.title || row.listing_id} went live`,
      eventCode: 'LISTING_PUBLISHED',
      referenceTable: 'marketplace_listings',
      referencePrefix: 'LST',
      referenceId: row.listing_id,
      metadata: { status: 'approved', previousStatus: 'scheduled', publishAt: row.publish_at, title: row.title },
    });
    try {
      require('./BadgeServices').scheduleBadgeEvaluation(row.submitted_by_account_id);
    } catch (badgeErr) {
      console.error('Badge evaluation after scheduled publish failed:', badgeErr.message);
    }
  }
  if (published) emitMarketplaceChange();
  return { published };
}

module.exports = {
  ListingReviewError,
  cleanListingMessage,
  getSellerSubmissionThreadServices,
  postSellerSubmissionMessageServices,
  recordSellerSubmissionServices,
  postStaffListingMessageServices,
  publishDueScheduledListingsServices,
};
