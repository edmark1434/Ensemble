import type { CaseAccess } from '@/lib/cases';
import type { ThreadAttachment } from './appealAttachments';

/** Must match `APPEAL_TICKET_TYPE` in `backend/lib/AccountRestriction.js`. */
export const APPEAL_TICKET_TYPE = 'Appeal an account penalty';

export const APPEAL_LIMITS = {
  subject: 200,
  descriptionMin: 10,
  description: 5000,
  caseId: 80,
  evidence: 2000,
  /** `postPublicDisputeComment` rejects longer dispute replies. */
  disputeReply: 2000,
} as const;

/** Must match `TARGET_TYPES` in `backend/services/PenaltyAppealServices.js`. */
export type AppealTargetType =
  | 'ban'
  | 'lock'
  | 'suspension'
  | 'forum_timeout'
  | 'warning'
  | 'credit_hold'
  | 'merit_penalty';

/** The one penalty an appeal ticket is about. Null on account-wide appeals filed before the change. */
export type AppealTarget = {
  type: AppealTargetType;
  id: string | null;
  label: string | null;
  startedAt?: string | null;
};

export type AppealState =
  | 'available'
  | 'open'
  | 'legacy_open'
  | 'accepted'
  | 'denied'
  | 'denied_permanent';

/** One active penalty and whether it can be appealed now (`GET /api/users/appeals`). */
export type AppealablePenalty = {
  key: string;
  type: AppealTargetType;
  id: string;
  label: string;
  detail: string | null;
  reason: string | null;
  number: string | null;
  points: number | null;
  credits: number | null;
  startedAt: string | null;
  endsAt: string | null;
  appeal: {
    state: AppealState;
    canAppeal: boolean;
    ticketId: string | null;
    ticketNumber: string | null;
    status: string | null;
    decidedAt: string | null;
    availableAt: string | null;
    legacy?: boolean;
    message: string | null;
  };
};

export type AppealOptions = {
  /** False before the per-penalty migration: appeals are still account-wide. */
  perPenalty: boolean;
  legacyOpenAppeal: { ticketId: string | null; ticketNumber: string | null; status: string | null } | null;
  penalties: AppealablePenalty[];
};

export type TicketRow = {
  id: string;
  number?: string;
  subject?: string;
  type?: string;
  priority?: string;
  status?: string;
  updatedAt?: string;
  lastMessageAt?: string | null;
  /** The ticket's chat, so old `?conversation=` links find their case. */
  chatId?: string | null;
  /** Appeals: the one penalty this ticket is about, and the decision on it. */
  appealTarget?: AppealTarget | null;
  appealDecision?: AppealDecision;
  /** What the member may do on it, from the server. */
  access?: CaseAccess;
};

export type DisputeRow = {
  id: string;
  number?: string;
  title?: string;
  status?: string;
  reason?: string;
  updatedAt?: string;
  visibility?: boolean;
  viewerRole?: 'disputer' | 'disputee' | null;
  limited?: boolean;
  access?: CaseAccess;
};

export type ThreadMessage = {
  id: string;
  /** Ticket messages. */
  senderId?: string | null;
  /** Dispute messages. */
  senderAccountId?: string | null;
  authorType?: string;
  /** Dispute messages: `resolution` marks a platform ruling or notice. */
  authorRole?: string | null;
  authorName?: string;
  body?: string;
  messageType?: string;
  attachments?: ThreadAttachment[];
  createdAt?: string;
  replyToId?: string | null;
  /** Dispute messages: who can read it. */
  audience?: string | null;
  isUnsent?: boolean;
  /** Dispute messages: the author's stored profile picture path. */
  authorAvatar?: string | null;
  /** Dispute messages: a community reply still waiting for staff. */
  pendingReview?: boolean;
  /** Ticket messages: the appeal decision card (`messageType: 'appeal_decision'`). */
  decision?: AppealDecisionCardData | null;
};

export type AppealDecision = 'accepted' | 'denied' | 'denied_permanent' | null;

