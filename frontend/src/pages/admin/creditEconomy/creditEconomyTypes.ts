/** Canonical CREDIT_TRANSACTION.type values. */
export const CREDIT_TRANSACTION_TYPES = [
  'Fund Transfer',
  'Escrow Hold',
  'Escrow Release',
  'Escrow Refund',
  'Asset Purchase',
  'Asset Refund',
  'Fee',
  'Cashout',
  'Cashout Refund',
  'Job Posting Fee',
  'Job Posting Fee Refund',
  'Proposal Fee',
  'Proposal Fee Refund',
  'Service Posting Fee',
] as const;

export const CREDIT_TRANSACTION_STATUSES = ['Pending', 'Completed', 'Failed', 'Reversed'] as const;

export type CreditTransactionType = (typeof CREDIT_TRANSACTION_TYPES)[number];
export type CreditTransactionStatus = (typeof CREDIT_TRANSACTION_STATUSES)[number];

export const LEDGER_KINDS: { value: string; label: string }[] = [
  { value: 'adjustment', label: 'Staff adjustments' },
  { value: 'topup', label: 'Top-ups' },
  { value: 'transfer', label: 'Transfers' },
  { value: 'escrow', label: 'Escrow' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'jobs', label: 'Jobs & gigs fees' },
  { value: 'fees', label: 'Platform fees' },
  { value: 'cashout', label: 'Cashouts' },
  { value: 'refunds', label: 'Refunds' },
  { value: 'dispute', label: 'Dispute-linked' },
];

export type EconomyVariant = 'admin' | 'support';

export type EconomyViewer = {
  role: string | null;
  isAdmin: boolean;
  includeStaff: boolean;
  canAdjust: boolean;
  canHold: boolean;
  canSeeStaffWallets: boolean;
  canOpenSettings: boolean;
};

export type WalletHold = {
  credits: number;
  reason: string | null;
  frozenAt: string | null;
  frozenUntil: string | null;
  overdue: boolean;
  byStaffId: string | null;
  byStaffName: string | null;
  byStaffRole: string | null;
};

export type EconomyWallet = {
  walletId: string;
  accountId: string;
  name: string;
  username: string;
  email: string;
  accountType: 'User' | 'Team' | 'Staff' | string;
  staffRole: string | null;
  accountStatus: string;
  walletStatus: string;
  spendableCredits: number;
  heldCredits: number;
  totalCredits: number;
  hold: WalletHold | null;
  createdAt: string | null;
  lastActivityAt: string | null;
  transactionCount: number | null;
};

export type LedgerParty = {
  walletId: string | null;
  walletType: 'Account' | 'Escrow' | 'Platform' | string;
  accountId: string | null;
  name: string;
  handle: string | null;
  accountType: string | null;
  isStaff: boolean;
  contractId: string | null;
};

export type LedgerEntry = {
  id: string;
  type: CreditTransactionType | string;
  category: string;
  status: CreditTransactionStatus | string;
  amount: number;
  /** Relative to the wallet/account the list was filtered by, or an adjustment's sign. */
  signedAmount: number | null;
  direction: 'in' | 'out' | 'internal' | 'unknown' | null;
  createdAt: string;
  source: LedgerParty;
  destination: LedgerParty;
  isAdjustment: boolean;
  adjustment: {
    recorded: boolean;
    delta: number | null;
    reason: string | null;
    balanceAfter: number | null;
    actorStaffId: string | null;
    actorName: string | null;
    actorRole: string | null;
  } | null;
  referenceTable: string | null;
  referenceId: string | null;
  relatedDisputeId: string | null;
  reversesTransactionId: string | null;
  feeTransactionId: string | null;
};

export type Page<T> = { items: T[]; total: number; limit: number; offset: number };

export type CreditAdjustment = {
  id: string;
  accountId: string;
  walletId: string | null;
  name: string;
  username: string;
  delta: number;
  reason: string | null;
  balanceAfter: number | null;
  creditTransactionId: string | null;
  sourceTable: string | null;
  sourceId: string | null;
  actorName: string;
  actorRole: string | null;
  createdAt: string;
};

export type AccountTotal = {
  accountId: string;
  walletId: string | null;
  name: string;
  username: string;
  accountType: string;
  credits: number;
  transactions: number | null;
};

export type EconomyAlert = {
  id: string;
  severity: 'error' | 'warning' | 'info' | 'success';
  title: string;
  detail: string;
  action: { tab: EconomyTab; filters: Record<string, string> } | null;
};

export type EconomyTab = 'overview' | 'wallets' | 'holds' | 'ledger';

export type EconomyOverview = {
  lastUpdated: string;
  viewer: EconomyViewer;
  creditValuePhp: number | null;
  supply: {
    walletCount: number;
    userWallets: number;
    teamWallets: number;
    staffWallets: number;
    spendable: number;
    held: number;
    circulating: number;
    escrow: number;
    fundedEscrowWallets: number;
    platform: number;
    averageBalance: number;
    medianBalance: number;
    emptyWallets: number;
    negativeWallets: number;
    topTenShare: number;
    holds: { wallets: number; credits: number; overdue: number; expiringSoon: number; indefinite: number };
  };
  flow: {
    days: number;
    rows: { total: number; completed: number; pending: number; failed: number; reversed: number };
    volume: number;
    issued: { total: number; topups: number; platformPayouts: number; staffGrants: number };
    collected: { total: number; fees: number; cashouts: number; other: number; staffDeductions: number };
    net: number;
    escrowFunded: number;
    escrowPaidOut: number;
    marketplace: number;
    refunds: number;
    adjustments: { rows: number; unsigned: number };
    series: { day: string; volume: number; issued: number; collected: number; rows: number }[];
  };
  inFlight: {
    pendingLedger: { count: number; credits: number; stale: number; oldestAt: string | null; failedThisWeek: number };
    cashouts: { count: number; credits: number; stale: number; oldestAt: string | null; failedThisWeek: number };
    disputePayouts: {
      scheduled: number;
      scheduledCredits: number;
      failed: number;
      failedCredits: number;
      nextReleaseAt: string | null;
    };
  };
  leaders: { holders: AccountTotal[]; spenders: AccountTotal[]; earners: AccountTotal[] };
  recentAdjustments: CreditAdjustment[];
  recentLedger: LedgerEntry[];
  facets: {
    accountStatuses: string[];
    transactionTypes: string[];
    transactionStatuses: string[];
    ledgerKinds: string[];
  };
  alerts: EconomyAlert[];
};

export type WalletInsights = {
  creditsIn: number;
  creditsOut: number;
  pendingIn: number;
  pendingOut: number;
  transactionCount: number;
  firstActivityAt: string | null;
  lastActivityAt: string | null;
  staffGranted: number;
  staffDeducted: number;
  unsignedAdjustments: number;
  ledgerNet: number;
  unexplainedCredits: number;
  escrow: { wallets: number; credits: number };
  disputePayouts: { scheduled: number; scheduledCredits: number; failed: number; nextReleaseAt: string | null };
  holdHistory: {
    id: string;
    kind: 'hold' | 'release';
    action: string;
    credits: number;
    reason: string | null;
    until: string | null;
    source: string | null;
    actorName: string;
    actorRole: string | null;
    createdAt: string;
  }[];
  cashouts: { id: string; referenceId: string; credits: number; status: string; channel: string | null; createdAt: string }[];
};

export type WalletDetail = {
  wallet: EconomyWallet;
  insights: WalletInsights;
  adjustments: CreditAdjustment[];
  viewer: EconomyViewer;
};
