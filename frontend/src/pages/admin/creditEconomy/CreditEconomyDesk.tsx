import { useCallback, useEffect, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Info,
  LayoutGrid,
  Lock,
  RefreshCw,
  ScrollText,
  Settings2,
  Wallet,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import useGlobalState from '@/lib/global_state';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import LedgerEntryModal from './LedgerEntryModal';
import LedgerTab from './LedgerTab';
import OverviewTab from './OverviewTab';
import WalletDetailModal from './WalletDetailModal';
import WalletsTab, { WALLET_PARAM_KEYS, writeWalletFilters } from './WalletsTab';
import { ECONOMY_ACCENT, ECONOMY_API, formatRelative } from './economyUi';
import { LEDGER_DEFAULTS, LEDGER_PARAM_KEYS, writeLedgerFilters } from './ledgerShared';

/** Every tab filter in the URL (dropped when the tab changes). */
const FILTER_PARAM_KEYS = [...new Set([...LEDGER_PARAM_KEYS, ...WALLET_PARAM_KEYS])];
import type { EconomyAlert, EconomyOverview, EconomyTab, EconomyVariant, LedgerFilters } from './creditEconomyTypes';
import ConsolePageSkeleton from '@/pages/staff/ConsolePageSkeleton';

const TABS: { id: EconomyTab; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'wallets', label: 'Wallets', icon: Wallet },
  { id: 'holds', label: 'Holds', icon: Lock },
  { id: 'ledger', label: 'Ledger', icon: ScrollText },
];

const VALID_TABS = TABS.map((t) => t.id);
/** Old links: the Audit log tab became the Ledger. */
const LEGACY_TABS: Record<string, EconomyTab> = { audit: 'ledger' };

const META: Record<EconomyVariant, { eyebrow: string; title: string; subtitle: string; fallbackUser: string }> = {
  admin: {
    eyebrow: 'Credit & economy',
    title: 'Credits & economy',
    subtitle: 'Supply, holds, staff adjustments and the full credit ledger',
    fallbackUser: 'admin',
  },
  support: {
    eyebrow: 'Support Moderator · Credits',
    title: 'Credits & wallets',
    subtitle: 'Member and team wallets, holds and adjustments · staff wallets are Admin only',
    fallbackUser: 'support',
  },
};

