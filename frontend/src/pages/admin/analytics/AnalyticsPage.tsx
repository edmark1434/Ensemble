import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Banknote,
  LayoutGrid,
  Loader2,
  MessageSquare,
  RefreshCw,
  Shield,
  Star,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '@/lib/axios';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import { useStaffLive } from '@/lib/staffLive';
import { prefetchStaffRoute } from '@/lib/staffPrefetch';
import { showErrorToast } from '@/components/utility/toast.ts';
import ConsolePageSkeleton from '@/pages/staff/ConsolePageSkeleton';
import { formatRelative } from '../creditEconomy/economyUi';
import { AdminFeedbacksPanel } from '../feedbacks/AdminFeedbacksPage';
import type { Bucket, LedgerKind, PlatformAnalytics, RangeKey } from './analyticsTypes';
import { fmtDay } from './analyticsFormat';
import { Notice } from './analyticsUi';
import type { GlossaryId } from './analyticsGlossary';
import { DefinitionsButton, DefinitionsDrawer, GlossaryProvider } from './analyticsInfo';
import AnalyticsRangePicker, { type RangeSelection } from './components/AnalyticsRangePicker';
import OverviewTab from './components/OverviewTab';
import MembersTab from './components/MembersTab';
import CommunityTab from './components/CommunityTab';
import MoneyTab from './components/MoneyTab';
import OperationsTab from './components/OperationsTab';
import RateLimitMonitorPanel from './components/RateLimitMonitorPanel';

type TabId = 'overview' | 'members' | 'community' | 'money' | 'operations' | 'traffic' | 'feedback';

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'community', label: 'Community', icon: MessageSquare },
  { id: 'money', label: 'Revenue & credits', icon: Banknote },
  { id: 'operations', label: 'Operations', icon: Shield },
  { id: 'traffic', label: 'Traffic & rate limits', icon: Activity },
  { id: 'feedback', label: 'Feedback', icon: Star },
];

/** Old `?tab=` values from before the redesign, so saved links still land somewhere sensible. */
const LEGACY_TABS: Record<string, TabId> = {
  growth: 'members',
  economy: 'money',
  finance: 'money',
  health: 'operations',
};

// Tabs that load their own data instead of the analytics overview.
const STANDALONE_TABS: TabId[] = ['traffic', 'feedback'];
const ANALYTICS_URL = '/api/admin/analytics-overview';
const RANGE_KEYS: RangeKey[] = ['7d', '30d', '90d', '12m', 'ytd', 'all', 'custom'];
const BUCKETS: Bucket[] = ['day', 'week', 'month'];
const LEDGER_KINDS: LedgerKind[] = ['topups', 'invoices', 'subscriptions', 'cashouts'];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function resolveTab(raw: string | null): TabId {
  if (!raw) return 'overview';
  if (TABS.some((t) => t.id === raw)) return raw as TabId;
  return LEGACY_TABS[raw] || 'overview';
}

function readSelection(params: URLSearchParams): RangeSelection {
  const raw = params.get('range') as RangeKey | null;
  const selection: RangeSelection = { range: raw && RANGE_KEYS.includes(raw) ? raw : '30d' };
  if (selection.range === 'custom') {
    const from = params.get('from') || '';
    const to = params.get('to') || '';
    if (ISO_DAY.test(from) && ISO_DAY.test(to)) {
      selection.from = from;
      selection.to = to;
    } else {
      selection.range = '30d';
    }
  }
  const bucket = params.get('bucket') as Bucket | null;
  if (bucket && BUCKETS.includes(bucket)) selection.bucket = bucket;
  return selection;
}

/** The default (30 days, automatic interval) sends no params so it matches the route prefetch. */
function requestParamsOf(selection: RangeSelection): Record<string, string> | undefined {
  const params: Record<string, string> = {};
  if (selection.range !== '30d') params.range = selection.range;
  if (selection.range === 'custom') {
    params.from = selection.from || '';
    params.to = selection.to || '';
  }
  if (selection.bucket) params.bucket = selection.bucket;
  return Object.keys(params).length ? params : undefined;
}

