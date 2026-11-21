import type { AppealDecisionCardData, AppealTarget, AppealTargetType } from '@/pages/user/account/appeal/appealShared';

export type { AppealDecisionCardData, AppealTarget, AppealTargetType };

export type TicketPerson = {
  accountId?: number | string;
  userId?: number | string | null;
  name: string;
  username?: string;
  email?: string | null;
  /** Stored profile picture path (dispute parties). */
  avatar?: string | null;
};

export type TicketAssignee = {
  staffId: number | string;
  name: string;
  role: string;
  accountId?: string | null;
};

export type SupportTicket = {
  id: number | string;
  number: string;
  subject: string;
  reason?: string;
  type: string;
  /** @deprecated use type */
  category?: string;
  priority: string;
  status: string;
  requester: TicketPerson;
  assignee: TicketAssignee | null;
  escalatedBy?: TicketAssignee | null;
  /** Moderator queue this ticket was escalated TO */
  escalatedToRole?: string | null;
  isEscalated?: boolean;
  waitingForResponse?: boolean;
  isOverdue?: boolean;
  lastMessageAuthorType?: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  resolvedAt?: string | null;
  /** "Appeal an account penalty": the one penalty this appeal is about (null on older appeals). */
  appealTarget?: AppealTarget | null;
};

export type TicketAttachment = {
  attachment_id?: string;
  attachment_key?: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_type?: string;
};

export type TicketTimelineEntry = {
  id: string;
  kind: 'ticket' | 'account' | string;
  eventType: string;
  summary: string;
  actorName?: string | null;
  actorRole?: string | null;
  createdAt: string;
};

export type TicketArticle = {
  id: string;
  ticketType: string;
  title: string;
  body: string;
};

export type TicketPaymentEvidence = {
  payments: {
    id: string;
    reference: string;
    amount: number;
    currency: string;
    status: string;
    type: string | null;
    credits: number;
    createdAt: string;
    processedAt: string | null;
  }[];
  credits: {
    id: string;
    type: string;
    amount: number;
    status: string;
    createdAt: string;
  }[];
  cashouts: {
    id: string;
    status: string;
    credits: number;
    channel: string | null;
    failureCode: string | null;
    accountLast4: string | null;
    createdAt: string;
    refundedAt: string | null;
  }[];
};

export type TicketMessage = {
  id: number | string;
  senderId?: string | null;
  authorType: string;
  authorName: string;
  authorRole?: string | null;
  /** Stored profile picture path of the author (dispute threads). */
  authorAvatar?: string | null;
  body: string;
  attachments?: TicketAttachment[];
  isInternal: boolean;
  isEdited?: boolean;
  isUnsent?: boolean;
  messageType?: string;
  /** Appeal decision card (`messageType: 'appeal_decision'`). */
  decision?: AppealDecisionCardData | null;
  replyToId?: string | null;
  audience?: 'staff' | 'author_and_staff' | 'disputer' | 'disputee' | 'parties' | 'public' | string;
  publishedAt?: string | null;
  createdAt: string;
};

export type TicketParticipant = {
  accountId: string;
  name: string;
  handle?: string | null;
  email?: string | null;
  role: string;
  status: 'active' | 'removed' | 'left' | string;
  isRequester: boolean;
  isStaff: boolean;
  replyCount: number;
  lastReplyAt?: string | null;
  joinedAt?: string | null;
};

export type DisputeCreditHold = {
  transactionId: number | string | null;
  status: string;
  amount: number;
  type: string; // CREDIT_TRANSACTION.type, e.g. Escrow Hold
};

export type DisputePermissions = {
  staffId?: string | null;
  role?: string | null;
  isAssignee?: boolean;
  isAdmin?: boolean;
  canView?: boolean;
  canReply?: boolean;
  canAct?: boolean;
  canAssignOthers?: boolean;
  canSelfAssign?: boolean;
  canAssignMyself?: boolean;
  canRelease?: boolean;
};

