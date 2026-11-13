/**
 * Turns the live standing from `/api/users/me` (`user.restriction`) into plain-language
 * conditions: what is paused, when it ends, and how to get back to normal. The banner, the
 * details sheet, the appeal page and the wallet all read from here so they never disagree.
 *
 * The backend stays the authority: these are explanations, not checks.
 */

export type StandingRestriction = {
  status?: string | null;
  code?: string | null;
  message?: string | null;
  blocked?: boolean;
  banned?: boolean;
  locked?: boolean;
  suspended?: boolean;
  deactivated?: boolean;
  forumTimeout?: boolean;
  warningFrozen?: boolean;
  warningBand?: string | null;
  warningBandLabel?: string | null;
  warningBandEndsAt?: string | null;
  suspensionEndsAt?: string | null;
  banEndsAt?: string | null;
  lockEndsAt?: string | null;
  forumTimeoutEndsAt?: string | null;
  creditsFrozen?: boolean;
  frozenCredits?: number | null;
  creditsFrozenAt?: string | null;
  creditsFrozenUntil?: string | null;
  creditsFrozenReason?: string | null;
  returnsToDeactivated?: boolean;
  merit?: number | null;
};

export type StandingConditionId =
  | 'banned'
  | 'locked'
  | 'suspended'
  | 'frozen_access'
  | 'credit_hold'
  | 'forum_timeout';

export type StandingCondition = {
  id: StandingConditionId;
  label: string;
  title: string;
  summary: string;
  reason: string | null;
  paused: string[];
  /** ISO end time, or null when it waits for staff or for warnings with no end date. */
  endsAt: string | null;
  /** Shown when there is no end time. */
  openEnded: string;
  recover: string[];
  canAppeal: boolean;
  tone: 'rose' | 'amber' | 'sky';
};

export const APPEAL_PATH = '/account/appeal';

