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

/** How each ledger type reads to staff (rows, titles, pickers). */
export const TYPE_LABELS: Record<string, string> = {
  'Fund Transfer': 'Transfer',
  'Escrow Hold': 'Escrow funded',
  'Escrow Release': 'Escrow released',
  'Escrow Refund': 'Escrow refunded',
  'Asset Purchase': 'Marketplace sale',
  'Asset Refund': 'Marketplace refund',
  Fee: 'Platform fee',
  Cashout: 'Cashout',
  'Cashout Refund': 'Cashout returned',
  'Job Posting Fee': 'Job post fee',
  'Job Posting Fee Refund': 'Job post fee refunded',
  'Proposal Fee': 'Proposal fee',
  'Proposal Fee Refund': 'Proposal fee refunded',
  'Service Posting Fee': 'Gig listing fee',
};

export function typeLabel(type: string | null | undefined) {
  if (!type) return 'Entry';
  return TYPE_LABELS[type] || type;
}

/**
 * The ledger's one "Show" picker: a category (`kind:…`) or one exact type (`type:…`).
 * Grouped so each kind of money appears once; fees sit together under one heading.
 */
export const LEDGER_SHOW_OPTIONS: { value: string; label: string; group: string }[] = [
  { value: 'kind:topup', label: 'Top-ups', group: 'Money in & out' },
  { value: 'type:Cashout', label: 'Cashouts', group: 'Money in & out' },
  { value: 'kind:cashout_open', label: 'Cashouts not paid yet', group: 'Money in & out' },
  { value: 'type:Cashout Refund', label: 'Cashouts returned', group: 'Money in & out' },
  { value: 'kind:transfer', label: 'Transfers', group: 'Between members' },
  { value: 'kind:escrow', label: 'Escrow (all)', group: 'Between members' },
  { value: 'type:Escrow Hold', label: 'Escrow funded', group: 'Between members' },
  { value: 'type:Escrow Release', label: 'Escrow released', group: 'Between members' },
  { value: 'type:Escrow Refund', label: 'Escrow refunded', group: 'Between members' },
  { value: 'type:Asset Purchase', label: 'Marketplace sales', group: 'Between members' },
  { value: 'type:Asset Refund', label: 'Marketplace refunds', group: 'Between members' },
  { value: 'kind:fees', label: 'Fees: all', group: 'Platform fees' },
  { value: 'type:Fee', label: 'Fees: on sales & escrow', group: 'Platform fees' },
  { value: 'type:Job Posting Fee', label: 'Fees: job posts', group: 'Platform fees' },
  { value: 'type:Proposal Fee', label: 'Fees: proposals', group: 'Platform fees' },
  { value: 'type:Service Posting Fee', label: 'Fees: gig listings', group: 'Platform fees' },
  { value: 'type:Job Posting Fee Refund', label: 'Fees refunded: job posts', group: 'Platform fees' },
  { value: 'type:Proposal Fee Refund', label: 'Fees refunded: proposals', group: 'Platform fees' },
  { value: 'kind:adjustment', label: 'Staff adjustments (all)', group: 'Staff' },
  { value: 'kind:grant', label: 'Staff grants', group: 'Staff' },
  { value: 'kind:deduction', label: 'Staff deductions', group: 'Staff' },
  { value: 'kind:adjustment_unrecorded', label: 'Adjustments with no direction', group: 'Staff' },
  { value: 'kind:refunds', label: 'All refunds', group: 'Corrections' },
  { value: 'kind:reversal', label: 'Reversing entries', group: 'Corrections' },
  { value: 'kind:dispute', label: 'Dispute-linked', group: 'Corrections' },
];

/**
 * Categories the overview and its alerts link to. Not in the picker; shown under
 * "From the overview" while one is applied, so the ledger says which figure it explains.
 */
export const LINKED_KIND_LABELS: Record<string, string> = {
  flow_volume: 'Member volume',
  flow_topups: 'Issued: top-ups',
  flow_platform_refunds: 'Issued: returned by the platform',
  flow_platform_payouts: 'Issued: other platform payouts',
  flow_fees: 'Collected: platform fees',
  flow_cashouts: 'Collected: cashouts',
  flow_other_collected: 'Collected: other',
  flow_escrow_funded: 'Escrow funded',
  flow_escrow_released: 'Escrow released to members',
  flow_escrow_refunded: 'Escrow refunded to members',
  flow_transfers: 'Transfers between members',
  flow_sales: 'Marketplace sales',
  flow_sale_refunds: 'Marketplace refunds',
  platform: 'Platform wallet in & out',
  escrow_open: 'Contracts still holding escrow',
  cashout: 'Cashouts & returns',
  marketplace: 'Marketplace',
  jobs: 'Job, proposal & gig fees',
};

