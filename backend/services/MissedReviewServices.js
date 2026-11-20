/**
 * Missed contract reviews cost merit (docs/warning-system.md §4a).
 *
 * A contract stays `Done` until both parties review each other. Each member party has
 * REVIEW_WINDOW_HOURS from when the contract ended to review the other party:
 *   1. Reminder: once there are REMINDER_LEAD_HOURS or fewer left, the party is told once.
 *   2. Warning: after the deadline, and at least REMINDER_LEAD_HOURS after the reminder, the
 *      system issues the `missed_review` warning (catalog points and clock, no staff author).
 * Each party is reminded and warned at most once per contract. Team accounts and contracts
 * with an open dispute are skipped. Hiding the `missed_review` catalog row turns warnings off.
 */
const { createNotification } = require('../repositories/NotificationRepositories');
const { recordAccountActivity } = require('../repositories/AccountActivityRepositories');
const {
  listPendingReviewers,
  markReviewReminded,
  insertMissedReviewViolation,
} = require('../repositories/MissedReviewRepositories');

const REVIEW_WINDOW_HOURS = 24;
const REMINDER_LEAD_HOURS = 6;
// Contracts that ended longer ago than this are never reminded (keeps old contracts out at launch).
const REMINDER_LOOKBACK_DAYS = 14;
// A party reminded late (e.g. at launch) can still be warned up to this long after the contract ended.
const WARNING_LOOKBACK_DAYS = 30;
const MISSED_REVIEW_WARNING_ID = 'missed_review';

function contractLabel(row) {
  return row.listing_title ? `"${row.listing_title}"` : 'your finished contract';
}

function emitNotification(accountId, notification) {
  if (!notification) return;
  try {
    const { getIo } = require('../lib/WebSocket');
    const io = getIo();
    if (io) io.to(String(accountId)).emit('notification', notification);
  } catch (err) {
    console.warn('Review reminder broadcast skipped:', err.message);
  }
}

async function sendReviewReminders() {
  const rows = await listPendingReviewers({
    stage: 'remind',
    endedBefore: `${REVIEW_WINDOW_HOURS - REMINDER_LEAD_HOURS} hours`,
    endedAfter: `${REMINDER_LOOKBACK_DAYS} days`,
  });

  let reminded = 0;
  for (const row of rows) {
    try {
      const claimed = await markReviewReminded(row.contract_id, row.reviewer_account_id);
      if (!claimed) continue;

      const deadline = new Date(new Date(row.ended_at).getTime() + REVIEW_WINDOW_HOURS * 3600000);
      // Late reminders (e.g. contracts that ended before this rule existed) still get a full lead time.
      const effectiveDeadline = new Date(Math.max(deadline.getTime(), Date.now() + REMINDER_LEAD_HOURS * 3600000));
      const who = row.reviewee_name ? ` ${row.reviewee_name}` : ' the other party';
      const notification = await createNotification({
        account_id: row.reviewer_account_id,
        message: `Leave a review for${who} on ${contractLabel(row)} by ${effectiveDeadline.toUTCString()}. Skipping it lowers your Platform Merit.`,
        is_read: false,
        reference_table: 'contracts',
        reference_prefix: 'CONTRACT_REVIEW_REMINDER',
        reference_path: `/dashboard/tasks/${row.contract_id}`,
        reference_id: row.contract_id,
      });
      emitNotification(row.reviewer_account_id, notification);
      reminded += 1;
    } catch (err) {
      console.error(`Review reminder failed for contract ${row.contract_id}:`, err.message);
    }
  }
  return reminded;
}

async function issueMissedReviewWarning(row, issued) {
  const { assertWarnableAccount, refreshWarningBand } = require('./WarningBandServices');
  try {
    await assertWarnableAccount(row.reviewer_account_id);
  } catch {
    return null; // Not a member account any more (deleted, team, staff): nothing to warn.
  }

  const { warningExpiry } = require('../lib/AccountRestriction');
  const expiresAt = warningExpiry({ durationDays: issued.durationDays, points: issued.points });
  const reason = `No review left for ${row.reviewee_name || 'the other party'} within ${REVIEW_WINDOW_HOURS} hours of ${contractLabel(row)} ending.`;

  const inserted = await insertMissedReviewViolation({
    contractId: row.contract_id,
    reviewerAccountId: row.reviewer_account_id,
    type: issued.type,
    reason,
    points: issued.points,
    expiresAt,
  });
  if (!inserted) return null;

  await recordAccountActivity({
    accountId: row.reviewer_account_id,
    action: `Warning issued: ${issued.type}`,
    eventCode: 'ACCOUNT_WARNED',
    referenceTable: 'violations',
    referencePrefix: 'VIO',
    referenceId: inserted.violationId,
    metadata: {
      violationNumber: inserted.violationNumber,
      type: issued.type,
      reason,
      points: issued.points,
      warningId: issued.warningId,
      expiresAt,
      contractId: row.contract_id,
      source: 'system',
    },
  });

  // Same engine as staff warnings: crossing a merit level starts its timed punishment.
  const { applyMeritPunishmentsForWarning } = require('./MeritPenaltyServices');
  const result = await applyMeritPunishmentsForWarning(row.reviewer_account_id, {
    violationId: inserted.violationId,
    staffId: null,
  });

  try {
    const { notifyAccountWarned } = require('./AccountStandingServices');
    await notifyAccountWarned(row.reviewer_account_id, {
      violationId: inserted.violationId,
      violationNumber: inserted.violationNumber,
      type: issued.type,
      reason,
      points: issued.points,
      expiresAt,
      autoSuspended: Boolean(result?.suspended),
      activeWarnings: result?.activeCount ?? null,
      maxWarningsBeforeSuspend: result?.max ?? null,
    });
  } catch (err) {
    console.warn('Missed review warning notification failed:', err.message);
  }

  try {
    await refreshWarningBand(row.reviewer_account_id);
  } catch (err) {
    console.warn('Warning band refresh after missed review failed:', err.message);
  }

  return inserted;
}

async function issueMissedReviewWarnings() {
  const rows = await listPendingReviewers({
    stage: 'warn',
    endedBefore: `${REVIEW_WINDOW_HOURS} hours`,
    endedAfter: `${WARNING_LOOKBACK_DAYS} days`,
    remindedBefore: `${REMINDER_LEAD_HOURS} hours`,
  });
  if (!rows.length) return 0;

  let issued;
  try {
    const { resolveIssuedWarning } = require('./WarningDefServices');
    issued = await resolveIssuedWarning({ warningId: MISSED_REVIEW_WARNING_ID, actorRole: 'Admin' });
  } catch {
    return 0; // Admin hid the catalog row: missed reviews are not warned.
  }

  let warned = 0;
  for (const row of rows) {
    try {
      if (await issueMissedReviewWarning(row, issued)) warned += 1;
    } catch (err) {
      console.error(`Missed review warning failed for contract ${row.contract_id}:`, err.message);
    }
  }
  return warned;
}

async function reconcileMissedReviews() {
  const reminded = await sendReviewReminders();
  const warned = await issueMissedReviewWarnings();
  return { reminded, warned };
}

module.exports = {
  REVIEW_WINDOW_HOURS,
  reconcileMissedReviews,
};
