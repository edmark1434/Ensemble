import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Archive,
  Briefcase,
  CheckCircle2,
  Coins,
  FileSignature,
  FileText,
  Flag,
  Gem,
  Hand,
  Inbox,
  Loader2,
  Lock,
  Pause,
  RefreshCw,
  Scale,
  Star,
  Ticket,
  TimerReset,
} from 'lucide-react';
import api from '@/lib/axios';
import useGlobalState from '@/lib/global_state';
import {
  ChartCard,
  DonutChart,
  HorizontalBarChart,
  LineChart,
} from '@/pages/admin/analytics/components/AnalyticsCharts';
import { ReportCaseDetailModal } from '@/pages/admin/moderation/CaseDetailModals';
import ModeratorTicketDetailModal from '../shared/ModeratorTicketDetailModal';
import ModeratorDisputeDetailModal from '../shared/ModeratorDisputeDetailModal';
import type { Alert, JobsOverview } from '../shared/moderatorTypes';
import { PriorityBadge, StatusBadge, titleCaseWords } from '../shared/ui';

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function postingStatusClass(status: string) {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'open') return 'bg-emerald-500/15 text-emerald-300';
  if (s === 'paused') return 'bg-amber-500/15 text-amber-300';
  if (s === 'closed') return 'bg-zinc-500/15 text-zinc-300';
  if (s === 'archived') return 'bg-red-500/15 text-red-300';
  return 'bg-zinc-500/15 text-zinc-300';
}

