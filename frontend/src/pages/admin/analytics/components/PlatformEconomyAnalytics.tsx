import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  BadgeDollarSign,
  BarChart3,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  Info,
  Layers,
  Maximize2,
  Repeat,
  Search,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import type {
  PlatformAnalytics,
  PlatformTransaction,
  SubscriptionPlanItem,
  SubscriptionTransactionItem,
  TopupTransactionItem,
  UserSubscriptionItem,
  UserTransaction,
} from '../analyticsTypes';

type TransactionSubTab = 'platform' | 'users' | 'topups' | 'subscriptions' | 'subscribers' | 'cashouts';

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatPhp(amount: number) {
  return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getStatusBadge(status: string) {
  const s = String(status || '').toLowerCase();
  if (['completed', 'succeeded', 'paid', 'approved', 'released', 'active'].includes(s)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        {status}
      </span>
    );
  }
  if (['pending', 'processing', 'held'].includes(s)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
        <Clock className="h-3 w-3" />
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-400">
      <XCircle className="h-3 w-3" />
      {status}
    </span>
  );
}

function getTypeBadge(type: string) {
  const t = String(type || '').toLowerCase();
  let colorClass = 'border-white/10 bg-white/5 text-zinc-300';
  if (t.includes('fee')) {
    colorClass = 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300 font-semibold';
  } else if (t.includes('top-up') || t.includes('topup')) {
    colorClass = 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300 font-semibold';
  } else if (t.includes('cashout')) {
    colorClass = 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  } else if (t.includes('escrow')) {
    colorClass = 'border-blue-500/20 bg-blue-500/10 text-blue-300';
  } else if (t.includes('asset') || t.includes('purchase')) {
    colorClass = 'border-purple-500/20 bg-purple-500/10 text-purple-300';
  } else if (t.includes('transfer')) {
    colorClass = 'border-teal-500/20 bg-teal-500/10 text-teal-300';
  }

  return (
    <span className={`inline-flex rounded-lg border px-2 py-0.5 text-[11px] font-medium ${colorClass}`}>
      {type}
    </span>
  );
}

