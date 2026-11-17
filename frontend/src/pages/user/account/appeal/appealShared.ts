import type { StandingConditionId } from '@/lib/standing';

/** Must match `APPEAL_TICKET_TYPE` in `backend/lib/AccountRestriction.js`. */
export const APPEAL_TICKET_TYPE = 'Appeal an account penalty';

export const APPEAL_LIMITS = {
  subject: 200,
  descriptionMin: 10,
  description: 5000,
  caseId: 80,
  evidence: 2000,
} as const;

export type TicketRow = {
  id: string;
  number?: string;
  subject?: string;
  type?: string;
  status?: string;
  updatedAt?: string;
  lastMessageAt?: string | null;
};

export type DisputeRow = {
  id: string;
  number?: string;
  title?: string;
  status?: string;
  reason?: string;
  updatedAt?: string;
};

export type ThreadMessage = {
  id: string;
  senderId?: string | null;
  authorType?: string;
  authorName?: string;
  body?: string;
  messageType?: string;
  createdAt?: string;
};

export type AppealDecision = 'accepted' | 'denied' | 'denied_permanent' | null;

export type CaseSelection = { kind: 'ticket' | 'dispute'; id: string };

export function isClosedStatus(status?: string | null) {
  const value = String(status || '').toLowerCase();
  return value === 'closed' || value === 'resolved';
}

export function isAppealTicket(ticket?: { type?: string } | null) {
  return ticket?.type === APPEAL_TICKET_TYPE;
}

export function statusPillClass(status?: string | null) {
  const value = String(status || '').toLowerCase();
  if (value === 'closed' || value === 'resolved') {
    return 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-zinc-400';
  }
  if (value === 'open' || value === 'new') {
    return 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
  }
  return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
}

export function errorMessage(err: unknown, fallback: string) {
  const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message || fallback;
}

type PenaltyCopy = {
  formTitle: string;
  subjectPlaceholder: string;
  /** What an accepted appeal does, in plain words. */
  outcome: string;
};

/** Per-penalty copy. Accepted appeals end bans, locks, suspensions, timeouts and holds; warnings are rescinded instead. */
export const PENALTY_COPY: Record<StandingConditionId, PenaltyCopy> = {
  banned: {
    formTitle: 'Appeal this ban',
    subjectPlaceholder: 'Appeal: account ban',
    outcome: 'If staff accept your appeal, the ban ends within 24 hours.',
  },
  locked: {
    formTitle: 'Ask to unlock this account',
    subjectPlaceholder: 'Request: unlock my account',
    outcome: 'If staff accept your appeal, the lock ends within 24 hours.',
  },
  suspended: {
    formTitle: 'Appeal this suspension',
    subjectPlaceholder: 'Appeal: account suspension',
    outcome: 'If staff accept your appeal, the suspension ends within 24 hours.',
  },
  frozen_access: {
    formTitle: 'Appeal a warning',
    subjectPlaceholder: 'Appeal: warning on my account',
    outcome: 'If a warning was issued by mistake, staff remove it and your Platform Merit recovers.',
  },
  credit_hold: {
    formTitle: 'Ask for your credits back',
    subjectPlaceholder: 'Request: release my held credits',
    outcome: 'If staff accept your appeal, the credits return to your Account Wallet within 24 hours.',
  },
  forum_timeout: {
    formTitle: 'Appeal this forum timeout',
    subjectPlaceholder: 'Appeal: forum timeout',
    outcome: 'If staff accept your appeal, the timeout ends within 24 hours.',
  },
};

export const DEFAULT_PENALTY_COPY: PenaltyCopy = {
  formTitle: 'Appeal an account penalty',
  subjectPlaceholder: 'Appeal: account penalty',
  outcome: 'If staff accept your appeal, the penalty ends within 24 hours.',
};
