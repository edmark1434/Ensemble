import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Coins,
  Flag,
  Hand,
  Loader2,
  Package,
  RefreshCw,
  ShieldAlert,
  ShoppingBag,
  Ticket,
  TimerReset,
  XCircle,
} from 'lucide-react';
import api from '@/lib/axios';
import useGlobalState from '@/lib/global_state';
import {
  ChartCard,
  DonutChart,
  HorizontalBarChart,
} from '@/pages/admin/analytics/components/AnalyticsCharts';
import { ReportCaseDetailModal } from '@/pages/admin/moderation/CaseDetailModals';
import ModeratorTicketDetailModal from '../shared/ModeratorTicketDetailModal';
import { PriorityBadge, StatusBadge, titleCaseWords } from '../shared/ui';
import { listingStatusPill } from './ListingDetailModal';
import type { MarketplaceAlert, MarketplaceOverview } from './marketplaceTypes';

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function MarketplaceModeratorDashboard() {
  const { user } = useGlobalState();
  const navigate = useNavigate();
  const [data, setData] = useState<MarketplaceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<number | string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await api.get('/api/moderator/marketplace/overview');
      if (res.data?.success) setData(res.data.data);
      else setError(res.data?.message || 'Failed to load marketplace dashboard');
    } catch {
      setError('Failed to load marketplace dashboard');
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

  const kpiCards = [
    {
      label: 'Pending listings',
      value: summary.pendingListings,
      sub: `${summary.totalListings} total · ${summary.approvedListings} live`,
      icon: Package,
      accent: 'text-amber-300',
    },
    {
      label: 'Catalog value',
      value: summary.approvedCreditValue.toLocaleString(),
      sub: `${summary.approvedListings} approved · ${summary.delistedListings} delisted`,
      icon: Coins,
      accent: 'text-emerald-300',
    },
    {
      label: 'Open marketplace tickets',
      value: summary.openTickets,
      sub: `${summary.totalTickets} total · ${summary.inProgressTickets} in progress`,
      icon: Ticket,
      accent: 'text-sky-300',
    },
    {
      label: 'Unassigned tickets',
      value: summary.unassignedTickets,
      sub: `${summary.awaitingReplyTickets} awaiting member reply`,
      icon: Hand,
      accent: 'text-amber-300',
    },
    {
      label: 'High priority tickets',
      value: summary.highPriorityTickets,
      sub: `${summary.escalatedTickets} escalated into this queue`,
      icon: TimerReset,
      accent: 'text-rose-300',
    },
    {
      label: 'Open marketplace reports',
      value: summary.openReports,
      sub: `${summary.totalReports} total · ${summary.unassignedReports} unassigned`,
      icon: Flag,
      accent: 'text-fuchsia-300',
    },
  ];

  return (
    <main className="min-h-screen md:pl-[260px]">
      {selectedTicketId != null && (
        <ModeratorTicketDetailModal
          ticketId={selectedTicketId}
          endpointBase="/api/moderator/marketplace/tickets"
          accent="rose"
          onClose={() => setSelectedTicketId(null)}
          onUpdated={() => void load(true)}
        />
      )}
      {selectedReportId != null && (
        <ReportCaseDetailModal
          reportId={selectedReportId}
          endpointBase="/api/moderator/marketplace/reports"
          accent="amber"
          onClose={() => setSelectedReportId(null)}
          onUpdated={() => void load(true)}
        />
      )}

      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between md:px-8">
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
            className="flex items-center gap-2 self-start rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
        <div className="flex flex-wrap gap-2">
          {alerts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => handleAlertClick(a)}
              className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-xs transition hover:brightness-110 ${
                a.severity === 'error'
                  ? 'border-red-500/30 bg-red-500/10 text-red-200'
                  : a.severity === 'warning'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                    : a.severity === 'success'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-white/10 bg-white/[0.03] text-zinc-300'
              }`}
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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {kpiCards.map(({ label, value, sub, icon: Icon, accent }) => (
            <div
              key={label}
              className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-transparent p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    {label}
                  </p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-white">{value}</p>
                  <p className="mt-1 text-xs text-zinc-500">{sub}</p>
                </div>
                <div className={`rounded-xl bg-white/[0.04] p-2.5 ${accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat
            icon={ShoppingBag}
            label="Approved listings"
            value={summary.approvedListings}
            sub={`${summary.approvedCreditValue.toLocaleString()} credits live`}
          />
          <MiniStat
            icon={XCircle}
            label="Rejected"
            value={summary.rejectedListings}
            sub="Policy / quality rejections"
          />
          <MiniStat
            icon={Archive}
            label="Delisted"
            value={summary.delistedListings}
            sub="Removed from catalog"
          />
          <MiniStat
            icon={ShieldAlert}
            label="Restricted accounts"
            value={summary.restrictedAccounts}
            sub="Suspended or banned"
          />
        </div>

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
            <HorizontalBarChart title="Listings by category" data={charts.listingCategories || []} />
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
            <HorizontalBarChart title="Tickets by type" data={charts.ticketCategories || []} />
          </ChartCard>
          <ChartCard>
            <HorizontalBarChart title="Reports by target" data={charts.reportTypes || []} />
          </ChartCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 xl:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-white">Marketplace ticket queue</h2>
                <p className="mt-1 text-xs text-zinc-600">
                  Asset / listing / purchase tickets only — click a row to open.
                </p>
              </div>
              <Link
                to="/moderator/marketplace/ticket-management"
                className="text-xs font-medium text-amber-300 hover:underline"
              >
                Open desk
              </Link>
            </div>
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
                      onClick={() => setSelectedTicketId(t.id)}
                      className="cursor-pointer border-b border-white/[0.04] text-zinc-300 transition hover:bg-white/[0.03]"
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
                        {t.assignee?.name || (
                          <span className="text-amber-200/90">Unassigned</span>
                        )}
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-white">Marketplace reports</h2>
                <p className="mt-1 text-xs text-zinc-600">
                  Listing / seller / purchase / asset reports.
                </p>
              </div>
              <Link
                to="/moderator/marketplace/reports"
                className="text-xs font-medium text-amber-300 hover:underline"
              >
                Open desk
              </Link>
            </div>
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
                    <p className="line-clamp-1 text-sm text-white">{r.reason}</p>
                    <p className="text-[11px] text-zinc-500">
                      {r.targetLabel || r.targetId} · {r.targetType}
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">Recent listing submissions</h2>
              <p className="mt-1 text-xs text-zinc-600">
                Latest assets entering the review queue — open Control to moderate.
              </p>
            </div>
            <Link
              to="/moderator/marketplace/marketplace-control"
              className="text-xs font-medium text-amber-300 hover:underline"
            >
              Open control
            </Link>
          </div>
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
                    onClick={() => navigate('/moderator/marketplace/marketplace-control')}
                    className="cursor-pointer border-b border-white/[0.04] text-zinc-300 transition hover:bg-white/[0.03]"
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

function MiniStat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Package;
  label: string;
  value: string | number;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="rounded-xl bg-amber-500/15 p-2.5 text-amber-300">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-zinc-500">{label}</p>
        <p className="text-2xl font-bold tabular-nums text-white">{value}</p>
        <p className="text-[11px] text-zinc-600">{sub}</p>
      </div>
    </div>
  );
}
