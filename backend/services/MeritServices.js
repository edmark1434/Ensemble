const {
  getMeritAccount,
  getMeritFacts,
  countProposalsToday,
  updateMeritScore,
} = require('../repositories/MeritRepositories');
const {
  BASE_MERIT,
  RESTRICTED_PROPOSAL_DAILY_CAP,
  ACTION_MESSAGES,
  clampMerit,
  bandFor,
  computeMeritScore,
  actionAllowed,
  meritError,
} = require('../lib/Merit');

function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase();
}

async function notifyBandChange(accountId, previousBand, nextBand, score) {
  if (!previousBand || previousBand.id === nextBand.id) return;
  const dropped = nextBand.min < previousBand.min;
  const message = dropped
    ? `Your Platform Merit is now ${nextBand.label} (${score}). Some actions are limited until the score recovers.`
    : `Your Platform Merit recovered to ${nextBand.label} (${score}).`;
  try {
    const { createNotificationServices } = require('./NotificationServices');
    const notification = await createNotificationServices({
      message,
      is_read: false,
      reference_table: 'accounts',
      reference_prefix: dropped ? 'MERIT_DOWN' : 'MERIT_UP',
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
      score,
      previousBand: previousBand.id,
    });
  } catch (err) {
    console.warn('Merit band notification failed:', err.message);
  }
}

async function recomputeAccountMerit(accountId, { force = false } = {}) {
  if (!accountId) return null;
  const facts = await getMeritFacts(accountId);
  if (!facts || String(facts.type || '').toLowerCase() !== 'user') return null;

  const status = normalizeStatus(facts.status);
  const banned = status === 'banned';
  const locked = status === 'locked';
  const previousScore = clampMerit(facts.merit_score);
  const previousBand = bandFor(previousScore);

  if ((banned || locked) && !force) {
    return {
      accountId,
      score: previousScore,
      band: previousBand,
      frozen: true,
    };
  }

  const score = computeMeritScore({
    completions: facts.completions,
    reviewAverage: facts.review_average,
    reviewCount: facts.review_count,
    verified: Boolean(facts.verified),
    createdAt: facts.created_at,
    warningHits: facts.warning_hits,
    timeoutActive: Boolean(facts.timeout_active),
    suspended: status === 'suspended',
    banned,
    disputeHits: facts.dispute_hits,
  });
  await updateMeritScore(accountId, score);
  const nextBand = bandFor(score);
  await notifyBandChange(accountId, previousBand, nextBand, score);
  return { accountId, score, band: nextBand, frozen: banned || locked };
}

function scheduleMeritRecompute(accountIds, options = {}) {
  const ids = [...new Set((Array.isArray(accountIds) ? accountIds : [accountIds]).filter(Boolean).map(String))];
  if (!ids.length) return;
  setImmediate(() => {
    Promise.all(ids.map((id) => recomputeAccountMerit(id, options))).catch((err) => {
      console.error('Merit recompute failed:', err.message);
    });
  });
}

async function getStoredMerit(accountId) {
  const account = await getMeritAccount(accountId);
  if (!account || String(account.type || '').toLowerCase() !== 'user') {
    return { score: BASE_MERIT, band: bandFor(BASE_MERIT), account };
  }
  const score = clampMerit(account.merit_score);
  return { score, band: bandFor(score), account };
}

async function assertMeritAllows(accountId, action, extras = {}) {
  const { score, band, account } = await getStoredMerit(accountId);
  if (!account || String(account.type || '').toLowerCase() !== 'user') return { score, band };

  if (action === 'proposal' && band.id === 'restricted') {
    const used = extras.proposalsToday != null
      ? Number(extras.proposalsToday)
      : await countProposalsToday(accountId);
    if (used >= RESTRICTED_PROPOSAL_DAILY_CAP) {
      throw meritError(ACTION_MESSAGES.proposal_cap, 'MERIT_PROPOSAL_CAP');
    }
    return { score, band };
  }

  if (!actionAllowed(action, band.id)) {
    throw meritError(ACTION_MESSAGES[action] || 'Your Platform Merit does not allow this action.', 'MERIT_RESTRICTED');
  }
  return { score, band };
}

async function meritWatchForcesListingReview(accountId) {
  const { band } = await getStoredMerit(accountId);
  return band.id === 'watch';
}

module.exports = {
  recomputeAccountMerit,
  scheduleMeritRecompute,
  getStoredMerit,
  assertMeritAllows,
  meritWatchForcesListingReview,
  countProposalsToday,
};
