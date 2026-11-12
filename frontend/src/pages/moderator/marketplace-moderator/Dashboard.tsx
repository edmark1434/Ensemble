import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Coins,
  Flag,
  Gauge,
  Hand,
  Loader2,
  Package,
  RefreshCw,
  ShieldAlert,
  ShoppingBag,
  Ticket,
  Timer,
  TimerReset,
} from 'lucide-react';
import useGlobalState from '@/lib/global_state';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import {
  ChartCard,
  DonutChart,
  HorizontalBarChart,
} from '@/pages/admin/analytics/components/AnalyticsCharts';
import { ReportCaseDetailModal } from '@/pages/admin/moderation/CaseDetailModals';
import ModeratorTicketDetailModal from '../shared/ModeratorTicketDetailModal';
import { PriorityBadge, StatusBadge, titleCaseWords } from '../shared/ui';
import ListingDetailModal, { listingStatusPill } from './ListingDetailModal';
import type { MarketplaceAlert, MarketplaceOverview } from './marketplaceTypes';

const API_BASE = '/api/moderator/marketplace';
const OVERVIEW_URL = `${API_BASE}/overview`;

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
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SectionHeading({
  title,
  hint,
  to,
  linkLabel,
}: {
  title: string;
  hint: string;
  to?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="mt-1 text-xs text-zinc-500">{hint}</p>
      </div>
      {to && (
        <Link to={to} className="text-xs font-medium text-amber-300 hover:underline">
          {linkLabel || 'Open desk'}
        </Link>
      )}
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
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub: string;
  tone: string;
  to?: string;
}) {
  const body = (
    <div className="flex h-full items-start gap-3 rounded-2xl border border-white/[0.08] bg-[#14151c] px-4 py-3.5 transition hover:border-white/15">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
        <p className="mt-1 text-2xl font-bold leading-none tabular-nums text-white">{value}</p>
        <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">{sub}</p>
      </div>
    </div>
  );
  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

function MetricRow({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl border border-white/[0.08] bg-[#14151c] px-4 py-4 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            {item.label}
          </dt>
          <dd className="mt-1 text-base font-semibold tabular-nums text-zinc-100">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

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
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null);
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

  const handleAlertClick = (alert: MarketplaceAlert) => {
    const tab = alert.action?.tab;
    if (!tab) return;
    if (tab === 'ticket-management') {
      const params = new URLSearchParams(alert.action?.ticketFilters || {});
      navigate(`/moderator/marketplace/ticket-management?${params.toString()}`);
      return;
    }
    navigate(`/moderator/marketplace/${tab}`);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center md:pl-[260px]">
        <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
      </main>
    );
  }

  if (error || !data) {
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

  const { summary, charts, recentListings, recentTickets, flaggedReports, alerts } = data;
  const avgReview = summary.avgReviewHours == null ? 'No data' : `${summary.avgReviewHours}h`;

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
        />
      )}

      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-6 py-4 md:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/80">
              Asset marketplace control center
            </p>
            <h1 className="text-xl font-bold text-white">Marketplace dashboard</h1>
            <p className="mt-1 text-xs text-zinc-500">
              Updated {formatDateTime(data.lastUpdated)} · Signed in as @
              {user?.username || 'marketplace'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 self-start rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-zinc-300 transition hover:border-white/20 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <div className="space-y-8 px-6 py-6 md:px-8 md:py-8">
        {alerts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {alerts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => handleAlertClick(a)}
                disabled={!a.action?.tab}
                className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-xs transition disabled:cursor-default ${
                  a.severity === 'error'
                    ? 'border-red-500/30 bg-red-500/10 text-red-200'
                    : a.severity === 'warning'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                      : a.severity === 'success'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                        : 'border-white/10 bg-white/[0.03] text-zinc-300'
                } ${a.action?.tab ? 'hover:brightness-110' : ''}`}
              >
                {a.severity === 'success' ? (
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                ) : (
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                )}
                {a.message}
              </button>
            ))}
          </div>
        )}

        <section className="space-y-3">
          <SectionHeading
            title="Listing review"
            hint="The catalog pipeline, from submission to takedown."
            to="/moderator/marketplace/marketplace-control"
            linkLabel="Open Marketplace Control"
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={Package}
              label="Pending review"
              value={summary.pendingListings}
              sub={
                summary.pendingOver48h > 0
                  ? `${summary.pendingOver48h} over 48h · oldest ${relativeTime(summary.oldestPendingAt)}`
                  : summary.oldestPendingAt
                    ? `Oldest submitted ${relativeTime(summary.oldestPendingAt)}`
                    : 'Queue is clear'
              }
              tone="bg-amber-500/15 text-amber-300"
              to="/moderator/marketplace/marketplace-control"
            />
            <KpiCard
              icon={ShoppingBag}
              label="Live catalog"
              value={summary.approvedListings}
              sub={`${summary.approvedCreditValue.toLocaleString()} credits of approved assets`}
              tone="bg-emerald-500/15 text-emerald-300"
              to="/moderator/marketplace/marketplace-control"
            />
            <KpiCard
              icon={Archive}
              label="Off catalog"
              value={summary.rejectedListings + summary.delistedListings}
              sub={`${summary.rejectedListings} rejected · ${summary.delistedListings} delisted`}
              tone="bg-zinc-500/15 text-zinc-300"
              to="/moderator/marketplace/marketplace-control"
            />
            <KpiCard
              icon={Gauge}
              label="Review throughput"
              value={summary.reviewedLast7d}
              sub={`Decided in 7 days · ${avgReview} average wait`}
              tone="bg-sky-500/15 text-sky-300"
            />
          </div>
          <MetricRow
            items={[
              { label: 'Total listings', value: summary.totalListings },
              { label: 'Decided today', value: summary.reviewedLast24h },
              { label: 'Approved · 7d', value: summary.approvedLast7d },
              { label: 'Removed · 7d', value: summary.removedLast7d },
              { label: 'Pending > 48h', value: summary.pendingOver48h },
              { label: 'Pending > 7d', value: summary.pendingOver7d },
            ]}
          />
          {(summary.pendingOver48h > 0 || summary.copyrightReports > 0) && (
            <div className="flex flex-wrap gap-2">
              {summary.pendingOver48h > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3 py-1.5 text-[11px] text-amber-100">
                  <Timer className="h-3.5 w-3.5" />
                  {summary.pendingOver48h} submission
                  {summary.pendingOver48h === 1 ? '' : 's'} are past the 48 hour review target
                </span>
              )}
              {summary.copyrightReports > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/[0.07] px-3 py-1.5 text-[11px] text-red-100">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {summary.copyrightReports} open report
                  {summary.copyrightReports === 1 ? '' : 's'} mention copyright — delist or
                  re-review the live asset from Marketplace Control
                </span>
              )}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <SectionHeading
            title="Tickets and reports"
            hint="Only marketplace-scoped cases reach this console."
            to="/moderator/marketplace/ticket-management"
            linkLabel="Open ticket desk"
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              icon={Ticket}
              label="Open marketplace tickets"
              value={summary.openTickets}
              sub={`${summary.totalTickets} total · ${summary.inProgressTickets} in progress`}
              tone="bg-sky-500/15 text-sky-300"
              to="/moderator/marketplace/ticket-management"
            />
            <KpiCard
              icon={Hand}
              label="Unassigned tickets"
              value={summary.unassignedTickets}
              sub={`${summary.awaitingReplyTickets} awaiting a staff reply`}
              tone="bg-amber-500/15 text-amber-300"
              to="/moderator/marketplace/ticket-management?assignee=unassigned"
            />
            <KpiCard
              icon={TimerReset}
              label="High priority tickets"
              value={summary.highPriorityTickets}
              sub={`${summary.escalatedTickets} escalated into this queue`}
              tone="bg-rose-500/15 text-rose-300"
              to="/moderator/marketplace/ticket-management?priority=High"
            />
            <KpiCard
              icon={Flag}
              label="Open marketplace reports"
              value={summary.openReports}
              sub={`${summary.totalReports} total · ${summary.unassignedReports} unassigned`}
              tone="bg-fuchsia-500/15 text-fuchsia-300"
              to="/moderator/marketplace/reports"
            />
            <KpiCard
              icon={ShieldAlert}
              label="Copyright reports"
              value={summary.copyrightReports}
              sub="Open reports mentioning a copyright claim"
              tone="bg-red-500/15 text-red-300"
              to="/moderator/marketplace/reports"
            />
            <KpiCard
              icon={Coins}
              label="Resolved this queue"
              value={summary.resolvedTickets + summary.resolvedReports}
              sub={`${summary.resolvedTickets} tickets · ${summary.resolvedReports} reports closed`}
              tone="bg-emerald-500/15 text-emerald-300"
            />
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeading title="Trends" hint="Live mix across listings, tickets and reports." />
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard>
              <DonutChart
                title="Listings by status"
                segments={(charts.listingStatusMix || []).map((s) => ({
                  label: s.label,
                  value: s.value,
                  color: s.color || '#f59e0b',
                }))}
              />
            </ChartCard>
            <ChartCard>
              <HorizontalBarChart
                title="Listings by category"
                data={charts.listingCategories || []}
              />
            </ChartCard>
            <ChartCard>
              <DonutChart
                title="Marketplace tickets by status"
                segments={(charts.ticketStatusMix || []).map((s) => ({
                  label: s.label,
                  value: s.value,
                  color: s.color || '#fbbf24',
                }))}
              />
            </ChartCard>
            <ChartCard>
              <HorizontalBarChart title="Tickets by type" data={charts.ticketCategories || []} />
            </ChartCard>
            <ChartCard>
              <DonutChart
                title="Marketplace reports by status"
                segments={(charts.reportStatusMix || []).map((s) => ({
                  label: s.label,
                  value: s.value,
                  color: s.color || '#fb7185',
                }))}
              />
            </ChartCard>
            <ChartCard>
              <HorizontalBarChart title="Reports by target" data={charts.reportTypes || []} />
            </ChartCard>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 xl:col-span-2">
            <SectionHeading
              title="Marketplace ticket queue"
              hint="Asset, listing and purchase tickets only — click a row to open the case."
              to="/moderator/marketplace/ticket-management"
            />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wide text-zinc-600">
                    <th className="pb-2 pr-4 font-medium">Ticket</th>
                    <th className="pb-2 pr-4 font-medium">Type</th>
                    <th className="pb-2 pr-4 font-medium">Priority</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Assignee</th>
                    <th className="pb-2 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentTickets || []).map((t) => (
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
                        <p className="font-medium text-white">{t.number}</p>
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
                        {t.assignee?.name || <span className="text-amber-200/90">Unassigned</span>}
                      </td>
                      <td className="py-3 text-xs text-zinc-500">
                        {formatDateTime(t.updatedAt || t.createdAt)}
                      </td>
                    </tr>
                  ))}
                  {(!recentTickets || recentTickets.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500">
                        No marketplace tickets in queue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <SectionHeading
              title="Marketplace reports"
              hint="Listing, seller, purchase and asset reports."
              to="/moderator/marketplace/reports"
            />
            <ul className="mt-4 max-h-[420px] space-y-2 overflow-y-auto">
              {(flaggedReports || []).map((r) => (
                <li key={String(r.id)}>
                  <button
                    type="button"
                    onClick={() => setSelectedReportId(r.id)}
                    className="flex w-full flex-col gap-1 rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 text-left transition hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-amber-200">{r.number}</p>
                      <span className="text-[10px] text-zinc-500">{titleCaseWords(r.status)}</span>
                    </div>
                    <p className="line-clamp-1 text-sm text-white">{r.type}</p>
                    <p className="text-[11px] text-zinc-500">
                      {r.targetType}
                      {r.targetId ? ` · ${r.targetId}` : ''}
                      {r.assignee ? ` · ${r.assignee.name}` : ' · Unassigned'}
                    </p>
                  </button>
                </li>
              ))}
              {(!flaggedReports || flaggedReports.length === 0) && (
                <li className="py-8 text-center text-sm text-zinc-500">No marketplace reports.</li>
              )}
            </ul>
          </section>
        </div>

        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <SectionHeading
            title="Recent listing submissions"
            hint="Latest assets entering the review queue — click a row to review it here."
            to="/moderator/marketplace/marketplace-control"
            linkLabel="Open control"
          />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wide text-zinc-600">
                  <th className="pb-2 pr-4 font-medium">Listing</th>
                  <th className="pb-2 pr-4 font-medium">Seller</th>
                  <th className="pb-2 pr-4 font-medium">Category</th>
                  <th className="pb-2 pr-4 font-medium">Price</th>
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
                    <td className="py-3 pr-4 text-xs">{l.category || '—'}</td>
                    <td className="py-3 pr-4 text-xs tabular-nums">
                      {l.priceCredits.toLocaleString()} cr
                    </td>
                    <td className="py-3 pr-4">{listingStatusPill(l.status)}</td>
                    <td className="py-3 text-xs text-zinc-500">{formatDateTime(l.createdAt)}</td>
                  </tr>
                ))}
                {(!recentListings || recentListings.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
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
