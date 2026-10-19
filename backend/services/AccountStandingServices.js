const { createNotification } = require('../repositories/NotificationRepositories');
const { SUSPENDED_ACTION_MESSAGE, getAccountAccess } = require('../lib/AccountRestriction');

/**
 * Broadcast and persist warning notification for an account.
 */
async function notifyAccountWarned(accountId, warningData = {}) {
  if (!accountId) return null;

  const warnType = String(warningData.type || 'Account warning').trim();
  const warnReason = warningData.reason ? String(warningData.reason).trim() : '';
  const message = `Warning issued: ${warnType}${warnReason ? ` — ${warnReason}` : ''}`;

  let notification = null;
  try {
    notification = await createNotification({
      account_id: accountId,
      message,
      is_read: false,
      reference_table: 'violations',
      reference_prefix: 'WARNING',
      reference_path: '/notifications',
      reference_id: warningData.violationId || warningData.violationNumber || accountId,
    });
  } catch (err) {
    console.error('Failed to save warning notification:', err.message);
  }

  try {
    const { getIo } = require('../lib/WebSocket');
    const io = getIo();
    if (io) {
      if (notification) {
        io.to(String(accountId)).emit('notification', notification);
      }
      io.to(String(accountId)).emit('account:warning', {
        notificationId: notification?.notification_id || null,
        violationId: warningData.violationId || null,
        violationNumber: warningData.violationNumber || null,
        type: warnType,
        reason: warnReason || null,
        points: Number(warningData.points) || 1,
        expiresAt: warningData.expiresAt || null,
        activeWarnings: warningData.activeWarnings ?? null,
        maxWarningsBeforeSuspend: warningData.maxWarningsBeforeSuspend ?? null,
        autoSuspended: Boolean(warningData.autoSuspended),
        message,
        createdAt: notification?.created_at || new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Warning realtime socket broadcast failed:', err.message);
  }

  if (warningData.autoSuspended) {
    try {
      await notifyAccountStatusChanged(accountId, {
        status: 'Suspended',
        previousStatus: 'Active',
        action: 'auto_suspend',
        reason: 'Auto-suspended after exceeding active warning threshold',
      });
    } catch (err) {
      console.warn('Auto-suspension notification failed:', err.message);
    }
  }

  return notification;
}

/**
 * Broadcast and persist account status changes (Banned, Locked, Suspended, Active).
 */
async function notifyAccountStatusChanged(accountId, statusData = {}) {
  if (!accountId) return null;

  const rawStatus = String(statusData.status || '').trim();
  const normalized = rawStatus.toLowerCase();
  const nextStatus =
    normalized === 'banned'
      ? 'Banned'
      : normalized === 'locked'
      ? 'Locked'
      : normalized === 'suspended'
      ? 'Suspended'
      : 'Active';

  let access = null;
  try {
    access = await getAccountAccess(accountId);
  } catch (_e) {
    access = {
      status: nextStatus,
      blocked: false,
      banned: nextStatus === 'Banned',
      locked: nextStatus === 'Locked',
      suspended: nextStatus === 'Suspended',
    };
  }

  let notification = null;

  if (nextStatus === 'Banned' || nextStatus === 'Locked') {
    const isBan = nextStatus === 'Banned';
    const defaultMsg = isBan
      ? 'Your account has been banned. You can sign in only to file an appeal and view your tickets and disputes.'
      : access.blocked
        ? 'Your account has been locked. You cannot sign in until an administrator unlocks it.'
        : 'Your account has been locked. You can sign in only to file an appeal and view your tickets and disputes.';
    const msg = statusData.reason || access.message || defaultMsg;

    try {
      notification = await createNotification({
        account_id: accountId,
        message: msg,
        is_read: false,
        reference_table: 'accounts',
        reference_prefix: isBan ? 'ACCOUNT_BANNED' : 'ACCOUNT_LOCKED',
        reference_path: '/notifications',
        reference_id: accountId,
      });
    } catch (err) {
      console.error(`Failed to save ${nextStatus} notification:`, err.message);
    }

    // Staff and team locks end the session. Member bans and locks stay signed in for an appeal.
    if (access.blocked) {
      try {
        const redisClient = require('../lib/Redis');
        const keys = await redisClient.keys('session:*');
        for (const key of keys) {
          const raw = await redisClient.get(key);
          if (raw) {
            try {
              const sessionUser = JSON.parse(raw);
              if (
                String(sessionUser.account_id) === String(accountId) ||
                String(sessionUser.accountId) === String(accountId)
              ) {
                await redisClient.del(key);
              }
            } catch (_parseErr) {}
          }
        }
      } catch (redisErr) {
        console.warn('Redis session cleanup failed on lock:', redisErr.message);
      }
    }

    // Real-time broadcast
    try {
      const { getIo } = require('../lib/WebSocket');
      const io = getIo();
      if (io) {
        if (notification) io.to(String(accountId)).emit('notification', notification);
        io.to(String(accountId)).emit('account:restricted', {
          code: access.code || (isBan ? 'ACCOUNT_BANNED' : 'ACCOUNT_LOCKED'),
          status: nextStatus,
          message: msg,
          reason: statusData.reason || null,
          restriction: access,
        });
        io.to(String(accountId)).emit('account:status_changed', {
          accountId,
          status: nextStatus,
          previousStatus: statusData.previousStatus,
          action: statusData.action || (isBan ? 'ban' : 'lock'),
          code: access.code || (isBan ? 'ACCOUNT_BANNED' : 'ACCOUNT_LOCKED'),
          message: msg,
          reason: statusData.reason || null,
          restriction: access,
        });
      }
    } catch (err) {
      console.warn(`${nextStatus} realtime socket broadcast failed:`, err.message);
    }
  } else if (nextStatus === 'Suspended') {
    const msg = statusData.reason || access.message || SUSPENDED_ACTION_MESSAGE;

    try {
      notification = await createNotification({
        account_id: accountId,
        message: msg,
        is_read: false,
        reference_table: 'accounts',
        reference_prefix: 'SUSPEND',
        reference_path: '/notifications',
        reference_id: accountId,
      });
    } catch (err) {
      console.error('Failed to save suspended notification:', err.message);
    }

    try {
      const { getIo } = require('../lib/WebSocket');
      const io = getIo();
      if (io) {
        if (notification) io.to(String(accountId)).emit('notification', notification);
        io.to(String(accountId)).emit('account:status_changed', {
          accountId,
          status: 'Suspended',
          previousStatus: statusData.previousStatus,
          action: statusData.action || 'suspend',
          code: 'ACCOUNT_SUSPENDED',
          message: msg,
          reason: statusData.reason || null,
          restriction: access,
        });
      }
    } catch (err) {
      console.warn('Suspension realtime socket broadcast failed:', err.message);
    }
  } else if (nextStatus === 'Active') {
    const msg =
      statusData.reason ||
      'Your account standing has been restored to Active. All features and actions are now available.';

    try {
      notification = await createNotification({
        account_id: accountId,
        message: msg,
        is_read: false,
        reference_table: 'accounts',
        reference_prefix: 'RESTORE',
        reference_path: '/notifications',
        reference_id: accountId,
      });
    } catch (err) {
      console.error('Failed to save restored notification:', err.message);
    }

    try {
      const { getIo } = require('../lib/WebSocket');
      const io = getIo();
      if (io) {
        if (notification) io.to(String(accountId)).emit('notification', notification);
        io.to(String(accountId)).emit('account:status_changed', {
          accountId,
          status: 'Active',
          previousStatus: statusData.previousStatus,
          action: statusData.action || 'restore',
          code: null,
          message: msg,
          restriction: access,
        });
      }
    } catch (err) {
      console.warn('Active restoration realtime socket broadcast failed:', err.message);
    }
  }

  return notification;
}

/**
 * Backward compatibility wrapper for suspension notices.
 */
async function notifyAccountSuspended(accountId) {
  return notifyAccountStatusChanged(accountId, { status: 'Suspended', action: 'suspend' });
}

module.exports = {
  notifyAccountWarned,
  notifyAccountStatusChanged,
  notifyAccountSuspended,
};