export function formatStandingWhen(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "2d 4h", "3h 12m", "45s" — the compact form for banners. */
export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function credits(n?: number | null) {
  const value = Number(n || 0);
  return `${value.toLocaleString()} credit${value === 1 ? '' : 's'}`;
}

function endsLine(endsAt: string | null | undefined, openEnded: string) {
  const when = formatStandingWhen(endsAt);
  return when ? `It ends by itself on ${when}. You do not need to do anything.` : openEnded;
}

const APPEAL_STEP =
  'If you think this is a mistake, file an appeal and explain what happened. If staff accept it, it ends within 24 hours.';

/**
 * Every condition that is active right now, most serious first. Ban and lock only appear on
 * the appeal page (members in those states cannot reach the rest of the site).
 */
export function standingConditions(restriction?: StandingRestriction | null): StandingCondition[] {
  if (!restriction) return [];
  const r = restriction;
  const status = String(r.status || '').toLowerCase();
  const list: StandingCondition[] = [];
  const backToDeactivated = r.returnsToDeactivated
    ? ['When it ends, your account goes back to deactivated, the way you left it. Reactivate it whenever you are ready.']
    : [];

  if (r.banned || status === 'banned') {
    list.push({
      id: 'banned',
      label: 'Banned',
      title: 'Your account is banned',
      summary: 'You can sign in only to appeal and to read your tickets and disputes.',
      reason: null,
      paused: ['Everything except appeals, tickets and disputes'],
      endsAt: r.banEndsAt || null,
      openEnded: 'This ban has no end date. An accepted appeal is the way back.',
      recover: [endsLine(r.banEndsAt, 'This ban has no end date.'), APPEAL_STEP, ...backToDeactivated],
      canAppeal: true,
      tone: 'rose',
    });
  } else if (r.locked || status === 'locked') {
    list.push({
      id: 'locked',
      label: 'Locked',
      title: 'Your account is locked',
      summary: 'Staff are reviewing this account. You can sign in only to appeal and to read your tickets and disputes.',
      reason: null,
      paused: ['Everything except appeals, tickets and disputes'],
      endsAt: r.lockEndsAt || null,
      openEnded: 'The lock stays until staff finish their review.',
      recover: [
        endsLine(r.lockEndsAt, 'The lock stays until staff finish their review.'),
        'Answer any questions staff send on your tickets; that speeds the review up.',
        APPEAL_STEP,
        ...backToDeactivated,
      ],
      canAppeal: true,
      tone: 'rose',
    });
  } else if (r.suspended || status === 'suspended' || r.code === 'ACCOUNT_SUSPENDED') {
    list.push({
      id: 'suspended',
      label: 'Suspended',
      title: 'Your account is suspended',
      summary: 'You can still look around Ensemble. Actions stay off until the suspension ends.',
      reason: null,
      paused: [
        'Posting jobs, gigs and listings',
        'Sending proposals, offers and orders',
        'Buying credits, assets or subscriptions, and cashing out',
        'Sending messages, forum posts and reviews',
        'Opening tickets other than an appeal',
      ],
      endsAt: r.suspensionEndsAt || null,
      openEnded: 'This suspension has no end date yet. An accepted appeal is the way back.',
      recover: [
        endsLine(r.suspensionEndsAt, 'This suspension has no end date yet.'),
        APPEAL_STEP,
        'Your credits and live contracts are not touched. Contracts pick up again when it ends.',
        ...backToDeactivated,
      ],
      canAppeal: true,
      tone: 'amber',
    });
  }

  if (r.warningFrozen || (r.warningBand === 'frozen' && status === 'active')) {
    list.push({
      id: 'frozen_access',
      label: r.warningBandLabel || 'Frozen access',
      title: 'Frozen access',
      summary: 'Your Platform Merit is low because of active warnings, so some actions are paused. Nothing is taken from you.',
      reason: null,
      paused: [
        'Sending proposals',
        'Starting new messages (existing job, gig and contract threads stay open)',
        'Cashing out (your balance stays yours)',
        'Posting new jobs, gigs and listings',
        'Forum posts, new teams and new shared projects',
      ],
      endsAt: r.warningBandEndsAt || null,
      openEnded: 'It lifts as the warnings behind it expire.',
      recover: [
        r.warningBandEndsAt
          ? `It lifts by itself on ${formatStandingWhen(r.warningBandEndsAt)}, when enough warnings expire. New warnings push that date back.`
          : 'It lifts as the warnings behind it expire. New warnings push that date back.',
        'You can still finish live contracts and gig orders.',
        'If a warning was issued by mistake, file an appeal about it.',
      ],
      canAppeal: true,
      tone: 'sky',
    });
  }

  if (r.creditsFrozen && Number(r.frozenCredits || 0) > 0) {
    list.push({
      id: 'credit_hold',
      label: 'Credits on hold',
      title: `${credits(r.frozenCredits)} on hold`,
      summary: 'Staff put a hold on credits in your Account Wallet. They are still yours; you just cannot spend, transfer or cash them out yet.',
      reason: r.creditsFrozenReason || null,
      paused: [
        `Spending, transferring or cashing out the ${credits(r.frozenCredits)} on hold`,
        'Credits you receive after the hold stay usable',
      ],
      endsAt: r.creditsFrozenUntil || null,
      openEnded: 'The hold stays until staff review it.',
      recover: [
        r.creditsFrozenUntil
          ? `They return to your Account Wallet automatically on ${formatStandingWhen(r.creditsFrozenUntil)}.`
          : 'There is no end date yet; staff release it after reviewing your account.',
        'To ask for them back sooner, file an appeal. If staff accept it, the credits return within 24 hours.',
      ],
      canAppeal: true,
      tone: 'amber',
    });
  }

  if (r.forumTimeout) {
    list.push({
      id: 'forum_timeout',
      label: 'Forum timeout',
      title: 'You are timed out from the forums',
      summary: 'You can read the forums. Posting, commenting, reacting and reporting there are off. Everything else works.',
      reason: null,
      paused: ['Forum posts, comments, reactions, groups and forum reports'],
      endsAt: r.forumTimeoutEndsAt || null,
      openEnded: 'The timeout stays until staff remove it.',
      recover: [endsLine(r.forumTimeoutEndsAt, 'The timeout stays until staff remove it.'), APPEAL_STEP],
      canAppeal: true,
      tone: 'amber',
    });
  }

  return list;
}

/** The conditions the site-wide banner shows (ban and lock live on the appeal page). */
export function bannerConditions(restriction?: StandingRestriction | null) {
  return standingConditions(restriction).filter((c) => c.id !== 'banned' && c.id !== 'locked');
}

/** Earliest end time among the conditions, for a single refresh when it passes. */
export function nextStandingChange(conditions: StandingCondition[]) {
  const times = conditions
    .map((c) => (c.endsAt ? new Date(c.endsAt).getTime() : NaN))
    .filter((t) => Number.isFinite(t));
  return times.length ? Math.min(...times) : null;
}
