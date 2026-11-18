const { pool } = require('./Database');
const { DEFAULT_SETTINGS } = require('./PlatformConfiguration');
const { getSectionValue } = require('../repositories/AdminSettingsRepositories');
const { recordAccountActivity } = require('../repositories/AccountActivityRepositories');
const { sumActiveWarningPoints } = require('../repositories/WarningBandRepositories');
const {
  autoSuspendRowForPoints,
  AUTO_SUSPEND_POINTS,
  AUTO_SUSPEND_DAYS,
  DEFAULT_MERIT,
  meritFromWarningPoints,
  refreshLiveThresholds,
} = require('./WarningBands');

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
        `SELECT listing_id, listing_number, status
         FROM marketplace_listings
         WHERE market_asset_id = $1
         ORDER BY created_at DESC LIMIT 1`,
        [marketAssetId]
      );
      existingListing = existing.rows[0] || null;
    }

    if (existingListing) {
      // UPDATE existing listing instead of inserting duplicate!
      await pool.query(
        `UPDATE marketplace_listings
         SET title = $1, description = $2, category = $3, price_credits = $4,
             thumbnail_url = COALESCE($5, thumbnail_url), status = 'pending',
             rejection_reason = NULL, reviewed_by_staff_id = NULL, reviewed_at = NULL,
             updated_at = NOW()
         WHERE listing_id = $6`,
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
        listingNumber: existingListing.listing_number,
        message: 'Listing submitted for moderator approval. It will be published once approved.',
      };
    }

    const listingNumber = `LST-${Date.now().toString().slice(-10)}`;
    await pool.query(
      `
      INSERT INTO marketplace_listings (
        listing_number, submitted_by_account_id, market_asset_id, title, description,
        category, price_credits, thumbnail_url, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW(), NOW())
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
      listingNumber,
      message: 'Listing submitted for moderator approval. It will be published once approved.',
    };
  } catch (err) {
    console.warn('marketplaceListingReview queue skipped:', err.message);
    return { status: requestedStatus, queued: false };
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
 * After a warning is issued, suspend when warning thresholds say so
 * (managed under /admin/warnings). Already-suspended accounts are not stacked.
 */
async function maybeAutoSuspendAfterWarning(accountId, staffId = null) {
  if (!accountId) return null;
  const activeCount = await sumActiveWarningPoints(accountId);
  await refreshLiveThresholds();
  const rule = autoSuspendRowForPoints(activeCount);
  const days = rule?.suspendDays || 0;
  if (!days) {
    return { suspended: false, activeCount, max: AUTO_SUSPEND_POINTS };
  }
  // Copied onto the account like a warning copies its catalog clock: later threshold edits
  // do not change a suspension already running.
  const liftAtMerit = rule.liftAtMerit ?? null;

  const previous = await pool.query(
    `SELECT status FROM accounts WHERE account_id = $1 AND deleted_at IS NULL`,
    [accountId]
  );
  if (!previous.rows.length) return { suspended: false, activeCount, max: AUTO_SUSPEND_POINTS };
  const previousStatus = previous.rows[0].status;
  const current = String(previousStatus).toLowerCase();
  if (current === 'suspended') {
    return { suspended: false, alreadySuspended: true, activeCount, max: AUTO_SUSPEND_POINTS };
  }
  // A ban or lock is stricter than a suspension. Writing Suspended over it would turn a
  // permanent ban into a 7-day suspension that then lifts to Active.
  if (current === 'banned' || current === 'locked') {
    return { suspended: false, stricterStanding: current, activeCount, max: AUTO_SUSPEND_POINTS };
  }

  // Guarded again in SQL, in case a ban landed between the read and this write. The engine
  // marker is only written once the warning-lift migration has added its columns.
  const { autoSuspendColumnsReady } = require('./SchemaFeatures');
  const markAuto = await autoSuspendColumnsReady();
  const applied = await pool.query(
    `UPDATE accounts
     SET status = 'Suspended',
         suspension_ends_at = NOW() + ($2 * INTERVAL '1 day')
         ${markAuto ? ", suspension_source = 'auto', auto_suspend_lift_merit = $3" : ''}
     WHERE account_id = $1
       AND LOWER(COALESCE(status, 'active')) NOT IN ('banned', 'locked', 'suspended')`,
    markAuto ? [accountId, days, liftAtMerit] : [accountId, days]
  );
  if (!applied.rowCount) {
    return { suspended: false, activeCount, max: AUTO_SUSPEND_POINTS };
  }
  await recordAccountActivity({
    accountId,
    action: `Auto-suspended ${days} day(s) after ${activeCount} active warning point(s)`,
    eventCode: 'ACCOUNT_STATUS_CHANGED',
    referenceTable: 'accounts',
    referencePrefix: 'ACC',
    referenceId: accountId,
    actorStaffId: staffId,
    metadata: {
      previousStatus,
      status: 'Suspended',
      action: 'auto_suspend',
      activeWarnings: activeCount,
      maxWarningsBeforeSuspend: AUTO_SUSPEND_POINTS,
      suspensionDays: days,
      liftAtMerit,
      source: 'warning_thresholds',
    },
  });

  // The one suspension notice for this crossing. notifyAccountWarned does not send another.
  try {
    const { notifyAccountStatusChanged } = require('../services/AccountStandingServices');
    await notifyAccountStatusChanged(accountId, {
      status: 'Suspended',
      previousStatus,
      action: 'auto_suspend',
      reason: 'Auto-suspended after exceeding active warning threshold',
    });
  } catch (notifyErr) {
    console.error('Failed to notify auto-suspended account:', notifyErr);
  }

  return { suspended: true, activeCount, max: AUTO_SUSPEND_POINTS, days, liftAtMerit, previousStatus };
}

/** Same per-row weight as sumActiveWarningPoints. */
const ACTIVE_POINTS_SQL = `
  COALESCE((
    SELECT SUM(LEAST(GREATEST(COALESCE(v.points, 1), 1), 10))
    FROM violations v
    WHERE v.account_id = a.account_id
      AND v.deleted_at IS NULL
      AND LOWER(COALESCE(v.status, 'active')) IN ('active', 'open', 'pending')
      AND (v.expires_at IS NULL OR v.expires_at > NOW())
  ), 0)
`;

/**
 * End warning-engine suspensions early once the member's Platform Merit has recovered to the
 * level copied from the auto-suspend threshold (warnings expired, rescinded or lifted).
 * Staff suspensions are never touched: only rows with `suspension_source = 'auto'` qualify,
 * and every staff status change clears that marker.
 * @param {{ accountId?: string|null, limit?: number }} [options]
 * @returns {Promise<{ accountId: string, merit: number, nextStatus: string }[]>}
 */
async function liftRecoveredAutoSuspensions({ accountId = null, limit = 100 } = {}) {
  const { autoSuspendColumnsReady } = require('./SchemaFeatures');
  if (!(await autoSuspendColumnsReady())) return [];
  const result = await pool.query(
    `
    WITH recovered AS (
      SELECT a.account_id, a.status, ${ACTIVE_POINTS_SQL} AS points
      FROM accounts a
      WHERE a.deleted_at IS NULL
        AND ($1::uuid IS NULL OR a.account_id = $1::uuid)
        AND LOWER(COALESCE(a.status, '')) = 'suspended'
        AND a.suspension_source = 'auto'
        AND a.auto_suspend_lift_merit IS NOT NULL
        AND GREATEST(0, $3::int - ${ACTIVE_POINTS_SQL}) >= a.auto_suspend_lift_merit
      LIMIT $2
      FOR UPDATE OF a SKIP LOCKED
    )
    UPDATE accounts a
    SET status = CASE WHEN a.deactivated_at IS NOT NULL AND LOWER(COALESCE(a.type, '')) = 'user'
          THEN 'Deactivated' ELSE 'Active' END,
        suspension_ends_at = NULL,
        suspension_source = NULL,
        auto_suspend_lift_merit = NULL
    FROM recovered r
    WHERE a.account_id = r.account_id
      AND LOWER(COALESCE(a.status, '')) = 'suspended'
      AND a.suspension_source = 'auto'
    RETURNING a.account_id, r.points, a.status AS next_status
    `,
    [accountId || null, limit, DEFAULT_MERIT]
  );

  const lifted = result.rows.map((row) => ({
    accountId: String(row.account_id),
    merit: meritFromWarningPoints(Number(row.points || 0)),
    nextStatus: row.next_status || 'Active',
  }));

  for (const item of lifted) {
    // Best effort: the lift is already committed.
    announceAutoSuspensionLift(item).catch((err) =>
      console.warn('Auto-suspension lift notice skipped:', err.message)
    );
  }
  return lifted;
}

async function announceAutoSuspensionLift({ accountId, merit, nextStatus }) {
  const deactivated = String(nextStatus).toLowerCase() === 'deactivated';
  await recordAccountActivity({
    accountId,
    action: deactivated
      ? `Auto-suspension lifted early — Platform Merit recovered to ${merit}; the account is back to deactivated`
      : `Auto-suspension lifted early — Platform Merit recovered to ${merit}`,
    eventCode: 'ACCOUNT_STATUS_CHANGED',
    referenceTable: 'accounts',
    referencePrefix: 'ACC',
    referenceId: accountId,
    metadata: {
      previousStatus: 'Suspended',
      status: nextStatus,
      action: 'auto_suspend_lifted',
      merit,
      source: 'merit_recovery',
    },
  });
  // A member who had turned the account off is not told it is "active"; they reactivate it.
  if (deactivated) return;
  const { notifyAccountStatusChanged } = require('../services/AccountStandingServices');
  await notifyAccountStatusChanged(accountId, {
    status: 'Active',
    previousStatus: 'Suspended',
    action: 'auto_suspend_lifted',
    reason: `Your Platform Merit recovered to ${merit}, so your automatic suspension has ended early.`,
  });
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

/**
 * Dispatch in-app notification and realtime socket events for marketplace listing review decisions.
 */
async function sendMarketplaceListingNotification({
  accountId,
  marketAssetId,
  listingId,
  title,
  status,
  rejectionReason = null,
  moderationNote = null,
}) {
  if (!accountId) return;
  const assetTitle = String(title || 'Untitled Asset').trim();
  const note = String(moderationNote || '').trim();
  let message = '';
  if (status === 'approved') {
    message = `Your asset "${assetTitle}" has been approved by moderators and is now published to the Marketplace!`;
  } else if (status === 'rejected') {
    message = `Your asset "${assetTitle}" was not approved.${rejectionReason ? ` Reason: ${rejectionReason}` : ''} You can edit the asset to address this feedback and resubmit.`;
  } else if (status === 'delisted') {
    message = `Your asset "${assetTitle}" has been delisted from the Marketplace and reverted to draft.${note ? ` Reason: ${note}` : ''}`;
  } else if (status === 'pending') {
    message = `Your asset "${assetTitle}" was removed from the Marketplace and is being re-reviewed by moderators.${note ? ` Reason: ${note}` : ''}`;
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
          moderationNote: note || null,
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
  maybeAutoSuspendAfterWarning,
  liftRecoveredAutoSuspensions,
  applyReportAutomations,
};