const ALERT_TONE: Record<EconomyAlert['severity'], { box: string; icon: typeof Info }> = {
  error: { box: 'border-red-500/30 bg-red-500/10 text-red-100', icon: AlertOctagon },
  warning: { box: 'border-amber-500/30 bg-amber-500/10 text-amber-100', icon: AlertTriangle },
  info: { box: 'border-white/10 bg-white/[0.03] text-zinc-200', icon: Info },
  success: { box: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100', icon: CheckCircle2 },
};

function readTab(value: string | null): EconomyTab {
  if (!value) return 'overview';
  if (LEGACY_TABS[value]) return LEGACY_TABS[value];
  return (VALID_TABS as string[]).includes(value) ? (value as EconomyTab) : 'overview';
}

export default function CreditEconomyDesk({ variant }: { variant: EconomyVariant }) {
  const { user } = useGlobalState();
  const navigate = useNavigate();
  const accent = ECONOMY_ACCENT[variant];
  const meta = META[variant];
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = readTab(searchParams.get('tab'));
  const openWalletId = searchParams.get('wallet');
  const openTxId = searchParams.get('tx');

  const [data, setData] = useState<EconomyOverview | null>(() => {
    const cached = peekStaffGet(ECONOMY_API.overview);
    return cached?.data?.success ? cached.data.data : null;
  });
  const [loading, setLoading] = useState(() => !data);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const res = await staffGet(ECONOMY_API.overview);
      if (res.data?.success) setData(res.data.data);
      else setError(res.data?.message || 'Failed to load economy data');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Failed to load economy data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const raw = searchParams.get('tab');
    if (raw === 'management' && variant === 'admin') {
      navigate('/admin/system-settings?tab=economy', { replace: true });
    } else if (raw && LEGACY_TABS[raw]) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', LEGACY_TABS[raw]);
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, navigate, variant]);

  /** `push` adds a history step, so Back returns to the view the jump came from. */
  const patchParams = (patch: Record<string, string | null>, push = false) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: !push }
    );
  };
  const setParam = (key: string, value: string | null) => patchParams({ [key]: value });

  /**
   * Every tab keeps its filters in the URL, so any view can be reloaded, opened with Back
   * and shared by its URL. Switching tabs drops the old tab's filters. Clicking the
   * current tab keeps them; a link with filters (an overview figure, an alert) replaces them.
   * Links from the overview add a history step so Back returns to the overview.
   */
  const switchTab = (id: EconomyTab, filters?: Record<string, string>) => {
    const sameTab = id === tab;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!sameTab || filters) FILTER_PARAM_KEYS.forEach((k) => next.delete(k));
        if (filters && id === 'ledger') writeLedgerFilters(next, filters as Partial<LedgerFilters>);
        if (filters && (id === 'wallets' || id === 'holds')) writeWalletFilters(next, filters, id);
        if (id === 'overview') next.delete('tab');
        else next.set('tab', id);
        return next;
      },
      { replace: !(filters && tab === 'overview') }
    );
  };

  /** Ledger with exactly these filters, from a modal; closes the modals. */
  const openLedger = (filters: Partial<LedgerFilters>) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        FILTER_PARAM_KEYS.forEach((k) => next.delete(k));
        next.delete('wallet');
        next.delete('tx');
        next.set('tab', 'ledger');
        writeLedgerFilters(next, { ...LEDGER_DEFAULTS, ...filters });
        return next;
      },
      { replace: false }
    );
  };


  const refreshAll = () => {
    void load();
    setRefreshToken((n) => n + 1);
  };

  const openWallet = (walletId: string) => patchParams({ wallet: walletId, tx: null }, Boolean(openTxId));
  const openTransaction = (transactionId: string) => patchParams({ tx: transactionId }, !openTxId);

  if (loading && !data) {
    return (
      <ConsolePageSkeleton />
    );
  }

  if (!data) {
    return (
      <main className="p-8 md:pl-[284px]">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          {error || 'Failed to load economy data'}
          <button type="button" onClick={() => void load()} className="mt-4 block text-sm underline">
            Retry
          </button>
        </div>
      </main>
    );
  }

  const tabCounts: Partial<Record<EconomyTab, number>> = {
    wallets: data.supply.walletCount,
    holds: data.supply.holds.wallets,
  };
  // Alerts live on the Overview; other tabs only show how many need a look.
  const attention = data.alerts.filter((a) => a.severity === 'error' || a.severity === 'warning').length;

  return (
    <main className="min-h-screen md:pl-[260px]">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-6 py-4 md:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${accent.label}`}>{meta.eyebrow}</p>
            <h1 className="text-xl font-bold text-white">{meta.title}</h1>
            <p className="mt-1 text-xs text-zinc-500">
              {meta.subtitle} · @{user?.username || meta.fallbackUser} · updated {formatRelative(data.lastUpdated)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data.viewer.canOpenSettings && (
              <>
                <Link
                  to="/admin/analytics?tab=money"
                  className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-zinc-300 hover:text-white"
                >
                  <BarChart3 className="h-4 w-4" /> Revenue & payouts
                </Link>
                <Link
                  to="/admin/system-settings?tab=economy"
                  className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-zinc-300 hover:text-white"
                >
                  <Settings2 className="h-4 w-4" /> Economy settings
                </Link>
              </>
            )}
            <button
              type="button"
              onClick={refreshAll}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-zinc-300 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto px-4 md:px-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                tab === id ? accent.tab : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {id === 'overview' && attention > 0 && tab !== 'overview' && (
                <span className="rounded-full bg-amber-500/15 px-1.5 text-[10px] text-amber-200" title="Alerts on the Overview">
                  {attention}
                </span>
              )}
              {tabCounts[id] != null && (
                <span className={`rounded-full px-1.5 text-[10px] ${id === 'holds' && tabCounts[id] ? 'bg-amber-500/15 text-amber-200' : 'bg-white/[0.06] text-zinc-400'}`}>
                  {tabCounts[id]!.toLocaleString()}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
        {error && (
          <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-100">
            Showing the last loaded data: {error}
          </p>
        )}

        {tab === 'overview' && (
          <div className="grid gap-2 md:grid-cols-2">
            {data.alerts.map((a) => {
              const tone = ALERT_TONE[a.severity];
              const Icon = tone.icon;
              const body = (
                <>
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{a.title}</span>
                    <span className="block text-xs opacity-75">{a.detail}</span>
                  </span>
                  {a.action && <span className="ml-auto shrink-0 self-center text-xs opacity-75">Show →</span>}
                </>
              );
              return a.action ? (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => switchTab(a.action!.tab, a.action!.filters)}
                  className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition hover:brightness-125 ${tone.box}`}
                >
                  {body}
                </button>
              ) : (
                <div key={a.id} className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 ${tone.box}`}>
                  {body}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'overview' && (
          <OverviewTab
            data={data}
            variant={variant}
            onOpenTab={switchTab}
            onOpenWallet={openWallet}
            onOpenTransaction={openTransaction}
          />
        )}
        {(tab === 'wallets' || tab === 'holds') && (
          <WalletsTab
            key={tab}
            variant={variant}
            viewer={data.viewer}
            mode={tab}
            statuses={data.facets.accountStatuses}
            refreshToken={refreshToken}
            onView={(w) => openWallet(w.walletId)}
            onChanged={() => void load()}
          />
        )}
        {tab === 'ledger' && (
          <LedgerTab variant={variant} refreshToken={refreshToken} onOpenWallet={openWallet} onOpenTransaction={openTransaction} />
        )}
      </div>

      {openWalletId && (
        <WalletDetailModal
          key={openWalletId}
          walletId={openWalletId}
          variant={variant}
          onClose={() => setParam('wallet', null)}
          onChanged={refreshAll}
          onOpenWallet={openWallet}
          onOpenTransaction={openTransaction}
          onShowInLedger={openLedger}
          escapeDisabled={Boolean(openTxId)}
        />
      )}
      {openTxId && (
        <LedgerEntryModal
          transactionId={openTxId}
          variant={variant}
          onClose={() => setParam('tx', null)}
          onNavigate={(id) => setParam('tx', id)}
          onOpenWallet={openWallet}
          onShowInLedger={openLedger}
        />
      )}
    </main>
  );
}