/**
 * An appeal decision posted in the ticket chat (`messageType: 'appeal_decision'`). Built by
 * `buildDecision` in `backend/services/PenaltyAppealServices.js`.
 */
export type AppealDecisionCardData = {
  version: number;
  decision: Exclude<AppealDecision, null>;
  headline: string;
  ticketNumber: string | null;
  target: { type: AppealTargetType; label: string } | null;
  outcomeLabel: string;
  outcome: string;
  paragraphs: string[];
  note: string | null;
  followUp: { action: 'suspend' | 'ban'; title: string; detail: string | null; label: string | null; reason: string | null } | null;
  reappeal: string | null;
  closing: string | null;
  decidedAt: string | null;
};

/** The card on a ticket message, from the API (`decision`) or a raw socket message (`appeal_decision`). */
export function decisionCardOf(message: unknown): AppealDecisionCardData | null {
  const m = message as { messageType?: string; message_type?: string; decision?: unknown; appeal_decision?: unknown } | null;
  const type = String(m?.messageType || m?.message_type || '').toLowerCase();
  if (type !== 'appeal_decision') return null;
  const card = (m?.decision || m?.appeal_decision) as AppealDecisionCardData | undefined;
  return card && typeof card === 'object' && card.decision ? card : null;
}

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
  /** "your suspension", for sentences. */
  noun: string;
};

/**
 * Per-penalty copy. Each penalty is appealed on its own and a decision changes only that one:
 * accepted bans, locks, suspensions, timeouts, automatic punishments and holds end within 24
 * hours; an accepted warning is rescinded at once.
 */
export const APPEAL_TARGET_COPY: Record<AppealTargetType, PenaltyCopy> = {
  ban: {
    formTitle: 'Appeal this ban',
    subjectPlaceholder: 'Appeal: account ban',
    outcome: 'If staff accept this appeal, the ban ends within 24 hours.',
    noun: 'ban',
  },
  lock: {
    formTitle: 'Ask to unlock this account',
    subjectPlaceholder: 'Request: unlock my account',
    outcome: 'If staff accept this appeal, the lock ends within 24 hours.',
    noun: 'lock',
  },
  suspension: {
    formTitle: 'Appeal this suspension',
    subjectPlaceholder: 'Appeal: account suspension',
    outcome: 'If staff accept this appeal, the suspension ends within 24 hours.',
    noun: 'suspension',
  },
  warning: {
    formTitle: 'Appeal this warning',
    subjectPlaceholder: 'Appeal: warning on my account',
    outcome: 'If staff accept this appeal, the warning is rescinded right away and its points stop counting against your Platform Merit.',
    noun: 'warning',
  },
  merit_penalty: {
    formTitle: 'Appeal this automatic punishment',
    subjectPlaceholder: 'Appeal: automatic punishment',
    outcome: 'If staff accept this appeal, this automatic punishment ends within 24 hours. The warnings behind it stay unless you appeal them too.',
    noun: 'automatic punishment',
  },
  credit_hold: {
    formTitle: 'Ask for your credits back',
    subjectPlaceholder: 'Request: release my held credits',
    outcome: 'If staff accept this appeal, the credits return to your Account Wallet within 24 hours.',
    noun: 'credit hold',
  },
  forum_timeout: {
    formTitle: 'Appeal this forum timeout',
    subjectPlaceholder: 'Appeal: forum timeout',
    outcome: 'If staff accept this appeal, this timeout ends within 24 hours.',
    noun: 'forum timeout',
  },
};

export const DEFAULT_PENALTY_COPY: PenaltyCopy = {
  formTitle: 'Appeal an account penalty',
  subjectPlaceholder: 'Appeal: account penalty',
  outcome: 'If staff accept your appeal, the penalty ends within 24 hours.',
  noun: 'penalty',
};

export function appealCopyFor(type?: AppealTargetType | null): PenaltyCopy {
  return (type && APPEAL_TARGET_COPY[type]) || DEFAULT_PENALTY_COPY;
}
