const {
  getAccountCreditHold,
  placeCreditHold,
  releaseCreditHold,
  listDueCreditHolds,
} = require('../repositories/CreditHoldRepositories');
const { recordAccountActivity } = require('../repositories/AccountActivityRepositories');
const { createNotification } = require('../repositories/NotificationRepositories');
const { pool } = require('../lib/Database');

const MAX_HOLD_DAYS = 365;
const MIN_REASON_LENGTH = 5;

function holdError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function formatWhen(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function credits(n) {
  return `${Number(n || 0).toLocaleString()} credit${Number(n) === 1 ? '' : 's'}`;
}

/**
 * When the hold ends. No days and no end date means "until staff review it".
 * @returns {Date|null}
 */
function resolveHoldEnd({ days, endsAt } = {}) {
  if (endsAt) {
    const date = new Date(endsAt);
    if (Number.isNaN(date.getTime())) throw holdError('Choose a valid end date for the hold');
    if (date.getTime() <= Date.now()) throw holdError('The hold has to end in the future');
    if (date.getTime() > Date.now() + MAX_HOLD_DAYS * 86400000) {
      throw holdError(`A hold can last at most ${MAX_HOLD_DAYS} days`);
    }
    return date;
  }
  if (days == null || days === '') return null;
  const parsed = Number(days);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_HOLD_DAYS) {
    throw holdError(`Hold length must be a whole number of days from 1 to ${MAX_HOLD_DAYS}`);
  }
  return new Date(Date.now() + parsed * 86400000);
}

async function assertHoldTarget(accountId, staffId) {
  const result = await pool.query(
    `SELECT account_id FROM accounts WHERE account_id = $1 AND deleted_at IS NULL`,
    [accountId]
  );
  if (!result.rows.length) throw holdError('Account not found', 404);
  // Nobody holds their own credits, and staff wallets are Admin's to touch.
  if (staffId) {
    const { assertCanSanctionTarget } = require('../lib/SuspendGuards');
    await assertCanSanctionTarget({ actorStaffId: staffId, targetAccountId: accountId, action: 'credits' });
  }
}

/**
 * Persist the notice, then push it and the refreshed standing so an open tab updates its
 * wallet banner without a reload.
 */
async function announceHoldChange(accountId, { message, walletId, held }) {
  let notification = null;
  try {
    notification = await createNotification({
      account_id: accountId,
      message,
      is_read: false,
      reference_table: 'wallets',
      reference_prefix: held ? 'CREDITS_HOLD' : 'CREDITS_RELEASED',
      reference_path: '/notifications',
      reference_id: walletId || accountId,
    });
  } catch (err) {
    console.warn('Credit hold notification skipped:', err.message);
  }
  try {
    const { getIo } = require('../lib/WebSocket');
    const { getAccountAccess } = require('../lib/AccountRestriction');
    const io = getIo();
    if (io) {
      const restriction = await getAccountAccess(accountId).catch(() => null);
      if (notification) io.to(String(accountId)).emit('notification', notification);
      io.to(String(accountId)).emit('account:credits_hold', {
        accountId,
        held,
        message,
        restriction,
      });
    }
  } catch (err) {
    console.warn('Credit hold broadcast skipped:', err.message);
  }
}

/**
 * Staff hold the member's available credits.
 * @param {string} accountId
 * @param {{ reason?: string, days?: number|string|null, endsAt?: string|null }} options
 * @param {string|null} staffId
 */
async function freezeAccountCredits(accountId, options = {}, staffId = null) {
  await assertHoldTarget(accountId, staffId);
  const reason = String(options.reason || '').trim();
  if (reason.length < MIN_REASON_LENGTH) {
    throw holdError('Write the reason the member will see (at least 5 characters)');
  }
  const frozenUntil = resolveHoldEnd(options);
  const hold = await placeCreditHold({ accountId, reason, frozenUntil, staffId });

  await recordAccountActivity({
    accountId,
    action: `Credits frozen (${hold.moved.toLocaleString()} credits): ${reason}`,
    eventCode: 'CREDITS_FROZEN',
    referenceTable: 'wallets',
    referencePrefix: 'WAL',
    referenceId: hold.walletId,
    actorStaffId: staffId,
    metadata: {
      amount: hold.moved,
      frozenTotal: hold.frozenBalanceCredits,
      frozen: true,
      frozenUntil: hold.frozenUntil,
      endsAt: hold.frozenUntil,
      reason,
    },
  });

  const until = formatWhen(hold.frozenUntil);
  await announceHoldChange(accountId, {
    held: true,
    walletId: hold.walletId,
    message: `${credits(hold.frozenBalanceCredits)} in your Account Wallet are on hold${
      until ? ` until ${until}` : ' until staff review your account'
    }. Reason: ${reason} They are not taken from you. If you think this is a mistake, file an appeal.`,
  });

  return {
    accountId,
    walletId: hold.walletId,
    balanceCredits: 0,
    frozenBalanceCredits: hold.frozenBalanceCredits,
    frozenUntil: hold.frozenUntil,
    reason,
    frozen: true,
  };
}

/**
 * Return held credits. `source` says why: staff action, a reversed log entry, or the hold's
 * end date (which is also how an accepted appeal lands).
 */
async function unfreezeAccountCredits(accountId, { staffId = null, reason = null, source = 'staff' } = {}) {
  if (source === 'staff' || source === 'reversal') await assertHoldTarget(accountId, staffId);
  const released = await releaseCreditHold({ accountId, onlyIfDue: source === 'hold_expired' });
  if (!released) {
    if (source === 'hold_expired') return null;
    throw holdError('No frozen credits to restore', 409);
  }
  const note = String(reason || '').trim();
  await recordAccountActivity({
    accountId,
    action: `Credits unfrozen (${released.released.toLocaleString()} credits)${
      source === 'hold_expired' ? ' — the hold ended' : note ? `: ${note}` : ''
    }`,
    eventCode: 'CREDITS_UNFROZEN',
    referenceTable: 'wallets',
    referencePrefix: 'WAL',
    referenceId: released.walletId,
    actorStaffId: staffId,
    metadata: { amount: released.released, frozen: false, source, reason: note || null },
  });
  await announceHoldChange(accountId, {
    held: false,
    walletId: released.walletId,
    message: `The hold on your credits has ended. ${credits(released.released)} are back in your Account Wallet.`,
  });
  return {
    accountId,
    walletId: released.walletId,
    balanceCredits: released.balanceCredits,
    frozenBalanceCredits: 0,
    frozen: false,
  };
}

/** Background job: release holds whose end date has passed. */
async function releaseDueCreditHolds({ limit = 50 } = {}) {
  let released = 0;
  for (const accountId of await listDueCreditHolds(limit)) {
    try {
      if (await unfreezeAccountCredits(accountId, { source: 'hold_expired' })) released += 1;
    } catch (err) {
      console.warn('Credit hold release skipped:', err.message);
    }
  }
  return released;
}

module.exports = {
  MAX_HOLD_DAYS,
  resolveHoldEnd,
  getAccountCreditHold,
  freezeAccountCredits,
  unfreezeAccountCredits,
  releaseDueCreditHolds,
};
