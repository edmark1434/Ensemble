import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  BadgeDollarSign,
  CheckCircle2,
  Coins,
  Eye,
  LayoutGrid,
  Loader2,
  Package,
  Percent,
  RefreshCw,
  ScrollText,
  Settings2,
  Store,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '@/lib/axios';
import useGlobalState from '@/lib/global_state';
import AuditTab from './AuditTab';
import WalletDetailModal from './WalletDetailModal';
import WalletsTab from './WalletsTab';
import type {
  AuditEntry,
  EconomyOverview,
  EconomyWallet,
} from './creditEconomyTypes';

type TabId = 'overview' | 'wallets' | 'audit' | 'management';

const TABS: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'wallets', label: 'Wallets', icon: Wallet },
  { id: 'audit', label: 'Audit log', icon: ScrollText },
  { id: 'management', label: 'Management', icon: Settings2 },
];

type ManagementSection = 'packages' | 'fees' | 'marketplace';

const MANAGEMENT_SECTIONS: { id: ManagementSection; label: string; icon: typeof Package }[] = [
  { id: 'packages', label: 'Credit packages', icon: Package },
  { id: 'fees', label: 'Fees', icon: Percent },
  { id: 'marketplace', label: 'Marketplace', icon: Store },
];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatAmount(n: number) {
  const prefix = n >= 0 ? '+' : '';
  return `${prefix}${n.toLocaleString()}`;
}

