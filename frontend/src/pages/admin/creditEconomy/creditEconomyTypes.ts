export type WalletTransaction = {
  id: string;
  type: string;
  amount: number;
  label: string;
  timeAgo: string;
  positive: boolean;
  reversible: boolean;
  status: string;
};

export type EconomyWallet = {
  id: number | string;
  accountId: number;
  walletId: string;
  name: string;
  email: string;
  username: string;
  accountType: string;
  meritScore: number;
  totalCredits: number;
  totalAssets: number;
  totalRevenue: number;
  frozen: boolean;
  status: string;
  leaderId?: number;
  leaderName?: string;
  memberCount?: number;
  transactions: WalletTransaction[];
};

export type AuditEntry = {
  id: string;
  username: string;
  name: string;
  accountType: string;
  status: string;
  creditAmount: number;
  type: string;
  transactionStatus: string;
  timestamp: string;
  walletId: string;
};

export type TopBuyer = {
  rank: number;
  name: string;
  username: string;
  totalSpent: number;
  totalCredits: number;
  initial: string;
};

export type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  pricePhp: number;
  active: boolean;
  salesCount: number;
};

export type FeeSetting = {
  id: string;
  label: string;
  percent: number;
  flatFee: number;
  appliesTo: string;
};

export type EconomyAlert = {
  id: string;
  message: string;
  severity: 'warning' | 'error' | 'info' | 'success';
};

export type EconomyOverview = {
  lastUpdated: string;
  summary: {
    completedTransactions: number;
    cancelledTransactions: number;
    pendingTransactions: number;
    totalCreditsInCirculation: number;
    totalRevenue: number;
    frozenWallets: number;
    averageWalletBalance: number;
    totalMeritPoints: number;
    activeWallets: number;
  };
  wallets: EconomyWallet[];
  auditLog: AuditEntry[];
  topBuyers: TopBuyer[];
  creditPackages: CreditPackage[];
  feeSettings: FeeSetting[];
  marketplaceSettings: {
    listingFeeCredits: number;
    transactionFeePercent: number;
    escrowHoldDays: number;
    minPayoutCredits: number;
    refundWindowDays: number;
  };
  alerts: EconomyAlert[];
};
