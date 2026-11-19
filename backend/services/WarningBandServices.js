const { getWarningBandAccount, sumActiveWarningPoints, countProposalsToday } = require('../repositories/WarningBandRepositories');
const {
  RESTRICTED_PROPOSAL_DAILY_CAP,
  ACTION_MESSAGES,
  MUTE_ACTIONS,
  NO_BAND,
  bandForPoints,
  bandActionMessage,
  muteActionMessage,
  actionAllowed,
  warningBandError,
  meritFromWarningPoints,
  refreshLiveThresholds,
} = require('../lib/WarningBands');

/**
 * Points and the punishments running for a member. The band comes from timed punishments
 * (`merit_penalties`), not from points: a band keeps running when merit recovers. Before the
 * timed-punishment migration the band still follows points live.
 */
async function getWarningBand(accountId) {
  const account = accountId ? await getWarningBandAccount(accountId) : null;
  await refreshLiveThresholds();
  const { EMPTY_PUNISHMENTS, getActiveMeritPunishments } = require('./MeritPenaltyServices');
  if (!account || String(account.type || '').toLowerCase() !== 'user') {
    return { points: 0, band: { ...NO_BAND }, account, punishments: { ...EMPTY_PUNISHMENTS } };
  }
  const [points, punishments] = await Promise.all([
    sumActiveWarningPoints(accountId),
    getActiveMeritPunishments(accountId).catch((err) => {
      console.warn('Could not load merit punishments:', err.message);
      return { ...EMPTY_PUNISHMENTS };
    }),
  ]);
  const band = punishments.ready ? punishments.band : bandForPoints(points);
  return { points, band, account, punishments };
}

/** Merit went up (warnings expired). Running punishments keep their own end dates. */
async function notifyMeritRecovered(accountId, { points, punishments }) {
  const merit = meritFromWarningPoints(points);
  const running = punishments?.ready && punishments.list?.length;
  const message = running
    ? `A warning expired and your Platform Merit recovered to ${merit}. Automatic punishments already running keep their end dates.`
    : `A warning expired and your Platform Merit recovered to ${merit}.`;
  try {
    const { createNotificationServices } = require('./NotificationServices');
    const notification = await createNotificationServices({
      message,
      is_read: false,
      reference_table: 'accounts',
      reference_prefix: 'WARNING_UP',
      reference_path: '/profile',
      reference_id: accountId,
      account_id: accountId,
    });
    const { getIo } = require('../lib/WebSocket');
    const io = getIo();
    if (!io) return;
    if (notification) io.to(String(accountId)).emit('notification', notification);
    // Refetch signal only (no code / status / restriction), so the client re-reads its standing.
    io.to(String(accountId)).emit('account:restricted', {
      band: punishments?.band?.id || 'none',
      label: punishments?.band?.label || null,
      points,
    });
  } catch (err) {
    console.warn('Merit recovery notification failed:', err.message);
  }
}

/**
 * Re-read the member's points after they changed. When `previousPoints` is given (warnings
 * expired) and merit went up, the member is told. Punishments are not touched: they run on
 * their own clocks.
 */
async function refreshWarningBand(accountId, previousPoints = null) {
  if (!accountId) return null;
  const next = await getWarningBand(accountId);
  if (previousPoints != null && next.points < Number(previousPoints)) {
    await notifyMeritRecovered(accountId, next);
  }
  return next;
}

async function assertWarningAllows(accountId, action, extras = {}) {
  const { points, band, account, punishments } = await getWarningBand(accountId);
  if (!account || String(account.type || '').toLowerCase() !== 'user') return { points, band };

  if (MUTE_ACTIONS.has(action) && punishments?.mute) {
    throw warningBandError(muteActionMessage(action, punishments.mute), 'WARNING_RESTRICTED');
  }

  if (action === 'proposal' && band.id === 'restricted') {
    const used = extras.proposalsToday != null
      ? Number(extras.proposalsToday)
      : await countProposalsToday(accountId);
    if (used >= RESTRICTED_PROPOSAL_DAILY_CAP) {
      throw warningBandError(bandActionMessage('proposal_cap', band), 'WARNING_PROPOSAL_CAP');
    }
    return { points, band };
  }

  if (!actionAllowed(action, band.id)) {
    throw warningBandError(
      ACTION_MESSAGES[action] ? bandActionMessage(action, band) : 'An automatic merit punishment does not allow this action.',
      'WARNING_RESTRICTED'
    );
  }
  return { points, band };
}

/**
 * Warnings only count on member accounts (Platform Merit). A warning on a team or staff
 * account would be saved and then silently ignored, so it is refused with a clear reason.
 */
async function assertWarnableAccount(accountId) {
  const account = accountId ? await getWarningBandAccount(accountId) : null;
  if (!account || account.deleted_at) {
    throw warningBandError('Account not found', 'ACCOUNT_NOT_FOUND', 404);
  }
  if (String(account.type || '').toLowerCase() !== 'user') {
    throw warningBandError(
      'Warnings only apply to member accounts. Teams and staff have no Platform Merit, so warn the member who acted, or lock or ban the account instead.',
      'WARNING_MEMBER_ONLY',
      400
    );
  }
  return account;
}

async function listingReviewForced(accountId) {
  const { band } = await getWarningBand(accountId);
  return band.id === 'limited';
}

module.exports = {
  getWarningBand,
  refreshWarningBand,
  assertWarningAllows,
  assertWarnableAccount,
  listingReviewForced,
  countProposalsToday,
};
