import { useCallback, useEffect, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Info,
  LayoutGrid,
  Loader2,
  Lock,
  RefreshCw,
  ScrollText,
  Settings2,
  Wallet,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import useGlobalState from '@/lib/global_state';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import LedgerTab from './LedgerTab';
import OverviewTab from './OverviewTab';
import WalletDetailModal from './WalletDetailModal';
import WalletsTab from './WalletsTab';
import { ECONOMY_ACCENT, ECONOMY_API, formatRelative } from './economyUi';
import type { EconomyAlert, EconomyOverview, EconomyTab, EconomyVariant } from './creditEconomyTypes';

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

  const [data, setData] = useState<EconomyOverview | null>(() => {
    const cached = peekStaffGet(ECONOMY_API.overview);
    return cached?.data?.success ? cached.data.data : null;
  });
  const [loading, setLoading] = useState(() => !data);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [presets, setPresets] = useState<Partial<Record<EconomyTab, Record<string, string>>>>({});

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

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const switchTab = (id: EconomyTab, filters?: Record<string, string>) => {
    setPresets((prev) => ({ ...prev, [id]: filters ? { ...filters } : prev[id] }));
    setParam('tab', id === 'overview' ? null : id);
  };

  const refreshAll = () => {
    void load();
    setRefreshToken((n) => n + 1);
  };

  const openWallet = (walletId: string) => setParam('wallet', walletId);

  if (loading && !data) {
    return (
      <main className="flex min-h-screen items-center justify-center md:pl-[260px]">
        <Loader2 className={`h-10 w-10 animate-spin ${accent.spinner}`} />
      </main>
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
  const actionable = data.alerts.filter((a) => a.severity !== 'success');

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
                  to="/admin/analytics?tab=finance"
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

        {(tab === 'overview' || actionable.length > 0) && (
          <div className="grid gap-2 md:grid-cols-2">
            {(tab === 'overview' ? data.alerts : actionable).map((a) => {
              const tone = ALERT_TONE[a.severity];
              const Icon = tone.icon;
              const body = (
                <>
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{a.title}</span>
                    <span className="block text-xs opacity-75">{a.detail}</span>
                  </span>
                  {a.action && <span className="ml-auto shrink-0 self-center text-xs opacity-75">Review →</span>}
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
          <OverviewTab data={data} variant={variant} onOpenTab={switchTab} onOpenWallet={openWallet} />
        )}
        {(tab === 'wallets' || tab === 'holds') && (
          <WalletsTab
            key={tab}
            variant={variant}
            viewer={data.viewer}
            mode={tab}
            preset={presets[tab]}
            statuses={data.facets.accountStatuses}
            refreshToken={refreshToken}
            onView={(w) => openWallet(w.walletId)}
            onChanged={() => void load()}
          />
        )}
        {tab === 'ledger' && (
          <LedgerTab variant={variant} preset={presets.ledger} refreshToken={refreshToken} onOpenWallet={openWallet} />
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
        />
      )}
    </main>
  );
}