function getChannelBadge(channel: string | null) {
  if (!channel) return <span className="text-zinc-600">—</span>;
  const c = channel.toUpperCase();
  let style = 'border-white/10 bg-white/5 text-zinc-300';
  if (c.includes('GCASH')) {
    style = 'border-sky-500/20 bg-sky-500/10 text-sky-300';
  } else if (c.includes('MAYA')) {
    style = 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  } else if (c.includes('CARD')) {
    style = 'border-purple-500/20 bg-purple-500/10 text-purple-300';
  }
  return (
    <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 font-mono text-[11px] font-medium ${style}`}>
      {channel}
    </span>
  );
}

export default function PlatformEconomyAnalytics({
  data,
}: {
  data: PlatformAnalytics;
  filteredMembers?: PlatformAnalytics['memberDirectory'];
}) {
  const { economy } = data;
  const revenue = economy.platformRevenue;
  const payout = economy.platformPayout;
  const subAnalytics = economy.subscriptionAnalytics;
  const topupAnalytics = economy.topupAnalytics;

  const platformTx = economy.platformTransactions || [];
  const userTx = economy.userTransactions || [];
  const cashouts = payout?.recentCashouts || [];
  const subTx = subAnalytics?.transactions || [];
  const userSubs = subAnalytics?.userSubscriptions || [];
  const availablePlans = subAnalytics?.summary?.availablePlans || [];
  const topupTx = topupAnalytics?.transactions || [];
  const topupSummary = topupAnalytics?.summary;

  const [activeSubTab, setActiveSubTab] = useState<TransactionSubTab>('platform');
  const [activeMetricModal, setActiveMetricModal] = useState<
    | 'wallet'
    | 'revenue'
    | 'topup'
    | 'subscription_earn'
    | 'subscribers'
    | 'payout'
    | 'escrow'
    | 'fee_breakdown'
    | 'subscription_breakdown'
    | 'payout_breakdown'
    | null
  >(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveMetricModal(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDirection, setSelectedDirection] = useState<'all' | 'inflow' | 'outflow'>('all');
  const [selectedPlan, setSelectedPlan] = useState<string>('all');
  const [selectedSubStatus, setSelectedSubStatus] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Available types for transaction filter
  const platformTypes = useMemo(() => {
    return Array.from(new Set(platformTx.map((t) => t.type)));
  }, [platformTx]);

  const userTypes = useMemo(() => {
    return Array.from(new Set(userTx.map((t) => t.type)));
  }, [userTx]);

  // Filtered platform transactions (with fee revenue numbers)
  const filteredPlatformTx = useMemo(() => {
    return platformTx.filter((t) => {
      if (selectedType !== 'all' && t.type !== selectedType) return false;
      if (selectedStatus !== 'all' && t.status.toLowerCase() !== selectedStatus.toLowerCase()) return false;
      if (selectedDirection !== 'all' && t.direction !== selectedDirection) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchId = t.id.toLowerCase().includes(q);
        const matchName = t.counterpartyName?.toLowerCase().includes(q);
        const matchHandle = t.counterpartyHandle?.toLowerCase().includes(q);
        const matchType = t.type.toLowerCase().includes(q);
        if (!matchId && !matchName && !matchHandle && !matchType) return false;
      }
      return true;
    });
  }, [platformTx, selectedType, selectedStatus, selectedDirection, search]);

  // Filtered user transactions
  const filteredUserTx = useMemo(() => {
    return userTx.filter((t) => {
      if (selectedType !== 'all' && t.type !== selectedType) return false;
      if (selectedStatus !== 'all' && t.status.toLowerCase() !== selectedStatus.toLowerCase()) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchId = t.id.toLowerCase().includes(q);
        const matchSrc = t.sourceName?.toLowerCase().includes(q) || t.sourceHandle?.toLowerCase().includes(q);
        const matchDst = t.destinationName?.toLowerCase().includes(q) || t.destinationHandle?.toLowerCase().includes(q);
        const matchType = t.type.toLowerCase().includes(q);
        if (!matchId && !matchSrc && !matchDst && !matchType) return false;
      }
      return true;
    });
  }, [userTx, selectedType, selectedStatus, search]);

  // Filtered subscription transactions
  const filteredSubTx = useMemo(() => {
    return subTx.filter((tx) => {
      if (selectedStatus !== 'all' && tx.status.toLowerCase() !== selectedStatus.toLowerCase()) return false;
      if (selectedPlan !== 'all' && tx.planName.toLowerCase() !== selectedPlan.toLowerCase()) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchId = tx.id.toLowerCase().includes(q);
        const matchUser = tx.subscriberName?.toLowerCase().includes(q) || tx.subscriberHandle?.toLowerCase().includes(q);
        const matchEmail = tx.subscriberEmail?.toLowerCase().includes(q);
        const matchPlan = tx.planName?.toLowerCase().includes(q);
        if (!matchId && !matchUser && !matchEmail && !matchPlan) return false;
      }
      return true;
    });
  }, [subTx, selectedStatus, selectedPlan, search]);

  // Filtered user subscriptions list (Subscribed vs Not Subscribed with plan filter)
  const filteredUserSubs = useMemo(() => {
    return userSubs.filter((u) => {
      if (selectedPlan !== 'all') {
        if (u.planName.toLowerCase() !== selectedPlan.toLowerCase()) return false;
      }
      if (selectedSubStatus !== 'all') {
        if (selectedSubStatus === 'subscribed' && !u.isSubscribed) return false;
        if (selectedSubStatus === 'not_subscribed' && u.isSubscribed) return false;
        if (selectedSubStatus === 'recurring' && (!u.isSubscribed || !u.recurring)) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName = u.name?.toLowerCase().includes(q);
        const matchHandle = u.username?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        const matchPlan = u.planName?.toLowerCase().includes(q);
        if (!matchName && !matchHandle && !matchEmail && !matchPlan) return false;
      }
      return true;
    });
  }, [userSubs, selectedPlan, selectedSubStatus, search]);

  // Filtered cashouts
  const filteredCashouts = useMemo(() => {
    return cashouts.filter((c) => {
      if (selectedStatus !== 'all' && c.status.toLowerCase() !== selectedStatus.toLowerCase()) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchId = c.id.toLowerCase().includes(q) || c.referenceId.toLowerCase().includes(q);
        const matchUser = c.userName?.toLowerCase().includes(q) || c.userHandle?.toLowerCase().includes(q);
        const matchAccount = c.accountNo?.toLowerCase().includes(q) || c.accountName?.toLowerCase().includes(q);
        if (!matchId && !matchUser && !matchAccount) return false;
      }
      return true;
    });
  }, [cashouts, selectedStatus, search]);

  // Filtered topup transactions
  const topupChannels = useMemo(() => {
    const channels = topupTx.map((t) => t.channelCode).filter(Boolean) as string[];
    return Array.from(new Set(channels));
  }, [topupTx]);

  const filteredTopupTx = useMemo(() => {
    return topupTx.filter((tx) => {
      if (selectedStatus !== 'all') {
        const s = (tx.status || '').toLowerCase();
        const filter = selectedStatus.toLowerCase();
        if (filter === 'paid' || filter === 'completed') {
          if (s !== 'paid' && s !== 'completed') return false;
        } else if (s !== filter) {
          return false;
        }
      }
      if (selectedChannel !== 'all' && (tx.channelCode || '').toLowerCase() !== selectedChannel.toLowerCase()) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchId = tx.id.toLowerCase().includes(q) || (tx.referenceId || '').toLowerCase().includes(q);
        const matchPaymentId = (tx.paymentId || '').toLowerCase().includes(q);
        const matchUser = (tx.userName || '').toLowerCase().includes(q) || (tx.userHandle || '').toLowerCase().includes(q);
        const matchEmail = (tx.userEmail || '').toLowerCase().includes(q);
        const matchChannel = (tx.channelCode || '').toLowerCase().includes(q);
        if (!matchId && !matchPaymentId && !matchUser && !matchEmail && !matchChannel) return false;
      }
      return true;
    });
  }, [topupTx, selectedStatus, selectedChannel, search]);

  // Current subtab pagination counts
  const currentTotal =
    activeSubTab === 'platform'
      ? filteredPlatformTx.length
      : activeSubTab === 'users'
      ? filteredUserTx.length
      : activeSubTab === 'topups'
      ? filteredTopupTx.length
      : activeSubTab === 'subscriptions'
      ? filteredSubTx.length
      : activeSubTab === 'subscribers'
      ? filteredUserSubs.length
      : filteredCashouts.length;

  const totalPages = Math.max(1, Math.ceil(currentTotal / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;

  const pagedPlatformTx = filteredPlatformTx.slice(startIndex, startIndex + pageSize);
  const pagedUserTx = filteredUserTx.slice(startIndex, startIndex + pageSize);
  const pagedTopupTx = filteredTopupTx.slice(startIndex, startIndex + pageSize);
  const pagedSubTx = filteredSubTx.slice(startIndex, startIndex + pageSize);
  const pagedUserSubs = filteredUserSubs.slice(startIndex, startIndex + pageSize);
  const pagedCashouts = filteredCashouts.slice(startIndex, startIndex + pageSize);

  const resetFilters = () => {
    setSearch('');
    setSelectedType('all');
    setSelectedStatus('all');
    setSelectedDirection('all');
    setSelectedPlan('all');
    setSelectedSubStatus('all');
    setSelectedChannel('all');
    setPage(1);
  };

  return (
    <div className="space-y-8">
      {/* 1. FINANCIAL & SUBSCRIPTION KPI OVERVIEW */}
      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Platform Finance & Revenue Analytics</h2>
            <p className="text-xs text-zinc-400">
              Platform wallet reserves, fee revenues, subscriptions monetization, and cashout disbursements.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            <span>Platform Wallet: {revenue?.platformWalletStatus ?? 'active'}</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">
          {/* Platform Wallet */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveMetricModal('wallet')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveMetricModal('wallet');
            }}
            className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-white/[0.07] bg-[#12131a] p-4 text-left transition-all duration-200 hover:border-white/20 hover:bg-[#161822] hover:shadow-lg active:scale-[0.99]"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 group-hover:text-zinc-400 transition-colors">
                    Platform Wallet
                  </p>
                  <p className="mt-1.5 break-words text-xl xl:text-2xl font-semibold tabular-nums text-white tracking-tight leading-tight">
                    {(revenue?.platformWalletBalance ?? 0).toLocaleString()}
                  </p>
                  <p className="mt-1 break-words text-xs text-emerald-400 leading-normal">Reserve credits</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 group-hover:bg-rose-500/20 transition-colors">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/[0.04] pt-2 text-[10px] text-zinc-500 group-hover:text-zinc-300 transition-colors">
              <span>View whole digits</span>
              <Maximize2 className="h-3 w-3 text-zinc-500 group-hover:text-white transition-colors" />
            </div>
          </div>

          {/* Platform Revenue */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveMetricModal('revenue')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveMetricModal('revenue');
            }}
            className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-white/[0.07] bg-[#12131a] p-4 text-left transition-all duration-200 hover:border-emerald-500/40 hover:bg-[#161822] hover:shadow-lg active:scale-[0.99]"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 group-hover:text-emerald-400/80 transition-colors">
                    Platform Revenue
                  </p>
                  <p className="mt-1.5 break-words text-xl xl:text-2xl font-semibold tabular-nums text-emerald-400 tracking-tight leading-tight">
                    +{(revenue?.totalRevenueCredits ?? 0).toLocaleString()}{' '}
                    <span className="text-xs text-zinc-400 font-normal">cr</span>
                  </p>
                  <p className="mt-1 break-words text-xs text-zinc-400 leading-normal">
                    {formatPhp(revenue?.totalRevenuePhp ?? 0)} fiat total
                  </p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                  <BadgeDollarSign className="h-4 w-4" />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/[0.04] pt-2 text-[10px] text-zinc-500 group-hover:text-emerald-400 transition-colors">
              <span>View whole digits & fee details</span>
              <Maximize2 className="h-3 w-3 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
            </div>
          </div>

          {/* Top-Up Revenue */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveMetricModal('topup')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveMetricModal('topup');
            }}
            className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-white/[0.07] bg-[#12131a] p-4 text-left transition-all duration-200 hover:border-emerald-500/40 hover:bg-[#161822] hover:shadow-lg active:scale-[0.99]"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 group-hover:text-emerald-400/80 transition-colors">
                    Top-Up Revenue
                  </p>
                  <p className="mt-1.5 break-words text-xl xl:text-2xl font-semibold tabular-nums text-emerald-400 tracking-tight leading-tight">
                    {formatPhp(topupSummary?.totalPaidPhp ?? revenue?.topupRevenuePhp ?? 0)}
                  </p>
                  <p className="mt-1 break-words text-xs text-zinc-400 leading-normal">
                    {(topupSummary?.totalCreditsIssued ?? 0).toLocaleString()} cr granted
                  </p>
                  <p className="mt-0.5 break-words text-[10px] text-zinc-500 leading-normal">
                    {topupSummary?.paidCount ?? 0} paid top-ups
                  </p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                  <Coins className="h-4 w-4" />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/[0.04] pt-2 text-[10px] text-zinc-500 group-hover:text-emerald-300 transition-colors">
              <span>View whole digits & top-ups</span>
              <Maximize2 className="h-3 w-3 text-zinc-500 group-hover:text-emerald-300 transition-colors" />
            </div>
          </div>

          {/* Subscription Platform Earn */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveMetricModal('subscription_earn')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveMetricModal('subscription_earn');
            }}
            className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-white/[0.07] bg-[#12131a] p-4 text-left transition-all duration-200 hover:border-indigo-500/40 hover:bg-[#161822] hover:shadow-lg active:scale-[0.99]"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 group-hover:text-indigo-400/80 transition-colors">
                    Subscription Earn
                  </p>
                  <p className="mt-1.5 break-words text-xl xl:text-2xl font-semibold tabular-nums text-indigo-400 tracking-tight leading-tight">
                    {formatPhp(subAnalytics?.summary?.subscriptionPlatformEarnPhp ?? revenue?.subscriptionRevenuePhp ?? 0)}
                  </p>
                  <p className="mt-1 break-words text-xs text-zinc-400 leading-normal">
                    Platform subscription income
                  </p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                  <CreditCard className="h-4 w-4" />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/[0.04] pt-2 text-[10px] text-zinc-500 group-hover:text-indigo-300 transition-colors">
              <span>View whole digits</span>
              <Maximize2 className="h-3 w-3 text-zinc-500 group-hover:text-indigo-300 transition-colors" />
            </div>
          </div>

          {/* Subscribed Members */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveMetricModal('subscribers')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveMetricModal('subscribers');
            }}
            className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-white/[0.07] bg-[#12131a] p-4 text-left transition-all duration-200 hover:border-purple-500/40 hover:bg-[#161822] hover:shadow-lg active:scale-[0.99]"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 group-hover:text-purple-400/80 transition-colors">
                    Subscribers
                  </p>
                  <p className="mt-1.5 break-words text-xl xl:text-2xl font-semibold tabular-nums text-white tracking-tight leading-tight">
                    {subAnalytics?.summary?.activePaidSubscribers ?? 0}
                  </p>
                  <p className="mt-1 break-words text-xs text-emerald-400 leading-normal">
                    {subAnalytics?.summary?.recurringMembers ?? 0} recurring active
                  </p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                  <Repeat className="h-4 w-4" />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/[0.04] pt-2 text-[10px] text-zinc-500 group-hover:text-purple-300 transition-colors">
              <span>View subscriber counts</span>
              <Maximize2 className="h-3 w-3 text-zinc-500 group-hover:text-purple-300 transition-colors" />
            </div>
          </div>

          {/* Platform Payout */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveMetricModal('payout')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveMetricModal('payout');
            }}
            className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-white/[0.07] bg-[#12131a] p-4 text-left transition-all duration-200 hover:border-amber-500/40 hover:bg-[#161822] hover:shadow-lg active:scale-[0.99]"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 group-hover:text-amber-400/80 transition-colors">
                    Platform Payout
                  </p>
                  <p className="mt-1.5 break-words text-xl xl:text-2xl font-semibold tabular-nums text-white tracking-tight leading-tight">
                    {formatPhp(payout?.totalPayoutPhp ?? 0)}
                  </p>
                  <p className="mt-1 break-words text-xs text-zinc-400 leading-normal">
                    {(payout?.totalPayoutCredits ?? 0).toLocaleString()} cr cashed out
                  </p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/[0.04] pt-2 text-[10px] text-zinc-500 group-hover:text-amber-300 transition-colors">
              <span>View whole digits</span>
              <Maximize2 className="h-3 w-3 text-zinc-500 group-hover:text-amber-300 transition-colors" />
            </div>
          </div>

          {/* Escrow Held */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveMetricModal('escrow')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveMetricModal('escrow');
            }}
            className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-white/[0.07] bg-[#12131a] p-4 text-left transition-all duration-200 hover:border-blue-500/40 hover:bg-[#161822] hover:shadow-lg active:scale-[0.99]"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 group-hover:text-blue-400/80 transition-colors">
                    Escrow Held
                  </p>
                  <p className="mt-1.5 break-words text-xl xl:text-2xl font-semibold tabular-nums text-blue-300 tracking-tight leading-tight">
                    {(revenue?.escrowHeldCredits ?? 0).toLocaleString()}{' '}
                    <span className="text-xs text-zinc-400 font-normal">cr</span>
                  </p>
                  <p className="mt-1 break-words text-xs text-zinc-400 leading-normal">Protected project escrow</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/[0.04] pt-2 text-[10px] text-zinc-500 group-hover:text-blue-300 transition-colors">
              <span>View whole digits</span>
              <Maximize2 className="h-3 w-3 text-zinc-500 group-hover:text-blue-300 transition-colors" />
            </div>
          </div>
        </div>
      </section>

      {/* 2. REVENUE STREAMS, SUBSCRIPTION ANALYTICS, & PAYOUT BREAKDOWN */}
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Platform Fee Revenue Streams */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveMetricModal('fee_breakdown')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveMetricModal('fee_breakdown');
          }}
          className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-white/[0.07] bg-[#12131a] p-5 text-left transition-all duration-200 hover:border-emerald-500/30 hover:bg-[#161822] hover:shadow-lg active:scale-[0.99]"
        >
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                  Platform Fee Revenue
                </h3>
                <p className="text-xs text-zinc-500">Fee collections and marketplace monetization</p>
              </div>
              <div className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                {(revenue?.totalRevenueCredits ?? 0).toLocaleString()} cr
                <Maximize2 className="ml-0.5 h-3 w-3" />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-[#0c0d12] p-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="text-zinc-300">Milestone Contract Fees</span>
                </div>
                <span className="font-semibold tabular-nums text-emerald-400">
                  +{(revenue?.milestoneFeesCredits ?? 0).toLocaleString()} cr
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#0c0d12] p-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="text-zinc-300">Job Posting Fees (50 cr/job)</span>
                </div>
                <span className="font-semibold tabular-nums text-emerald-400">
                  +{(revenue?.jobPostingFeesCredits ?? 0).toLocaleString()} cr
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#0c0d12] p-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="text-zinc-300">Proposal Fees (10 cr/app)</span>
                </div>
                <span className="font-semibold tabular-nums text-emerald-400">
                  +{(revenue?.proposalFeesCredits ?? 0).toLocaleString()} cr
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#0c0d12] p-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-400" />
                  <span className="text-zinc-300">Cashout Processing Fees</span>
                </div>
                <span className="font-semibold tabular-nums text-white">
                  {formatPhp(revenue?.cashoutFeesPhp ?? 0)}
                </span>
              </div>

              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMetricModal('topup');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    setActiveMetricModal('topup');
                  }
                }}
                className="flex items-center justify-between rounded-xl bg-[#0c0d12] p-3 text-xs transition-colors hover:bg-white/[0.04] cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="text-zinc-300">Direct Top-up Purchases</span>
                  {(topupSummary?.paidCount ?? 0) > 0 && (
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                      {topupSummary?.paidCount} paid
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-semibold tabular-nums text-emerald-400">
                    {formatPhp(topupSummary?.totalPaidPhp ?? revenue?.topupRevenuePhp ?? 0)}
                  </span>
                  <span className="block text-[10px] text-zinc-500">
                    {(topupSummary?.totalCreditsIssued ?? 0).toLocaleString()} cr issued ↗
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-2 text-[11px] text-zinc-500 group-hover:text-zinc-300 transition-colors">
            <span>Click card to inspect full digits & breakdown</span>
            <span className="font-medium text-emerald-400">Inspect Fee Mechanics ↗</span>
          </div>
        </div>

        {/* Card 2: Top-Up Purchases & Gateways */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveMetricModal('topup')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveMetricModal('topup');
          }}
          className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-white/[0.07] bg-[#12131a] p-5 text-left transition-all duration-200 hover:border-emerald-500/30 hover:bg-[#161822] hover:shadow-lg active:scale-[0.99]"
        >
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                  Top-Up Purchases
                </h3>
                <p className="text-xs text-zinc-500">Gross fiat revenue & user credit grants</p>
              </div>
              <div className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                {formatPhp(topupSummary?.totalPaidPhp ?? revenue?.topupRevenuePhp ?? 0)}
                <Maximize2 className="ml-0.5 h-3 w-3" />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-[#0c0d12] p-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <Coins className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-zinc-300">Paid Top-Up Orders</span>
                </div>
                <span className="font-semibold tabular-nums text-emerald-400">
                  {topupSummary?.paidCount ?? 0} paid
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#0c0d12] p-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                  <span className="text-zinc-300">Credits Granted to Users</span>
                </div>
                <span className="font-semibold tabular-nums text-white">
                  +{(topupSummary?.totalCreditsIssued ?? 0).toLocaleString()} cr
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#0c0d12] p-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-teal-400" />
                  <span className="text-zinc-300">Average Order Size</span>
                </div>
                <span className="font-semibold tabular-nums text-zinc-300">
                  {topupSummary?.paidCount
                    ? formatPhp(
                        Math.round(
                          ((topupSummary?.totalPaidPhp ?? 0) / topupSummary.paidCount) * 100
                        ) / 100
                      )
                    : '₱0.00'}
                </span>
              </div>

              <div className="rounded-xl bg-[#0c0d12] p-3 text-xs">
                <p className="font-medium text-zinc-400 mb-2">Payment Channels Used:</p>
                <div className="flex flex-wrap gap-1.5">
                  {topupChannels.length > 0 ? (
                    topupChannels.map((ch) => (
                      <span key={ch}>{getChannelBadge(ch)}</span>
                    ))
                  ) : (
                    <span className="text-[11px] text-zinc-500">GCash, Maya, Cards</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-2 text-[11px] text-zinc-500 group-hover:text-zinc-300 transition-colors">
            <span>Click card to inspect full digits & breakdown</span>
            <span className="font-medium text-emerald-400">Inspect Top-Up Mechanics ↗</span>
          </div>
        </div>

        {/* Card 3: Subscription Analytics */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveMetricModal('subscription_breakdown')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveMetricModal('subscription_breakdown');
          }}
          className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-white/[0.07] bg-[#12131a] p-5 text-left transition-all duration-200 hover:border-indigo-500/30 hover:bg-[#161822] hover:shadow-lg active:scale-[0.99]"
        >
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                  Subscription Analytics
                </h3>
                <p className="text-xs text-zinc-500">Subscriber base, recurring revenue, and tiers</p>
              </div>
              <div className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                {formatPhp(subAnalytics?.summary?.subscriptionPlatformEarnPhp ?? 0)}
                <Maximize2 className="ml-0.5 h-3 w-3" />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-[#0c0d12] p-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-zinc-300">Active Paid Subscribers</span>
                </div>
                <span className="font-semibold tabular-nums text-emerald-400">
                  {subAnalytics?.summary?.activePaidSubscribers ?? 0} members
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#0c0d12] p-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <Repeat className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-zinc-300">Recurring Members (Auto-Renew)</span>
                </div>
                <span className="font-semibold tabular-nums text-white">
                  {subAnalytics?.summary?.recurringMembers ?? 0} members
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#0c0d12] p-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <UserX className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-zinc-300">Free / Unsubscribed Members</span>
                </div>
                <span className="font-semibold tabular-nums text-zinc-400">
                  {subAnalytics?.summary?.freeMembers ?? 0} members
                </span>
              </div>

              <div className="rounded-xl bg-[#0c0d12] p-3 text-xs">
                <p className="font-medium text-zinc-400 mb-2">Available Subscription Plans:</p>
                <div className="space-y-1.5">
                  {availablePlans.map((p) => (
                    <div key={p.planId} className="flex items-center justify-between text-zinc-300">
                      <span className="font-medium text-white">{p.name}</span>
                      <span className="font-mono text-zinc-400">
                        {p.amountPhp > 0 ? `${formatPhp(p.amountPhp)}/${p.billingPeriod.toLowerCase()}` : 'Free'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-2 text-[11px] text-zinc-500 group-hover:text-zinc-300 transition-colors">
            <span>Click card to inspect subscriber metrics</span>
            <span className="font-medium text-indigo-400">Inspect Tiers ↗</span>
          </div>
        </div>

        {/* Card 3: Payout & Cashout Performance */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveMetricModal('payout_breakdown')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveMetricModal('payout_breakdown');
          }}
          className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-white/[0.07] bg-[#12131a] p-5 text-left transition-all duration-200 hover:border-amber-500/30 hover:bg-[#161822] hover:shadow-lg active:scale-[0.99]"
        >
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">
                  Payout Disbursements
                </h3>
                <p className="text-xs text-zinc-500">Cashouts fulfillment, pending queue, and averages</p>
              </div>
              <div className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                {payout?.payoutCounts?.total ?? 0} requests
                <Maximize2 className="ml-0.5 h-3 w-3" />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-[#0c0d12] p-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="text-zinc-300">Succeeded / Disbursed Cashouts</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold tabular-nums text-emerald-400">
                    {formatPhp(payout?.totalPayoutPhp ?? 0)}
                  </span>
                  <span className="ml-2 text-zinc-500">
                    ({payout?.payoutCounts?.succeeded ?? 0})
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#0c0d12] p-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="text-zinc-300">Pending Review Queue</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold tabular-nums text-amber-300">
                    {formatPhp(payout?.pendingPayoutPhp ?? 0)}
                  </span>
                  <span className="ml-2 text-zinc-500">
                    ({payout?.payoutCounts?.pending ?? 0})
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#0c0d12] p-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="text-zinc-300">Failed / Refunded</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold tabular-nums text-rose-400">
                    {formatPhp(payout?.failedPayoutPhp ?? 0)}
                  </span>
                  <span className="ml-2 text-zinc-500">
                    ({payout?.payoutCounts?.failed ?? 0})
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#0c0d12] p-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-400" />
                  <span className="text-zinc-300">Average Payout Amount</span>
                </div>
                <span className="font-semibold tabular-nums text-white">
                  {formatPhp(payout?.averagePayoutPhp ?? 0)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#0c0d12] p-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                  <span className="text-zinc-300">Total Credits Redeemed</span>
                </div>
                <span className="font-semibold tabular-nums text-white">
                  {(payout?.totalPayoutCredits ?? 0).toLocaleString()} cr
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-2 text-[11px] text-zinc-500 group-hover:text-zinc-300 transition-colors">
            <span>Click card to inspect payout metrics</span>
            <span className="font-medium text-amber-400">Inspect Cashouts ↗</span>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE TRANSACTIONS & SUBSCRIBER DIRECTORY */}
      <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#12131a]">
        {/* Ledger Header & Sub-tabs */}
        <div className="border-b border-white/[0.06] p-4 lg:flex lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Transaction Ledgers & Subscription Directory</h3>
            <p className="text-xs text-zinc-500">
              Live records of platform fee revenues, user interactions, subscription transactions, and member statuses.
            </p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1 rounded-xl bg-[#0c0d12] p-1 lg:mt-0">
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('platform');
                resetFilters();
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeSubTab === 'platform'
                  ? 'bg-rose-500/20 text-rose-300 shadow-inner'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Platform Transactions ({platformTx.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab('users');
                resetFilters();
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeSubTab === 'users'
                  ? 'bg-rose-500/20 text-rose-300 shadow-inner'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              User Transactions ({userTx.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab('topups');
                resetFilters();
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeSubTab === 'topups'
                  ? 'bg-rose-500/20 text-rose-300 shadow-inner'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Top-Up Purchases ({topupTx.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab('subscriptions');
                resetFilters();
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeSubTab === 'subscriptions'
                  ? 'bg-rose-500/20 text-rose-300 shadow-inner'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Subscription Invoices ({subTx.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab('subscribers');
                resetFilters();
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeSubTab === 'subscribers'
                  ? 'bg-rose-500/20 text-rose-300 shadow-inner'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Subscription Members ({userSubs.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab('cashouts');
                resetFilters();
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeSubTab === 'cashouts'
                  ? 'bg-rose-500/20 text-rose-300 shadow-inner'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Cashout Payouts ({cashouts.length})
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid gap-3 border-b border-white/[0.06] bg-[#0c0d12]/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={
                activeSubTab === 'subscribers'
                  ? 'Search member name, @handle, email...'
                  : activeSubTab === 'topups'
                  ? 'Search reference ID, member, channel, payment ID...'
                  : 'Search by ID, username, name...'
              }
              className="w-full rounded-xl border border-white/[0.08] bg-[#0c0d12] py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-rose-500/50 focus:outline-none"
            />
          </div>

          {/* Type Filter for Transactions */}
          {(activeSubTab === 'platform' || activeSubTab === 'users') && (
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-white/[0.08] bg-[#0c0d12] px-3 py-2 text-xs text-zinc-300 focus:border-rose-500/50 focus:outline-none"
            >
              <option value="all">All transaction types</option>
              {(activeSubTab === 'platform' ? platformTypes : userTypes).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}

          {/* Channel Filter (Top-up Tab Only) */}
          {activeSubTab === 'topups' && (
            <select
              value={selectedChannel}
              onChange={(e) => {
                setSelectedChannel(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-white/[0.08] bg-[#0c0d12] px-3 py-2 text-xs text-zinc-300 focus:border-rose-500/50 focus:outline-none"
            >
              <option value="all">All payment channels</option>
              {topupChannels.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          )}

          {/* Subscription Plan Filter (for Subscription tabs) */}
          {(activeSubTab === 'subscriptions' || activeSubTab === 'subscribers') && (
            <select
              value={selectedPlan}
              onChange={(e) => {
                setSelectedPlan(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-white/[0.08] bg-[#0c0d12] px-3 py-2 text-xs text-zinc-300 focus:border-rose-500/50 focus:outline-none"
            >
              <option value="all">All subscription plans</option>
              {availablePlans.map((p) => (
                <option key={p.planId} value={p.name}>
                  {p.name} {p.amountPhp > 0 ? `(${formatPhp(p.amountPhp)})` : '(Free)'}
                </option>
              ))}
            </select>
          )}

          {/* Subscriber Status Filter (for Subscriber list) */}
          {activeSubTab === 'subscribers' && (
            <select
              value={selectedSubStatus}
              onChange={(e) => {
                setSelectedSubStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-white/[0.08] bg-[#0c0d12] px-3 py-2 text-xs text-zinc-300 focus:border-rose-500/50 focus:outline-none"
            >
              <option value="all">All subscription statuses</option>
              <option value="subscribed">Subscribed Only (Paid Active)</option>
              <option value="not_subscribed">Not Subscribed (Free / Inactive)</option>
              <option value="recurring">Recurring Auto-Renewing Only</option>
            </select>
          )}

          {/* Status Filter for Transactions */}
          {activeSubTab !== 'subscribers' && (
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-white/[0.08] bg-[#0c0d12] px-3 py-2 text-xs text-zinc-300 focus:border-rose-500/50 focus:outline-none"
            >
              <option value="all">All statuses</option>
              <option value="completed">Completed / Succeeded / Paid</option>
              <option value="pending">Pending / Processing</option>
              <option value="held">Held (Escrow)</option>
              <option value="failed">Failed / Refunded</option>
            </select>
          )}

          {/* Direction Filter (Platform Tab Only) */}
          {activeSubTab === 'platform' && (
            <select
              value={selectedDirection}
              onChange={(e) => {
                setSelectedDirection(e.target.value as 'all' | 'inflow' | 'outflow');
                setPage(1);
              }}
              className="rounded-xl border border-white/[0.08] bg-[#0c0d12] px-3 py-2 text-xs text-zinc-300 focus:border-rose-500/50 focus:outline-none"
            >
              <option value="all">All flow directions</option>
              <option value="inflow">Inflow (+ Fee / Deposit)</option>
              <option value="outflow">Outflow (- Payout / Transfer)</option>
            </select>
          )}
        </div>

        {/* Tab 1: Platform Transactions Table */}
        {activeSubTab === 'platform' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[#0c0d12] text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Transaction ID & Type</th>
                  <th className="px-4 py-3">Flow</th>
                  <th className="px-4 py-3 text-right">Revenue Number (Credits)</th>
                  <th className="px-4 py-3">Counterparty</th>
                  <th className="px-4 py-3">Reference / Context</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {pagedPlatformTx.map((tx) => {
                  const isFee = String(tx.type || '').toLowerCase().includes('fee');
                  const isInflow = tx.direction === 'inflow' || isFee;
                  const revenueNumber = isFee
                    ? `+${tx.amountCredits.toLocaleString()} cr`
                    : isInflow
                    ? `+${tx.amountCredits.toLocaleString()} cr`
                    : `-${tx.amountCredits.toLocaleString()} cr`;

                  return (
                    <tr key={tx.id} className="text-zinc-300 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-[11px] text-zinc-400">{tx.id.slice(0, 8)}...</span>
                          <div>{getTypeBadge(tx.type)}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isFee ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                            <ArrowDownLeft className="h-3 w-3" />
                            Platform Revenue
                          </span>
                        ) : isInflow ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                            <ArrowDownLeft className="h-3.5 w-3.5" />
                            Inflow
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-rose-400">
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            Outflow
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-semibold tabular-nums">
                        <span className={isInflow ? 'text-emerald-400' : 'text-rose-400'}>
                          {revenueNumber}
                        </span>
                        {isFee && (
                          <span className="block text-[10px] font-normal text-emerald-500/80">
                            100% Platform Fee Earned
                          </span>
                        )}
                        {tx.fiatAmountPhp != null && Number(tx.fiatAmountPhp) > 0 && (
                          <span className="block text-[10px] font-semibold text-emerald-400">
                            +{formatPhp(Number(tx.fiatAmountPhp))} Fiat {tx.fiatChannelCode ? `(${tx.fiatChannelCode})` : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-white">{tx.counterpartyName}</span>
                          {tx.counterpartyHandle && (
                            <span className="text-[11px] text-zinc-500">@{tx.counterpartyHandle}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          {tx.referenceTable ? (
                            <span className="w-fit rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                              {tx.referenceTable}
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                          {tx.referenceId && (
                            <span className="font-mono text-[10px] text-zinc-500">
                              {tx.referenceId.slice(0, 10)}...
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(tx.status)}</td>
                      <td className="px-4 py-3 text-right text-zinc-400">{formatDateTime(tx.createdAt)}</td>
                    </tr>
                  );
                })}
                {pagedPlatformTx.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                      No platform transactions found matching the filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: User Transactions Table */}
        {activeSubTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[#0c0d12] text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Transaction ID & Type</th>
                  <th className="px-4 py-3">Source Account</th>
                  <th className="px-4 py-3 text-center">Flow</th>
                  <th className="px-4 py-3">Destination Account</th>
                  <th className="px-4 py-3 text-right">Amount (Credits)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {pagedUserTx.map((tx) => (
                  <tr key={tx.id} className="text-zinc-300 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-[11px] text-zinc-400">{tx.id.slice(0, 8)}...</span>
                        <div>{getTypeBadge(tx.type)}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{tx.sourceName}</span>
                        {tx.sourceHandle && <span className="text-[11px] text-zinc-500">@{tx.sourceHandle}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-zinc-500">
                      <span className="text-zinc-600">→</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{tx.destinationName}</span>
                        {tx.destinationHandle && (
                          <span className="text-[11px] text-zinc-500">@{tx.destinationHandle}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-semibold tabular-nums text-white">
                      {tx.amountCredits.toLocaleString()} cr
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(tx.status)}</td>
                    <td className="px-4 py-3 text-right text-zinc-400">{formatDateTime(tx.createdAt)}</td>
                  </tr>
                ))}
                {pagedUserTx.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                      No user transactions found matching the filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab: Top-up Purchases Table */}
        {activeSubTab === 'topups' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[#0c0d12] text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Reference & Payment ID</th>
                  <th className="px-4 py-3">Customer Member</th>
                  <th className="px-4 py-3">Payment Channel</th>
                  <th className="px-4 py-3 text-right">Fiat Paid (Platform Revenue)</th>
                  <th className="px-4 py-3 text-right">Credits Granted</th>
                  <th className="px-4 py-3">Platform Balance Impact</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Processed Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {pagedTopupTx.map((tx) => (
                  <tr key={tx.id} className="text-zinc-300 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-xs font-semibold text-white">
                          {tx.referenceId || tx.id.slice(0, 10)}
                        </span>
                        {tx.paymentId && (
                          <span className="font-mono text-[10px] text-zinc-400">
                            Pay ID: {tx.paymentId}
                          </span>
                        )}
                        {tx.description && (
                          <span className="text-[10px] text-zinc-500">
                            {tx.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{tx.userName}</span>
                        {tx.userHandle && (
                          <span className="text-[11px] text-zinc-500">@{tx.userHandle}</span>
                        )}
                        {tx.userEmail && (
                          <span className="text-[10px] text-zinc-600">{tx.userEmail}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getChannelBadge(tx.channelCode)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-semibold tabular-nums text-emerald-400">
                      +{formatPhp(Number(tx.amountPhp || 0))}
                      <span className="block text-[10px] font-normal text-emerald-500/80">
                        Gross Fiat Revenue
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-semibold tabular-nums text-white">
                      +{Number(tx.creditsGranted || 0).toLocaleString()} cr
                      <span className="block text-[10px] font-normal text-zinc-500">
                        User Wallet Credited
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                          <ArrowDownLeft className="h-3 w-3" />
                          +{formatPhp(Number(tx.amountPhp || 0))} Fiat Inflow
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400">
                          <ArrowUpRight className="h-3 w-3 text-rose-400" />
                          -{Number(tx.creditsGranted || 0).toLocaleString()} cr Platform Reserve
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(tx.status)}</td>
                    <td className="px-4 py-3 text-right text-zinc-400">
                      {formatDateTime(tx.processedAt || tx.createdAt)}
                    </td>
                  </tr>
                ))}
                {pagedTopupTx.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                      No top-up transactions found matching the filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Subscription Invoices / Platform Transactions */}
        {activeSubTab === 'subscriptions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[#0c0d12] text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Invoice ID</th>
                  <th className="px-4 py-3">Subscriber</th>
                  <th className="px-4 py-3">Plan Type</th>
                  <th className="px-4 py-3 text-right">Platform Earn (PHP)</th>
                  <th className="px-4 py-3">Billing Cycle Dates</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Payment Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {pagedSubTx.map((tx) => (
                  <tr key={tx.id} className="text-zinc-300 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] text-zinc-400">{tx.id.slice(0, 8)}...</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{tx.subscriberName}</span>
                        {tx.subscriberHandle && (
                          <span className="text-[11px] text-zinc-500">@{tx.subscriberHandle}</span>
                        )}
                        {tx.subscriberEmail && (
                          <span className="text-[10px] text-zinc-600">{tx.subscriberEmail}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 font-medium text-indigo-300">
                        {tx.planName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-semibold tabular-nums text-emerald-400">
                      +{formatPhp(Number(tx.amountPhp || 0))}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {tx.periodStart && tx.periodEnd ? (
                        <span>
                          {formatDateTime(tx.periodStart).split(',')[0]} → {formatDateTime(tx.periodEnd).split(',')[0]}
                        </span>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(tx.status)}</td>
                    <td className="px-4 py-3 text-right text-zinc-400">{formatDateTime(tx.paidAt || tx.createdAt)}</td>
                  </tr>
                ))}
                {pagedSubTx.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                      No subscription transactions found matching the filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: User Subscription Directory (Subscribed vs Not Subscribed) */}
        {activeSubTab === 'subscribers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[#0c0d12] text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Subscription Status</th>
                  <th className="px-4 py-3">Plan Type</th>
                  <th className="px-4 py-3">Billing Cycle</th>
                  <th className="px-4 py-3">Auto-Renew</th>
                  <th className="px-4 py-3">Renewal / Expiry</th>
                  <th className="px-4 py-3 text-right">Total Spent (PHP)</th>
                  <th className="px-4 py-3 text-right">Joined At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {pagedUserSubs.map((u) => (
                  <tr key={u.userId} className="text-zinc-300 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{u.name}</span>
                        <span className="text-[11px] text-zinc-500">@{u.username}</span>
                        <span className="text-[10px] text-zinc-600">{u.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.isSubscribed ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Subscribed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                          Not Subscribed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-lg border px-2 py-0.5 font-medium ${
                          u.isSubscribed
                            ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300'
                            : 'border-white/10 bg-white/5 text-zinc-400'
                        }`}
                      >
                        {u.planName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 capitalize">{u.billingPeriod.toLowerCase()}</td>
                    <td className="px-4 py-3">
                      {u.isSubscribed ? (
                        u.recurring ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                            <Repeat className="h-3 w-3" />
                            Auto-renewing
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-400">Canceling at period end</span>
                        )
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {formatDateTime(u.currentPeriodEnd || u.nextBillingAt)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-semibold tabular-nums text-white">
                      {formatPhp(Number(u.totalSpentPhp || 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-400">{formatDateTime(u.joinedAt)}</td>
                  </tr>
                ))}
                {pagedUserSubs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                      No members found matching the selected subscription filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: Cashouts Table */}
        {activeSubTab === 'cashouts' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[#0c0d12] text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Reference / Member</th>
                  <th className="px-4 py-3">Disbursement Channel</th>
                  <th className="px-4 py-3">Target Account</th>
                  <th className="px-4 py-3 text-right">Cashed Credits</th>
                  <th className="px-4 py-3 text-right">Net Payout (PHP)</th>
                  <th className="px-4 py-3 text-right">Platform Fee</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Requested At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {pagedCashouts.map((c) => (
                  <tr key={c.id} className="text-zinc-300 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{c.userName}</span>
                        <span className="font-mono text-[11px] text-zinc-500">
                          {c.referenceId || c.id.slice(0, 8)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-white/[0.04] px-2 py-0.5 font-medium text-zinc-300">
                        {c.channelCode || 'Direct Transfer'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-white">{c.accountName || '—'}</span>
                        <span className="font-mono text-[11px] text-zinc-500">{c.accountNo || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-white tabular-nums">
                      {c.amountCredits.toLocaleString()} cr
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-emerald-400 tabular-nums">
                      {formatPhp(Number(c.netAmountPhp || 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-zinc-400 tabular-nums">
                      {formatPhp(Number(c.feePhp || 0))}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(c.status)}</td>
                    <td className="px-4 py-3 text-right text-zinc-400">{formatDateTime(c.createdAt)}</td>
                  </tr>
                ))}
                {pagedCashouts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                      No cashout records found matching the filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        <div className="flex items-center justify-between border-t border-white/[0.06] bg-[#0c0d12] px-4 py-3 text-xs text-zinc-400">
          <div>
            Showing <span className="font-medium text-white">{currentTotal > 0 ? startIndex + 1 : 0}</span> to{' '}
            <span className="font-medium text-white">{Math.min(startIndex + pageSize, currentTotal)}</span> of{' '}
            <span className="font-medium text-white">{currentTotal}</span> items
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="flex items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 py-1 text-xs text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <span className="text-zinc-500">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 py-1 text-xs text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 4. MODAL FOR DETAILED REVENUE, FEES, AND STATS INSPECTION */}
      {activeMetricModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setActiveMetricModal(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0f1016] p-6 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.08]">
                  {activeMetricModal === 'wallet' && <Wallet className="h-5 w-5 text-rose-400" />}
                  {activeMetricModal === 'topup' && <Coins className="h-5 w-5 text-emerald-400" />}
                  {(activeMetricModal === 'revenue' || activeMetricModal === 'fee_breakdown') && (
                    <BadgeDollarSign className="h-5 w-5 text-emerald-400" />
                  )}
                  {(activeMetricModal === 'subscription_earn' || activeMetricModal === 'subscription_breakdown') && (
                    <CreditCard className="h-5 w-5 text-indigo-400" />
                  )}
                  {activeMetricModal === 'subscribers' && <Repeat className="h-5 w-5 text-purple-400" />}
                  {(activeMetricModal === 'payout' || activeMetricModal === 'payout_breakdown') && (
                    <ArrowUpRight className="h-5 w-5 text-amber-400" />
                  )}
                  {activeMetricModal === 'escrow' && <ShieldCheck className="h-5 w-5 text-blue-400" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {activeMetricModal === 'wallet' && 'Platform Wallet Reserves'}
                    {activeMetricModal === 'topup' && 'Top-Up Purchases & Platform Reserve Issuance'}
                    {activeMetricModal === 'revenue' && 'Platform Revenue & Fee Collections'}
                    {activeMetricModal === 'fee_breakdown' && 'Platform Fee Revenue Streams & Mechanics'}
                    {activeMetricModal === 'subscription_earn' && 'Subscription Platform Revenue'}
                    {activeMetricModal === 'subscription_breakdown' && 'Subscription Tiers & Member Base'}
                    {activeMetricModal === 'subscribers' && 'Platform Subscribers Directory'}
                    {activeMetricModal === 'payout' && 'Platform Payouts & Disbursements'}
                    {activeMetricModal === 'payout_breakdown' && 'Payouts Queue & Performance'}
                    {activeMetricModal === 'escrow' && 'Milestone Escrow Held'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Exact, unclipped numeric digits and full itemized calculations.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveMetricModal(null)}
                className="rounded-xl border border-white/[0.08] p-2 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-5 space-y-6">
              {/* Platform Revenue or Fee Breakdown */}
              {(activeMetricModal === 'revenue' || activeMetricModal === 'fee_breakdown') && (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                          Total Revenue (Credits)
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(String(revenue?.totalRevenueCredits ?? 0), 'rev_cr')}
                          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white"
                        >
                          {copiedKey === 'rev_cr' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                              <Check className="h-3 w-3" /> Copied
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Copy className="h-3 w-3" /> Copy Digits
                            </span>
                          )}
                        </button>
                      </div>
                      <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-emerald-400 break-words">
                        +{(revenue?.totalRevenueCredits ?? 0).toLocaleString()} cr
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Exact raw digits: <span className="font-mono text-white">{revenue?.totalRevenueCredits ?? 0}</span> credits
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                          Total Fiat Revenue (PHP)
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(String(revenue?.totalRevenuePhp ?? 0), 'rev_php')}
                          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white"
                        >
                          {copiedKey === 'rev_php' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                              <Check className="h-3 w-3" /> Copied
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Copy className="h-3 w-3" /> Copy Digits
                            </span>
                          )}
                        </button>
                      </div>
                      <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-emerald-400 break-words">
                        {formatPhp(revenue?.totalRevenuePhp ?? 0)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Exact raw value:{' '}
                        <span className="font-mono text-white">
                          ₱{(revenue?.totalRevenuePhp ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                      Itemized Revenue Stream Breakdown
                    </h4>
                    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#0c0d12]">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/[0.06] text-[10px] uppercase text-zinc-500">
                            <th className="px-4 py-2.5">Revenue Category</th>
                            <th className="px-4 py-2.5">Fee Mechanic / Pricing</th>
                            <th className="px-4 py-2.5 text-right">Earned Digits</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          <tr>
                            <td className="px-4 py-3 font-medium text-white">Milestone Contract Fees</td>
                            <td className="px-4 py-3 text-zinc-400">10% retained upon client milestone completion</td>
                            <td className="px-4 py-3 text-right font-mono text-emerald-400 font-semibold">
                              +{(revenue?.milestoneFeesCredits ?? 0).toLocaleString()} cr
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-medium text-white">Job Posting Fees</td>
                            <td className="px-4 py-3 text-zinc-400">50 credits fee billed per client job publication</td>
                            <td className="px-4 py-3 text-right font-mono text-emerald-400 font-semibold">
                              +{(revenue?.jobPostingFeesCredits ?? 0).toLocaleString()} cr
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-medium text-white">Proposal Application Fees</td>
                            <td className="px-4 py-3 text-zinc-400">10 credits billed per proposal bid submitted</td>
                            <td className="px-4 py-3 text-right font-mono text-emerald-400 font-semibold">
                              +{(revenue?.proposalFeesCredits ?? 0).toLocaleString()} cr
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-medium text-white">Cashout Processing Fees</td>
                            <td className="px-4 py-3 text-zinc-400">Flat processing fee per completed payout request</td>
                            <td className="px-4 py-3 text-right font-mono text-white font-semibold">
                              {formatPhp(revenue?.cashoutFeesPhp ?? 0)}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-medium text-white">
                              <div>Direct Top-up Purchases</div>
                              <span className="text-[10px] text-zinc-500">
                                {topupSummary?.paidCount ?? 0} paid • {(topupSummary?.totalCreditsIssued ?? 0).toLocaleString()} cr granted
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-400">Fiat payment for platform credit packages</td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-mono text-emerald-400 font-semibold">
                                {formatPhp(topupSummary?.totalPaidPhp ?? revenue?.topupRevenuePhp ?? 0)}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMetricModal('topup');
                                }}
                                className="block ml-auto mt-0.5 text-[10px] text-emerald-400 hover:underline cursor-pointer"
                              >
                                View Mechanics ↗
                              </button>
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-medium text-white">Subscription Monetization</td>
                            <td className="px-4 py-3 text-zinc-400">Paid tier renewals (Premium / Business)</td>
                            <td className="px-4 py-3 text-right font-mono text-indigo-400 font-semibold">
                              {formatPhp(
                                subAnalytics?.summary?.subscriptionPlatformEarnPhp ??
                                  revenue?.subscriptionRevenuePhp ??
                                  0
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMetricModal(null);
                        setActiveSubTab('topups');
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                    >
                      <span>View Top-Up Purchases in Ledger</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMetricModal(null);
                        setActiveSubTab('platform');
                        setSelectedType('Fee');
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 transition-colors"
                    >
                      <span>View Fee Transactions in Ledger</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Platform Wallet */}
              {activeMetricModal === 'wallet' && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                        Platform System Wallet Balance
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(String(revenue?.platformWalletBalance ?? 0), 'wallet_bal')}
                        className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white"
                      >
                        {copiedKey === 'wallet_bal' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <Check className="h-3 w-3" /> Copied
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Copy className="h-3 w-3" /> Copy Digits
                          </span>
                        )}
                      </button>
                    </div>
                    <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-white break-words">
                      {(revenue?.platformWalletBalance ?? 0).toLocaleString()} Credits
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Exact raw digits: <span className="font-mono text-white">{revenue?.platformWalletBalance ?? 0}</span> cr
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl bg-[#0c0d12] p-3">
                      <p className="text-[10px] uppercase text-zinc-500">Wallet Status</p>
                      <p className="mt-1 text-sm font-semibold capitalize text-emerald-400">
                        {revenue?.platformWalletStatus ?? 'Active'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#0c0d12] p-3">
                      <p className="text-[10px] uppercase text-zinc-500">Escrow Locked</p>
                      <p className="mt-1 text-sm font-semibold text-blue-300">
                        {(revenue?.escrowHeldCredits ?? 0).toLocaleString()} cr
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#0c0d12] p-3">
                      <p className="text-[10px] uppercase text-zinc-500">Liquid Free Reserve</p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {Math.max(
                          0,
                          (revenue?.platformWalletBalance ?? 0) - (revenue?.escrowHeldCredits ?? 0)
                        ).toLocaleString()}{' '}
                        cr
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#0c0d12] p-3">
                      <p className="text-[10px] uppercase text-zinc-500">Top-Up Credits Issued</p>
                      <p className="mt-1 text-sm font-semibold text-amber-400">
                        {(topupSummary?.totalCreditsIssued ?? 0).toLocaleString()} cr
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMetricModal(null);
                        setActiveSubTab('topups');
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                    >
                      <span>View Top-Up Purchases</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMetricModal(null);
                        setActiveSubTab('platform');
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 transition-colors"
                    >
                      <span>View Platform Wallet Transactions</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Top-up Purchases Modal */}
              {activeMetricModal === 'topup' && (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                          Total Top-Up Fiat Revenue (PHP)
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(
                              String(topupSummary?.totalPaidPhp ?? revenue?.topupRevenuePhp ?? 0),
                              'topup_php'
                            )
                          }
                          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white"
                        >
                          {copiedKey === 'topup_php' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                              <Check className="h-3 w-3" /> Copied
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Copy className="h-3 w-3" /> Copy Digits
                            </span>
                          )}
                        </button>
                      </div>
                      <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-emerald-400 break-words">
                        {formatPhp(topupSummary?.totalPaidPhp ?? revenue?.topupRevenuePhp ?? 0)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Exact raw value:{' '}
                        <span className="font-mono text-white">
                          ₱{(topupSummary?.totalPaidPhp ?? revenue?.topupRevenuePhp ?? 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                          Total Credits Issued to Users
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(
                              String(topupSummary?.totalCreditsIssued ?? 0),
                              'topup_cr'
                            )
                          }
                          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white"
                        >
                          {copiedKey === 'topup_cr' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                              <Check className="h-3 w-3" /> Copied
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Copy className="h-3 w-3" /> Copy Digits
                            </span>
                          )}
                        </button>
                      </div>
                      <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-white break-words">
                        {(topupSummary?.totalCreditsIssued ?? 0).toLocaleString()} cr
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Granted from Platform Wallet reserve balance
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-[#0c0d12] p-3">
                      <p className="text-[10px] uppercase text-zinc-500">Paid Top-Ups</p>
                      <p className="mt-1 text-lg font-bold text-emerald-400">
                        {topupSummary?.paidCount ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#0c0d12] p-3">
                      <p className="text-[10px] uppercase text-zinc-500">Total Attempts</p>
                      <p className="mt-1 text-lg font-bold text-white">
                        {topupSummary?.totalCount ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#0c0d12] p-3">
                      <p className="text-[10px] uppercase text-zinc-500">Avg Top-Up Value</p>
                      <p className="mt-1 text-lg font-bold text-zinc-300">
                        {topupSummary?.paidCount
                          ? formatPhp(
                              Math.round(
                                ((topupSummary?.totalPaidPhp ?? 0) / topupSummary.paidCount) * 100
                              ) / 100
                            )
                          : '₱0.00'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-[#0c0d12] p-3.5 text-xs text-zinc-400">
                    <p className="font-medium text-white mb-1">Financial Impact on Platform Balance & Revenue:</p>
                    <p>
                      Top-up transactions represent gross fiat revenue inflows collected through external gateways (GCash, PayMaya, Card). In return, digital credits are issued from the system's platform reserve balance to the purchasing user's wallet.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMetricModal(null);
                        setActiveSubTab('topups');
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                    >
                      <span>View Top-Up Purchases in Ledger</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMetricModal('wallet');
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 transition-colors"
                    >
                      <span>Inspect Platform Wallet Balance</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Subscription Earn or Breakdown */}
              {(activeMetricModal === 'subscription_earn' || activeMetricModal === 'subscription_breakdown') && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                        Subscription Platform Earned
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            String(
                              subAnalytics?.summary?.subscriptionPlatformEarnPhp ??
                                revenue?.subscriptionRevenuePhp ??
                                0
                            ),
                            'sub_earn'
                          )
                        }
                        className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white"
                      >
                        {copiedKey === 'sub_earn' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <Check className="h-3 w-3" /> Copied
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Copy className="h-3 w-3" /> Copy Digits
                          </span>
                        )}
                      </button>
                    </div>
                    <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-indigo-400 break-words">
                      {formatPhp(
                        subAnalytics?.summary?.subscriptionPlatformEarnPhp ??
                          revenue?.subscriptionRevenuePhp ??
                          0
                      )}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Exact raw digits:{' '}
                      <span className="font-mono text-white">
                        ₱
                        {(
                          subAnalytics?.summary?.subscriptionPlatformEarnPhp ??
                          revenue?.subscriptionRevenuePhp ??
                          0
                        ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-[#0c0d12] p-3">
                      <p className="text-[10px] uppercase text-zinc-500">Paid Subscribers</p>
                      <p className="mt-1 text-lg font-bold text-white">
                        {subAnalytics?.summary?.activePaidSubscribers ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#0c0d12] p-3">
                      <p className="text-[10px] uppercase text-zinc-500">Auto-Renewing</p>
                      <p className="mt-1 text-lg font-bold text-emerald-400">
                        {subAnalytics?.summary?.recurringMembers ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#0c0d12] p-3">
                      <p className="text-[10px] uppercase text-zinc-500">Free Members</p>
                      <p className="mt-1 text-lg font-bold text-zinc-400">
                        {subAnalytics?.summary?.freeMembers ?? 0}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                      Available Subscription Plans
                    </h4>
                    <div className="space-y-2">
                      {availablePlans.map((p) => (
                        <div
                          key={p.planId}
                          className="flex items-center justify-between rounded-xl bg-[#0c0d12] p-3 text-xs"
                        >
                          <span className="font-medium text-white">{p.name} Plan</span>
                          <span className="font-mono text-emerald-400 font-semibold">
                            {p.amountPhp > 0
                              ? `${formatPhp(p.amountPhp)} / ${p.billingPeriod.toLowerCase()}`
                              : 'Free'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMetricModal(null);
                        setActiveSubTab('subscriptions');
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-500/20 px-4 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/30 transition-colors"
                    >
                      <span>View Subscription Invoices</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMetricModal(null);
                        setActiveSubTab('subscribers');
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 transition-colors"
                    >
                      <span>View Member List</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Subscribers */}
              {activeMetricModal === 'subscribers' && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-400">
                        Paid Active Subscribers
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            String(subAnalytics?.summary?.activePaidSubscribers ?? 0),
                            'sub_count'
                          )
                        }
                        className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white"
                      >
                        {copiedKey === 'sub_count' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <Check className="h-3 w-3" /> Copied
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Copy className="h-3 w-3" /> Copy Count
                          </span>
                        )}
                      </button>
                    </div>
                    <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-white break-words">
                      {subAnalytics?.summary?.activePaidSubscribers ?? 0} Members
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Active paid subscriptions across Premium and Business plans
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-[#0c0d12] p-3">
                      <p className="text-[10px] uppercase text-zinc-500">Auto-Renewing</p>
                      <p className="mt-1 text-lg font-bold text-emerald-400">
                        {subAnalytics?.summary?.recurringMembers ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#0c0d12] p-3">
                      <p className="text-[10px] uppercase text-zinc-500">Canceling at End</p>
                      <p className="mt-1 text-lg font-bold text-amber-400">
                        {subAnalytics?.summary?.cancelingMembers ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#0c0d12] p-3">
                      <p className="text-[10px] uppercase text-zinc-500">Free / Inactive</p>
                      <p className="mt-1 text-lg font-bold text-zinc-400">
                        {subAnalytics?.summary?.freeMembers ?? 0}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMetricModal(null);
                        setActiveSubTab('subscribers');
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-purple-500/20 px-4 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/30 transition-colors"
                    >
                      <span>Open Subscription Members Directory</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Payout or Payout Breakdown */}
              {(activeMetricModal === 'payout' || activeMetricModal === 'payout_breakdown') && (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                          Total Disbursed (PHP)
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(String(payout?.totalPayoutPhp ?? 0), 'payout_php')}
                          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white"
                        >
                          {copiedKey === 'payout_php' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                              <Check className="h-3 w-3" /> Copied
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Copy className="h-3 w-3" /> Copy Digits
                            </span>
                          )}
                        </button>
                      </div>
                      <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-white break-words">
                        {formatPhp(payout?.totalPayoutPhp ?? 0)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Exact raw digits:{' '}
                        <span className="font-mono text-white">
                          ₱{(payout?.totalPayoutPhp ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </p>
                    </div>

                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                          Credits Cashed Out
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(String(payout?.totalPayoutCredits ?? 0), 'payout_cr')
                          }
                          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white"
                        >
                          {copiedKey === 'payout_cr' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                              <Check className="h-3 w-3" /> Copied
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Copy className="h-3 w-3" /> Copy Digits
                            </span>
                          )}
                        </button>
                      </div>
                      <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-white break-words">
                        {(payout?.totalPayoutCredits ?? 0).toLocaleString()} cr
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Exact raw digits: <span className="font-mono text-white">{payout?.totalPayoutCredits ?? 0}</span> credits
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="rounded-xl bg-[#0c0d12] p-3">
                      <p className="text-[10px] uppercase text-zinc-500">Succeeded</p>
                      <p className="mt-1 text-base font-bold text-emerald-400">
                        {payout?.payoutCounts?.succeeded ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#0c0d12] p-3">
                      <p className="text-[10px] uppercase text-zinc-500">Pending Review</p>
                      <p className="mt-1 text-base font-bold text-amber-400">
                        {payout?.payoutCounts?.pending ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#0c0d12] p-3">
                      <p className="text-[10px] uppercase text-zinc-500">Failed / Refunded</p>
                      <p className="mt-1 text-base font-bold text-rose-400">
                        {payout?.payoutCounts?.failed ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#0c0d12] p-3">
                      <p className="text-[10px] uppercase text-zinc-500">Average Payout</p>
                      <p className="mt-1 text-base font-bold text-white">
                        {formatPhp(payout?.averagePayoutPhp ?? 0)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMetricModal(null);
                        setActiveSubTab('cashouts');
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 transition-colors"
                    >
                      <span>Open Cashout Payouts Ledger</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Escrow */}
              {activeMetricModal === 'escrow' && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">
                        Protected Escrow Credits
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(String(revenue?.escrowHeldCredits ?? 0), 'escrow_digits')
                        }
                        className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white"
                      >
                        {copiedKey === 'escrow_digits' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <Check className="h-3 w-3" /> Copied
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Copy className="h-3 w-3" /> Copy Digits
                          </span>
                        )}
                      </button>
                    </div>
                    <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-blue-300 break-words">
                      {(revenue?.escrowHeldCredits ?? 0).toLocaleString()} Credits
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Exact raw digits: <span className="font-mono text-white">{revenue?.escrowHeldCredits ?? 0}</span> cr
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#0c0d12] p-4 text-xs text-zinc-300 space-y-2">
                    <p className="font-semibold text-white">How Milestone Escrow Works:</p>
                    <p className="text-zinc-400 leading-relaxed">
                      When a client funds a project milestone, the credits are moved from the client&apos;s wallet into
                      protected escrow. The funds remain locked until the freelancer submits work and the client approves.
                      Upon release, Ensemble automatically deducts the 10% platform fee and transfers net credits to the freelancer.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMetricModal(null);
                        setActiveSubTab('users');
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-500/20 px-4 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-500/30 transition-colors"
                    >
                      <span>View User Escrow Transactions</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
