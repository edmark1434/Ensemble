const { pool } = require('./Database');
const { DEFAULT_SETTINGS } = require('./PlatformConfiguration');
const { getSectionValue } = require('../repositories/AdminSettingsRepositories');
const { recordAccountActivity } = require('../repositories/AccountActivityRepositories');
const { sumActiveWarningPoints } = require('../repositories/WarningBandRepositories');

async function getModerationSettings() {
  // Automod toggles were removed from System Settings.
  return {};
}

async function getSecuritySettings() {
  try {
    const saved = await getSectionValue('security');
    return {
      ...DEFAULT_SETTINGS.security,
      ...(saved || {}),
    };
  } catch {
    return { ...DEFAULT_SETTINGS.security };
  }
}

/**
 * Evaluate user-authored text.
 * Automod spam/profanity toggles were removed — content is never blocked here.
 */
async function evaluateUserContent() {
  return {
    blocked: false,
    reasons: [],
    flags: { spam: false, profanity: false, suspiciousLinks: false },
    settings: {},
  };
}

/**
 * Queue or update a pending marketplace_listings row for moderator approval and return
 * the status that should be persisted on market_assets ('draft').
 * Already-published assets keep published status when their details are edited.
 *
 * A queued result carries `listingId` and `previousStatus` (the listing status before this
 * call, null for a new row) so the caller can add the submission to the listing thread once
 * its own save has succeeded. A scheduled listing that is edited goes back to `pending`: the
 * content changed after approval.
 */
async function resolveMarketplacePublishStatus({
  accountId,
  marketAssetId = null,
  title,
  description,
  priceCredits,
  category = 'Assets',
  thumbnailUrl = null,
  requestedStatus,
  currentStatus = 'draft',
}) {
  if (String(requestedStatus).toLowerCase() !== 'published') {
    return { status: requestedStatus, queued: false };
  }

  const { assertWarningAllows } = require('../services/WarningBandServices');
  await assertWarningAllows(accountId, 'publish_asset');

  // If the asset is ALREADY published, updating its details preserves published status
  if (currentStatus === 'published') {
    if (marketAssetId) {
      try {
        await pool.query(
          `UPDATE marketplace_listings
           SET title = $1, description = $2, category = $3, price_credits = $4,
               thumbnail_url = COALESCE($5, thumbnail_url), updated_at = NOW()
           WHERE market_asset_id = $6`,
          [
            String(title || 'Untitled').slice(0, 255),
            description || null,
            category,
            Number(priceCredits) || 0,
            thumbnailUrl || null,
            marketAssetId,
          ]
        );
      } catch (err) {
        console.warn('marketplaceListing sync skipped:', err.message);
      }
    }
    return { status: requestedStatus, queued: false };
  }

  // New publishes always enter the moderator review queue before going live.
  try {
    // Check if an existing listing already exists for this market_asset_id
    let existingListing = null;
    if (marketAssetId) {
      const existing = await pool.query(
        `SELECT listing_id, listing_number, status, permanently_rejected_at
         FROM marketplace_listings
         WHERE market_asset_id = $1
         ORDER BY created_at DESC LIMIT 1`,
        [marketAssetId]
      );
      existingListing = existing.rows[0] || null;
    }

    // Staff rejected this asset for good: saving it must not put it back in the queue.
    if (existingListing?.status === 'rejected' && existingListing.permanently_rejected_at) {
      const err = new Error('This asset was permanently rejected by the review team and cannot be resubmitted.');
      err.code = 'LISTING_PERMANENTLY_REJECTED';
      throw err;
    }

    if (existingListing) {
      // UPDATE existing listing instead of inserting duplicate!
      await pool.query(
        `UPDATE marketplace_listings
         SET title = $1, description = $2, category = $3, price_credits = $4,
             thumbnail_url = COALESCE($5, thumbnail_url), status = 'pending',
             rejection_reason = NULL, reviewed_by_staff_id = NULL, reviewed_at = NULL,
             updated_at = NOW()
         WHERE listing_id = $6 AND permanently_rejected_at IS NULL`,
        [
          String(title || 'Untitled').slice(0, 255),
          description || null,
          category,
          Number(priceCredits) || 0,
          thumbnailUrl || null,
          existingListing.listing_id,
        ]
      );
      return {
        status: 'draft',
        queued: true,
        listingId: existingListing.listing_id,
        previousStatus: existingListing.status || null,
        listingNumber: existingListing.listing_number,
        message: 'Listing submitted for moderator approval. It will be published once approved.',
      };
    }

    const listingNumber = `LST-${Date.now().toString().slice(-10)}`;
    const inserted = await pool.query(
      `
      INSERT INTO marketplace_listings (
        listing_number, submitted_by_account_id, market_asset_id, title, description,
        category, price_credits, thumbnail_url, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW(), NOW())
      RETURNING listing_id
      `,
      [
        listingNumber,
        accountId || null,
        marketAssetId || null,
        String(title || 'Untitled').slice(0, 255),
        description || null,
        category,
        Number(priceCredits) || 0,
        thumbnailUrl || null,
      ]
    );

    return {
      status: 'draft',
      queued: true,
      listingId: inserted.rows[0]?.listing_id || null,
      previousStatus: null,
      listingNumber,
      message: 'Listing submitted for moderator approval. It will be published once approved.',
    };
  } catch (err) {
    if (err.code === 'LISTING_PERMANENTLY_REJECTED') throw err;
    // Fail closed: a listing that could not enter the queue stays a draft. Returning the
    // requested 'published' here used to put it in the catalog without any review.
    console.error('marketplaceListingReview queue failed:', err.message);
    return { status: 'draft', queued: false };
  }
}