function errorMessage(err: unknown, fallback: string) {
  const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof message === 'string' && message ? message : fallback;
}

export default function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = resolveTab(searchParams.get('tab'));
  const standalone = STANDALONE_TABS.includes(tab);
  const selection = useMemo(() => readSelection(searchParams), [searchParams]);
  const requestParams = useMemo(() => requestParamsOf(selection), [selection]);
  const requestKey = JSON.stringify(requestParams ?? {});
  const ledgerParam = searchParams.get('ledger') as LedgerKind | null;
  const ledgerKind: LedgerKind = ledgerParam && LEDGER_KINDS.includes(ledgerParam) ? ledgerParam : 'topups';

  const [loaded, setLoaded] = useState<{ key: string; data: PlatformAnalytics } | null>(() => {
    const cached = peekStaffGet(ANALYTICS_URL, requestParams);
    return cached?.data?.success ? { key: requestKey, data: cached.data.data } : null;
  });
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [definitions, setDefinitions] = useState<{ open: boolean; focus: GlossaryId | null }>({ open: false, focus: null });
  const glossary = useMemo(() => ({ open: (focus?: GlossaryId) => setDefinitions({ open: true, focus: focus ?? null }) }), []);
  const closeDefinitions = useCallback(() => setDefinitions({ open: false, focus: null }), []);

  useEffect(() => {
    if (standalone) return;
    let cancelled = false;
    staffGet(ANALYTICS_URL, requestParams)
      .then((res) => {
        if (cancelled) return;
        if (res.data?.success) setLoaded({ key: requestKey, data: res.data.data });
        else setFailure({ key: requestKey, message: res.data?.message || 'Failed to load analytics.' });
      })
      .catch((err) => {
        if (!cancelled) setFailure({ key: requestKey, message: errorMessage(err, 'Failed to load analytics.') });
      });
    return () => {
      cancelled = true;
    };
  }, [standalone, requestKey, requestParams, reloadToken]);

  // Live: the overview is computed from the whole platform and cached on the server for 60
  // seconds, so it re-reads on that cadence while visible (and after a reconnect) rather than
  // on every event. The numbers stay on screen while it does.
  useStaffLive([], () => setReloadToken((n) => n + 1), { enabled: !standalone, pollMs: 60_000 });

  // Data for the selected range if we have it; otherwise keep showing the last range (dimmed).
  const current = loaded?.key === requestKey ? loaded.data : null;
  const cached = current ? null : peekStaffGet(ANALYTICS_URL, requestParams)?.data;
  const data: PlatformAnalytics | null = current || (cached?.success ? cached.data : null) || loaded?.data || null;
  const upToDate = Boolean(current || cached?.success);
  const error = failure?.key === requestKey ? failure.message : '';
  // Waiting for the server's answer for this range (cached data stays fully visible meanwhile).
  const revalidating = !standalone && !current && !error;
  // Showing another range's numbers until this one arrives: dim them.
  const pending = revalidating && !upToDate;

  const updateParams = (mutate: (params: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams);
    mutate(next);
    setSearchParams(next, { replace: true });
  };

  const switchTab = (id: TabId) => {
    if (id === 'feedback') prefetchStaffRoute('/admin/feedbacks');
    updateParams((p) => {
      if (id === 'overview') p.delete('tab');
      else p.set('tab', id);
      if (id !== 'money') p.delete('ledger');
    });
  };

  const changeRange = (next: RangeSelection) => {
    updateParams((p) => {
      ['range', 'from', 'to', 'bucket'].forEach((k) => p.delete(k));
      if (next.range !== '30d') p.set('range', next.range);
      if (next.range === 'custom' && next.from && next.to) {
        p.set('from', next.from);
        p.set('to', next.to);
      }
      if (next.bucket) p.set('bucket', next.bucket);
    });
  };

  const changeLedger = (kind: LedgerKind) => {
    updateParams((p) => {
      p.set('tab', 'money');
      if (kind === 'topups') p.delete('ledger');
      else p.set('ledger', kind);
    });
  };

  const retry = () => {
    setFailure(null);
    setReloadToken((n) => n + 1);
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.get(ANALYTICS_URL, { params: { ...(requestParams || {}), refresh: '1' } });
      if (res.data?.success) {
        setLoaded({ key: requestKey, data: res.data.data });
        setFailure(null);
      } else {
        showErrorToast(res.data?.message || 'Could not refresh analytics.');
      }
    } catch (err) {
      showErrorToast(errorMessage(err, 'Could not refresh analytics.'));
    } finally {
      setRefreshing(false);
    }
  };

  if (!standalone && !data && !error) return <ConsolePageSkeleton />;

  const range = data?.range;
  const subtitle =
    tab === 'feedback'
      ? 'Suggestions and ratings from members'
      : tab === 'traffic'
        ? 'API request volume, 429 responses and client addresses (this server only)'
        : range
          ? `${range.label} · ${fmtDay(range.from)} – ${fmtDay(range.to)}${
              range.previous ? ` · compared with the ${range.days} days before` : ''
            }`
          : 'Platform analytics';

  return (
    <GlossaryProvider value={glossary}>
    <main className="relative min-h-screen md:pl-[260px]">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-3 px-6 py-4 md:px-8 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400/80">Analytics</p>
            <h1 className="text-xl font-bold text-white">Platform analytics</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
              <span>{subtitle}</span>
              {!standalone && data && (
                <span className="inline-flex items-center gap-1.5 text-zinc-600">
                  {revalidating ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {pending ? 'Loading…' : 'Updating…'}
                    </>
                  ) : (
                    <>
                      · Updated {formatRelative(data.generatedAt)}
                      {data.cached ? ' (cached up to a minute)' : ''}
                    </>
                  )}
                </span>
              )}
            </p>
          </div>
          {tab !== 'feedback' && (
            <div className="flex flex-wrap items-center gap-2">
              <DefinitionsButton onClick={() => glossary.open()} />
              {!standalone && (
                <>
              <AnalyticsRangePicker
                value={selection}
                days={upToDate ? range?.days ?? null : null}
                today={range?.today ?? null}
                onChange={changeRange}
              />
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={refreshing || pending}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2 text-sm text-zinc-300 hover:border-white/20 hover:text-white disabled:opacity-50"
                title="Recalculate now instead of using the one-minute cache"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
                </>
              )}
            </div>
          )}
        </div>
        <nav aria-label="Analytics sections" className="flex gap-1 overflow-x-auto px-4 md:px-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => switchTab(id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                tab === id ? 'border-rose-400 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </header>

      <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
        {tab === 'feedback' && <AdminFeedbacksPanel />}
        {tab === 'traffic' && <RateLimitMonitorPanel />}

        {!standalone && error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/[0.07] px-5 py-4 text-sm text-rose-100">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-300" />
              {data ? `Could not load this range: ${error} Showing ${data.range.label.toLowerCase()} instead.` : error}
            </span>
            <button type="button" onClick={retry} className="rounded-lg border border-rose-400/30 px-3 py-1.5 text-xs font-medium hover:bg-rose-500/10">
              Try again
            </button>
          </div>
        )}

        {!standalone && data && (
          <div className={`space-y-6 transition-opacity ${pending ? 'pointer-events-none opacity-60' : ''}`} aria-busy={pending}>
            {data.problems.length > 0 && (
              <Notice tone="warning">
                Some figures could not be loaded ({data.problems.join(', ')}). They show as zero or blank. Refresh to try again.
              </Notice>
            )}
            {tab === 'overview' && <OverviewTab data={data} />}
            {tab === 'members' && <MembersTab data={data} />}
            {tab === 'community' && <CommunityTab data={data} />}
            {tab === 'money' && <MoneyTab data={data} ledgerKind={ledgerKind} onLedgerKindChange={changeLedger} />}
            {tab === 'operations' && <OperationsTab data={data} />}
          </div>
        )}
      </div>
      <DefinitionsDrawer open={definitions.open} focus={definitions.focus} section={tab} onClose={closeDefinitions} />
    </main>
    </GlossaryProvider>
  );
}