export type TicketPermissions = {
  staffId?: string | null;
  role?: string | null;
  isAssignee?: boolean;
  isAdmin?: boolean;
  canView?: boolean;
  canReply?: boolean;
  canAct?: boolean;
  canAssignOthers?: boolean;
  canSelfAssign?: boolean;
  canAssignMyself?: boolean;
  canRelease?: boolean;
  canEscalate?: boolean;
};

export type DisputeFinancialResolution = {
  at: string;
  kind: string | null;
  staffId?: string | null;
  clientCredits: number;
  freelancerCredits: number;
  reversedTransactionId?: string | null;
};

export type Dispute = {
  id: number | string;
  number: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  visibility?: boolean;
  initiator: TicketPerson;
  respondent: TicketPerson;
  assignee: TicketAssignee | null;
  creditAmount: number;
  sanctionType?: string | null;
  relatedCreditTransactionId?: number | string | null;
  creditHold?: DisputeCreditHold | null;
  openedAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  /** Why the case closed, from backend/lib/DisputeResolutions.js. */
  resolutionOutcome?: string | null;
  resolutionOutcomeLabel?: string | null;
  isClosed?: boolean;
  /** Filed after the contract ended: staff can record an outcome or sanction, but never move credits. */
  conductOnly?: boolean;
  financialResolution?: DisputeFinancialResolution | null;
};

/** One choice in the Resolve prompt, served by the dispute detail payload. */
export type DisputeResolutionOption = {
  key: string;
  label: string;
  hint: string;
  requiresNote?: boolean;
  /**
   * Disputes only: what the outcome does with escrow the case still holds. `keep` leaves it with
   * the contract; `disputer` sends it to the disputer (Settle escrow, award "disputer").
   */
  escrow?: "keep" | "disputer";
  /** The exact message the server posts for this choice (without staff notes). */
  preview?: string;
};

