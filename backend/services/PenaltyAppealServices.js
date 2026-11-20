/**
 * One appeal per penalty.
 *
 * A member can appeal each active penalty on their account on its own: a ban, a lock, a
 * suspension, each forum timeout, each warning, and each credit hold. Staff accept or deny each
 * appeal separately, and the decision only touches that penalty:
 *  - accept: a ban / lock / suspension / timeout / credit hold ends within 24 hours (never later
 *    than planned); a warning is rescinded at once.
 *  - deny: that penalty cannot be appealed again for 12 months; deny permanently: never.
 *    Other penalties stay appealable.
 *  - filing window: a penalty must first be appealed within `APPEAL_WINDOW_DAYS` of being
 *    issued or last extended; after that it can no longer be appealed (`window_closed`).
 *
 * A decision covers the penalty as it stood when decided. When staff extend or re-issue it
 * afterwards (a newer status change into the same status), it can be appealed again.
 *
 * Before the per-penalty migration runs, appeals stay account-wide (`assertCanFileLegacyAppeal`
 * and the legacy branch of `decideTicketAppeal`). Undecided account-wide appeals filed before
 * it, and the account-wide denial holds in `account_appeal_holds`, keep working.
 *
 * The member page (`GET /api/users/appeals`), the filing check, the staff case file and the
 * staff "open a ticket for a member" picker all read `listAppealablePenalties`, so they agree.
 */
const repo = require('../repositories/PenaltyAppealRepositories');

const TARGET_TYPES = Object.freeze([
  'ban',
  'lock',
  'suspension',
  'forum_timeout',
  'warning',
  'credit_hold',
  'merit_penalty',
]);
const DENIAL_HOLD_MONTHS = 12;
/**
 * A penalty must first be appealed within this many days of being issued (or last extended /
 * re-issued, which makes it a new decision). After that it cannot be appealed. A penalty already
 * appealed and denied (12-month hold) can still be appealed again once the hold ends.
 */
const APPEAL_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** How each kind of penalty is named in sentences ("your suspension ends within 24 hours"). */
const PENALTY_NOUN = Object.freeze({
  ban: 'ban',
  lock: 'lock',
  suspension: 'suspension',
  forum_timeout: 'forum timeout',
  warning: 'warning',
  credit_hold: 'credit hold',
  merit_penalty: 'automatic punishment',
});

/** Automatic merit punishment effects (`merit_penalties.effect`), when the row has no label. */
const MERIT_EFFECT_LABEL = Object.freeze({
  limited: 'Limited access',
  restricted: 'Restricted access',
  frozen: 'Frozen access',
  mute: 'Mute',
});

