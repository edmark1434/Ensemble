const { getWarningBandAccount, sumActiveWarningPoints, countProposalsToday } = require('../repositories/WarningBandRepositories');
const {
  RESTRICTED_PROPOSAL_DAILY_CAP,
  ACTION_MESSAGES,
  bandForPoints,
  actionAllowed,
  warningBandError,
  refreshLiveThresholds,
} = require('../lib/WarningBands');

async function getWarningBand(accountId) {
  const account = accountId ? await getWarningBandAccount(accountId) : null;
  await refreshLiveThresholds();
  if (!account || String(account.type || '').toLowerCase() !== 'user') {
    return { points: 0, band: bandForPoints(0), account };
  }
  const points = await sumActiveWarningPoints(accountId);
  return { points, band: bandForPoints(points), account };
}

async function notifyWarningBandChange(accountId, previousBand, nextBand, points) {
  if (!previousBand || !nextBand || previousBand.id === nextBand.id) return;
  const dropped = nextBand.min > previousBand.min;
  const message = dropped
    ? `Your account is now ${nextBand.label} (${points} active warning point${points === 1 ? '' : 's'}). Some actions are limited until warnings expire.`
    : `Warning limits lifted to ${nextBand.label} (${points} active warning point${points === 1 ? '' : 's'}).`;
  try {
    const { createNotificationServices } = require('./NotificationServices');
    const notification = await createNotificationServices({
      message,
      is_read: false,
      reference_table: 'accounts',
      reference_prefix: dropped ? 'WARNING_DOWN' : 'WARNING_UP',
      reference_path: '/profile',
      reference_id: accountId,
      account_id: accountId,
    });
    const { getIo } = require('../lib/WebSocket');
    const io = getIo();
    io.to(String(accountId)).emit('notification', notification);
    io.to(String(accountId)).emit('account:restricted', {
      band: nextBand.id,
      label: nextBand.label,
      points,
      previousBand: previousBand.id,
    });
  } catch (err) {
    console.warn('Warning band notification failed:', err.message);
  }
}

async function refreshWarningBand(accountId, previousPoints = null) {
  if (!accountId) return null;
  const next = await getWarningBand(accountId);
  if (previousPoints != null) {
    await notifyWarningBandChange(accountId, bandForPoints(previousPoints), next.band, next.points);
  }
  return next;
}

async function assertWarningAllows(accountId, action, extras = {}) {
  const { points, band, account } = await getWarningBand(accountId);
  if (!account || String(account.type || '').toLowerCase() !== 'user') return { points, band };

  if (action === 'proposal' && band.id === 'restricted') {
    const used = extras.proposalsToday != null
      ? Number(extras.proposalsToday)
      : await countProposalsToday(accountId);
    if (used >= RESTRICTED_PROPOSAL_DAILY_CAP) {
      throw warningBandError(ACTION_MESSAGES.proposal_cap, 'WARNING_PROPOSAL_CAP');
    }
    return { points, band };
  }

  if (!actionAllowed(action, band.id)) {
    throw warningBandError(ACTION_MESSAGES[action] || 'Active warnings do not allow this action.', 'WARNING_RESTRICTED');
  }
  return { points, band };
}

async function listingReviewForced(accountId) {
  const { band } = await getWarningBand(accountId);
  return band.id === 'limited';
}

module.exports = {
  getWarningBand,
  refreshWarningBand,
  assertWarningAllows,
  listingReviewForced,
  countProposalsToday,
};