export type UserReport = {
  id: number | string;
  number: string;
  reporter: TicketPerson;
  targetType: string;
  targetId: string | null;
  /** The account the report is against (seller, poster, member); null for platform reports. */
  reported?: { accountId: string; name: string; username: string } | null;
  subjectTitle?: string | null;
  type: string;
  description: string | null;
  status: string;
  priority: string;
  assignee: { staffId: number | string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type StaffWorkload = {
  staffId: number | string;
  name: string;
  role: string;
  openTickets: number;
  openDisputes: number;
  openReports: number;
  totalOpen: number;
};

export type TicketActivity = {
  id: string;
  type: string;
  ref: string;
  label: string;
  status: string;
  at: string;
};

export type ChartSegment = { label: string; value: number; color?: string };

export const TICKET_STATUS_OPTIONS = ['Open', 'In Progress', 'Closed'] as const;
export const TICKET_PRIORITY_OPTIONS = ['Low', 'Medium', 'High'] as const;

export const SUPPORT_SUBGROUPS: { label: string; types: readonly string[] }[] = [
  {
    label: 'Account',
    types: [
      'Sign-in and password',
      'Account compromised',
      'Identity verification',
      'Profile and settings',
      'Teams',
      'Delete account or export data',
    ],
  },
  {
    label: 'Billing',
    types: ['Subscriptions and plans', 'Credits and balance', 'Payouts and withdrawals', 'Charges and receipts'],
  },
  {
    label: 'Video Editing Platform',
    types: ['Editor problems', 'Export and rendering', 'Uploads and storage', 'Project files', 'Sharing and collaboration'],
  },
  {
    label: 'Messaging',
    types: ['Inbox, chat, and calls', 'Notifications and email'],
  },
  {
    label: 'Safety and appeals',
    types: ['Report a user', 'Copyright claim', 'Appeal an account penalty'],
  },
  { label: 'General', types: ['Other'] },
];

export const SUPPORT_TICKET_TYPES = SUPPORT_SUBGROUPS.flatMap((group) => group.types);

export const FORUM_TICKET_TYPES = [
  'Posts and replies',
  'Forum groups',
  'Report a post or member',
  'Appeal a forum action',
] as const;

export const MARKETPLACE_TICKET_TYPES = [
  'Seller verification',
  'Listing review',
  'Asset purchase and download',
  'File is wrong or broken',
  'Marketplace refunds',
  'Report a listing or seller',
  'Asset reviews',
  'Appeal a marketplace action',
] as const;

export const JOBS_TICKET_TYPES = [
  'Job and gig listings',
  'Proposals and hiring',
  'Contracts, milestones, and orders',
  'Delivery and disputes',
  'Cancellations and refunds',
  'Report a listing or user',
  'Gig reviews',
  'Appeal a jobs action',
] as const;

export const TICKET_TYPE_OPTIONS = [
  ...SUPPORT_TICKET_TYPES,
  ...FORUM_TICKET_TYPES,
  ...MARKETPLACE_TICKET_TYPES,
  ...JOBS_TICKET_TYPES,
] as const;

export const TICKET_TYPE_GROUPS: {
  label: string;
  types: readonly string[];
  subgroups?: { label: string; types: readonly string[] }[];
}[] = [
  { label: 'Support', types: SUPPORT_TICKET_TYPES, subgroups: SUPPORT_SUBGROUPS },
  { label: 'Forums', types: FORUM_TICKET_TYPES },
  { label: 'Marketplace', types: MARKETPLACE_TICKET_TYPES },
  { label: 'Jobs and Gigs', types: JOBS_TICKET_TYPES },
];

export const TICKET_TYPE_DESCRIPTIONS: Record<string, string> = {
  'Sign-in and password': 'The member cannot sign in, reset their password, or stay logged in.',
  'Account compromised': 'Suspicious logins, unauthorized account changes, or two-factor authentication issues.',
  'Identity verification': 'The account identity check is pending, rejected, or unclear. This is different from seller verification.',
  'Profile and settings': 'Issues with the profile, photo, banner, email, or account settings.',
  Teams: 'Problems with team invitations, roles, removals, or suspended team memberships.',
  'Delete account or export data': 'Requests to delete an account or obtain a copy of personal data.',
  'Subscriptions and plans': 'Issues with plans, renewals, upgrades, downgrades, or cancellations.',
  'Credits and balance': 'Missing credits, duplicate deductions, early expiration, or an incorrect balance.',
  'Payouts and withdrawals': 'Missing, delayed, held, or rejected earnings payouts.',
  'Charges and receipts': 'Incorrect charges, invoices, or receipts.',
  'Editor problems': 'The editor crashes, freezes, lags, or its tools do not work properly.',
  'Export and rendering': 'Failed exports, unfinished rendering, or incorrect output.',
  'Uploads and storage': 'Failed or stuck uploads, or incorrect storage quotas.',
  'Project files': 'Missing projects, projects that will not open, or lost content.',
  'Sharing and collaboration': 'Problems with project invitations, permissions, syncing, or lost edits.',
  'Inbox, chat, and calls': 'Missing messages, broken conversations, or failed calls.',
  'Notifications and email': 'Missing, duplicated, or incorrectly delivered alerts and emails.',
  'Report a user': 'Harassment, impersonation, or scams outside the forum, marketplace, or jobs sections.',
  'Copyright claim': "Someone is using or selling the member's work without permission anywhere on Ensemble.",
  'Appeal an account penalty': 'One appeal per penalty: a ban, lock, suspension, forum timeout, warning, automatic punishment, or credit hold.',
  Other: 'Any issue that does not fit the available types.',
  'Posts and replies': 'Missing discussions, posts, or replies, or content displaying incorrectly.',
  'Forum groups': 'Problems with groups, memberships, or settings.',
  'Report a post or member': 'Reports involving forum posts, replies, groups, or members breaking the rules.',
  'Appeal a forum action': 'Appeals for removed content or restrictions on forum participation.',
  'Seller verification': 'The eligibility check required to sell is pending, rejected, or unclear. This is different from account identity verification.',
  'Listing review': "The member's listing is stuck in review or was rejected.",
  'Asset purchase and download': 'The buyer paid but did not receive the file, or the download failed.',
  'File is wrong or broken': 'The delivered file is damaged, incomplete, or different from what was advertised.',
  'Marketplace refunds': 'The buyer wants credits from an asset purchase returned.',
  'Report a listing or seller': 'Reports involving scams, misleading listings, or rule violations.',
  'Asset reviews': 'Reports about fake, abusive, or unfair reviews of an asset or seller.',
  'Appeal a marketplace action': 'Appeals for removed listings or restrictions on selling.',
  'Job and gig listings': 'Missing listings, stuck submissions, or incorrect listing details.',
  'Proposals and hiring': 'Missing proposals or applications, or hiring processes that fail.',
  'Contracts, milestones, and orders': 'Problems with agreements, escrow, milestone payments, or gig orders.',
  'Delivery and disputes': 'Work was not delivered, does not match the agreement, or the parties disagree about the result.',
  'Cancellations and refunds': 'Requests to cancel a contract or gig order, or return escrowed funds.',
  'Report a listing or user': 'Reports involving scams or rule violations by jobs, gigs, clients, or freelancers.',
  'Gig reviews': 'Reports about fake, abusive, or unfair reviews of gigs, clients, or freelancers.',
  'Appeal a jobs action': 'Appeals for removed listings or restrictions on Jobs & Gigs.',
};

export const DEFAULT_TICKET_PRIORITY: Record<string, 'Low' | 'Medium' | 'High'> = {
  'Account compromised': 'High',
  'Payouts and withdrawals': 'High',
  'Copyright claim': 'High',
  'Delivery and disputes': 'High',
  'Notifications and email': 'Low',
};

export function subgroupForType(type: string) {
  for (const group of SUPPORT_SUBGROUPS) {
    if ((group.types as readonly string[]).includes(type)) return group.label;
  }
  return null;
}

/** Escalate: pick a moderator queue, then a type allowed for that queue only */
export const ESCALATE_ROLE_OPTIONS = [
  'Support Moderator',
  'Marketplace Moderator',
  'Forum Moderator',
  'Jobs N Gigs Moderator',
  'Admin',
] as const;

export const ESCALATE_TYPES_BY_ROLE: Record<string, readonly string[]> = {
  'Support Moderator': SUPPORT_TICKET_TYPES,
  'Marketplace Moderator': MARKETPLACE_TICKET_TYPES,
  'Forum Moderator': FORUM_TICKET_TYPES,
  'Forums Moderator': FORUM_TICKET_TYPES,
  'Jobs N Gigs Moderator': JOBS_TICKET_TYPES,
  'Jobs & Gigs Moderator': JOBS_TICKET_TYPES,
  'Jobs Moderator': JOBS_TICKET_TYPES,
  Admin: TICKET_TYPE_OPTIONS,
  Administrator: TICKET_TYPE_OPTIONS,
};

export function escalateTypesForRole(role: string): string[] {
  return [...(ESCALATE_TYPES_BY_ROLE[role] || [])];
}

export type TicketsOverview = {
  lastUpdated: string;
  summary: {
    openTickets: number;
    totalTickets: number;
    unassignedTickets: number;
    highPriorityTickets: number;
    awaitingReplyTickets?: number;
    escalatedTickets?: number;
    openDisputes: number;
    totalDisputes: number;
    creditsAtRisk: number;
    openReports: number;
    totalReports: number;
    avgResolutionHours: number;
    slaCompliancePercent: number;
  };
  charts: {
    ticketStatusMix: ChartSegment[];
    ticketCategories: ChartSegment[];
    ticketTypes?: ChartSegment[];
    openByPriority: { label: string; value: number }[];
    disputeStatusMix: ChartSegment[];
  };
  /** Distinct ticket types from tickets.type enum values */
  types: string[];
  typeDetails?: { label: string; queueRole: string; description?: string | null; group?: string | null; subgroup?: string | null }[];
  escalateByRole?: Record<string, string[]>;
  escalateRoles?: string[];
  statuses?: string[];
  priorities?: string[];
  /** @deprecated use types */
  categories?: string[];
  tickets: SupportTicket[];
  disputes: Dispute[];
  reports: UserReport[];
  staffWorkload: StaffWorkload[];
  recentActivity: TicketActivity[];
  currentStaffId?: string | number | null;
  alerts: {
    id: string;
    message: string;
    severity: string;
    action?: {
      tab?: 'overview' | 'tickets' | 'mine' | 'disputes' | 'reports' | 'assignments' | string;
      ticketFilters?: Partial<{
        search: string;
        status: string;
        priority: string;
        type: string;
        assignee: string;
        flag: string;
      }>;
    };
  }[];
  dataSources: { tables: string[]; persisted: boolean };
};

export type TicketDetail = {
  ticket: SupportTicket;
  messages: TicketMessage[];
  chatId?: string | null;
  chatAvailable?: boolean;
  types?: string[];
  statuses?: string[];
  priorities?: string[];
  typeDetails?: { label: string; queueRole: string; description?: string | null; group?: string | null; subgroup?: string | null }[];
  escalateByRole?: Record<string, string[]>;
  escalateRoles?: string[];
  /** @deprecated use types */
  categories?: string[];
  permissions?: TicketPermissions;
  assignableStaff: { staffId: number | string; name: string; role: string }[];
  timeline?: TicketTimelineEntry[];
  articles?: TicketArticle[];
  payments?: TicketPaymentEvidence | null;
  canAdjustCredits?: boolean;
  formValues?: { key: string; label: string; value: string; id?: string }[];
  submissionContext?: {
    accountId?: string;
    username?: string;
    email?: string;
    plan?: string;
    submittedAt?: string;
    browser?: string;
    device?: string;
    page?: string;
  } | null;
  participants?: TicketParticipant[];
  involved?: TicketParticipant[];
  pendingInvites?: { accountId: string; name: string; handle?: string | null }[];
  invitePending?: boolean;
  canManageParticipants?: boolean;
  savedTranscript?: { text: string; createdAt?: string | null } | null;
  autoClosesAt?: string | null;
  scheduledCloseAt?: string | null;
  appealDecision?: 'accepted' | 'denied' | 'denied_permanent' | null;
  appealDecidedAt?: string | null;
  /** What the decision did: how it was lifted, the new end, and any follow-up action. */
  appealOutcome?: {
    remedy?: 'lift_24h' | 'lift_now' | 'shorten' | 'rescind' | null;
    state?: string | null;
    endsAt?: string | null;
    followUp?: { action: 'suspend' | 'ban'; applied: boolean; label?: string | null; endsAt?: string | null; reason?: string; error?: string } | null;
  } | null;
  /** The note the member was given with the decision. */
  appealDecisionNote?: string | null;
  /** Only present when loaded with `?include=case`; null when it failed to build. */
  caseContext?: TicketCaseContext | null;
};

/* ---------- Category case file (backend/repositories/TicketCaseRepositories.js) ---------- */

export type CaseKind = 'appeal' | 'marketplace' | 'jobs' | 'forum' | 'billing' | 'account' | 'editor' | 'safety' | 'general';

/** The member's item as it read when staff acted on it from platform view. */
export type CasePenaltyEvidence = {
  source: string | null;
  kind: string | null;
  title: string;
  excerpt: string | null;
  page: string | null;
  stateWhenActed: string | null;
  capturedAt: string | null;
  relatedReports: string | null;
  pairedAction: string | null;
};

export type CaseAccountSummary = {
  accountId: string;
  name: string;
  handle: string | null;
  type: string | null;
  joinedAt: string | null;
  status: string;
  statusEndsAt: string | null;
  merit: number | null;
  warningPoints: number;
  warningBandLabel: string | null;
  warningBandEndsAt: string | null;
  /** Running automatic merit punishments, each on its own clock (timed-merit punishments). */
  meritPenalties?: {
    id: string;
    effect: string;
    label: string;
    ruleLabel: string;
    startsAt: string;
    endsAt: string;
    durationDays: number;
    triggerMerit: number;
    meritAtStart: number;
  }[];
  muted?: boolean;
  mutedUntil?: string | null;
  forumTimeout: boolean;
  forumTimeoutEndsAt: string | null;
  creditsFrozen: boolean;
  frozenCredits: number;
  creditsFrozenUntil: string | null;
  creditsFrozenReason: string | null;
  deactivated: boolean;
  identityVerified: boolean;
  identityVerifiedAt: string | null;
  counts: {
    activeWarnings: number;
    totalWarnings: number;
    totalDisputes: number;
    openDisputesAgainst: number;
    reportsAgainst: number;
    totalTickets: number;
  };
};

export type CaseTicketRef = { id: string; number: string; type: string; status: string; requester?: string; createdAt: string };
export type CaseReportRef = {
  id: string;
  number: string;
  type: string;
  status: string;
  priority?: string;
  targetType?: string;
  reporter?: string;
  createdAt: string;
};

/** The penalty a per-penalty appeal is about, as staff need it to decide (`describeAppealTarget`). */
export type CaseAppealTarget = {
  type: AppealTargetType;
  id: string;
  label: string;
  startedAt: string | null;
  /** `changed`: the account is under a newer penalty of the same kind, not this one. */
  state: 'active' | 'ended' | 'changed';
  note: string | null;
  current: {
    endsAt: string | null;
    reason: string | null;
    detail: string | null;
    number: string | null;
    points: number | null;
    credits: number | null;
  } | null;
  /** How accepting may lift it; empty when there is nothing left to lift. */
  remedies: ('lift_24h' | 'lift_now' | 'shorten' | 'rescind')[];
  acceptEffect: string;
  denyEffect: string;
  denyPermanentEffect: string;
  history: { id: string; number: string | null; status: string | null; decision: string | null; decidedAt: string | null; createdAt: string | null }[];
  otherPenalties: {
    type: AppealTargetType;
    id: string;
    label: string;
    number: string | null;
    endsAt: string | null;
    appealState: string;
    appealTicketNumber: string | null;
  }[];
};

export type CaseAppeal = {
  area: 'account' | 'forum' | 'marketplace' | 'jobs';
  decidable: boolean;
  decision: 'accepted' | 'denied' | 'denied_permanent' | null;
  decidedAt: string | null;
  /** The one penalty this appeal is about; null on account-wide appeals filed before the change. */
  target?: CaseAppealTarget | null;
  reasonGiven: string | null;
  evidence: string | null;
  referencedCase:
    | { found: false; query: string }
    | {
        found: true;
        query: string;
        kind: 'warning' | 'restriction' | 'dispute' | 'report' | 'ticket' | 'listing';
        id: string;
        number: string | null;
        title: string | null;
        status: string | null;
        detail: string | null;
        belongsToRequester: boolean;
        createdAt: string | null;
      }
    | null;
  /** Marketplace appeals: the listing the member picked, if any. */
  listing?: CaseListing | null;
  /** Jobs appeals: the job or gig the member picked, if any. */
  posting?: CasePosting | null;
  record: {
    warnings: {
      id: string;
      number: string | null;
      type: string;
      reason: string | null;
      points: number;
      status: string;
      active: boolean;
      issuedBy: string;
      createdAt: string;
      expiresAt: string | null;
      /** Saved when the warning was issued from platform view. */
      evidence?: CasePenaltyEvidence | null;
    }[];
    restrictions: {
      id: string;
      type: string;
      module: string | null;
      active: boolean;
      issuedBy: string;
      startsAt: string;
      endsAt: string | null;
      warningId: string | null;
    }[];
    history: {
      id: string;
      eventCode: string;
      action: string;
      status: string | null;
      previousStatus: string | null;
      reason: string | null;
      endsAt: string | null;
      disputeNumber: string | null;
      actor: { name: string; role: string } | null;
      createdAt: string;
      /** Saved when the change was made from platform view. */
      evidence?: CasePenaltyEvidence | null;
    }[];
  } | null;
  appeals: {
    previous: {
      id: string;
      number: string;
      type: string;
      status: string;
      decision: 'accepted' | 'denied' | 'denied_permanent' | null;
      decidedAt: string | null;
      createdAt: string;
      targetType?: AppealTargetType | null;
      targetLabel?: string | null;
    }[];
    hold: {
      decision: string;
      permanentlyDenied: boolean;
      blockedUntil: string | null;
      active: boolean;
      decidedAt: string;
      ticketId: string | null;
    } | null;
  } | null;
  areaActions: { id: string; label: string; number: string | null; status: string | null; reason: string | null; at: string }[] | null;
  reportsAgainst: CaseReportRef[] | null;
};

export type CaseListing = {
  id: string;
  number: string | null;
  title: string;
  category: string | null;
  status: string;
  priceCredits: number;
  assetType: string | null;
  marketAssetId: string | null;
  rejectionReason: string | null;
  moderationNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  seller: {
    accountId: string | null;
    name: string;
    handle: string | null;
    status: string | null;
    merit: number | null;
    listings: { total: number; approved: number; rejected: number; delisted: number; pending: number } | null;
  };
  asset: {
    id: string;
    name: string;
    status: string;
    stats: {
      activeLicenses: number;
      refundedLicenses: number;
      likes: number;
      reviews: number;
      averageRating: number | null;
    } | null;
    files: { name: string; type: string | null; sizeBytes: number | null; processingStatus: string | null; processingError: string | null }[];
  } | null;
  reports: { open: number; total: number; items: { id: string; number: string; type: string; status: string; isOpen: boolean; createdAt: string }[] };
  history: { id: string; action: string; actorName?: string | null; status: string | null; reason: string | null; createdAt: string }[];
  duplicateSignals: number;
};

export type CaseMarketplace = {
  role: 'buyer' | 'seller';
  listing: CaseListing | null;
  purchase: {
    assetName: string | null;
    licenses: {
      id: string;
      status: string;
      priceCredits: number;
      purchasedAt: string;
      assignedProject: string | null;
      assignedAt: string | null;
      transactionId: string | null;
      transactionStatus: string | null;
    }[];
  } | null;
  buyer: { purchases: number; refunded: number; spentCredits: number } | null;
  sellerListings: { id: string; number: string | null; title: string; status: string; priceCredits: number; rejectionReason: string | null; createdAt: string }[] | null;
  reportedSeller: CaseAccountSummary | null;
  reportedText: string | null;
  relatedTickets: CaseTicketRef[];
};

/**
 * What a gig order bought: the package (tier) and the add-ons the client picked. Add-on prices
 * and extra days are the ones the order was placed with; the package price is the tier's
 * current price (sellers can edit tiers later).
 */
export type CaseGigOrder = {
  requestId: string;
  tierTitle: string | null;
  tierCredits: number | null;
  tierDeliveryDays: number | null;
  tierRevisions: number | null;
  addons: { id: string; name: string; priceCredits: number; additionalDays: number }[];
  addonCredits: number;
  addonDays: number;
};

export type CaseContract = {
  id: string;
  title: string;
  type: string | null;
  paymentType: string | null;
  status: string;
  rateCredits: number;
  startsAt: string | null;
  deadlineAt: string | null;
  createdAt: string | null;
  requesterRole: 'client' | 'freelancer' | null;
  /** The requester is on the contract through a team they own. */
  requesterViaTeam?: boolean;
  client: CaseAccountSummary | null;
  freelancer: CaseAccountSummary | null;
  /** Gig orders only; null for job contracts. */
  gigOrder?: CaseGigOrder | null;
  milestones: { id: string; index: number; name: string; status: string; credits: number; deadlineAt: string | null; startedAt: string | null }[];
  milestoneTotals: { count: number; credits: number; completed: number };
  disputes: { id: string; number: string; title: string; status: string; public: boolean; filedByRequester: boolean; openedAt: string }[];
  transactions: { id: string; type: string; credits: number; status: string; createdAt: string }[];
};

export type CasePosting = {
  id: string;
  kind: 'job' | 'gig';
  title: string;
  status: string;
  createdAt: string;
  owner: { accountId: string; name: string; handle: string | null };
  reports: CaseReportRef[];
  history: { id: string; status: string | null; previousStatus: string | null; reason: string | null; actor: string; createdAt: string }[];
};

export type CaseJobs = {
  contract: CaseContract | null;
  posting: CasePosting | null;
  reportedMember: CaseAccountSummary | null;
  proposalId: string | null;
  desiredOutcome: string | null;
  activity: { jobs: number; gigs: number; contracts: number } | null;
  relatedTickets: CaseTicketRef[];
};

export type CaseForum = {
  post: {
    id: string;
    title: string;
    status: string;
    isLocked: boolean;
    isSticky: boolean;
    groupName: string | null;
    author: string | null;
    commentCount: number;
    removedComments: number;
    createdAt: string | null;
    removedAt: string | null;
    reports: CaseReportRef[];
  } | null;
  group: {
    id: string;
    name: string;
    status: string;
    owner: string | null;
    memberCount: number;
    discussionCount: number;
    removedDiscussionCount: number;
    createdAt: string | null;
    deletedAt: string | null;
  } | null;
  reportedMember: CaseAccountSummary | null;
  restrictions: { id: string; type: string; active: boolean; startsAt: string; endsAt: string | null }[] | null;
};

export type CaseBilling =
  | { restricted: true }
  | {
      restricted: false;
      wallet: { balanceCredits: number; frozenCredits: number; status: string | null } | null;
      subscription: { plan: string; status: string | null; since: string | null; trialEndsAt: string | null; recurring: boolean } | null;
      referencedTransaction:
        | { found: false; query: string }
        | {
            found: true;
            query: string;
            kind: 'payment' | 'credit' | 'cashout';
            id: string;
            reference: string | null;
            status: string;
            type: string | null;
            amount: number | null;
            credits: number | null;
            belongsToRequester: boolean;
            createdAt: string;
          }
        | null;
    };

export type CaseAccount = {
  verification: {
    verified: boolean;
    verifiedAt?: string | null;
    kycStatus?: string | null;
    status?: string | null;
    expiresAt?: string | null;
    submittedAt?: string | null;
    updatedAt?: string | null;
  } | null;
  recentChanges: { id: string; action: string; eventCode: string; createdAt: string }[] | null;
  team: { id: string; name: string; handle: string | null; status: string; createdAt: string } | null;
};

export type CaseEditor = {
  project: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    deleted: boolean;
    members: number;
    requesterIsMember: boolean;
  } | null;
};

export type CaseSafety = {
  reportedMember: CaseAccountSummary | null;
  reportsAgainst: CaseReportRef[] | null;
  infringingListings: CaseListing[] | null;
};

export type TicketCaseContext = {
  kind: CaseKind;
  requester: CaseAccountSummary | null;
  otherOpenTickets: CaseTicketRef[];
  notes: string[];
  appeal?: CaseAppeal | null;
  marketplace?: CaseMarketplace | null;
  jobs?: CaseJobs | null;
  forum?: CaseForum | null;
  billing?: CaseBilling | null;
  account?: CaseAccount | null;
  editor?: CaseEditor | null;
  safety?: CaseSafety | null;
};

export function ticketTypeOf(t: { type?: string; category?: string }) {
  return t.type || t.category || 'Other';
}
