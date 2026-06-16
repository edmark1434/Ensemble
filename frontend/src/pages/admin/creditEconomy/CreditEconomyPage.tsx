import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
  Search,
  Settings2,
  Store,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '@/lib/axios';
import useGlobalState from '@/lib/global_state';
import WalletDetailModal from './WalletDetailModal';
import type { AuditEntry, EconomyOverview, EconomyWallet } from './creditEconomyTypes';

type TabId = 'overview' | 'wallets' | 'audit' | 'settings';

const TABS: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'wallets', label: 'Wallets', icon: Wallet },
  { id: 'audit', label: 'Audit log', icon: ScrollText },
  { id: 'settings', label: 'Packages & fees', icon: Settings2 },
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
  const validTabs: TabId[] = ['overview', 'wallets', 'audit', 'settings'];
  const initialTab = paramTab && validTabs.includes(paramTab) ? paramTab : 'overview';

  const [data, setData] = useState<EconomyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabId>(initialTab);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<EconomyWallet | null>(null);
  const [managementPanel, setManagementPanel] = useState<'packages' | 'fees' | 'marketplace' | null>(null);

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
    setManagementPanel(null);
  };

  const q = search.trim().toLowerCase();

  const filteredWallets = useMemo(() => {
    if (!data) return [];
    if (!q) return data.wallets;
    return data.wallets.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.email.toLowerCase().includes(q) ||
        w.username.toLowerCase().includes(q) ||
        w.walletId.toLowerCase().includes(q)
    );
  }, [data, q]);

  const filteredAudit = useMemo(() => {
    if (!data) return [];
    if (!q) return data.auditLog;
    return data.auditLog.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.username.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q)
    );
  }, [data, q]);

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
            <div className="relative min-w-[200px] flex-1 lg:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search wallets, users, transactions…"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/15"
              />
            </div>
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
            filteredWallets={filteredWallets}
            filteredAudit={filteredAudit.slice(0, 8)}
            managementPanel={managementPanel}
            setManagementPanel={setManagementPanel}
            onViewWallet={setSelectedWallet}
            creditPackages={creditPackages}
            feeSettings={feeSettings}
            marketplaceSettings={marketplaceSettings}
            topBuyers={topBuyers}
            summary={summary}
          />
        )}

        {tab === 'wallets' && (
          <WalletsTable wallets={filteredWallets} onView={setSelectedWallet} full />
        )}

        {tab === 'audit' && (
          <AuditTable entries={filteredAudit} onViewWallet={(walletId) => {
            const w = data.wallets.find((x) => x.walletId === walletId);
            if (w) setSelectedWallet(w);
          }} full />
        )}

        {tab === 'settings' && (
          <SettingsTab
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
  filteredWallets,
  filteredAudit,
  topBuyers,
  onViewWallet,
  managementPanel,
  setManagementPanel,
  creditPackages,
  feeSettings,
  marketplaceSettings,
}: {
  summary: EconomyOverview['summary'];
  allWallets: EconomyWallet[];
  filteredWallets: EconomyWallet[];
  filteredAudit: AuditEntry[];
  topBuyers: EconomyOverview['topBuyers'];
  onViewWallet: (w: EconomyWallet) => void;
  managementPanel: 'packages' | 'fees' | 'marketplace' | null;
  setManagementPanel: (p: 'packages' | 'fees' | 'marketplace' | null) => void;
  creditPackages: EconomyOverview['creditPackages'];
  feeSettings: EconomyOverview['feeSettings'];
  marketplaceSettings: EconomyOverview['marketplaceSettings'];
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
              ₱{summary.totalRevenue.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{summary.frozenWallets} frozen wallet(s)</p>
          </div>
        </div>

        <WalletsTable wallets={filteredWallets.slice(0, 6)} onView={onViewWallet} />
        <AuditTable
          entries={filteredAudit}
          onViewWallet={(walletId) => {
            const w = allWallets.find((x) => x.walletId === walletId);
            if (w) onViewWallet(w);
          }}
        />
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <MgmtButton
            icon={Package}
            label="Credit package management"
            active={managementPanel === 'packages'}
            onClick={() => setManagementPanel(managementPanel === 'packages' ? null : 'packages')}
          />
          <MgmtButton
            icon={Percent}
            label="Fee management"
            active={managementPanel === 'fees'}
            onClick={() => setManagementPanel(managementPanel === 'fees' ? null : 'fees')}
          />
          <MgmtButton
            icon={Store}
            label="Marketplace management"
            active={managementPanel === 'marketplace'}
            onClick={() => setManagementPanel(managementPanel === 'marketplace' ? null : 'marketplace')}
          />
        </div>

        {managementPanel === 'packages' && (
          <Panel title="Credit packages">
            <ul className="space-y-2 text-sm">
              {creditPackages.map((p) => (
                <li key={p.id} className="rounded-lg bg-white/[0.03] px-3 py-2">
                  <p className="font-medium text-white">{p.name}</p>
                  <p className="text-xs text-zinc-500">
                    {p.credits.toLocaleString()} credits · ₱{p.pricePhp} · {p.salesCount} sales
                    {!p.active && ' · Inactive'}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        {managementPanel === 'fees' && (
          <Panel title="Platform fees">
            <ul className="space-y-2 text-sm">
              {feeSettings.map((f) => (
                <li key={f.id} className="rounded-lg bg-white/[0.03] px-3 py-2">
                  <p className="font-medium text-white">{f.label}</p>
                  <p className="text-xs text-zinc-500">
                    {f.percent}% + ₱{f.flatFee} · {f.appliesTo}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        {managementPanel === 'marketplace' && (
          <Panel title="Marketplace rules">
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Listing fee</dt>
                <dd className="text-white">{marketplaceSettings.listingFeeCredits} credits</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Transaction fee</dt>
                <dd className="text-white">{marketplaceSettings.transactionFeePercent}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Escrow hold</dt>
                <dd className="text-white">{marketplaceSettings.escrowHoldDays} days</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Min payout</dt>
                <dd className="text-white">{marketplaceSettings.minPayoutCredits} credits</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Refund window</dt>
                <dd className="text-white">{marketplaceSettings.refundWindowDays} days</dd>
              </div>
            </dl>
          </Panel>
        )}

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

function MgmtButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Package;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition ${
        active
          ? 'border-rose-500/40 bg-rose-500/10 text-white'
          : 'border-white/[0.08] bg-[#14151c] text-zinc-300 hover:border-white/15 hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0 text-rose-400" />
      {label}
    </button>
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

function WalletsTable({
  wallets,
  onView,
  full,
}: {
  wallets: EconomyWallet[];
  onView: (w: EconomyWallet) => void;
  full?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Users wallet</h2>
        {!full && <p className="text-xs text-zinc-500">Platform balances — tap view for transaction history</p>}
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

function AuditTable({
  entries,
  onViewWallet,
  full,
}: {
  entries: AuditEntry[];
  onViewWallet: (walletId: string) => void;
  full?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Audit log</h2>
        {!full && <p className="text-xs text-zinc-500">Recent credit movements across the platform</p>}
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

function SettingsTab({
  creditPackages,
  feeSettings,
  marketplaceSettings,
}: {
  creditPackages: EconomyOverview['creditPackages'];
  feeSettings: EconomyOverview['feeSettings'];
  marketplaceSettings: EconomyOverview['marketplaceSettings'];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-rose-400" />
          <h2 className="font-semibold text-white">Credit packages</h2>
        </div>
        <p className="mb-4 text-xs text-zinc-500">Configure purchasable credit bundles for the platform shop.</p>
        <div className="space-y-3">
          {creditPackages.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
            >
              <div>
                <p className="font-medium text-white">{p.name}</p>
                <p className="text-xs text-zinc-500">
                  {p.credits.toLocaleString()} credits · ₱{p.pricePhp.toLocaleString()} · {p.salesCount} sold
                </p>
              </div>
              <div className="flex gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    p.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-500/15 text-zinc-400'
                  }`}
                >
                  {p.active ? 'Active' : 'Inactive'}
                </span>
                <button type="button" className="rounded-lg border border-white/10 px-3 py-1 text-xs text-zinc-300">
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="mt-4 w-full rounded-xl border border-dashed border-white/15 py-2.5 text-sm text-zinc-400">
          + Add package
        </button>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Percent className="h-5 w-5 text-rose-400" />
          <h2 className="font-semibold text-white">Fee management</h2>
        </div>
        <ul className="space-y-3">
          {feeSettings.map((f) => (
            <li key={f.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <p className="font-medium text-white">{f.label}</p>
              <p className="mt-1 text-sm text-zinc-400">
                {f.percent}% platform fee · ₱{f.flatFee} flat · Applies to: {f.appliesTo}
              </p>
              <button type="button" className="mt-2 text-xs text-rose-400 underline">
                Adjust rate
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5 lg:col-span-2">
        <div className="mb-4 flex items-center gap-2">
          <BadgeDollarSign className="h-5 w-5 text-rose-400" />
          <h2 className="font-semibold text-white">Marketplace economy rules</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Listing fee', `${marketplaceSettings.listingFeeCredits} credits`],
            ['Transaction fee', `${marketplaceSettings.transactionFeePercent}%`],
            ['Escrow hold period', `${marketplaceSettings.escrowHoldDays} days`],
            ['Minimum payout', `${marketplaceSettings.minPayoutCredits} credits`],
            ['Refund window', `${marketplaceSettings.refundWindowDays} days`],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl bg-white/[0.03] p-4">
              <p className="text-[10px] uppercase text-zinc-600">{label}</p>
              <p className="mt-1 font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
        <button type="button" className="mt-4 rounded-xl bg-rose-500/90 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-500">
          Save marketplace settings
        </button>
      </section>
    </div>
  );
}
