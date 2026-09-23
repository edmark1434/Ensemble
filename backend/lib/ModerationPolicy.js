const { pool } = require('./Database');
const { DEFAULT_SETTINGS } = require('./PlatformConfiguration');
const { getSectionValue } = require('../repositories/AdminSettingsRepositories');
const { recordAccountActivity } = require('../repositories/AccountActivityRepositories');

const PROFANITY_PATTERN =
  /\b(fuck|shit|bitch|asshole|cunt|nigger|faggot|slut|whore)\b/i;
const URL_PATTERN = /https?:\/\/[^\s]+|www\.[^\s]+/gi;
const REPEATED_CHAR_SPAM = /(.)\1{9,}/i;
const REPEATED_WORD_SPAM = /\b(\w+)\b(?:\s+\1\b){4,}/i;

async function getModerationSettings() {
  try {
    const saved = await getSectionValue('moderation');
    return {
      ...DEFAULT_SETTINGS.moderation,
      ...(saved || {}),
    };
  } catch {
    return { ...DEFAULT_SETTINGS.moderation };
  }
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
 * Evaluate user-authored text against active automod toggles.
 * Returns { blocked, reasons, flags } — throw/block at the call site when blocked.
 */
async function evaluateUserContent(text = '') {
  const settings = await getModerationSettings();
  const content = String(text || '');
  const reasons = [];
  const flags = {
    spam: false,
    profanity: false,
    suspiciousLinks: false,
  };

  if (settings.spamFilterEnabled) {
    if (REPEATED_CHAR_SPAM.test(content) || REPEATED_WORD_SPAM.test(content)) {
      flags.spam = true;
      reasons.push('Content looks like spam');
    }
  }

  if (settings.autoFlagProfanity && PROFANITY_PATTERN.test(content)) {
    flags.profanity = true;
    reasons.push('Content contains blocked language');
  }

  if (settings.forumLinkScanning) {
    const urls = content.match(URL_PATTERN) || [];
    if (urls.length > 0) {
      flags.suspiciousLinks = true;
      // Soft flag only — do not block posting solely for having a link
      reasons.push('Outbound link(s) flagged for review');
    }
  }

  // Spam + profanity hard-block; link scanning flags for review (caller may soft-flag)
  const blocked = flags.spam || flags.profanity;
  return { blocked, reasons, flags, settings };
}

/**
 * When marketplace listing review is on, queue or update a pending marketplace_listings row
 * and return the status that should be persisted on market_assets ('draft').
 * When off, returns requestedStatus unchanged.
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

  const settings = await getModerationSettings();
  if (!settings.marketplaceListingReview) {
    return { status: requestedStatus, queued: false };
  }

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
  if (!disputeRow?.dispute_id && !disputeRow?.id) return disputeRow;
  const disputeId = disputeRow.dispute_id || disputeRow.id;
  if (disputeRow.handled_by_staff_id) return disputeRow;

  const settings = await getModerationSettings();
  if (!settings.disputeAutoAssign) return disputeRow;

  const staff = await pool.query(
    `
    SELECT s.staff_id
    FROM staff s
    JOIN accounts a ON a.account_id = s.account_id
    WHERE a.deleted_at IS NULL
      AND LOWER(COALESCE(a.status, 'active')) = 'active'
      AND LOWER(COALESCE(s.role, '')) IN (
        'admin', 'support moderator', 'support_moderator', 'moderator'
      )
    ORDER BY (
      SELECT COUNT(*) FROM disputes d
      WHERE d.handled_by_staff_id = s.staff_id
        AND LOWER(COALESCE(d.status, '')) <> 'closed'
    ) ASC, s.staff_id ASC
    LIMIT 1
    `
  );
  if (!staff.rows.length) return disputeRow;

  const staffId = staff.rows[0].staff_id;
  await pool.query(
    `
    UPDATE disputes
    SET handled_by_staff_id = $1,
        status = CASE
          WHEN LOWER(COALESCE(status, 'pending_review')) IN ('pending_review', 'open', 'pending')
            THEN 'under_review'
          ELSE status
        END,
        updated_at = NOW()
    WHERE dispute_id = $2
      AND handled_by_staff_id IS NULL
    `,
    [staffId, disputeId]
  );

  return { ...disputeRow, handled_by_staff_id: staffId };
}

/**
 * Reconcile unassigned open disputes in the system based on moderation.disputeAutoAssign.
 */
async function reconcileUnassignedDisputes() {
  const settings = await getModerationSettings();
  if (!settings.disputeAutoAssign) return { assigned: 0 };

  const unassigned = await pool.query(
    `
    SELECT dispute_id, handled_by_staff_id, status
    FROM disputes
    WHERE handled_by_staff_id IS NULL
      AND deleted_at IS NULL
      AND LOWER(COALESCE(status, 'open')) NOT IN ('closed', 'resolved')
    ORDER BY opened_at ASC NULLS LAST, created_at ASC
    `
  );

  let assignedCount = 0;
  for (const row of unassigned.rows) {
    const updated = await applyDisputeAutomations(row);
    if (updated?.handled_by_staff_id) {
      assignedCount++;
    }
  }

  return { assigned: assignedCount };
}

async function countActiveWarnings(accountId) {
  const result = await pool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM violations
    WHERE account_id = $1
      AND deleted_at IS NULL
      AND LOWER(COALESCE(status, 'active')) IN ('active', 'open', 'pending')
      AND (expires_at IS NULL OR expires_at > NOW())
    `,
    [accountId]
  );
  return Number(result.rows[0]?.count || 0);
}

/**
 * After a warning/violation is issued, suspend the account when active
 * warning count reaches moderation.maxWarningsBeforeSuspend.
 */
async function maybeAutoSuspendAfterWarning(accountId, staffId = null) {
  if (!accountId) return null;
  const settings = await getModerationSettings();
  const max = Math.max(1, Number(settings.maxWarningsBeforeSuspend) || 3);
  const activeCount = await countActiveWarnings(accountId);
  if (activeCount < max) {
    return { suspended: false, activeCount, max };
  }

  const previous = await pool.query(
    `SELECT status FROM accounts WHERE account_id = $1 AND deleted_at IS NULL`,
    [accountId]
  );
  if (!previous.rows.length) return { suspended: false, activeCount, max };
  const previousStatus = previous.rows[0].status;
  if (String(previousStatus).toLowerCase() === 'suspended') {
    return { suspended: false, alreadySuspended: true, activeCount, max };
  }

  await pool.query(`UPDATE accounts SET status = 'Suspended' WHERE account_id = $1`, [accountId]);
  await recordAccountActivity({
    accountId,
    action: `Auto-suspended after ${activeCount} active warning(s) (limit ${max})`,
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
      maxWarningsBeforeSuspend: max,
      source: 'moderation_policy',
    },
  });

  return { suspended: true, activeCount, max, previousStatus };
}

const HIGH_PRIORITY_REPORT_TYPES = new Set([
  'harassment',
  'hate speech',
  'threat',
  'violence',
  'sexual content',
  'scam',
  'fraud',
  'impersonation',
]);

/**
 * Apply report automations from moderation settings after a report is created.
 */
async function applyReportAutomations(reportRow, { staffId = null } = {}) {
  if (!reportRow?.report_id && !reportRow?.id) return reportRow;
  const reportId = reportRow.report_id || reportRow.id;
  const settings = await getModerationSettings();
  const type = String(reportRow.type || '').trim().toLowerCase();
  let priority = String(reportRow.priority || 'medium').toLowerCase();
  let ticketAutoCreated = false;

  if (
    settings.autoEscalateHighPriority &&
    (priority === 'high' || HIGH_PRIORITY_REPORT_TYPES.has(type))
  ) {
    await pool.query(
      `UPDATE reports SET priority = 'high', updated_at = NOW() WHERE report_id = $1`,
      [reportId]
    );
    priority = 'high';
  }

  const requesterAccountId = reportRow.by_account_id || reportRow.reporterAccountId || null;
  if (settings.reportToTicketAutoCreate && requesterAccountId) {
    const reason = `Auto follow-up for report ${reportRow.report_number || String(reportId).slice(0, 8)}`;
    const existing = await pool
      .query(
        `
        SELECT ticket_id FROM tickets
        WHERE account_id = $1
          AND deleted_at IS NULL
          AND reason = $2
        LIMIT 1
        `,
        [requesterAccountId, reason]
      )
      .catch(() => ({ rows: [] }));

    if (!existing.rows.length) {
      const ticketNumber = `TKT-${Date.now().toString().slice(-10)}`;
      try {
        await pool.query(
          `
          INSERT INTO tickets (
            ticket_number, reason, type, priority, status, account_id, message_count
          ) VALUES ($1, $2, 'Other', $3, 'Open', $4, 0)
          `,
          [
            ticketNumber,
            reason,
            priority === 'high' ? 'High' : 'Medium',
            requesterAccountId,
          ]
        );
        ticketAutoCreated = true;
      } catch (err) {
        console.warn('reportToTicketAutoCreate skipped:', err.message);
      }
    }
  }

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
        autoEscalated: priority === 'high' && settings.autoEscalateHighPriority,
        ticketAutoCreated,
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

  return { ...reportRow, priority, ticketAutoCreated };
}

module.exports = {
  getModerationSettings,
  getSecuritySettings,
  evaluateUserContent,
  resolveMarketplacePublishStatus,
  applyDisputeAutomations,
  reconcileUnassignedDisputes,
  countActiveWarnings,
  maybeAutoSuspendAfterWarning,
  applyReportAutomations,
};