export default function JobsModeratorDashboard() {
  const { user } = useGlobalState();
  const navigate = useNavigate();
  const [data, setData] = useState<JobsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<number | string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | string | null>(null);
  const [selectedDisputeId, setSelectedDisputeId] = useState<number | string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await api.get('/api/moderator/jobs/overview');
      if (res.data?.success) setData(res.data.data);
      else setError(res.data?.message || 'Failed to load jobs dashboard');
    } catch {
      setError('Failed to load jobs dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAlertClick = (alert: Alert) => {
    const tab = alert.action?.tab;
    if (!tab) return;
    if (tab === 'ticket-management') {
      const params = new URLSearchParams(alert.action?.ticketFilters || {});
      navigate(`/moderator/jobs/ticket-management?${params.toString()}`);
      return;
    }
    navigate(`/moderator/jobs/${tab}`);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center md:pl-[260px]">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="p-8 md:pl-[284px]">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          {error || 'Failed to load jobs dashboard'}
          <button type="button" onClick={() => void load()} className="mt-4 block text-sm underline">
            Retry
          </button>
        </div>
      </main>
    );
  }

  const { summary, charts, recentTickets, recentPostings, flaggedReports, disputes, alerts } =
    data;

  const pausedPostings = (summary.pausedJobs ?? 0) + (summary.pausedGigs ?? 0);
  const archivedPostings = (summary.archivedJobs ?? 0) + (summary.archivedGigs ?? 0);

  const kpiCards = [
    {
      label: 'Active jobs',
      value: summary.activeJobs,
      sub: `${summary.totalJobs} total · ${summary.jobsThisWeek} new this week`,
      icon: Briefcase,
      accent: 'text-sky-300',
    },
    {
      label: 'Active gigs',
      value: summary.activeGigs,
      sub: `${summary.totalGigs} total · ${summary.gigsThisWeek} new this week`,
      icon: Gem,
      accent: 'text-violet-300',
    },
    {
      label: 'Open jobs & gigs tickets',
      value: summary.openTickets,
      sub: `${summary.totalTickets} total · ${summary.inProgressTickets ?? 0} in progress`,
      icon: Ticket,
      accent: 'text-emerald-300',
    },
    {
      label: 'Unassigned tickets',
      value: summary.unassignedTickets,
      sub: `${summary.awaitingReplyTickets ?? 0} awaiting member reply`,
      icon: Hand,
      accent: 'text-amber-300',
    },
    {
      label: 'High priority tickets',
      value: summary.highPriorityTickets ?? 0,
      sub: `${summary.escalatedTickets ?? 0} escalated into this queue`,
      icon: TimerReset,
      accent: 'text-rose-300',
    },
    {
      label: 'Open jobs & gigs reports',
      value: summary.openReports ?? 0,
      sub: `${summary.totalReports ?? 0} total · ${summary.unassignedReports ?? 0} unassigned`,
      icon: Flag,
      accent: 'text-fuchsia-300',
    },
  ];

  return (
    <main className="min-h-screen md:pl-[260px]">
      {selectedTicketId != null && (
        <ModeratorTicketDetailModal
          ticketId={selectedTicketId}
          endpointBase="/api/moderator/jobs/tickets"
          accent="emerald"
          onClose={() => setSelectedTicketId(null)}
          onUpdated={() => void load(true)}
        />
      )}
      {selectedReportId != null && (
        <ReportCaseDetailModal
          reportId={selectedReportId}
          endpointBase="/api/moderator/jobs/reports"
          accent="emerald"
          onClose={() => setSelectedReportId(null)}
          onUpdated={() => void load(true)}
        />
      )}
      {selectedDisputeId != null && (
        <ModeratorDisputeDetailModal
          disputeId={selectedDisputeId}
          endpointBase="/api/moderator/jobs/disputes"
          accent="emerald"
          onClose={() => setSelectedDisputeId(null)}
          onUpdated={() => void load(true)}
        />
      )}

      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between md:px-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400/80">
              Hiring marketplace control center
            </p>
            <h1 className="text-xl font-bold text-white">Jobs &amp; Gigs dashboard</h1>
            <p className="mt-1 text-xs text-zinc-500">
              Updated {formatDateTime(data.lastUpdated)} · Signed in as @
              {user?.username || 'jobs'}
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
            icon={Pause}
            label="Paused postings"
            value={pausedPostings}
            sub={`${summary.pausedJobs ?? 0} jobs · ${summary.pausedGigs ?? 0} gigs`}
          />
          <MiniStat
            icon={Archive}
            label="Archived"
            value={archivedPostings}
            sub="Soft-deleted from board"
          />
          <MiniStat
            icon={FileSignature}
            label="Active contracts"
            value={summary.activeContracts}
            sub={`${summary.completedContracts} of ${summary.totalContracts} completed`}
          />
          <MiniStat
            icon={Scale}
            label="Open disputes"
            value={summary.openDisputes}
            sub={`${summary.creditsAtRisk.toLocaleString()} credits at risk`}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat
            icon={FileText}
            label="Pending proposals"
            value={summary.pendingProposals}
            sub={`${summary.totalProposals} proposals total`}
          />
          <MiniStat
            icon={Inbox}
            label="Gig requests"
            value={summary.pendingGigRequests}
            sub={`${summary.totalGigRequests} total requests`}
          />
          <MiniStat
            icon={Lock}
            label="Credits in escrow"
            value={summary.creditsInEscrow.toLocaleString()}
            sub="Held for active contracts"
          />
          <MiniStat
            icon={Star}
            label="Avg rating"
            value={summary.totalRatings > 0 ? `${summary.avgContractRating} / 5` : '—'}
            sub={`${summary.totalRatings} rating(s)`}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard>
            <LineChart
              title="New postings (last 14 days)"
              labels={charts.postingTrend.map((p) =>
                new Date(p.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              )}
              series={[
                { label: 'Jobs', color: '#60a5fa', values: charts.postingTrend.map((p) => p.jobs) },
                { label: 'Gigs', color: '#34d399', values: charts.postingTrend.map((p) => p.gigs) },
              ]}
            />
          </ChartCard>
          <ChartCard>
            <DonutChart
              title="Postings by status"
              segments={(charts.postingStatusMix || []).map((s) => ({
                label: s.label,
                value: s.value,
                color: s.color || '#34d399',
              }))}
            />
          </ChartCard>
          <ChartCard>
            <DonutChart
              title="Postings by type"
              segments={charts.postingsMix.map((s) => ({
                label: s.label,
                value: s.value,
                color: s.color || '#34d399',
              }))}
            />
          </ChartCard>
          <ChartCard>
            <DonutChart
              title="Contracts by status"
              segments={charts.contractStatusMix.map((s) => ({
                label: s.label,
                value: s.value,
                color: s.color || '#34d399',
              }))}
            />
          </ChartCard>
          <ChartCard>
            <DonutChart
              title="Jobs & gigs tickets by status"
              segments={charts.ticketStatusMix.map((s) => ({
                label: s.label,
                value: s.value,
                color: s.color || '#34d399',
              }))}
            />
          </ChartCard>
          <ChartCard>
            <DonutChart
              title="Jobs & gigs reports by status"
              segments={(charts.reportStatusMix || []).map((s) => ({
                label: s.label,
                value: s.value,
                color: s.color || '#fb7185',
              }))}
            />
          </ChartCard>
          <ChartCard>
            <HorizontalBarChart
              title="Tickets by type"
              data={charts.ticketCategories || []}
            />
          </ChartCard>
          <ChartCard>
            <HorizontalBarChart title="Reports by target" data={charts.reportTypes || []} />
          </ChartCard>
          <ChartCard>
            <HorizontalBarChart title="Jobs by category" data={charts.jobCategories || []} />
          </ChartCard>
          <ChartCard>
            <HorizontalBarChart
              title="Jobs by experience level"
              data={charts.experienceLevels || []}
            />
          </ChartCard>
          <ChartCard>
            <DonutChart
              title="Disputes by status"
              segments={charts.disputeStatusMix.map((s) => ({
                label: s.label,
                value: s.value,
                color: s.color || '#34d399',
              }))}
            />
          </ChartCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 xl:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-white">Jobs &amp; gigs ticket queue</h2>
                <p className="mt-1 text-xs text-zinc-600">
                  Hiring / contract / payment tickets only — click a row to open.
                </p>
              </div>
              <Link
                to="/moderator/jobs/ticket-management"
                className="text-xs font-medium text-emerald-300 hover:underline"
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
                        No jobs/gigs tickets in queue.
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
                <h2 className="font-semibold text-white">Jobs &amp; gigs reports</h2>
                <p className="mt-1 text-xs text-zinc-600">
                  Job / gig / contract / proposal / feedback targets.
                </p>
              </div>
              <Link
                to="/moderator/jobs/reports"
                className="text-xs font-medium text-emerald-300 hover:underline"
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
                      <p className="text-xs font-medium text-emerald-200">{r.number}</p>
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
                <li className="py-8 text-center text-sm text-zinc-500">No jobs/gigs reports.</li>
              )}
            </ul>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-white">Active disputes</h2>
                <p className="mt-1 text-xs text-zinc-600">
                  Credits held while cases are open — click to review.
                </p>
              </div>
              <Link
                to="/moderator/jobs/disputes"
                className="text-xs font-medium text-emerald-300 hover:underline"
              >
                Open desk
              </Link>
            </div>
            <ul className="mt-4 max-h-[420px] space-y-2 overflow-y-auto">
              {(disputes || []).map((d) => (
                <li key={String(d.id)}>
                  <button
                    type="button"
                    onClick={() => setSelectedDisputeId(d.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 text-left transition hover:bg-white/[0.04]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{d.title}</p>
                      <p className="text-[11px] text-zinc-500">
                        {d.number} · {d.creditAmount.toLocaleString()} credits ·{' '}
                        {d.relatedEntityType || '—'}
                      </p>
                    </div>
                    <StatusBadge status={d.status} />
                  </button>
                </li>
              ))}
              {(!disputes || disputes.length === 0) && (
                <li className="py-8 text-center text-sm text-zinc-500">No open disputes.</li>
              )}
            </ul>
          </section>

          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 xl:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-white">Recent job &amp; gig postings</h2>
                <p className="mt-1 text-xs text-zinc-600">
                  Latest board activity — open Control to pause, close, or archive.
                </p>
              </div>
              <Link
                to="/moderator/jobs/control"
                className="text-xs font-medium text-emerald-300 hover:underline"
              >
                Open control
              </Link>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wide text-zinc-600">
                    <th className="pb-2 pr-4 font-medium">Posting</th>
                    <th className="pb-2 pr-4 font-medium">Author</th>
                    <th className="pb-2 pr-4 font-medium">Pipeline</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentPostings || []).map((p) => (
                    <tr
                      key={`${p.type}-${p.id}`}
                      onClick={() => navigate('/moderator/jobs/control')}
                      className="cursor-pointer border-b border-white/[0.04] text-zinc-300 transition hover:bg-white/[0.03]"
                    >
                      <td className="py-3 pr-4">
                        <p className="font-medium text-white">{p.title}</p>
                        <p className="font-mono text-[11px] text-zinc-500">
                          {p.postNumber} · {p.type}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-xs">@{p.author.handle}</td>
                      <td className="py-3 pr-4 text-xs">
                        {p.applicantCount} applicants · {p.contractCount} contracts
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${postingStatusClass(p.status)}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-zinc-500">
                        {formatDateTime(p.createdAt)}
                      </td>
                    </tr>
                  ))}
                  {(!recentPostings || recentPostings.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-500">
                        No postings yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <QuickLink
            icon={Hand}
            label="Unassigned tickets"
            value={summary.unassignedTickets}
            to="/moderator/jobs/ticket-management"
          />
          <QuickLink
            icon={TimerReset}
            label="High priority"
            value={summary.highPriorityTickets ?? 0}
            to="/moderator/jobs/ticket-management"
          />
          <QuickLink
            icon={Coins}
            label="Credits at risk"
            value={summary.creditsAtRisk.toLocaleString()}
            to="/moderator/jobs/disputes"
          />
        </div>
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
  icon: typeof Briefcase;
  label: string;
  value: string | number;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="rounded-xl bg-emerald-500/15 p-2.5 text-emerald-300">
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

function QuickLink({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: typeof Hand;
  label: string;
  value: string | number;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition hover:border-emerald-500/30 hover:bg-emerald-500/[0.04]"
    >
      <Icon className="h-4 w-4 text-emerald-400" />
      <div>
        <p className="text-sm font-semibold text-white">{value}</p>
        <p className="text-[11px] text-zinc-500">{label}</p>
      </div>
    </Link>
  );
}