export const LEDGER_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'settled', label: 'Settled (credits moved)' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Failed', label: 'Failed' },
  { value: 'Reversed', label: 'Reversed' },
];

/** What a ledger row's `reference_table` points at, in staff wording. */
export const REFERENCE_LABELS: Record<string, string> = {
  payments: 'Top-up payment',
  cashouts: 'Cashout',
  contracts: 'Contract',
  contract_milestones: 'Contract milestone',
  contract_milestone_revisions: 'Milestone revision',
  milestone_submits: 'Milestone submission',
  market_assets: 'Marketplace asset',
  marketplace_listings: 'Marketplace listing',
  disputes: 'Dispute',
  tickets: 'Support ticket',
  teams: 'Team',
  team_contract_workspaces: 'Team contract workspace',
  team_workspace_tasks: 'Team task',
  jobs: 'Job post',
  proposals: 'Proposal',
  gigs: 'Gig',
  gig_requests: 'Gig order',
  accounts: 'Account',
  wallets: 'Wallet',
  credit_transactions: 'Ledger entry',
};

export function referenceLabel(table: string | null | undefined) {
  if (!table) return 'Reference';
  return REFERENCE_LABELS[table] || table.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

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

/**
 * A wallet's credits just before and just after a ledger row, rebuilt from the ledger.
 * `before`/`after` are spendable; `heldBefore`/`heldAfter` are a staff hold. `approximate`
 * when a pre-audit adjustment (no recorded direction) sits between the row and today.
 */
export type LedgerBalance = {
  walletId: string;
  before: number;
  after: number;
  heldBefore: number;
  heldAfter: number;
  approximate: boolean;
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
  /** The platform fee taken on this movement (a separate row). */
  fee: { id: string; amount: number; status: string | null } | null;
  /** On a fee row: the sale or release the fee was charged on. */
  feeFor: { id: string; type: string | null; amount: number } | null;
  /** The original row this compensating entry reverses. */
  reverses: { id: string; type: string | null; status: string | null } | null;
  /** The compensating row that reversed this one. */
  reversedBy: { id: string; status: string | null } | null;
  /** The payout record behind a Cashout / Cashout Refund row. */
  cashout: { id: string; reference: string | null; status: string | null } | null;
  /**
   * Each side's balance around this row. Member and escrow wallets only (null for the platform
   * wallet); a self-transfer sets `source` alone. Absent on the overview's recent list.
   */
  balances?: { source: LedgerBalance | null; destination: LedgerBalance | null };
};

/** `totalCredits` (ledger only): credits across every matching row, not just this page. */
export type Page<T> = { items: T[]; total: number; limit: number; offset: number; totalCredits?: number };

/** Ledger filters, as the ledger tab keeps them in the URL. Empty string = not set. */
export type LedgerFilters = {
  search: string;
  kind: string;
  type: string;
  status: string;
  from: string;
  to: string;
  /** Rolling window: entries from the last N hours (the overview's clock). */
  sinceHours: string;
  /** Entries older than N hours (stuck Pending rows, unpaid cashouts). */
  olderThanHours: string;
  minAmount: string;
  maxAmount: string;
  sort: string;
  walletId: string;
  accountId: string;
  direction: string;
  referenceId: string;
  referenceTable: string;
  disputeId: string;
  contractId: string;
};

export type LedgerLinkRelation = 'fee' | 'fee_for' | 'reverses' | 'reversed_by';
export type LedgerGroupRelation = 'same_escrow' | 'same_reference' | 'same_dispute';

export type LedgerEntryDetailResponse = {
  entry: LedgerEntry;
  links: { relation: LedgerLinkRelation; entry: LedgerEntry }[];
  groups: {
    relation: LedgerGroupRelation;
    filters: Partial<LedgerFilters>;
    total: number;
    items: LedgerEntry[];
  }[];
  viewer: EconomyViewer;
};

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
    /** The window in hours (rolling); ledger links send it as `sinceHours`. */
    hours: number;
    rows: { total: number; completed: number; pending: number; failed: number; reversed: number };
    volume: number;
    issued: { total: number; topups: number; platformRefunds: number; platformPayouts: number; staffGrants: number };
    collected: { total: number; fees: number; cashouts: number; other: number; staffDeductions: number };
    net: number;
    between: {
      escrowFunded: number;
      escrowReleased: number;
      escrowRefunded: number;
      transfers: number;
      sales: number;
      saleRefunds: number;
    };
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