function appealError(message, statusCode = 400, code = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function iso(value) {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}

function formatDay(value) {
  const date = toDate(value);
  if (!date) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatWhen(value) {
  const date = toDate(value);
  if (!date) return '';
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function addMonths(date, months) {
  const next = new Date(date.getTime());
  next.setMonth(next.getMonth() + months);
  return next;
}

function creditsText(n) {
  const value = Number(n || 0);
  return `${value.toLocaleString()} credit${value === 1 ? '' : 's'}`;
}

function pointsText(n) {
  const value = Number(n || 0);
  return `${value} point${value === 1 ? '' : 's'}`;
}

function clip(text, max) {
  const value = String(text || '').trim();
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

/* ------------------------------------------------------------------ */
/* Active penalties                                                    */
/* ------------------------------------------------------------------ */

function standingPenalty(standing) {
  const label = standing.type === 'ban'
    ? 'Account ban'
    : standing.type === 'lock'
      ? 'Account lock'
      : standing.automatic
        ? 'Automatic suspension'
        : 'Suspension';
  const detail = standing.punishmentLabel
    || (standing.disputeNumber ? `After dispute ${standing.disputeNumber}` : null)
    || (standing.automatic ? 'Applied by Platform Merit after warnings' : null);
  return {
    type: standing.type,
    id: standing.id,
    label,
    detail,
    reason: standing.reason,
    number: null,
    points: null,
    credits: null,
    startedAt: iso(standing.startedAt),
    changedAt: iso(standing.changedAt),
    endsAt: iso(standing.endsAt),
  };
}

/**
 * Every penalty active on the account right now, most serious first, each with the stable id an
 * appeal names. Same order as the standing conditions the member sees.
 */
async function loadActivePenalties(accountId) {
  const [standing, meritPenalties, holds, timeouts, warnings] = await Promise.all([
    repo.loadStandingPenalty(accountId),
    repo.listActiveMeritPenalties(accountId),
    repo.listActiveCreditHolds(accountId),
    repo.listActiveForumTimeouts(accountId),
    repo.listActiveWarnings(accountId),
  ]);
  const list = [];
  if (standing) list.push(standingPenalty(standing));
  const warningNumbers = new Map(warnings.map((warning) => [warning.id, warning.number]));
  for (const punishment of meritPenalties) {
    const behind = punishment.violationId ? warningNumbers.get(punishment.violationId) : null;
    list.push({
      type: 'merit_penalty',
      id: punishment.id,
      label: punishment.label || MERIT_EFFECT_LABEL[punishment.effect] || 'Automatic punishment',
      detail: behind
        ? `Automatic, after warning ${behind}. If that warning is rescinded, this ends too.`
        : 'Automatic, after your Platform Merit dropped.',
      reason: null,
      number: null,
      points: null,
      credits: null,
      startedAt: iso(punishment.startedAt),
      changedAt: iso(punishment.startedAt),
      endsAt: iso(punishment.endsAt),
    });
  }
  for (const hold of holds) {
    list.push({
      type: 'credit_hold',
      id: hold.id,
      label: `${creditsText(hold.credits)} on hold`,
      detail: null,
      reason: hold.reason,
      number: null,
      points: null,
      credits: hold.credits,
      startedAt: iso(hold.startedAt),
      changedAt: iso(hold.startedAt),
      endsAt: iso(hold.endsAt),
    });
  }
  timeouts.forEach((timeout) => {
    list.push({
      type: 'forum_timeout',
      id: timeout.id,
      label: 'Forum timeout',
      detail: timeouts.length > 1 ? 'You have more than one forum timeout; each is appealed on its own.' : null,
      reason: null,
      number: null,
      points: null,
      credits: null,
      startedAt: iso(timeout.startedAt),
      changedAt: iso(timeout.startedAt),
      endsAt: iso(timeout.endsAt),
    });
  });
  for (const warning of warnings) {
    list.push({
      type: 'warning',
      id: warning.id,
      label: `Warning${warning.warningType ? ` · ${warning.warningType}` : ''}`,
      detail: pointsText(warning.points),
      reason: warning.reason,
      number: warning.number,
      points: warning.points,
      credits: null,
      startedAt: iso(warning.startedAt),
      changedAt: iso(warning.startedAt),
      endsAt: iso(warning.endsAt),
    });
  }
  return list.map((penalty) => ({
    ...penalty,
    key: `${penalty.type}:${penalty.id}`,
    // Stored in the ticket's "Case ID" answer, so staff search and the case file find it.
    reference: clip(penalty.number || `${penalty.label}${penalty.startedAt ? ` · ${formatDay(penalty.startedAt)}` : ''}`, 80),
  }));
}

function ticketRef(row) {
  return {
    ticketId: row?.ticket_id ? String(row.ticket_id) : null,
    ticketNumber: row?.ticket_number || null,
  };
}

/**
 * Whether this penalty can be appealed now, and why not. A decision covers the penalty as it
 * was when decided: an extension or re-issue after it can be appealed again.
 */
function appealStateFor(penalty, { appeals, legacyOpen, legacyHold, now = Date.now() }) {
  const mine = appeals.filter(
    (row) => row.appeal_target_type === penalty.type && String(row.appeal_target_id) === penalty.id
  );
  const open = mine.find((row) => !row.appeal_decision);
  if (open) {
    return {
      state: 'open',
      canAppeal: false,
      ...ticketRef(open),
      status: open.status || null,
      decidedAt: null,
      availableAt: null,
      message: `This penalty already has an open appeal${open.ticket_number ? ` (#${open.ticket_number})` : ''}. Reply on that ticket instead.`,
    };
  }
  if (legacyOpen) {
    return {
      state: 'legacy_open',
      canAppeal: false,
      ...ticketRef(legacyOpen),
      status: legacyOpen.status || null,
      decidedAt: null,
      availableAt: null,
      message: `Your appeal${legacyOpen.ticket_number ? ` #${legacyOpen.ticket_number}` : ''} covers your whole account. Staff decide it first; add anything new as a reply there.`,
    };
  }

  const changedAt = toDate(penalty.changedAt);
  const covers = (decidedAt) => Boolean(decidedAt) && (!changedAt || decidedAt.getTime() >= changedAt.getTime());
  const decided = mine
    .filter((row) => row.appeal_decision && toDate(row.appeal_decided_at))
    .sort((left, right) => toDate(right.appeal_decided_at) - toDate(left.appeal_decided_at))[0];
  const decidedAt = decided ? toDate(decided.appeal_decided_at) : null;
  if (decided && covers(decidedAt)) {
    const base = { canAppeal: false, ...ticketRef(decided), status: decided.status || null, decidedAt: iso(decidedAt) };
    if (decided.appeal_decision === 'denied_permanent') {
      return {
        ...base,
        state: 'denied_permanent',
        availableAt: null,
        message: 'Your appeal on this penalty was denied permanently. It cannot be appealed again.',
      };
    }
    if (decided.appeal_decision === 'accepted') {
      return {
        ...base,
        state: 'accepted',
        availableAt: null,
        // Staff may have lifted it now, within 24 hours, or on an earlier date: the card says which.
        message: 'Your appeal on this penalty was accepted. The decision on that ticket says when it ends.',
      };
    }
    if (decided.appeal_decision === 'denied') {
      const until = addMonths(decidedAt, DENIAL_HOLD_MONTHS);
      if (until.getTime() > now) {
        return {
          ...base,
          state: 'denied',
          availableAt: until.toISOString(),
          message: `Your appeal on this penalty was denied. You can appeal it again on ${formatDay(until)}.`,
        };
      }
    }
  }

  // Account-wide denials decided before appeals were per penalty still cover the penalties that
  // already existed then. A penalty issued after that decision is a new case.
  const legacyCovers = Boolean(legacyHold) && covers(toDate(legacyHold.decided_at));
  if (legacyHold) {
    const holdDecidedAt = toDate(legacyHold.decided_at);
    const until = toDate(legacyHold.blocked_until);
    const permanent = Boolean(legacyHold.permanently_denied);
    const active = permanent || Boolean(until && until.getTime() > now);
    if (active && legacyCovers) {
      return {
        state: permanent ? 'denied_permanent' : 'denied',
        canAppeal: false,
        ticketId: legacyHold.ticket_id ? String(legacyHold.ticket_id) : null,
        ticketNumber: null,
        status: null,
        decidedAt: iso(holdDecidedAt),
        availableAt: permanent ? null : iso(until),
        legacy: true,
        message: permanent
          ? 'An earlier appeal on your account was denied permanently, and it covered this penalty.'
          : `An earlier appeal on your account was denied, and it covered this penalty. You can appeal it again on ${formatDay(until)}.`,
      };
    }
  }

  // Filing window: a penalty nobody has appealed yet must be appealed within
  // APPEAL_WINDOW_DAYS of being issued or last extended. Once a decision covered it, the
  // 12-month denial hold above governs re-appeals instead.
  const issuedAt = changedAt || toDate(penalty.startedAt);
  const closesAt = issuedAt ? new Date(issuedAt.getTime() + APPEAL_WINDOW_DAYS * DAY_MS) : null;
  const previouslyDecided = Boolean(decided && covers(decidedAt)) || legacyCovers;
  if (closesAt && !previouslyDecided && closesAt.getTime() <= now) {
    return {
      state: 'window_closed',
      canAppeal: false,
      ticketId: null,
      ticketNumber: null,
      status: null,
      decidedAt: null,
      availableAt: null,
      closedAt: closesAt.toISOString(),
      message: `The appeal window for this penalty closed on ${formatDay(closesAt)}. Penalties must be appealed within ${APPEAL_WINDOW_DAYS} days of being issued.`,
    };
  }

  return {
    state: 'available',
    canAppeal: true,
    ticketId: null,
    ticketNumber: null,
    status: null,
    decidedAt: null,
    availableAt: null,
    // When filing closes; null when a previous decision covered it (the 12-month rule applies).
    closesAt: closesAt && !previouslyDecided ? closesAt.toISOString() : null,
    message: null,
  };
}

/**
 * The account's active penalties, each with whether it can be appealed now.
 * @returns {Promise<{ perPenalty: boolean, legacyOpenAppeal: object|null, penalties: object[] }>}
 */
async function listAppealablePenalties(accountId) {
  const [perPenalty, penalties, appeals, legacyOpen, legacyHold] = await Promise.all([
    repo.appealTargetsReady(),
    loadActivePenalties(accountId),
    repo.listTargetedAppeals(accountId),
    repo.findLegacyOpenAppeal(accountId),
    repo.findLegacyAppealHold(accountId),
  ]);
  const context = { appeals, legacyOpen, legacyHold, now: Date.now() };
  return {
    perPenalty,
    legacyOpenAppeal: legacyOpen
      ? { ...ticketRef(legacyOpen), status: legacyOpen.status || null, createdAt: iso(legacyOpen.created_at) }
      : null,
    penalties: penalties.map((penalty) => ({ ...penalty, appeal: appealStateFor(penalty, context) })),
  };
}

/* ------------------------------------------------------------------ */
/* Filing                                                              */
/* ------------------------------------------------------------------ */

const REFUSAL_STATUS = {
  open: 409,
  legacy_open: 409,
  accepted: 409,
  denied: 403,
  denied_permanent: 403,
  window_closed: 403,
};

/**
 * The penalty a new appeal is about, checked against what is on the account now.
 * @param {{ type?: string, id?: string }} input `appealTarget` from the request
 * @returns {Promise<{ type: string, id: string, label: string, startedAt: string|null, reference: string }>}
 */
async function resolveAppealTarget(accountId, input) {
  const type = String(input?.type || '').trim().toLowerCase();
  const id = String(input?.id || '').trim();
  if (!TARGET_TYPES.includes(type) || !id) {
    throw appealError(
      'Choose which penalty you are appealing. Each penalty is appealed on its own from your account standing page.',
      400,
      'APPEAL_TARGET_REQUIRED'
    );
  }
  const options = await listAppealablePenalties(accountId);
  const penalty = options.penalties.find((row) => row.type === type && row.id === id);
  if (!penalty) {
    throw appealError(
      'That penalty is no longer active, so there is nothing to appeal. Refresh to see what is on your account now.',
      409,
      'APPEAL_TARGET_INACTIVE'
    );
  }
  if (!penalty.appeal.canAppeal) {
    throw appealError(
      penalty.appeal.message || 'This penalty cannot be appealed right now.',
      REFUSAL_STATUS[penalty.appeal.state] || 409,
      `APPEAL_${String(penalty.appeal.state).toUpperCase()}`
    );
  }
  return {
    type: penalty.type,
    id: penalty.id,
    label: penalty.label,
    startedAt: penalty.startedAt,
    reference: penalty.reference,
  };
}

/**
 * Checks a new appeal. Returns the penalty it is about, or null before the per-penalty
 * migration (the appeal is then account-wide, under the old rules).
 */
async function prepareAppealFiling(accountId, input) {
  if (await repo.appealTargetsReady()) return resolveAppealTarget(accountId, input);
  const { assertCanFileLegacyAppeal } = require('../repositories/AdminTicketsRepositories');
  await assertCanFileLegacyAppeal(accountId);
  return null;
}

/* ------------------------------------------------------------------ */
/* Deciding                                                            */
/* ------------------------------------------------------------------ */

const REMEDIES = Object.freeze(['lift_24h', 'lift_now', 'shorten']);
const REMEDY_MODE = Object.freeze({ lift_24h: '24h', lift_now: 'now', shorten: 'at' });
const FOLLOW_UP_ACTIONS = Object.freeze(['suspend', 'ban']);
const NOTE_MAX = 1000;
const FOLLOW_UP_REASON_MAX = 500;

/**
 * What staff chose besides accept / deny, checked before anything is written.
 *  - accept: `remedy` — `lift_24h` (default), `lift_now`, or `shorten` with `endsAt`. Warnings are
 *    always rescinded (their clock cannot be changed). Account-wide appeals from before the
 *    change keep `lift_24h`.
 *  - deny: optional `followUp` — `{ action: 'suspend'|'ban', punishmentId, reason, days? }`, a
 *    named suspension or ban from the punishment catalog (a custom number of days, or none for
 *    a permanent ban, when `days` is sent).
 *  - `note`: the reason the member reads on the decision (optional, up to 1,000 characters).
 * @param {'accepted'|'denied'|'denied_permanent'} decision
 */
function normalizeDecisionOptions(ticket, decision, body = {}) {
  const note = String(body?.note || '').trim();
  if (note.length > NOTE_MAX) throw appealError(`Keep the note to ${NOTE_MAX.toLocaleString()} characters.`);
  const targeted = Boolean(ticket.appeal_target_type);
  const options = { note: note || null, remedy: null, endsAt: null, followUp: null };

  if (decision === 'accepted') {
    let remedy = String(body?.remedy || 'lift_24h').trim().toLowerCase();
    if (ticket.appeal_target_type === 'warning') remedy = 'rescind';
    else if (!REMEDIES.includes(remedy)) {
      throw appealError('Choose how to lift it: within 24 hours, right now, or on an earlier date.');
    }
    if (!targeted && remedy !== 'lift_24h') {
      throw appealError('This appeal covers the whole account (filed before appeals were per penalty), so accepting ends its penalties within 24 hours.');
    }
    if (remedy === 'shorten') {
      const endsAt = toDate(body?.endsAt);
      if (!endsAt || endsAt.getTime() <= Date.now() + 60 * 1000) {
        throw appealError('Pick a new end time at least a minute from now.');
      }
      options.endsAt = endsAt;
    }
    options.remedy = remedy;
    if (body?.followUp?.action && body.followUp.action !== 'none') {
      throw appealError('Further action is only for denied appeals.');
    }
    return options;
  }

  const raw = body?.followUp;
  const action = String(raw?.action || 'none').trim().toLowerCase();
  if (action === 'none') return options;
  if (!FOLLOW_UP_ACTIONS.includes(action)) throw appealError('Further action can be a suspension or a ban.');
  const punishmentId = String(raw?.punishmentId || '').trim();
  if (!punishmentId) throw appealError(`Pick which ${action === 'ban' ? 'ban' : 'suspension'} to issue.`);
  const reason = String(raw?.reason || '').trim() || note;
  if (!reason || reason.length < 5) {
    throw appealError(`Write the reason the member sees for the ${action === 'ban' ? 'ban' : 'suspension'}.`);
  }
  if (reason.length > FOLLOW_UP_REASON_MAX) {
    throw appealError(`Keep the reason to ${FOLLOW_UP_REASON_MAX} characters.`);
  }
  let days;
  if (raw?.days !== undefined && raw?.days !== '') {
    if (raw.days === null && action === 'ban') {
      days = null; // permanent
    } else {
      const parsed = Number(raw.days);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 365) {
        throw appealError('Choose between 1 and 365 days.');
      }
      days = parsed;
    }
  }
  options.followUp = { action, punishmentId, reason: clip(reason, FOLLOW_UP_REASON_MAX), days };
  return options;
}

/** Standing-action options for `updateAccountStatus` from a follow-up. */
function followUpStatusOptions(followUp) {
  const custom = followUp.days !== undefined;
  return {
    reason: followUp.reason,
    punishmentId: followUp.punishmentId,
    ...(custom
      ? { customDuration: true, duration: followUp.days ? 'temporary' : 'permanent', days: followUp.days || null }
      : {}),
  };
}

/**
 * Refuse a follow-up that cannot run, before the decision is saved: a suspension would replace a
 * stricter ban or lock, the target is the decider or (unless Admin) staff, or the catalog row is
 * not that kind of punishment.
 */
async function assertFollowUpAllowed(ticket, followUp, staffId) {
  if (!followUp) return;
  const standing = await repo.loadStandingPenalty(ticket.account_id);
  if (followUp.action === 'suspend' && standing && ['ban', 'lock'].includes(standing.type)) {
    throw appealError(
      `This account is ${standing.type === 'ban' ? 'banned' : 'locked'}; a suspension would replace that stricter penalty. Pick a ban or no further action.`,
      409
    );
  }
  const { assertCanSanctionTarget } = require('../lib/SuspendGuards');
  await assertCanSanctionTarget({ actorStaffId: staffId, targetAccountId: ticket.account_id, action: followUp.action });
  const { resolveStandingOptions } = require('./PunishmentDefServices');
  await resolveStandingOptions(followUp.action, followUpStatusOptions(followUp));
}

/**
 * Accept: change only the appealed penalty, the way staff chose. Runs inside the decision's
 * transaction.
 * @param {{ account_id: string, appeal_target_type: string, appeal_target_id: string }} ticket
 * @param {{ remedy?: string|null, endsAt?: Date|null }} [options]
 * @returns {Promise<{ applied: boolean, state: 'ends_soon'|'ended_now'|'shortened'|'rescinded'|'ended'|'changed', mode?: string, endsAt?: Date|null }>}
 */
async function applyAcceptedAppeal(client, ticket, options = {}) {
  const type = ticket.appeal_target_type;
  const accountId = ticket.account_id;
  const id = ticket.appeal_target_id;
  const lift = { mode: REMEDY_MODE[options.remedy] || '24h', at: options.endsAt || null };
  if (repo.STANDING_STATUS[type]) return repo.endStandingPenalty(client, accountId, type, id, lift);
  if (type === 'forum_timeout') return repo.endForumTimeout(client, accountId, id, lift);
  if (type === 'warning') return repo.rescindWarningRow(client, accountId, id);
  if (type === 'credit_hold') return repo.endCreditHold(client, accountId, id, lift);
  if (type === 'merit_penalty') return repo.endMeritPenalty(client, accountId, id, lift);
  return { applied: false, state: 'ended' };
}

/**
 * Denial with further action: issue the suspension or ban through the Users desk path (same
 * guards, notices and ban clean-up as anywhere else). Runs after the decision is committed.
 * @returns {Promise<{ action: string, applied: boolean, status?: string, label?: string|null, endsAt?: string|null, reason: string, error?: string }>}
 */
async function runFollowUp(ticket, followUp, staffId) {
  if (!followUp) return null;
  try {
    const { updateAccountStatus } = require('../repositories/AdminUserTeamRepositories');
    const result = await updateAccountStatus(ticket.account_id, followUp.action, staffId, followUpStatusOptions(followUp));
    const standing = await repo.loadStandingPenalty(ticket.account_id).catch(() => null);
    return {
      action: followUp.action,
      applied: true,
      status: result?.status || null,
      label: standing?.punishmentLabel || null,
      endsAt: iso(standing?.endsAt),
      reason: followUp.reason,
    };
  } catch (err) {
    console.error('Appeal follow-up action failed:', err.message);
    return { action: followUp.action, applied: false, reason: followUp.reason, error: err.message };
  }
}

function targetName(ticket) {
  return ticket.appeal_target_label || PENALTY_NOUN[ticket.appeal_target_type] || 'penalty';
}

const DECISION_HEADLINE = {
  accepted: 'Appeal accepted',
  denied: 'Appeal denied',
  denied_permanent: 'Appeal denied permanently',
};

function liftedLine(noun, outcome) {
  if (outcome?.state === 'rescinded') return 'The warning is rescinded.';
  if (outcome?.state === 'ended_now') return `Your ${noun} has been lifted.`;
  if (outcome?.state === 'shortened') return `Your ${noun} now ends ${formatWhen(outcome.endsAt)}.`;
  return `Your ${noun} ends within 24 hours.`;
}

function followUpLine(result) {
  if (!result?.applied) return null;
  const kind = result.action === 'ban' ? 'banned' : 'suspended';
  return result.endsAt
    ? `Your account is ${kind} until ${formatWhen(result.endsAt)}.`
    : `Your account is ${kind}${result.action === 'ban' ? ' permanently' : ''}.`;
}

/**
 * Everything one decision says: the chat card the member and staff see, the plain text behind
 * it (notifications, previews, transcripts), the staff timeline line and the live notice.
 * @param {'accepted'|'denied'|'denied_permanent'} decision
 * @param {{ applied?: boolean, state?: string, endsAt?: Date|null }|null} outcome what accepting changed
 * @param {{ note?: string|null, followUp?: object|null }} [extras] note, and the follow-up result
 */
function buildDecision(ticket, decision, outcome = null, { note = null, followUp = null } = {}) {
  const targeted = Boolean(ticket.appeal_target_type);
  const label = targeted ? targetName(ticket) : 'Account penalty';
  const noun = targeted ? PENALTY_NOUN[ticket.appeal_target_type] || 'penalty' : 'penalty';
  const number = ticket.ticket_number ? `#${ticket.ticket_number}` : '';
  const others = targeted ? 'Any other penalty on your account can still be appealed on its own.' : null;
  const followText = followUpLine(followUp);

  let outcomeLine;
  let paragraphs = [];
  let reappeal = null;
  let action;
  let message;
  let broadcast = null;

  if (decision === 'accepted') {
    if (!targeted) {
      outcomeLine = 'Your penalty ends within 24 hours.';
      paragraphs = ['Any ban, lock, suspension, forum timeout, automatic punishment or credit hold on the account ends within 24 hours of this decision. Warnings stay unless staff rescind them.'];
      action = 'Appeal accepted. Penalty (and any credit hold) ends in 24 hours.';
      message = `Your appeal on ticket ${number} was accepted. The penalty ends in 24 hours.`;
      broadcast = 'Your appeal was accepted. The penalty ends in 24 hours.';
    } else if (outcome?.applied) {
      outcomeLine = liftedLine(noun, outcome);
      if (outcome.state === 'rescinded') {
        paragraphs = ['Its points no longer count against your Platform Merit, and any automatic punishment it started ends with it. It stays on your record as rescinded.'];
      } else if (ticket.appeal_target_type === 'credit_hold') {
        paragraphs = ['The credits go back to your Account Wallet when the hold ends.'];
      } else if (ticket.appeal_target_type === 'merit_penalty') {
        paragraphs = ['The warnings behind it stay on your record and keep counting toward Platform Merit unless they are rescinded too.'];
      }
      action = `Appeal accepted: ${label} — ${outcomeLine.replace(/^Your /, 'the ').replace(/\.$/, '')}.`;
      message = `Your appeal on ticket ${number} was accepted. ${outcomeLine}`;
      broadcast = `Your appeal was accepted. ${outcomeLine}`;
    } else {
      outcomeLine = `Nothing changes: the ${noun} had already ended or been replaced.`;
      paragraphs = [`The ${noun} this appeal was about (${label}) was no longer active when staff decided, so there was nothing left to lift.`];
      action = `Appeal accepted: ${label} was no longer active, so nothing changed.`;
      message = `Your appeal on ticket ${number} was accepted. That ${noun} had already ended.`;
    }
  } else {
    const permanent = decision === 'denied_permanent';
    outcomeLine = targeted ? `The ${noun} stays in place.` : 'The penalty stays in place.';
    if (targeted) {
      reappeal = permanent
        ? `This ${noun} cannot be appealed again.`
        : `You can appeal this ${noun} again on ${formatDay(addMonths(new Date(), DENIAL_HOLD_MONTHS))}.`;
    } else {
      reappeal = permanent ? 'This account cannot submit another appeal.' : 'You can submit another appeal in 12 months.';
    }
    if (followText) paragraphs.push(`Staff also took further action: ${followText.charAt(0).toLowerCase()}${followText.slice(1)}`);
    action = targeted
      ? `Appeal ${permanent ? 'denied permanently' : 'denied'}: ${label} ${permanent ? 'cannot be appealed again' : 'can be appealed again in 12 months'}.${followText ? ` Further action: ${followText}` : ''}`
      : permanent
        ? 'Appeal denied permanently.'
        : 'Appeal denied. Next appeal is available in 12 months.';
    message = `Your appeal on ticket ${number} was ${permanent ? 'denied permanently' : 'denied'}. ${reappeal}${followText ? ` ${followText}` : ''}`;
  }

  const closing = ['This ticket is closed.', others].filter(Boolean).join(' ');
  const body = [
    `${DECISION_HEADLINE[decision]}${targeted ? ` — ${label}` : ''}`,
    outcomeLine,
    ...paragraphs,
    note ? `Staff note: ${note}` : null,
    reappeal,
    closing,
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    body,
    message: message.replace(/\s{2,}/g, ' ').trim(),
    action,
    broadcast,
    card: {
      version: 1,
      decision,
      headline: DECISION_HEADLINE[decision],
      ticketNumber: ticket.ticket_number || null,
      target: targeted ? { type: ticket.appeal_target_type, label } : null,
      outcomeLabel: decision === 'accepted' ? 'What changes' : 'Decision',
      outcome: outcomeLine,
      paragraphs,
      note,
      followUp: followUp?.applied
        ? {
            action: followUp.action,
            title: followUp.action === 'ban' ? 'Account banned' : 'Account suspended',
            detail: followText,
            label: followUp.label || null,
            reason: followUp.reason || null,
          }
        : null,
      reappeal,
      closing,
      decidedAt: new Date().toISOString(),
    },
  };
}

/** After an accepted appeal is committed: finish a "lift now", then tell the member and every open tab. Never throws. */
async function announceAcceptedAppeal(ticket, outcome, { staffId = null, copy = null } = {}) {
  if (!outcome?.applied) return;
  const accountId = ticket.account_id;
  // "Lift now": the end is already in the past, so lift it here instead of waiting for the
  // one-minute sweep. Each of these records the lift and notifies the member itself.
  if (outcome.state === 'ended_now') {
    try {
      const type = ticket.appeal_target_type;
      if (repo.STANDING_STATUS[type]) {
        const { liftExpiredStandings } = require('../lib/AccountRestriction');
        await liftExpiredStandings({ accountId, limit: 1 });
      } else if (type === 'credit_hold') {
        const { unfreezeAccountCredits } = require('./CreditHoldServices');
        await unfreezeAccountCredits(accountId, { source: 'hold_expired' });
      } else if (type === 'merit_penalty') {
        const merit = require('./MeritPenaltyServices');
        if (typeof merit.sweepElapsedMeritPenalties === 'function') await merit.sweepElapsedMeritPenalties({ limit: 50 });
      }
    } catch (err) {
      // The one-minute sweep lifts it anyway.
      if (err?.code !== 'MODULE_NOT_FOUND') console.warn('Immediate appeal lift deferred to the sweep:', err.message);
    }
  }
  try {
    if (outcome.state === 'rescinded' && outcome.warning) {
      // Same follow-up as a staff rescind: activity, automatic punishments this warning started
      // end, band refresh, and the member's merit notice.
      const { announceWarningRescinded } = require('../repositories/AdminUserTeamRepositories');
      await announceWarningRescinded({
        accountId,
        warning: outcome.warning,
        staffId,
        source: 'appeal',
        ticketNumber: ticket.ticket_number || null,
      });
    } else if (ticket.appeal_target_type === 'merit_penalty') {
      try {
        const { broadcastPunishmentChange } = require('./MeritPenaltyServices');
        if (typeof broadcastPunishmentChange === 'function') await broadcastPunishmentChange(accountId);
      } catch (err) {
        if (err?.code !== 'MODULE_NOT_FOUND') console.warn('Automatic punishment broadcast skipped:', err.message);
      }
    }
    const { getAccountAccess } = require('../lib/AccountRestriction');
    const restriction = await getAccountAccess(accountId);
    try {
      const { refreshSocketStanding } = require('../lib/WebSocket');
      if (typeof refreshSocketStanding === 'function') refreshSocketStanding(accountId, restriction);
    } catch (_err) {
      // Sockets refresh their standing on the next write event anyway.
    }
    const { getIo } = require('../lib/WebSocket');
    const io = getIo();
    if (io) {
      io.to(String(accountId)).emit('account:status_changed', {
        accountId,
        status: restriction?.status,
        code: restriction?.code || null,
        message: copy?.broadcast || 'Your appeal was accepted.',
        restriction,
      });
    }
  } catch (err) {
    console.warn('Appeal acceptance broadcast failed:', err.message);
  }
}

/* ------------------------------------------------------------------ */
/* Staff case file                                                     */
/* ------------------------------------------------------------------ */

function acceptEffectFor(penalty, others) {
  if (penalty.type === 'warning') {
    return `This warning is rescinded at once: ${pointsText(penalty.points)} stop counting toward Platform Merit, and any automatic punishment it started ends.`;
  }
  if (penalty.type === 'credit_hold') {
    return `${creditsText(penalty.credits)} return to the Account Wallet within 24 hours${
      penalty.endsAt ? ` (now set for ${formatWhen(penalty.endsAt)})` : ' (it has no release date now)'
    }.`;
  }
  if (penalty.type === 'merit_penalty') {
    return `${penalty.label} ends within 24 hours (now set to end ${formatWhen(penalty.endsAt)}). The warnings behind it stay; Platform Merit does not change.`;
  }
  if (penalty.type === 'forum_timeout') {
    const more = others.filter((row) => row.type === 'forum_timeout').length;
    return `This forum timeout ends within 24 hours${
      penalty.endsAt ? ` (now set to end ${formatWhen(penalty.endsAt)})` : ' (it has no end date now)'
    }.${more ? ` ${more} other forum timeout${more === 1 ? '' : 's'} keep running.` : ''}`;
  }
  return `The ${PENALTY_NOUN[penalty.type]} ends within 24 hours${
    penalty.endsAt ? ` (now set to end ${formatWhen(penalty.endsAt)})` : ' (it has no end date now)'
  }.`;
}

/**
 * The penalty an appeal ticket is about, as staff need it to decide: is it still active, what
 * accepting and denying do, earlier decisions on it, and the account's other penalties.
 * Null for account-wide (older) appeals.
 * @param row the `tickets` row (account_id, ticket_id, appeal_target_*)
 */
async function describeAppealTarget(row) {
  if (!row?.appeal_target_type || !row.account_id) return null;
  const type = row.appeal_target_type;
  const id = String(row.appeal_target_id);
  const accountId = row.account_id;
  const [options, appeals] = await Promise.all([listAppealablePenalties(accountId), repo.listTargetedAppeals(accountId)]);
  const penalty = options.penalties.find((item) => item.type === type && item.id === id) || null;
  const others = options.penalties.filter((item) => !(item.type === type && item.id === id));

  let state = penalty ? 'active' : 'ended';
  let note = null;
  if (!penalty) {
    if (repo.STANDING_STATUS[type]) {
      const sameKind = others.find((item) => item.type === type);
      if (sameKind) {
        state = 'changed';
        note = `The account is under a newer ${PENALTY_NOUN[type]} (since ${formatWhen(sameKind.startedAt)}). It is not part of this appeal.`;
      } else {
        note = `This ${PENALTY_NOUN[type]} has already ended.`;
      }
    } else if (type === 'warning') {
      const warning = await repo.findWarning(accountId, id);
      note = warning
        ? `This warning is no longer active (${String(warning.status || 'expired').toLowerCase()}).`
        : 'This warning is no longer on the record.';
    } else if (type === 'credit_hold') {
      const sameWallet = others.find((item) => item.type === 'credit_hold' && item.id.split('@')[0] === id.split('@')[0]);
      if (sameWallet) {
        state = 'changed';
        note = `Staff placed another hold since this appeal was filed; the current ${sameWallet.label.toLowerCase()} is a newer decision and is not part of this appeal.`;
      } else {
        note = 'These credits are no longer held.';
      }
    } else if (type === 'merit_penalty') {
      note = 'This automatic punishment has already ended.';
    } else {
      note = 'This forum timeout has already ended.';
    }
  }

  const noun = PENALTY_NOUN[type] || 'penalty';
  return {
    type,
    id,
    label: row.appeal_target_label || penalty?.label || noun,
    startedAt: iso(row.appeal_target_started_at) || penalty?.startedAt || null,
    state,
    note,
    current: penalty
      ? {
          endsAt: penalty.endsAt,
          reason: penalty.reason,
          detail: penalty.detail,
          number: penalty.number,
          points: penalty.points,
          credits: penalty.credits,
        }
      : null,
    // How accepting may lift it: a warning is rescinded; timed penalties end within 24 hours,
    // now, or at an earlier time; an inactive penalty has nothing left to lift.
    remedies: !penalty ? [] : type === 'warning' ? ['rescind'] : ['lift_24h', 'lift_now', 'shorten'],
    acceptEffect: penalty
      ? acceptEffectFor(penalty, others)
      : `This ${noun} is no longer active, so accepting only records the decision.`,
    denyEffect: `The ${noun} stays and cannot be appealed again for 12 months. Other penalties can still be appealed.`,
    denyPermanentEffect: `The ${noun} stays and can never be appealed again. Other penalties can still be appealed.`,
    history: appeals
      .filter(
        (item) =>
          item.appeal_target_type === type &&
          String(item.appeal_target_id) === id &&
          String(item.ticket_id) !== String(row.ticket_id)
      )
      .map((item) => ({
        id: String(item.ticket_id),
        number: item.ticket_number || null,
        status: item.status || null,
        decision: item.appeal_decision || null,
        decidedAt: iso(item.appeal_decided_at),
        createdAt: iso(item.created_at),
      })),
    otherPenalties: others.map((item) => ({
      type: item.type,
      id: item.id,
      label: item.label,
      number: item.number,
      endsAt: item.endsAt,
      appealState: item.appeal.state,
      appealTicketNumber: item.appeal.ticketNumber,
    })),
  };
}

module.exports = {
  TARGET_TYPES,
  APPEAL_WINDOW_DAYS,
  PENALTY_NOUN,
  appealTargetsReady: repo.appealTargetsReady,
  listAppealablePenalties,
  resolveAppealTarget,
  prepareAppealFiling,
  normalizeDecisionOptions,
  assertFollowUpAllowed,
  applyAcceptedAppeal,
  runFollowUp,
  buildDecision,
  announceAcceptedAppeal,
  describeAppealTarget,
};