export default function CreditEconomyPage() {
  const { user } = useGlobalState();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTab = searchParams.get('tab') as TabId | null;
  const validTabs: TabId[] = ['overview', 'wallets', 'audit', 'management'];
  const initialTab = paramTab && validTabs.includes(paramTab) ? paramTab : 'overview';

  const [data, setData] = useState<EconomyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabId>(initialTab);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<EconomyWallet | null>(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await api.get('/api/admin/economy-overview');
      if (res.data?.success) setData(res.data.data);
      else setError('Failed to load economy data');
    } catch {
      setError('Failed to load economy data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (paramTab && validTabs.includes(paramTab)) setTab(paramTab);
  }, [paramTab]);

  const switchTab = (id: TabId) => {
    setTab(id);
    setSearchParams(id === 'overview' ? {} : { tab: id }, { replace: true });
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center md:pl-[260px]">
        <Loader2 className="h-10 w-10 animate-spin text-rose-400" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="p-8 md:pl-[284px]">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          {error}
          <button type="button" onClick={() => void load()} className="mt-4 block text-sm underline">
            Retry
          </button>
        </div>
      </main>
    );
  }

  const { summary, alerts, topBuyers, creditPackages, feeSettings, marketplaceSettings } = data;

  return (
    <main className="min-h-screen md:pl-[260px]">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between md:px-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400/80">
              Credit & economy
            </p>
            <h1 className="text-xl font-bold text-white">Credits & economy management</h1>
            <p className="mt-1 text-xs text-zinc-500">
              {summary.activeWallets} active wallets · {summary.totalMeritPoints.toLocaleString()} merit in system · @
              {user?.username || 'admin'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-zinc-300 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto px-4 pb-0 md:px-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                tab === id
                  ? 'border-rose-400 text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
        <div className="flex flex-wrap gap-2">
          {alerts.map((a) => (
            <span
              key={a.id}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
                a.severity === 'warning'
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                  : a.severity === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                    : 'border-white/10 bg-white/[0.03] text-zinc-300'
              }`}
            >
              {a.severity === 'success' ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              {a.message}
            </span>
          ))}
        </div>

        {tab === 'overview' && (
          <OverviewTab
            allWallets={data.wallets}
            previewWallets={data.wallets.slice(0, 6)}
            previewAudit={data.auditLog.slice(0, 8)}
            onViewWallet={setSelectedWallet}
            topBuyers={topBuyers}
            summary={summary}
          />
        )}

        {tab === 'wallets' && (
          <WalletsTab
            wallets={data.wallets}
            onView={setSelectedWallet}
            onChanged={() => void load(true)}
          />
        )}

        {tab === 'audit' && (
          <AuditTab
            entries={data.auditLog}
            onViewWallet={(walletId) => {
              const w = data.wallets.find((x) => x.walletId === walletId);
              if (w) setSelectedWallet(w);
            }}
          />
        )}

        {tab === 'management' && (
          <ManagementTab
            creditPackages={creditPackages}
            feeSettings={feeSettings}
            marketplaceSettings={marketplaceSettings}
          />
        )}
      </div>

      {selectedWallet && (
        <WalletDetailModal wallet={selectedWallet} onClose={() => setSelectedWallet(null)} />
      )}
    </main>
  );
}

function OverviewTab({
  summary,
  allWallets,
  previewWallets,
  previewAudit,
  topBuyers,
  onViewWallet,
}: {
  summary: EconomyOverview['summary'];
  allWallets: EconomyWallet[];
  previewWallets: EconomyWallet[];
  previewAudit: AuditEntry[];
  topBuyers: EconomyOverview['topBuyers'];
  onViewWallet: (w: EconomyWallet) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Transactions</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex justify-between text-zinc-400">
                <span>Completed</span>
                <span className="font-bold text-white">{summary.completedTransactions}</span>
              </li>
              <li className="flex justify-between text-zinc-400">
                <span>Cancelled</span>
                <span className="font-bold text-white">{summary.cancelledTransactions}</span>
              </li>
              <li className="flex justify-between text-zinc-400">
                <span>Pending</span>
                <span className="font-bold text-amber-300">{summary.pendingTransactions}</span>
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
            <div className="flex items-start justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Total credits</p>
              <Coins className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums text-white">
              {summary.totalCreditsInCirculation.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Avg wallet {summary.averageWalletBalance.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
            <div className="flex items-start justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Total revenue</p>
              <TrendingUp className="h-5 w-5 text-rose-400" />
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums text-white">
              {summary.totalRevenue.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{summary.frozenWallets} frozen wallet(s)</p>
          </div>
        </div>

        <WalletsPreview wallets={previewWallets} onView={onViewWallet} />
        <AuditPreview
          entries={previewAudit}
          onViewWallet={(walletId) => {
            const w = allWallets.find((x) => x.walletId === walletId);
            if (w) onViewWallet(w);
          }}
        />
      </div>

      <div className="space-y-4">
        <Panel title="Top 10 credit buyers">
          <ul className="space-y-3">
            {topBuyers.map((b) => (
              <li key={b.rank} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-rose-500/30 to-violet-500/20 text-sm font-bold text-white">
                  {b.initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{b.name}</p>
                  <p className="text-xs text-zinc-500">@{b.username}</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-semibold tabular-nums text-emerald-300">{b.totalSpent.toLocaleString()}</p>
                  <p className="text-zinc-600">spent</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">{title}</h3>
      {children}
    </section>
  );
}

function WalletsPreview({
  wallets,
  onView,
}: {
  wallets: EconomyWallet[];
  onView: (w: EconomyWallet) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Users wallet</h2>
        <p className="text-xs text-zinc-500">Platform balances — open the Wallets tab for search and bulk actions</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Account type</th>
              <th className="px-4 py-3 text-right">Total credits</th>
              <th className="px-4 py-3 text-right">Total assets</th>
              <th className="px-4 py-3 text-right">Merit</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {wallets.map((w) => (
              <tr key={w.walletId} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{w.name}</p>
                  <p className="text-[10px] text-zinc-600">{w.walletId}</p>
                </td>
                <td className="px-4 py-3 text-zinc-400">{w.accountType}</td>
                <td className="px-4 py-3 text-right tabular-nums text-emerald-300/90">
                  {w.totalCredits.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{w.totalAssets}</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-400">{w.meritScore}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => onView(w)}
                    className="inline-flex rounded-lg p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                    title="View wallet"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {wallets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                  No wallets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AuditPreview({
  entries,
  onViewWallet,
}: {
  entries: AuditEntry[];
  onViewWallet: (walletId: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Audit log</h2>
        <p className="text-xs text-zinc-500">Recent credit movements — open Audit log for full filters</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Account type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Credit amount</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((a) => (
              <tr key={a.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{a.name}</p>
                  <p className="text-[10px] text-zinc-600">@{a.username}</p>
                </td>
                <td className="px-4 py-3 text-zinc-400">{a.accountType}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      a.transactionStatus === 'Pending'
                        ? 'bg-amber-500/15 text-amber-200'
                        : a.transactionStatus === 'Cancelled'
                          ? 'bg-zinc-500/15 text-zinc-400'
                          : a.status === 'Deducted'
                            ? 'bg-red-500/15 text-red-300'
                            : 'bg-emerald-500/15 text-emerald-300'
                    }`}
                  >
                    {a.status}
                  </span>
                </td>
                <td
                  className={`px-4 py-3 text-right font-medium tabular-nums ${
                    a.creditAmount >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {formatAmount(a.creditAmount)}
                </td>
                <td className="px-4 py-3 text-zinc-400">{a.type}</td>
                <td className="px-4 py-3 text-xs text-zinc-500">{formatDateTime(a.timestamp)}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => onViewWallet(a.walletId)}
                    className="inline-flex rounded-lg p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ManagementTab({
  creditPackages,
  feeSettings,
  marketplaceSettings,
}: {
  creditPackages: EconomyOverview['creditPackages'];
  feeSettings: EconomyOverview['feeSettings'];
  marketplaceSettings: EconomyOverview['marketplaceSettings'];
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramSection = searchParams.get('section') as ManagementSection | null;
  const validSections = MANAGEMENT_SECTIONS.map((s) => s.id);
  const initialSection =
    paramSection && validSections.includes(paramSection) ? paramSection : 'packages';
  const [section, setSection] = useState<ManagementSection>(initialSection);

  useEffect(() => {
    if (paramSection && validSections.includes(paramSection)) setSection(paramSection);
  }, [paramSection]);

  const switchSection = (id: ManagementSection) => {
    setSection(id);
    setSearchParams({ tab: 'management', section: id }, { replace: true });
  };

  const sectionMeta: Record<ManagementSection, { title: string; description: string }> = {
    packages: {
      title: 'Credit packages',
      description: 'Live shop packages. Edit them in System Settings → Economy.',
    },
    fees: {
      title: 'Fee schedule',
      description: 'Platform fees on purchases and services. Edit in System Settings → Economy.',
    },
    marketplace: {
      title: 'Marketplace rules',
      description: 'Listing, escrow, payout, and refund rules. Edit in System Settings → Economy.',
    },
  };

  const activePackages = creditPackages.filter((p) => p.active).length;

  return (
    <div className="space-y-6">
      <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-white/[0.08] bg-[#14151c] p-1.5">
        {MANAGEMENT_SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchSection(id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
              section === id
                ? 'bg-rose-500/15 text-white shadow-[inset_0_0_0_1px_rgba(244,63,94,0.35)]'
                : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            <Icon className={`h-4 w-4 ${section === id ? 'text-rose-400' : ''}`} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">{sectionMeta[section].title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{sectionMeta[section].description}</p>
        </div>
        <Link
          to="/admin/system-settings?tab=economy"
          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500"
        >
          <Settings2 className="h-4 w-4" />
          Edit in Settings
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-4">
          {section === 'packages' && (
            <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
              <div className="border-b border-white/[0.06] px-5 py-3 text-xs text-zinc-500">
                {activePackages} of {creditPackages.length} packages active
              </div>
              <div className="grid gap-px bg-white/[0.04] sm:grid-cols-2 xl:grid-cols-3">
                {creditPackages.map((p) => (
                  <div key={p.id} className="flex flex-col gap-3 bg-[#14151c] p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10">
                          <Package className="h-4 w-4 text-rose-400" />
                        </div>
                        <p className="font-semibold text-white">{p.name}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          p.active
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-zinc-500/15 text-zinc-400'
                        }`}
                      >
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold tabular-nums text-white">
                        {p.credits.toLocaleString()}
                      </p>
                      <p className="text-xs text-zinc-500">credits</p>
                    </div>
                    <p className="mt-auto text-xs text-zinc-500">
                      {p.pricePhp.toLocaleString()} PHP · {p.salesCount} sold
                    </p>
                  </div>
                ))}
                {creditPackages.length === 0 && (
                  <p className="col-span-full bg-[#14151c] p-8 text-center text-sm text-zinc-500">
                    No packages configured yet.
                  </p>
                )}
              </div>
            </section>
          )}

          {section === 'fees' && (
            <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] uppercase tracking-wide text-zinc-500">
                    <th className="px-5 py-3">Fee</th>
                    <th className="px-5 py-3 text-right">Rate</th>
                    <th className="px-5 py-3 text-right">Flat fee</th>
                    <th className="px-5 py-3">Applies to</th>
                  </tr>
                </thead>
                <tbody>
                  {feeSettings.map((f) => (
                    <tr key={f.id} className="border-b border-white/[0.04]">
                      <td className="px-5 py-3.5 font-medium text-white">{f.label}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-rose-300">{f.percent}%</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-zinc-300">{f.flatFee}</td>
                      <td className="px-5 py-3.5 text-zinc-400">{f.appliesTo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {section === 'marketplace' && (
            <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {(
                  [
                    ['listingFeeCredits', 'Listing fee', 'credits'],
                    ['transactionFeePercent', 'Transaction fee', '%'],
                    ['escrowHoldDays', 'Escrow hold period', 'days'],
                    ['minPayoutCredits', 'Minimum payout', 'credits'],
                    ['refundWindowDays', 'Refund window', 'days'],
                  ] as const
                ).map(([key, label, unit]) => (
                  <div key={key} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">{label}</p>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <p className="text-2xl font-bold tabular-nums text-white">
                        {marketplaceSettings[key].toLocaleString()}
                      </p>
                      <span className="shrink-0 text-xs text-zinc-500">{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-5 flex items-center gap-2 border-t border-white/[0.06] pt-5 text-xs text-zinc-500">
                <BadgeDollarSign className="h-4 w-4 text-rose-400" />
                These values apply to new listings and transactions after you save them in Settings.
              </p>
            </section>
          )}
        </div>

        <Panel title="Single editor">
          <p className="text-xs leading-relaxed text-zinc-500">
            This page is a status view. Change packages, fees, and marketplace rules in{' '}
            <strong className="font-medium text-zinc-400">System Settings → Economy</strong>{' '}
            (<code className="text-zinc-400">economy.*</code>). Refresh here after saving.
          </p>
          <Link
            to="/admin/system-settings?tab=economy"
            className="mt-3 inline-flex text-xs font-medium text-rose-400 hover:underline"
          >
            Open Settings → Economy
          </Link>
        </Panel>
      </div>
    </div>
  );
}
