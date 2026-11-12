import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Clock,
  Coins,
  FileSignature,
  Flag,
  Gauge,
  Gem,
  Hand,
  Inbox,
  Loader2,
  Lock,
  MessageSquareReply,
  RefreshCw,
  Scale,
  Star,
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
  LineChart,
} from '@/pages/admin/analytics/components/AnalyticsCharts';
import { ReportCaseDetailModal } from '@/pages/admin/moderation/CaseDetailModals';
import ModeratorTicketDetailModal from '../shared/ModeratorTicketDetailModal';
import ModeratorDisputeDetailModal from '../shared/ModeratorDisputeDetailModal';
import type { Alert, JobsOverview, JobsQueueHealth } from '../shared/moderatorTypes';
import { PriorityBadge, StatusBadge, titleCaseWords } from '../shared/ui';
import PostingDetailModal from './PostingDetailModal';
import { formatCredits, relativeTime, statusPill, typeBadge } from './postingUi';

const API_BASE = '/api/moderator/jobs';
const OVERVIEW_URL = `${API_BASE}/overview`;

const EMPTY_HEALTH: JobsQueueHealth = {
  oldestOpenTicketAt: null,
  ticketsOver48h: 0,
  ticketsOver7d: 0,
  ticketsNeverAnswered: 0,
  ticketsResolvedLast7d: 0,
  avgTicketResolutionHours: null,
  avgFirstReplyHours: null,
  oldestOpenReportAt: null,
  reportsOver48h: 0,
  reportsClosedLast7d: 0,
  oldestOpenDisputeAt: null,
  disputesOver7d: 0,
  unassignedDisputes: 0,
  disputesResolvedLast7d: 0,
  postingsLast24h: 0,
  staleActivePostings: 0,
  stalePendingProposals: 0,
  stalePendingRequests: 0,
  postingActionsLast7d: 0,
  postingActionsLast24h: 0,
  lastPostingActionAt: null,
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function hours(value: number | null | undefined) {
  if (value === null || value === undefined) return 'No data';
  if (value < 1) return `${Math.round(value * 60)}m`;
  if (value >= 48) return `${Math.round((value / 24) * 10) / 10}d`;
  return `${value}h`;
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
        <Link to={to} className="text-xs font-medium text-emerald-300 hover:underline">
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

function MetricRow({
  items,
}: {
  items: { label: string; value: string | number; warn?: boolean }[];
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl border border-white/[0.08] bg-[#14151c] px-4 py-4 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{item.label}</dt>
          <dd
            className={`mt-1 text-base font-semibold tabular-nums ${
              item.warn ? 'text-amber-200' : 'text-zinc-100'
            }`}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 ${className}`}>
      {children}
    </section>
  );
}

function rowKeyHandler(open: () => void) {
  return (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
    }
  };
}

export default function JobsModeratorDashboard() {
  const { user } = useGlobalState();
  const navigate = useNavigate();
  const [data, setData] = useState<JobsOverview | null>(() => {
    const cached = peekStaffGet(OVERVIEW_URL);
    return cached?.data?.success ? cached.data.data : null;
  });
  const [loading, setLoading] = useState(!data);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<number | string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | string | null>(null);
  const [selectedDisputeId, setSelectedDisputeId] = useState<number | string | null>(null);
  const [selectedPosting, setSelectedPosting] = useState<{
    type: 'job' | 'gig';
    id: string;
    title?: string;
  } | null>(null);
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
      } else if (!hasData.current) setError(res.data?.message || 'Failed to load jobs dashboard');
    } catch {
      if (!hasData.current) setError('Failed to load jobs dashboard');
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

  const jobsTeam = useMemo(
    () =>
      (data?.staffWorkload || [])
        .filter((s) => /jobs/i.test(String(s.role || '')))
        .sort((a, b) => b.totalOpen - a.totalOpen)
        .slice(0, 6),
    [data?.staffWorkload]
  );

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

  const { summary, charts, recentTickets, recentPostings, flaggedReports, disputes, alerts } = data;
  const health = data.queueHealth || EMPTY_HEALTH;
  const flaggedPostings = data.flaggedPostings || [];
  const pausedPostings = (summary.pausedJobs ?? 0) + (summary.pausedGigs ?? 0);
  const closedPostings = (summary.closedJobs ?? 0) + (summary.closedGigs ?? 0);
  const archivedPostings = (summary.archivedJobs ?? 0) + (summary.archivedGigs ?? 0);

  return (
    <main className="min-h-screen md:pl-[260px]">
      {selectedTicketId != null && (
        <ModeratorTicketDetailModal
          ticketId={selectedTicketId}
          endpointBase={`${API_BASE}/tickets`}
          accent="emerald"
          onClose={() => setSelectedTicketId(null)}
          onUpdated={() => void load(true)}
        />
      )}
      {selectedReportId != null && (
        <ReportCaseDetailModal
          reportId={selectedReportId}
          endpointBase={`${API_BASE}/reports`}
          accent="emerald"
          onClose={() => setSelectedReportId(null)}
          onUpdated={() => void load(true)}
        />
      )}
      {selectedDisputeId != null && (
        <ModeratorDisputeDetailModal
          disputeId={selectedDisputeId}
          endpointBase={`${API_BASE}/disputes`}
          accent="emerald"
          adminMode
          onClose={() => setSelectedDisputeId(null)}
          onUpdated={() => void load(true)}
          onOpenDispute={(id) => setSelectedDisputeId(id)}
        />
      )}
      {selectedPosting && (
        <PostingDetailModal
          type={selectedPosting.type}
          id={selectedPosting.id}
          seedTitle={selectedPosting.title}
          apiBase={API_BASE}
          onClose={() => setSelectedPosting(null)}
          onUpdated={() => void load(true)}
        />
      )}

      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-6 py-4 md:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400/80">
              Hiring marketplace control center
            </p>
            <h1 className="text-xl font-bold text-white">Jobs &amp; Gigs dashboard</h1>
            <p className="mt-1 text-xs text-zinc-500">
              Updated {formatDateTime(data.lastUpdated)} · Signed in as @{user?.username || 'jobs'}
              {health.lastPostingActionAt
                ? ` · last posting action ${relativeTime(health.lastPostingActionAt)}`
                : ''}
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

        {/* ── Queue health ─────────────────────────────────────────── */}
        <section className="space-y-3">
          <SectionHeading
            title="Queue health"
            hint="Is the desk keeping up? Ageing cases and response times across tickets, reports and disputes."
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={Timer}
              label="Tickets over 48h"
              value={health.ticketsOver48h}
              sub={
                health.oldestOpenTicketAt
                  ? `Oldest open ticket ${relativeTime(health.oldestOpenTicketAt)} · ${health.ticketsOver7d} over 7d`
                  : 'No open tickets'
              }
              tone="bg-rose-500/15 text-rose-300"
              to="/moderator/jobs/ticket-management?flag=open_only"
            />
            <KpiCard
              icon={MessageSquareReply}
              label="Avg first reply"
              value={hours(health.avgFirstReplyHours)}
              sub={`${health.ticketsNeverAnswered} open ticket(s) never answered · 30 day average`}
              tone="bg-sky-500/15 text-sky-300"
              to="/moderator/jobs/ticket-management"
            />
            <KpiCard
              icon={Gauge}
              label="Avg resolution"
              value={hours(health.avgTicketResolutionHours)}
              sub={`${health.ticketsResolvedLast7d} ticket(s) resolved in the last 7 days`}
              tone="bg-emerald-500/15 text-emerald-300"
            />
            <KpiCard
              icon={Flag}
              label="Reports over 48h"
              value={health.reportsOver48h}
              sub={
                health.oldestOpenReportAt
                  ? `Oldest open report ${relativeTime(health.oldestOpenReportAt)}`
                  : 'No open reports'
              }
              tone="bg-fuchsia-500/15 text-fuchsia-300"
              to="/moderator/jobs/reports"
            />
          </div>
          <MetricRow
            items={[
              { label: 'Reports closed · 7d', value: health.reportsClosedLast7d },
              { label: 'Disputes resolved · 7d', value: health.disputesResolvedLast7d },
              { label: 'Disputes > 7d', value: health.disputesOver7d, warn: health.disputesOver7d > 0 },
              { label: 'Unassigned disputes', value: health.unassignedDisputes, warn: health.unassignedDisputes > 0 },
              { label: 'Posting actions · 7d', value: health.postingActionsLast7d },
              { label: 'Posting actions · 24h', value: health.postingActionsLast24h },
            ]}
          />
        </section>

        {/* ── Board ────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <SectionHeading
            title="Job board"
            hint="What is live, what is reported, and what has gone quiet."
            to="/moderator/jobs/control"
            linkLabel="Open Jobs & Gigs Control"
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={Briefcase}
              label="Active jobs"
              value={summary.activeJobs}
              sub={`${summary.totalJobs} on the board · ${summary.jobsThisWeek} new this week`}
              tone="bg-sky-500/15 text-sky-300"
              to="/moderator/jobs/control"
            />
            <KpiCard
              icon={Gem}
              label="Active gigs"
              value={summary.activeGigs}
              sub={`${summary.totalGigs} on the board · ${summary.gigsThisWeek} new this week`}
              tone="bg-violet-500/15 text-violet-300"
              to="/moderator/jobs/control"
            />
            <KpiCard
              icon={Flag}
              label="Reported postings"
              value={flaggedPostings.length}
              sub={
                flaggedPostings.length
                  ? `${flaggedPostings.reduce((acc, p) => acc + p.openReports, 0)} open report(s) across the most reported`
                  : 'No posting has an open report'
              }
              tone="bg-red-500/15 text-red-300"
              to="/moderator/jobs/control"
            />
            <KpiCard
              icon={Inbox}
              label="Off the board"
              value={pausedPostings + closedPostings + archivedPostings}
              sub={`${pausedPostings} paused · ${closedPostings} closed · ${archivedPostings} archived`}
              tone="bg-zinc-500/15 text-zinc-300"
              to="/moderator/jobs/control"
            />
          </div>
          <MetricRow
            items={[
              { label: 'New · 24h', value: health.postingsLast24h },
              { label: 'New · 7d', value: summary.jobsThisWeek + summary.gigsThisWeek },
              { label: 'Stale active (60d)', value: health.staleActivePostings, warn: health.staleActivePostings > 0 },
              { label: 'Pending proposals', value: summary.pendingProposals },
              { label: 'Proposals idle 14d', value: health.stalePendingProposals, warn: health.stalePendingProposals > 0 },
              { label: 'Requests idle 14d', value: health.stalePendingRequests, warn: health.stalePendingRequests > 0 },
            ]}
          />
        </section>

        {/* ── Contracts & money ────────────────────────────────────── */}
        <section className="space-y-3">
          <SectionHeading
            title="Contracts and escrow"
            hint="Work in progress and the credits it holds. Disputes are claimed and settled by Support."
            to="/moderator/jobs/disputes"
            linkLabel="Open disputes"
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={FileSignature}
              label="Active contracts"
              value={summary.activeContracts}
              sub={`${summary.completedContracts} of ${summary.totalContracts} completed`}
              tone="bg-emerald-500/15 text-emerald-300"
            />
            <KpiCard
              icon={Lock}
              label="Credits in escrow"
              value={summary.creditsInEscrow.toLocaleString()}
              sub="Held for running contracts"
              tone="bg-sky-500/15 text-sky-300"
            />
            <KpiCard
              icon={Scale}
              label="Open disputes"
              value={summary.openDisputes}
              sub={`${summary.creditsAtRisk.toLocaleString()} credits at risk${
                health.oldestOpenDisputeAt ? ` · oldest ${relativeTime(health.oldestOpenDisputeAt)}` : ''
              }`}
              tone="bg-amber-500/15 text-amber-300"
              to="/moderator/jobs/disputes"
            />
            <KpiCard
              icon={Star}
              label="Average rating"
              value={summary.totalRatings > 0 ? `${summary.avgContractRating} / 5` : '—'}
              sub={`${summary.totalRatings} rating(s) left after contracts`}
              tone="bg-fuchsia-500/15 text-fuchsia-300"
            />
          </div>
        </section>

        {/* ── Tickets & reports ────────────────────────────────────── */}
        <section className="space-y-3">
          <SectionHeading
            title="Tickets and reports"
            hint="Only Jobs & Gigs cases reach this console. Miscategorised tickets can be moved to another queue from the ticket."
            to="/moderator/jobs/ticket-management"
            linkLabel="Open ticket desk"
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={Ticket}
              label="Open tickets"
              value={summary.openTickets}
              sub={`${summary.totalTickets} total · ${summary.inProgressTickets ?? 0} in progress`}
              tone="bg-emerald-500/15 text-emerald-300"
              to="/moderator/jobs/ticket-management"
            />
            <KpiCard
              icon={Hand}
              label="Unassigned tickets"
              value={summary.unassignedTickets}
              sub={`${summary.awaitingReplyTickets ?? 0} awaiting a staff reply`}
              tone="bg-amber-500/15 text-amber-300"
              to="/moderator/jobs/ticket-management?assignee=unassigned"
            />
            <KpiCard
              icon={TimerReset}
              label="High priority"
              value={summary.highPriorityTickets ?? 0}
              sub={`${summary.escalatedTickets ?? 0} escalated into this queue`}
              tone="bg-rose-500/15 text-rose-300"
              to="/moderator/jobs/ticket-management?priority=High"
            />
            <KpiCard
              icon={Flag}
              label="Open reports"
              value={summary.openReports ?? 0}
              sub={`${summary.totalReports ?? 0} total · ${summary.unassignedReports ?? 0} unassigned · ${summary.highPriorityReports ?? 0} high`}
              tone="bg-fuchsia-500/15 text-fuchsia-300"
              to="/moderator/jobs/reports"
            />
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <Panel>
            <SectionHeading
              title="Most reported postings"
              hint="Jobs and gigs with unresolved reports — click to review the posting."
              to="/moderator/jobs/control"
              linkLabel="Open control"
            />
            <ul className="mt-4 space-y-2">
              {flaggedPostings.map((p) => (
                <li key={`${p.postingId}-${p.reportId}`}>
                  <button
                    type="button"
                    disabled={!p.postingType}
                    onClick={() =>
                      p.postingType &&
                      setSelectedPosting({ type: p.postingType, id: p.postingId, title: p.postingTitle })
                    }
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 text-left transition hover:bg-white/[0.04]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {p.postingType && typeBadge(p.postingType)}
                        <p className="truncate text-sm font-medium text-white">{p.postingTitle}</p>
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        {p.reportType} · oldest filed {relativeTime(p.createdAt)}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-300">
                      <Flag className="h-3 w-3" />
                      {p.openReports}
                    </span>
                  </button>
                </li>
              ))}
              {flaggedPostings.length === 0 && (
                <li className="py-8 text-center text-sm text-zinc-500">No posting has an open report.</li>
              )}
            </ul>
          </Panel>

          <Panel>
            <SectionHeading
              title="Report queue"
              hint="Job, gig, contract, proposal and review reports — click to open the case."
              to="/moderator/jobs/reports"
            />
            <ul className="mt-4 max-h-[360px] space-y-2 overflow-y-auto">
              {(flaggedReports || []).map((r) => (
                <li key={String(r.id)}>
                  <button
                    type="button"
                    onClick={() => setSelectedReportId(r.id)}
                    className="flex w-full flex-col gap-1 rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 text-left transition hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-xs text-emerald-200">{r.number}</p>
                      <span className="flex items-center gap-1.5">
                        <PriorityBadge priority={r.priority || 'medium'} />
                        <span className="text-[10px] text-zinc-500">{titleCaseWords(r.status)}</span>
                      </span>
                    </div>
                    <p className="line-clamp-1 text-sm text-white">{r.subjectTitle || r.type}</p>
                    <p className="text-[11px] text-zinc-500">
                      {titleCaseWords(r.targetType)} · {r.type}
                      {r.assignee ? ` · ${r.assignee.name}` : ' · Unassigned'} · {relativeTime(r.createdAt)}
                    </p>
                  </button>
                </li>
              ))}
              {(!flaggedReports || flaggedReports.length === 0) && (
                <li className="py-8 text-center text-sm text-zinc-500">No Jobs &amp; Gigs reports.</li>
              )}
            </ul>
          </Panel>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Panel className="xl:col-span-2">
            <SectionHeading
              title="Ticket queue"
              hint="Hiring, contract and payment tickets only — click a row to open the case."
              to="/moderator/jobs/ticket-management"
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
                      onKeyDown={rowKeyHandler(() => setSelectedTicketId(t.id))}
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
                      <td className="py-3 text-xs text-zinc-500">{formatDateTime(t.updatedAt || t.createdAt)}</td>
                    </tr>
                  ))}
                  {(!recentTickets || recentTickets.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500">
                        No Jobs &amp; Gigs tickets in queue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel>
            <SectionHeading
              title="Active disputes"
              hint="Credits held while cases are open — click to review."
              to="/moderator/jobs/disputes"
            />
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
                        {d.number} · {d.creditAmount.toLocaleString()} credits · opened {relativeTime(d.openedAt)}
                      </p>
                      <p className="text-[11px] text-zinc-600">
                        {d.assignee ? `Handled by ${d.assignee.name}` : 'Unassigned'}
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
          </Panel>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Panel className="xl:col-span-2">
            <SectionHeading
              title="Latest postings"
              hint="Newest jobs and gigs on the board — click a row to review it here."
              to="/moderator/jobs/control"
              linkLabel="Open control"
            />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wide text-zinc-600">
                    <th className="pb-2 pr-4 font-medium">Posting</th>
                    <th className="pb-2 pr-4 font-medium">Owner</th>
                    <th className="pb-2 pr-4 font-medium">Rate</th>
                    <th className="pb-2 pr-4 font-medium">Pipeline</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium">Posted</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentPostings || []).map((p) => (
                    <tr
                      key={`${p.type}-${p.id}`}
                      tabIndex={0}
                      onClick={() => setSelectedPosting({ type: p.type, id: String(p.id), title: p.title })}
                      onKeyDown={rowKeyHandler(() =>
                        setSelectedPosting({ type: p.type, id: String(p.id), title: p.title })
                      )}
                      className="cursor-pointer border-b border-white/[0.04] text-zinc-300 transition hover:bg-white/[0.03] focus:bg-white/[0.04] focus:outline-none"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          {typeBadge(p.type)}
                          <p className="max-w-[220px] truncate font-medium text-white">{p.title}</p>
                          {(p.openReportCount ?? 0) > 0 && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500/10 px-1.5 py-px text-[10px] text-red-300">
                              <Flag className="h-2.5 w-2.5" />
                              {p.openReportCount}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 font-mono text-[11px] text-zinc-500">
                          {p.postNumber} · {p.category || 'Uncategorized'}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-xs">@{p.author.handle}</td>
                      <td className="py-3 pr-4 text-xs tabular-nums">
                        {formatCredits(p.rateCreditsMin, p.rateCreditsMax)} cr
                      </td>
                      <td className="py-3 pr-4 text-xs">
                        {p.applicantCount} {p.type === 'job' ? 'proposals' : 'requests'} · {p.contractCount}{' '}
                        contracts
                      </td>
                      <td className="py-3 pr-4">{statusPill(p.status)}</td>
                      <td className="py-3 text-xs text-zinc-500" title={formatDateTime(p.createdAt)}>
                        {relativeTime(p.createdAt)}
                      </td>
                    </tr>
                  ))}
                  {(!recentPostings || recentPostings.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500">
                        No postings yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel>
            <SectionHeading
              title="Team workload"
              hint="Open cases held by Jobs & Gigs moderators."
            />
            <ul className="mt-4 space-y-2">
              {jobsTeam.map((s) => (
                <li
                  key={String(s.staffId)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{s.name}</p>
                    <p className="text-[11px] text-zinc-500">
                      {s.openTickets} tickets · {s.openReports} reports
                      {typeof s.openDisputes === 'number' ? ` · ${s.openDisputes} disputes` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-white/[0.05] px-2 py-1 text-xs font-semibold tabular-nums text-zinc-200">
                    {s.totalOpen}
                  </span>
                </li>
              ))}
              {jobsTeam.length === 0 && (
                <li className="py-8 text-center text-sm text-zinc-500">No Jobs &amp; Gigs moderators found.</li>
              )}
            </ul>
          </Panel>
        </div>

        {/* ── Trends ───────────────────────────────────────────────── */}
        <section className="space-y-3">
          <SectionHeading title="Trends" hint="Board activity and the mix across postings, contracts and cases." />
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard className="lg:col-span-2">
              <LineChart
                title="New postings (last 14 days)"
                labels={charts.postingTrend.map((p) =>
                  new Date(p.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                )}
                series={[
                  { label: 'Jobs', color: '#60a5fa', values: charts.postingTrend.map((p) => p.jobs) },
                  { label: 'Gigs', color: '#a78bfa', values: charts.postingTrend.map((p) => p.gigs) },
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
              <HorizontalBarChart
                title="Postings by category"
                data={charts.postingCategories || charts.jobCategories || []}
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
              <HorizontalBarChart title="Jobs by experience level" data={charts.experienceLevels || []} />
            </ChartCard>
            <ChartCard>
              <HorizontalBarChart title="Tickets by type" data={charts.ticketCategories || []} />
            </ChartCard>
            <ChartCard>
              <HorizontalBarChart title="Reports by target" data={charts.reportTypes || []} />
            </ChartCard>
            <ChartCard>
              <DonutChart
                title="Reports by status"
                segments={(charts.reportStatusMix || []).map((s) => ({
                  label: s.label,
                  value: s.value,
                  color: s.color || '#fb7185',
                }))}
              />
            </ChartCard>
            <ChartCard>
              <DonutChart
                title="Disputes by status"
                segments={charts.disputeStatusMix.map((s) => ({
                  label: s.label,
                  value: s.value,
                  color: s.color || '#fbbf24',
                }))}
              />
            </ChartCard>
          </div>
        </section>

        <p className="flex items-center gap-1.5 text-[11px] text-zinc-600">
          <Clock className="h-3 w-3" />
          Response times are 30-day averages. Ageing targets: tickets and reports 48 hours, disputes 7 days.
          <Coins className="ml-2 h-3 w-3" />
          Credits figures are live wallet balances.
        </p>
      </div>
    </main>
  );
}
