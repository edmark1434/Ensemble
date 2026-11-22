const {
  listBanCleanupItems,
  restoreBanCleanupItem,
  RESTORE_SKIP_REASONS,
} = require('../repositories/BanCleanupRepositories');
const { recordAccountActivity } = require('../repositories/AccountActivityRepositories');
const { createNotification } = require('../repositories/NotificationRepositories');

/**
 * Putting back what a ban closed (docs/punishment-system.md §4.6 "Appeal accepted → restore").
 *
 * Decision: the member never has to file a ticket to get their work back.
 *  - An accepted appeal on a ban restores everything the ban closed, by default (staff may
 *    untick it in the decision). The ban still ends on its 24-hour clock; until then the
 *    restored items stay hidden by the paused-while-restricted gate (lib/OwnerAvailability).
 *  - Lifting a ban any other way (Users desk unban, platform view) restores only when staff
 *    ask for it ("Restore what the ban closed").
 *  - Staff can restore later, item by item, from the account (User & Team → account).
 *  - An expired temporary ban restores nothing: the member served it and reposts as before.
 * Only jobs, gigs and marketplace listings come back, and only when nothing changed them since
 * the ban. Withdrawn proposals, offers and orders never come back — other people moved on and
 * their credits were already returned.
 */

class BanRestoreError extends Error {
  constructor(message, statusCode = 400, code = 'BAN_RESTORE_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function toItem(row) {
  return {
    id: String(row.ban_cleanup_item_id),
    type: row.item_type,
    itemId: String(row.item_id),
    title: row.title || null,
    previousStatus: row.previous_status,
    closedAt: row.closed_at,
    restoredAt: row.restored_at || null,
    restoreSource: row.restore_source || null,
    skippedReason: row.skipped_reason || null,
    skippedText: row.skipped_reason ? RESTORE_SKIP_REASONS[row.skipped_reason] || row.skipped_reason : null,
    state: row.restored_at ? 'restored' : 'closed',
  };
}

/** Everything bans closed for the account, with what came back. */
async function listBanClosedItems(accountId) {
  const rows = await listBanCleanupItems(accountId);
  const items = rows.map(toItem);
  return {
    items,
    counts: {
      closed: items.filter((item) => item.state === 'closed').length,
      restored: items.filter((item) => item.state === 'restored').length,
    },
  };
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function describeRestored(restored) {
  const byType = { job: 0, gig: 0, listing: 0 };
  for (const item of restored) byType[item.item_type] = (byType[item.item_type] || 0) + 1;
  const parts = [];
  if (byType.job) parts.push(plural(byType.job, 'job'));
  if (byType.gig) parts.push(plural(byType.gig, 'gig'));
  if (byType.listing) parts.push(plural(byType.listing, 'marketplace listing'));
  return parts.join(', ');
}

async function accountStatus(accountId) {
  const { pool } = require('../lib/Database');
  const result = await pool.query(`SELECT status, type, ban_ends_at FROM accounts WHERE account_id = $1`, [accountId]);
  return result.rows[0] || null;
}

/**
 * Restore items a ban closed for the account.
 * @param {string} accountId
 * @param {{ source: 'appeal'|'staff', staffId?: string|null, itemIds?: string[]|null }} options
 *   itemIds: ban_cleanup_item ids to restore (default: every item not restored yet)
 * @returns {Promise<{ restored: object[], skipped: { id: string, title: string|null, reason: string, text: string }[] }>}
 */
async function restoreBanClosedItems(accountId, { source = 'staff', staffId = null, itemIds = null } = {}) {
  const account = await accountStatus(accountId);
  if (!account) throw new BanRestoreError('Account not found', 404, 'ACCOUNT_NOT_FOUND');
  const banned = String(account.status || '').toLowerCase() === 'banned';
  // A ban still in force keeps its items closed. The accepted-appeal path is the exception:
  // the ban ends within 24 hours and the paused gate keeps the items hidden until it does.
  if (banned && source !== 'appeal') {
    throw new BanRestoreError(
      'This account is still banned. Lift the ban first, or accept the appeal, then restore.',
      409,
      'ACCOUNT_STILL_BANNED'
    );
  }

  const wanted = Array.isArray(itemIds) && itemIds.length ? new Set(itemIds.map(String)) : null;
  const open = (await listBanCleanupItems(accountId)).filter(
    (row) => !row.restored_at && (!wanted || wanted.has(String(row.ban_cleanup_item_id)))
  );
  const restored = [];
  const skipped = [];
  for (const row of open) {
    try {
      const result = await restoreBanCleanupItem(row.ban_cleanup_item_id, { source, staffId });
      if (result.restored) restored.push(row);
      else if (result.reason !== 'already_restored') {
        skipped.push({
          id: String(row.ban_cleanup_item_id),
          title: row.title || null,
          reason: result.reason,
          text: RESTORE_SKIP_REASONS[result.reason] || result.reason,
        });
      }
    } catch (err) {
      console.error(`Ban restore of ${row.item_type} ${row.item_id} failed:`, err.message);
      skipped.push({ id: String(row.ban_cleanup_item_id), title: row.title || null, reason: 'error', text: 'it could not be restored' });
    }
  }

  if (restored.length || skipped.length) {
    await recordAccountActivity({
      accountId,
      action: `Ban restore (${source}): ${restored.length ? describeRestored(restored) : 'nothing'} restored${
        skipped.length ? `, ${plural(skipped.length, 'item')} left closed` : ''
      }`,
      eventCode: 'ACCOUNT_BAN_RESTORE',
      referenceTable: 'accounts',
      referencePrefix: 'ACC',
      referenceId: accountId,
      actorStaffId: staffId,
      metadata: {
        source,
        restored: restored.map((row) => ({ type: row.item_type, id: String(row.item_id), title: row.title })),
        skipped,
      },
    }).catch((err) => console.warn('Ban restore activity skipped:', err.message));
  }

  if (restored.length) {
    const what = describeRestored(restored);
    const later = banned ? ' They go live again when your ban ends.' : '';
    const leftClosed = skipped.length ? ` ${plural(skipped.length, 'item')} stayed closed because it changed or its window ended.` : '';
    const message = `Ensemble restored what the ban closed: ${what}.${later}${leftClosed} Withdrawn proposals, offers and orders cannot come back.`;
    try {
      const { describeTeamAccount, notifyTeamManagers } = require('./TeamStandingServices');
      const team = await describeTeamAccount(accountId);
      if (team.isTeam) {
        await notifyTeamManagers(accountId, { message: `Team ${team.name}: ${message}`, prefix: 'ACCOUNT_BAN_RESTORED' });
      } else {
        const notification = await createNotification({
          account_id: accountId,
          message,
          is_read: false,
          reference_table: 'accounts',
          reference_prefix: 'ACCOUNT_BAN_RESTORED',
          reference_path: '/notifications',
          reference_id: accountId,
        });
        const io = require('../lib/WebSocket').getIo();
        if (io && notification) io.to(String(accountId)).emit('notification', notification);
      }
    } catch (err) {
      console.warn('Ban restore notice skipped:', err.message);
    }
  }

  const restoredAt = new Date().toISOString();
  return {
    restored: restored.map((row) => ({ ...toItem(row), state: 'restored', restoredAt, restoreSource: source })),
    skipped,
  };
}

module.exports = {
  BanRestoreError,
  listBanClosedItems,
  restoreBanClosedItems,
};