/**
 * Round-robin assign an unassigned dispute to an active support/admin staff member.
 */
async function applyDisputeAutomations(disputeRow) {
  // Dispute auto-assign was removed from Automod settings; staff must claim disputes.
  return disputeRow;
}

/**
 * Kept as a no-op for callers/jobs after dispute auto-assign was removed.
 */
async function reconcileUnassignedDisputes() {
  return { assigned: 0 };
}

/**
 * Request-path variant: concurrent callers share one run, and runs are spaced
 * at least REQUEST_RECONCILE_INTERVAL_MS apart. The cron job still reconciles.
 */
const REQUEST_RECONCILE_INTERVAL_MS = 30 * 1000;
let reconcileInFlight = null;
let lastReconcileStartedAt = 0;

function reconcileUnassignedDisputesThrottled() {
  if (reconcileInFlight) return reconcileInFlight;
  if (Date.now() - lastReconcileStartedAt < REQUEST_RECONCILE_INTERVAL_MS) {
    return Promise.resolve({ assigned: 0, skipped: true });
  }
  lastReconcileStartedAt = Date.now();
  reconcileInFlight = reconcileUnassignedDisputes().finally(() => {
    reconcileInFlight = null;
  });
  return reconcileInFlight;
}

/**
 * Apply report automations after a report is created.
 * Auto-escalate and auto-ticket creation were removed from Automod settings.
 */
async function applyReportAutomations(reportRow, { staffId = null } = {}) {
  if (!reportRow?.report_id && !reportRow?.id) return reportRow;
  const reportId = reportRow.report_id || reportRow.id;
  const priority = String(reportRow.priority || 'medium').toLowerCase();

  const accountId = reportRow.for_account_id || reportRow.by_account_id || null;
  if (accountId) {
    await recordAccountActivity({
      accountId,
      action: `Report ${reportRow.report_number || reportId} filed`,
      eventCode: 'REPORT_CREATED',
      referenceTable: 'reports',
      referencePrefix: 'RPT',
      referenceId: reportId,
      actorStaffId: staffId,
      actorAccountId: reportRow.by_account_id || null,
      metadata: {
        type: reportRow.type,
        priority,
      },
    });
  }

  if (priority === 'high') {
    try {
      const { dispatchPlatformNotification } = require('../services/PlatformAlertServices');
      dispatchPlatformNotification('HIGH_PRIORITY_REPORT', {
        report_number: reportRow.report_number,
        report_id: reportId,
        reason: reportRow.type || reportRow.reason,
        category: reportRow.category,
      }).catch(() => {});
    } catch {}
  }

  return { ...reportRow, priority };
}

