import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flag,
  Gauge,
  Hand,
  Info,
  Loader2,
  Package,
  RefreshCw,
  ShieldAlert,
  ShoppingBag,
  Ticket,
  UserRound,
  Users,
} from 'lucide-react';
import useGlobalState from '@/lib/global_state';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import { ChartCard, DonutChart, LineChart } from '@/pages/admin/analytics/components/AnalyticsCharts';
import { ReportCaseDetailModal } from '@/pages/admin/moderation/CaseDetailModals';
import ModeratorTicketDetailModal from '../shared/ModeratorTicketDetailModal';
import { PriorityBadge, StatusBadge, titleCaseWords } from '../shared/ui';
import ListingDetailModal, { SellerListingsModal, listingStatusPill } from './ListingDetailModal';
import type {
  MarketplaceActivityDay,
  MarketplaceAlert,
  MarketplaceOverview,
} from './marketplaceTypes';

const API_BASE = '/api/moderator/marketplace';
const OVERVIEW_URL = `${API_BASE}/overview`;
const DESK = '/moderator/marketplace';

const CLOSED_REPORT = new Set(['resolved', 'closed', 'dismissed', 'denied', 'archived', 'sanctioned']);

/* ─── formatting ─────────────────────────────────────────────────────────── */

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function relativeTime(value: string | null | undefined) {
  if (!value) return '—';
  const mins = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (!Number.isFinite(mins)) return '—';
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** 0.4 → "24m", 5.5 → "5.5h", 50 → "2.1d". */
function formatHours(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return 'No data';
  if (value < 1) return `${Math.max(1, Math.round(value * 60))}m`;
  if (value < 48) return `${Math.round(value * 10) / 10}h`;
  return `${Math.round((value / 24) * 10) / 10}d`;
}

function dayLabel(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) return day;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function deskPath(tab: string, query?: Record<string, string> | null) {
  const params = new URLSearchParams(query || {});
  const qs = params.toString();
  return `${DESK}/${tab}${qs ? `?${qs}` : ''}`;
}

/* ─── building blocks ────────────────────────────────────────────────────── */

const PANEL = 'rounded-2xl border border-white/[0.07] bg-[#12131a]';

function SectionHeading({
  title,
  hint,
  to,
  linkLabel,
  icon: Icon,
}: {
  title: string;
  hint?: string;
  to?: string;
  linkLabel?: string;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          {Icon ? <Icon className="h-4 w-4 text-amber-300" /> : null}
          {title}
        </h2>
        {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
      </div>
      {to ? (
        <Link
          to={to}
          className="inline-flex items-center gap-1 text-xs font-medium text-amber-300 transition hover:text-amber-200"
        >
          {linkLabel || 'Open desk'}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  to,
  emphasis,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub: ReactNode;
  tone: string;
  to?: string;
  /** Shown as a small red line under the value when something is past target. */
  emphasis?: string | null;
}) {
  const body = (
    <div className={`${PANEL} flex h-full flex-col gap-3 px-4 py-4 transition hover:border-white/15`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div>
        <p className="text-3xl font-bold leading-none tabular-nums text-white">{value}</p>
        {emphasis ? <p className="mt-2 text-[11px] font-medium text-red-300">{emphasis}</p> : null}
        <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">{sub}</p>
      </div>
    </div>
  );
  return to ? (
    <Link to={to} className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 rounded-2xl">
      {body}
    </Link>
  ) : (
    body
  );
}

function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className={`mt-1 truncate text-sm font-semibold tabular-nums ${tone || 'text-zinc-100'}`}>{value}</dd>
    </div>
  );
}

function HealthCard({
  icon: Icon,
  title,
  headline,
  headlineLabel,
  stats,
  footer,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  headline: string;
  headlineLabel: string;
  stats: { label: string; value: ReactNode; tone?: string }[];
  footer?: ReactNode;
}) {
  return (
    <div className={`${PANEL} flex flex-col p-5`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <Icon className="h-4 w-4 text-amber-300" />
        {title}
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <p className="text-2xl font-bold tabular-nums text-white">{headline}</p>
        <p className="text-xs text-zinc-500">{headlineLabel}</p>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/[0.06] pt-4">
        {stats.map((s) => (
          <Stat key={s.label} label={s.label} value={s.value} tone={s.tone} />
        ))}
      </dl>
      {footer ? <div className="mt-4 text-[11px] text-zinc-500">{footer}</div> : null}
    </div>
  );
}

/** Solid bars (the theme avoids gradients). */
function BarList({
  title,
  data,
  color = 'bg-amber-400/80',
  empty = 'Nothing to show yet',
}: {
  title: string;
  data: { label: string; value: number }[];
  color?: string;
  empty?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <p className="mb-4 text-sm font-semibold tracking-tight text-white">{title}</p>
      {data.length === 0 ? (
        <p className="flex h-40 items-center justify-center rounded-xl border border-dashed border-white/10 text-xs text-zinc-500">
          {empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {data.slice(0, 7).map((d) => (
            <li key={d.label}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                <span className="truncate text-zinc-400">{d.label}</span>
                <span className="tabular-nums font-medium text-white">{d.value.toLocaleString()}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: `${Math.max(d.value > 0 ? 3 : 0, (d.value / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const SEVERITY_STYLE: Record<string, { dot: string; icon: ComponentType<{ className?: string }>; text: string }> = {
  error: { dot: 'bg-red-500/15 text-red-300', icon: AlertTriangle, text: 'text-red-200' },
  warning: { dot: 'bg-amber-500/15 text-amber-300', icon: Clock, text: 'text-amber-100' },
  info: { dot: 'bg-sky-500/15 text-sky-300', icon: Info, text: 'text-sky-100' },
  success: { dot: 'bg-emerald-500/15 text-emerald-300', icon: CheckCircle2, text: 'text-emerald-100' },
};

function AttentionList({ alerts, onOpen }: { alerts: MarketplaceAlert[]; onOpen: (a: MarketplaceAlert) => void }) {
  return (
    <ul className="divide-y divide-white/[0.05]">
      {alerts.map((a) => {
        const style = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.info;
        const Icon = style.icon;
        const clickable = Boolean(a.action?.tab);
        const content = (
          <>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.dot}`}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-sm font-medium ${style.text}`}>{a.title || a.message}</span>
              {a.detail ? <span className="mt-0.5 block text-[11px] text-zinc-500">{a.detail}</span> : null}
            </span>
            {a.count ? (
              <span className="shrink-0 rounded-md bg-white/[0.06] px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
                {a.count}
              </span>
            ) : null}
            {clickable ? <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" /> : null}
          </>
        );
        return (
          <li key={a.id}>
            {clickable ? (
              <button
                type="button"
                onClick={() => onOpen(a)}
                className="flex w-full items-center gap-3 px-1 py-3 text-left transition hover:bg-white/[0.02] focus:bg-white/[0.03] focus:outline-none"
              >
                {content}
              </button>
            ) : (
              <div className="flex items-center gap-3 px-1 py-3">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

type TrendView = 'catalog' | 'cases';

function ActivityTrend({ activity }: { activity: MarketplaceActivityDay[] }) {
  const [view, setView] = useState<TrendView>('catalog');
  const labels = activity.map((d) => dayLabel(d.day));
  const series =
    view === 'catalog'
      ? [
          { label: 'Listings submitted', color: '#fbbf24', values: activity.map((d) => d.submitted) },
          { label: 'Review decisions', color: '#34d399', values: activity.map((d) => d.decided) },
        ]
      : [
          { label: 'Tickets opened', color: '#60a5fa', values: activity.map((d) => d.ticketsOpened) },
          { label: 'Tickets closed', color: '#a1a1aa', values: activity.map((d) => d.ticketsClosed) },
          { label: 'Reports filed', color: '#fb7185', values: activity.map((d) => d.reportsFiled) },
        ];
  const totals = series.map((s) => ({ ...s, total: s.values.reduce((sum, v) => sum + v, 0) }));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tracking-tight text-white">Last 14 days</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {totals.map((s) => `${s.total.toLocaleString()} ${s.label.toLowerCase()}`).join(' · ')}
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-white/[0.08] bg-[#0f1016] p-0.5" role="group" aria-label="Trend">
          {(
            [
              { id: 'catalog', label: 'Catalog' },
              { id: 'cases', label: 'Tickets & reports' },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={view === option.id}
              onClick={() => setView(option.id)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                view === option.id ? 'bg-amber-500/15 text-amber-100' : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <LineChart key={view} labels={labels} series={series} height={220} />
    </div>
  );
}

/* ─── page ───────────────────────────────────────────────────────────────── */

export default function MarketplaceModeratorDashboard() {
  const { user } = useGlobalState();
  const navigate = useNavigate();
  const [data, setData] = useState<MarketplaceOverview | null>(() => {
    const cached = peekStaffGet(OVERVIEW_URL);
    return cached?.data?.success ? cached.data.data : null;
  });
  const [loading, setLoading] = useState(!data);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<number | string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | string | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [sellerAccountId, setSellerAccountId] = useState<string | null>(null);
  const hasData = useRef(Boolean(data));

  const load = useCallback(async (silent = false) => {
    if (!silent && !hasData.current) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await staffGet(OVERVIEW_URL);
      if (res.data?.success) {
        hasData.current = true;
        setData(res.data.data);
      } else if (!hasData.current) {
        setError(res.data?.message || 'Failed to load marketplace dashboard');
      }
    } catch {
      if (!hasData.current) setError('Failed to load marketplace dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const myStaffId = String(user?.staffId ?? user?.staff_id ?? '').toLowerCase();

  const openAlert = (alert: MarketplaceAlert) => {
    const tab = alert.action?.tab;
    if (!tab) return;
    navigate(deskPath(tab, alert.action?.query || alert.action?.ticketFilters || null));
  };

  const derived = useMemo(() => {
    if (!data) return null;
    const tickets = data.recentTickets || [];
    const reports = data.flaggedReports || [];
    return {
      activeTickets: tickets.filter((t) => t.status !== 'Closed').slice(0, 8),
      openReports: reports.filter((r) => !CLOSED_REPORT.has(String(r.status).toLowerCase())).slice(0, 8),
      myOpenTickets: myStaffId
        ? tickets.filter(
            (t) => t.status !== 'Closed' && String(t.assignee?.staffId ?? '').toLowerCase() === myStaffId
          ).length
        : 0,
    };
  }, [data, myStaffId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center md:pl-[260px]">
        <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
      </main>
    );
  }

  if (error || !data || !derived) {
    return (
      <main className="p-8 md:pl-[284px]">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          {error || 'Failed to load marketplace dashboard'}
          <button type="button" onClick={() => void load()} className="mt-4 block text-sm underline">
            Retry
          </button>
        </div>
      </main>
    );
  }

  const { summary, charts, recentListings, alerts } = data;
  const ticketSla = data.ticketSla;
  const reportSla = data.reportSla;
  const team = data.team || [];
  const sellers = data.sellersToWatch || [];
  const activity = data.activity || [];
  const urgentCount = alerts.filter((a) => a.severity === 'error').reduce((sum, a) => sum + (a.count || 0), 0);

  return (
    <main className="min-h-screen md:pl-[260px]">
      {selectedTicketId != null && (
        <ModeratorTicketDetailModal
          ticketId={selectedTicketId}
          endpointBase={`${API_BASE}/tickets`}
          accent="amber"
          onClose={() => setSelectedTicketId(null)}
          onUpdated={() => void load(true)}
        />
      )}
      {selectedReportId != null && (
        <ReportCaseDetailModal
          reportId={selectedReportId}
          endpointBase={`${API_BASE}/reports`}
          accent="amber"
          listingApiBase={API_BASE}
          onClose={() => setSelectedReportId(null)}
          onUpdated={() => void load(true)}
        />
      )}
      {selectedListingId != null && (
        <ListingDetailModal
          listingId={selectedListingId}
          seed={recentListings.find((l) => l.id === selectedListingId) || null}
          apiBase={API_BASE}
          onClose={() => setSelectedListingId(null)}
          onUpdated={() => void load(true)}
          onViewSeller={(accountId) => setSellerAccountId(String(accountId))}
          onOpenListing={(id) => setSelectedListingId(id)}
        />
      )}
      {sellerAccountId != null && (
        <SellerListingsModal
          accountId={sellerAccountId}
          apiBase={API_BASE}
          onClose={() => setSellerAccountId(null)}
          onOpenListing={(id) => {
            setSellerAccountId(null);
            setSelectedListingId(id);
          }}
        />
      )}

      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-6 py-4 md:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/80">
              Marketplace Moderator
            </p>
            <h1 className="text-xl font-bold text-white">Marketplace dashboard</h1>
            <p className="mt-1 text-xs text-zinc-500">
              Updated {formatDateTime(data.lastUpdated)} · Signed in as @{user?.username || 'marketplace'}
              {derived.myOpenTickets > 0 ? ` · ${derived.myOpenTickets} open ticket${derived.myOpenTickets === 1 ? '' : 's'} assigned to you` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {urgentCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/25 bg-red-500/[0.07] px-3 py-2 text-xs font-medium text-red-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {urgentCount} urgent item{urgentCount === 1 ? '' : 's'}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-zinc-300 transition hover:border-white/20 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-8 px-6 py-6 md:px-8 md:py-8">
        {/* Primary KPIs */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={Package}
            label="Awaiting review"
            value={summary.pendingListings}
            tone="bg-amber-500/15 text-amber-300"
            to={`${DESK}/marketplace-control`}
            emphasis={summary.pendingOver48h > 0 ? `${summary.pendingOver48h} past the 48h target` : null}
            sub={
              summary.oldestPendingAt
                ? `Oldest submitted ${relativeTime(summary.oldestPendingAt)} · ${formatHours(summary.avgReviewHours)} average wait`
                : 'Review queue is clear'
            }
          />
          <KpiCard
            icon={Ticket}
            label="Open tickets"
            value={summary.openTickets}
            tone="bg-sky-500/15 text-sky-300"
            to={`${DESK}/ticket-management`}
            emphasis={ticketSla && ticketSla.overdue > 0 ? `${ticketSla.overdue} overdue` : null}
            sub={`${summary.unassignedTickets} unassigned · ${summary.awaitingReplyTickets} awaiting a reply`}
          />
          <KpiCard
            icon={Flag}
            label="Open reports"
            value={summary.openReports}
            tone="bg-rose-500/15 text-rose-300"
            to={`${DESK}/reports`}
            emphasis={summary.copyrightReports > 0 ? `${summary.copyrightReports} copyright claim${summary.copyrightReports === 1 ? '' : 's'}` : null}
            sub={`${summary.unassignedReports} unassigned · ${summary.highPriorityReports} high priority`}
          />
          <KpiCard
            icon={ShoppingBag}
            label="Live catalog"
            value={summary.approvedListings}
            tone="bg-emerald-500/15 text-emerald-300"
            to={`${DESK}/marketplace-control`}
            sub={`${summary.approvedCreditValue.toLocaleString()} credits listed · ${summary.rejectedListings + summary.delistedListings} off catalog`}
          />
        </section>

        {/* Attention + trend */}
        <section className="grid gap-4 xl:grid-cols-5">
          <div className={`${PANEL} p-5 xl:col-span-2`}>
            <SectionHeading
              title="Needs attention"
              hint="Ranked by urgency. Open an item to jump to the filtered desk."
              icon={ShieldAlert}
            />
            <div className="mt-3 max-h-[360px] overflow-y-auto pr-1">
              <AttentionList alerts={alerts} onOpen={openAlert} />
            </div>
          </div>
          <ChartCard className="xl:col-span-3">
            {activity.length ? (
              <ActivityTrend activity={activity} />
            ) : (
              <p className="py-16 text-center text-sm text-zinc-500">No activity recorded yet.</p>
            )}
          </ChartCard>
        </section>

        {/* Queue health */}
        <section className="space-y-3">
          <SectionHeading title="Queue health" hint="Response times and throughput for each part of this desk." icon={Gauge} />
          <div className="grid gap-4 lg:grid-cols-3">
            <HealthCard
              icon={Package}
              title="Listing review"
              headline={formatHours(summary.avgReviewHours)}
              headlineLabel="average wait to a decision (30 days)"
              stats={[
                { label: 'Decided today', value: summary.reviewedLast24h },
                { label: 'Decided · 7d', value: summary.reviewedLast7d },
                { label: 'Approved · 7d', value: summary.approvedLast7d, tone: 'text-emerald-300' },
                { label: 'Removed · 7d', value: summary.removedLast7d, tone: 'text-zinc-300' },
                {
                  label: 'Pending > 48h',
                  value: summary.pendingOver48h,
                  tone: summary.pendingOver48h > 0 ? 'text-red-300' : undefined,
                },
                {
                  label: 'Pending > 7d',
                  value: summary.pendingOver7d,
                  tone: summary.pendingOver7d > 0 ? 'text-red-300' : undefined,
                },
              ]}
              footer={`${summary.totalListings.toLocaleString()} listings submitted in total.`}
            />
            <HealthCard
              icon={Ticket}
              title="Tickets"
              headline={formatHours(ticketSla?.avgFirstReplyHours)}
              headlineLabel="average first staff reply (30 days)"
              stats={[
                { label: 'Avg resolution', value: formatHours(ticketSla?.avgResolutionHours) },
                {
                  label: 'Overdue',
                  value: ticketSla?.overdue ?? 0,
                  tone: (ticketSla?.overdue ?? 0) > 0 ? 'text-red-300' : undefined,
                },
                { label: 'No reply yet', value: ticketSla?.awaitingFirstReply ?? 0 },
                { label: 'High priority', value: summary.highPriorityTickets },
                { label: 'Opened · 7d', value: ticketSla?.openedLast7d ?? 0 },
                { label: 'Closed · 7d', value: ticketSla?.closedLast7d ?? 0, tone: 'text-emerald-300' },
              ]}
              footer={
                ticketSla?.avgSatisfaction != null
                  ? `Member satisfaction ${ticketSla.avgSatisfaction}/5 across ${ticketSla.ratedTickets} rated ticket${ticketSla.ratedTickets === 1 ? '' : 's'}.`
                  : ticketSla?.oldestUnassignedAt
                    ? `Oldest unassigned ticket opened ${relativeTime(ticketSla.oldestUnassignedAt)}.`
                    : 'No unassigned tickets.'
              }
            />
            <HealthCard
              icon={Flag}
              title="Reports"
              headline={formatHours(reportSla?.avgResolutionHours)}
              headlineLabel="average time to a decision (30 days)"
              stats={[
                { label: 'Filed · 7d', value: reportSla?.filedLast7d ?? 0 },
                { label: 'Decided · 7d', value: reportSla?.decidedLast7d ?? 0 },
                { label: 'Sanctioned', value: summary.sanctionedReports ?? 0, tone: 'text-rose-300' },
                { label: 'Denied', value: summary.deniedReports ?? 0, tone: 'text-zinc-300' },
                { label: 'Unassigned', value: summary.unassignedReports },
                {
                  label: 'Copyright',
                  value: summary.copyrightReports,
                  tone: summary.copyrightReports > 0 ? 'text-red-300' : undefined,
                },
              ]}
              footer={
                reportSla?.oldestOpenAt
                  ? `Oldest open report filed ${relativeTime(reportSla.oldestOpenAt)}.`
                  : 'No open reports.'
              }
            />
          </div>
        </section>

        {/* Work queues */}
        <section className="grid gap-4 xl:grid-cols-3">
          <div className={`${PANEL} p-5 xl:col-span-2`}>
            <SectionHeading
              title="Active tickets"
              hint="Open marketplace tickets, highest priority first. Click a row to work it."
              to={`${DESK}/ticket-management`}
              linkLabel="Ticket desk"
              icon={Ticket}
            />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wide text-zinc-600">
                    <th className="pb-2 pr-4 font-medium">Ticket</th>
                    <th className="pb-2 pr-4 font-medium">Category</th>
                    <th className="pb-2 pr-4 font-medium">Priority</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Handler</th>
                    <th className="pb-2 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {derived.activeTickets.map((t) => (
                    <tr
                      key={String(t.id)}
                      tabIndex={0}
                      onClick={() => setSelectedTicketId(t.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedTicketId(t.id);
                        }
                      }}
                      className="cursor-pointer border-b border-white/[0.04] text-zinc-300 transition hover:bg-white/[0.03] focus:bg-white/[0.04] focus:outline-none"
                    >
                      <td className="py-3 pr-4">
                        <p className="flex items-center gap-1.5 font-medium text-white">
                          {t.number}
                          {t.isOverdue ? (
                            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-1.5 py-px text-[9px] font-medium text-red-200">
                              Overdue
                            </span>
                          ) : null}
                        </p>
                        <p className="line-clamp-1 text-xs text-zinc-500">{t.subject}</p>
                      </td>
                      <td className="py-3 pr-4 text-xs">{t.type || t.category || '—'}</td>
                      <td className="py-3 pr-4">
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="py-3 pr-4 text-xs">
                        {t.assignee?.name || (
                          <span className="inline-flex items-center gap-1 text-amber-200/90">
                            <Hand className="h-3 w-3" />
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-xs text-zinc-500">{relativeTime(t.updatedAt || t.createdAt)}</td>
                    </tr>
                  ))}
                  {derived.activeTickets.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-zinc-500">
                        No open marketplace tickets.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`${PANEL} p-5`}>
            <SectionHeading
              title="Open reports"
              hint="Asset, listing, seller and purchase reports."
              to={`${DESK}/reports`}
              linkLabel="Report desk"
              icon={Flag}
            />
            <ul className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {derived.openReports.map((r) => (
                <li key={String(r.id)}>
                  <button
                    type="button"
                    onClick={() => setSelectedReportId(r.id)}
                    className="flex w-full flex-col gap-1 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 text-left transition hover:border-white/10 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-[11px] text-amber-200">{r.number}</p>
                      <span
                        className={`text-[10px] font-medium ${
                          String(r.priority).toLowerCase() === 'high' ? 'text-red-300' : 'text-zinc-500'
                        }`}
                      >
                        {titleCaseWords(r.priority)} · {titleCaseWords(r.status)}
                      </span>
                    </div>
                    <p className="line-clamp-1 text-sm text-white">{r.subjectTitle || r.type}</p>
                    <p className="text-[11px] text-zinc-500">
                      {r.type}
                      {r.reported ? ` · against @${r.reported.username}` : ''}
                      {` · ${r.assignee ? r.assignee.name : 'Unassigned'}`}
                    </p>
                  </button>
                </li>
              ))}
              {derived.openReports.length === 0 && (
                <li className="py-10 text-center text-sm text-zinc-500">No open marketplace reports.</li>
              )}
            </ul>
          </div>
        </section>

        {/* Team + sellers */}
        <section className="grid gap-4 xl:grid-cols-2">
          <div className={`${PANEL} p-5`}>
            <SectionHeading
              title="Team workload"
              hint="Open marketplace work each moderator holds, and what they closed this week."
              icon={Users}
            />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wide text-zinc-600">
                    <th className="pb-2 pr-4 font-medium">Moderator</th>
                    <th className="pb-2 pr-4 text-right font-medium">Tickets</th>
                    <th className="pb-2 pr-4 text-right font-medium">Reports</th>
                    <th className="pb-2 pr-4 text-right font-medium">Reviews · 7d</th>
                    <th className="pb-2 text-right font-medium">Closed · 7d</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((m) => {
                    const isMe = myStaffId && String(m.staffId).toLowerCase() === myStaffId;
                    return (
                      <tr key={m.staffId} className="border-b border-white/[0.04] text-zinc-300">
                        <td className="py-2.5 pr-4">
                          <p className="font-medium text-white">
                            {m.name}
                            {isMe ? <span className="ml-1.5 text-[10px] font-normal text-amber-300">you</span> : null}
                          </p>
                          <p className="text-[11px] text-zinc-500">{m.role}</p>
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">{m.openTickets}</td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">{m.openReports}</td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">{m.reviewsLast7d}</td>
                        <td className="py-2.5 text-right tabular-nums">{m.ticketsClosedLast7d}</td>
                      </tr>
                    );
                  })}
                  {team.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-sm text-zinc-500">
                        No marketplace moderators found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`${PANEL} p-5`}>
            <SectionHeading
              title="Sellers to watch"
              hint="Most open reports against them. Open one to see every listing they have submitted."
              icon={UserRound}
            />
            <ul className="mt-4 space-y-2">
              {sellers.map((s) => (
                <li key={s.accountId}>
                  <button
                    type="button"
                    onClick={() => setSellerAccountId(s.accountId)}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 text-left transition hover:border-white/10 hover:bg-white/[0.04]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-sm font-semibold tabular-nums text-rose-200">
                      {s.openReports}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-white">{s.name}</span>
                        {s.status && s.status.toLowerCase() !== 'active' ? (
                          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-1.5 py-px text-[9px] font-medium capitalize text-red-200">
                            {s.status}
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-[11px] text-zinc-500">
                        @{s.handle || '—'} · {s.totalReports} report{s.totalReports === 1 ? '' : 's'} total
                        {s.sanctioned ? ` · ${s.sanctioned} sanctioned` : ''} · {s.liveListings} live
                        {s.removedListings ? ` · ${s.removedListings} removed` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] text-zinc-600">{relativeTime(s.lastReportedAt)}</span>
                  </button>
                </li>
              ))}
              {sellers.length === 0 && (
                <li className="flex flex-col items-center gap-2 py-10 text-center text-sm text-zinc-500">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400/70" />
                  No seller has open reports against them.
                </li>
              )}
            </ul>
          </div>
        </section>

        {/* Breakdown */}
        <section className="space-y-3">
          <SectionHeading title="Breakdown" hint="Where the catalog and the case load sit right now." />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ChartCard>
              <DonutChart
                title="Listings by status"
                size={140}
                segments={(charts.listingStatusMix || []).map((s) => ({
                  label: s.label,
                  value: s.value,
                  color: s.color || '#f59e0b',
                }))}
              />
            </ChartCard>
            <ChartCard>
              <BarList title="Listings by category" data={charts.listingCategories || []} />
            </ChartCard>
            <ChartCard>
              <BarList
                title="Tickets by category"
                data={charts.ticketCategories || []}
                color="bg-sky-400/80"
                empty="No marketplace tickets yet"
              />
            </ChartCard>
            <ChartCard>
              <BarList
                title="Why items are reported (open)"
                data={charts.reportReasons || []}
                color="bg-rose-400/80"
                empty="No open reports"
              />
            </ChartCard>
          </div>
        </section>

        {/* Recent submissions */}
        <section className={`${PANEL} p-5`}>
          <SectionHeading
            title="Recent listing submissions"
            hint="Pending submissions first, then the newest. Click a row to review it here."
            to={`${DESK}/marketplace-control`}
            linkLabel="Marketplace Control"
            icon={Package}
          />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wide text-zinc-600">
                  <th className="pb-2 pr-4 font-medium">Listing</th>
                  <th className="pb-2 pr-4 font-medium">Seller</th>
                  <th className="pb-2 pr-4 font-medium">Category</th>
                  <th className="pb-2 pr-4 text-right font-medium">Price</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {(recentListings || []).map((l) => (
                  <tr
                    key={l.id}
                    tabIndex={0}
                    onClick={() => setSelectedListingId(l.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedListingId(l.id);
                      }
                    }}
                    className="cursor-pointer border-b border-white/[0.04] text-zinc-300 transition hover:bg-white/[0.03] focus:bg-white/[0.04] focus:outline-none"
                  >
                    <td className="py-3 pr-4">
                      <p className="font-medium text-white">{l.title}</p>
                      <p className="font-mono text-[11px] text-zinc-500">{l.number}</p>
                    </td>
                    <td className="py-3 pr-4 text-xs">@{l.submittedBy.handle}</td>
                    <td className="py-3 pr-4 text-xs">{l.category || 'Uncategorized'}</td>
                    <td className="py-3 pr-4 text-right text-xs tabular-nums">{l.priceCredits.toLocaleString()} cr</td>
                    <td className="py-3 pr-4">{listingStatusPill(l.status)}</td>
                    <td className="py-3 text-xs text-zinc-500">{relativeTime(l.createdAt)}</td>
                  </tr>
                ))}
                {(!recentListings || recentListings.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-zinc-500">
                      No listings submitted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