/** Go-live time in notification text (UTC; the asset page shows it in local time). */
function formatGoLive(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'soon';
  return `${date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  })} UTC`;
}

/**
 * Dispatch in-app notification and realtime socket events for marketplace listing review decisions.
 * `status` is the listing status after the change, plus two thread events:
 * `published` (a scheduled listing went live) and `message` (staff replied in the thread).
 */
async function sendMarketplaceListingNotification({
  accountId,
  marketAssetId,
  listingId,
  title,
  status,
  rejectionReason = null,
  moderationNote = null,
  publishAt = null,
  messageBody = null,
  permanent = false,
}) {
  if (!accountId) return;
  const assetTitle = String(title || 'Untitled Asset').trim();
  const note = String(moderationNote || '').trim();
  const excerpt = String(messageBody || '').trim();
  const short = excerpt.length > 160 ? `${excerpt.slice(0, 157)}…` : excerpt;
  let message = '';
  if (status === 'approved') {
    message = `Your asset "${assetTitle}" has been approved by moderators and is now published to the Marketplace!${short ? ` Note: ${short}` : ''}`;
  } else if (status === 'published') {
    message = `Your asset "${assetTitle}" is now live on the Marketplace.`;
  } else if (status === 'scheduled') {
    message = `Your asset "${assetTitle}" was approved and goes live on the Marketplace on ${formatGoLive(publishAt)}.${short ? ` Note: ${short}` : ''}`;
  } else if (status === 'rejected' && permanent) {
    message = `Your asset "${assetTitle}" was permanently rejected and cannot be resubmitted to the Marketplace.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`;
  } else if (status === 'rejected') {
    message = `Your asset "${assetTitle}" was not approved.${rejectionReason ? ` Reason: ${rejectionReason}` : ''} Open the asset to read the feedback, then resubmit it with a message.`;
  } else if (status === 'delisted') {
    message = `Your asset "${assetTitle}" has been delisted from the Marketplace and reverted to draft.${note ? ` Reason: ${note}` : ''} You can resubmit it with a message from the asset page.`;
  } else if (status === 'pending') {
    message = `Your asset "${assetTitle}" was removed from the Marketplace and is being re-reviewed by moderators.${note ? ` Reason: ${note}` : ''}`;
  } else if (status === 'message') {
    message = `The marketplace review team replied about "${assetTitle}"${short ? `: ${short}` : '.'}`;
  } else {
    return;
  }

  try {
    const { createNotification } = require('../repositories/NotificationRepositories');
    const notification = await createNotification({
      account_id: accountId,
      message,
      is_read: false,
      reference_table: 'marketplace_listings',
      reference_prefix: 'MARKETPLACE',
      reference_path: marketAssetId ? `/assets/${marketAssetId}` : '/assets/owned',
      reference_id: listingId,
    });

    try {
      const { getIo } = require('./WebSocket');
      const io = getIo();
      if (io) {
        io.to(String(accountId)).emit('notification', notification);
        io.to(String(accountId)).emit('assetStatusUpdated', {
          marketAssetId,
          status,
          rejectionReason,
          permanentlyRejected: status === 'rejected' && Boolean(permanent),
          moderationNote: note || null,
          publishAt: publishAt || null,
        });
      }
    } catch (wsErr) {
      console.warn('WebSocket emit skipped:', wsErr.message);
    }
  } catch (err) {
    console.warn('Failed to send marketplace listing notification:', err.message);
  }
}

module.exports = {
  getModerationSettings,
  getSecuritySettings,
  evaluateUserContent,
  resolveMarketplacePublishStatus,
  sendMarketplaceListingNotification,
  applyDisputeAutomations,
  reconcileUnassignedDisputes,
  reconcileUnassignedDisputesThrottled,
  countActiveWarnings: sumActiveWarningPoints,
  sumActiveWarningPoints,
  applyReportAutomations,
};
