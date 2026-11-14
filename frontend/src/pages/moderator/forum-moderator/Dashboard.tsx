import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Flag,
  Hand,
  Info,
  Loader2,
  Lock,
  MessageSquare,
  MessagesSquare,
  Pin,
  RefreshCw,
  Ticket,
  TimerReset,
  Users,
  UsersRound,
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
import type { Alert, ForumOverview } from '../shared/moderatorTypes';
import { PriorityBadge, StatusBadge, titleCaseWords } from '../shared/ui';

const OVERVIEW_URL = '/api/moderator/forum/overview';

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusPill(status: string) {
  const s = status.toLowerCase();
  if (s === 'active') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
  if (s === 'removed' || s === 'inactive') return 'bg-rose-500/15 text-rose-200 border-rose-500/25';
  return 'bg-zinc-500/15 text-zinc-300 border-white/10';
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
        <Link to={to} className="text-xs font-medium text-violet-300 hover:underline">
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

export default function ForumModeratorDashboard() {
  const { user } = useGlobalState();
  const navigate = useNavigate();
  const [data, setData] = useState<ForumOverview | null>(() => {
    const cached = peekStaffGet(OVERVIEW_URL);
    return cached?.data?.success ? cached.data.data : null;
  });
  const [loading, setLoading] = useState(!data);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<number | string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | string | null>(null);
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
      } else if (!hasData.current) setError(res.data?.message || 'Failed to load forum dashboard');
    } catch {
      if (!hasData.current) setError('Failed to load forum dashboard');
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
      navigate(`/moderator/forum/ticket-management?${params.toString()}`);
      return;
    }
    if (tab === 'forum-discussion' || tab === 'forum-control' || tab === 'groups') {
      const view = tab === 'groups' ? '?view=groups' : '';
      navigate(`/moderator/forum/forum-control${view}`);
      return;
    }
    navigate(`/moderator/forum/${tab}`);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center md:pl-[260px]">
        <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="p-8 md:pl-[284px]">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          {error || 'Failed to load forum dashboard'}
          <button type="button" onClick={() => void load()} className="mt-4 block text-sm underline">
            Retry
          </button>
        </div>
      </main>
    );
  }

  const { summary, forumContent, charts, recentTickets, flaggedReports, alerts, notice } = data;
  const content = forumContent?.available ? forumContent : null;
  const workload = data.staffWorkload || [];

  return (
    <main className="min-h-screen md:pl-[260px]">
      {selectedTicketId != null && (
        <ModeratorTicketDetailModal
          ticketId={selectedTicketId}
          endpointBase="/api/moderator/forum/tickets"
          accent="violet"
          onClose={() => setSelectedTicketId(null)}
          onUpdated={() => void load(true)}
        />
      )}
      {selectedReportId != null && (
        <ReportCaseDetailModal
          reportId={selectedReportId}
          endpointBase="/api/moderator/forum/reports"
          accent="violet"
          onClose={() => setSelectedReportId(null)}
          onUpdated={() => void load(true)}
        />
      )}

      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-6 py-4 md:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-400/80">
              Community control center
            </p>
            <h1 className="text-xl font-bold text-white">Forum dashboard</h1>
            <p className="mt-1 text-xs text-zinc-500">
              Updated {formatDateTime(data.lastUpdated)} · Signed in as @{user?.username || 'forum'}
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
        {notice && (
          <div className="flex items-start gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3 text-sm text-violet-100">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
            <p>{notice}</p>
          </div>
        )}

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
            title="Community content"
            hint="Live groups and discussions from the member forums."
            to="/moderator/forum/forum-control"
            linkLabel="Open Forum Control"
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={UsersRound}
              label="Forum groups"
              value={content?.totalGroups ?? '—'}
              sub={
                content
                  ? `${content.activeGroups} active · ${content.inactiveGroups ?? 0} archived`
                  : 'Mongo unavailable'
              }
              tone="bg-sky-500/15 text-sky-300"
              to="/moderator/forum/forum-control?view=groups"
            />
            <KpiCard
              icon={MessagesSquare}
              label="Discussions"
              value={content?.totalDiscussions ?? '—'}
              sub={
                content
                  ? `${content.removedDiscussions} removed · ${content.totalComments} comments`
                  : 'Mongo unavailable'
              }
              tone="bg-indigo-500/15 text-indigo-300"
              to="/moderator/forum/forum-control"
            />
            <KpiCard
              icon={Lock}
              label="Locked threads"
              value={content?.lockedDiscussions ?? '—'}
              sub="Temporarily closed for posting"
              tone="bg-amber-500/15 text-amber-300"
              to="/moderator/forum/forum-control"
            />
            <KpiCard
              icon={Pin}
              label="Sticky threads"
              value={content?.stickyDiscussions ?? '—'}
              sub="Pinned in group feeds"
              tone="bg-violet-500/15 text-violet-300"
              to="/moderator/forum/forum-control"
            />
          </div>
          {content && (
            <MetricRow
              items={[
                { label: 'Active groups', value: content.activeGroups },
                { label: 'Archived groups', value: content.inactiveGroups ?? 0 },
                { label: 'Comments', value: content.totalComments },
                { label: 'Removed threads', value: content.removedDiscussions },
                { label: 'Locked', value: content.lockedDiscussions ?? 0 },
                { label: 'Pinned', value: content.stickyDiscussions ?? 0 },
              ]}
            />
          )}
        </section>

        <section className="space-y-3">
          <SectionHeading
            title="Tickets and reports"
            hint="Only forum-scoped cases reach this console."
            to="/moderator/forum/ticket-management"
            linkLabel="Open ticket desk"
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              icon={Ticket}
              label="Open forum tickets"
              value={summary.openTickets}
              sub={`${summary.totalTickets} total · ${summary.inProgressTickets ?? 0} in progress`}
              tone="bg-violet-500/15 text-violet-300"
              to="/moderator/forum/ticket-management"
            />
            <KpiCard
              icon={Hand}
              label="Unassigned tickets"
              value={summary.unassignedTickets}
              sub={`${summary.awaitingReplyTickets ?? 0} awaiting member reply`}
              tone="bg-amber-500/15 text-amber-300"
              to="/moderator/forum/ticket-management?assignee=unassigned&flag=open_only"
            />
            <KpiCard
              icon={TimerReset}
              label="High priority tickets"
              value={summary.highPriorityTickets ?? 0}
              sub={`${summary.escalatedTickets ?? 0} escalated into this queue`}
              tone="bg-rose-500/15 text-rose-300"
              to="/moderator/forum/ticket-management?priority=High&flag=open_only"
            />
            <KpiCard
              icon={Flag}
              label="Open forum reports"
              value={summary.flaggedContent}
              sub={`${summary.totalReports} total · ${summary.unassignedReports ?? 0} unassigned`}
              tone="bg-fuchsia-500/15 text-fuchsia-300"
              to="/moderator/forum/reports"
            />
            <KpiCard
              icon={MessageSquare}
              label="High priority reports"
              value={summary.highPriorityReports ?? 0}
              sub="Open forum reports marked high"
              tone="bg-red-500/15 text-red-300"
              to="/moderator/forum/reports"
            />
            <KpiCard
              icon={CheckCircle2}
              label="Resolved this queue"
              value={(summary.resolvedTickets || 0) + (summary.resolvedReports || 0)}
              sub={`${summary.resolvedTickets || 0} tickets · ${summary.resolvedReports || 0} reports closed`}
              tone="bg-emerald-500/15 text-emerald-300"
            />
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeading title="Trends" hint="Live mix across forum tickets and reports." />
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard>
              <DonutChart
                title="Forum tickets by status"
                segments={(charts.ticketStatusMix || []).map((s) => ({
                  label: s.label,
                  value: s.value,
                  color: s.color || '#a78bfa',
                }))}
              />
            </ChartCard>
            <ChartCard>
              <DonutChart
                title="Forum reports by status"
                segments={(charts.reportStatusMix || []).map((s) => ({
                  label: s.label,
                  value: s.value,
                  color: s.color || '#c084fc',
                }))}
              />
            </ChartCard>
            <ChartCard>
              <HorizontalBarChart title="Forum tickets by type" data={charts.ticketCategories || []} />
            </ChartCard>
            <ChartCard>
              <HorizontalBarChart title="Forum reports by target" data={charts.reportTypes || []} />
            </ChartCard>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 xl:col-span-2">
            <SectionHeading
              title="Forum ticket queue"
              hint="Posts, groups, comments and forum appeals only — click a row to open."
              to="/moderator/forum/ticket-management"
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
                  {recentTickets.map((t) => (
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
                        {t.assignee?.name || (
                          <span className="text-amber-200/90">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 text-xs text-zinc-500">
                        {formatDateTime(t.updatedAt || t.createdAt)}
                      </td>
                    </tr>
                  ))}
                  {recentTickets.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500">
                        No forum tickets in queue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <SectionHeading
              title="Forum reports"
              hint="Discussion, comment, group and member reports."
              to="/moderator/forum/reports"
            />
            <ul className="mt-4 max-h-[420px] space-y-2 overflow-y-auto">
              {flaggedReports.map((r) => (
                <li key={String(r.id)}>
                  <button
                    type="button"
                    onClick={() => setSelectedReportId(r.id)}
                    className="flex w-full flex-col gap-1 rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 text-left transition hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-violet-200">{r.number}</p>
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
              {flaggedReports.length === 0 && (
                <li className="py-8 text-center text-sm text-zinc-500">No forum reports.</li>
              )}
            </ul>
          </section>
        </div>

        {content && (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <SectionHeading
                title="Recent groups"
                hint="Newest community groups."
                to="/moderator/forum/forum-control?view=groups"
                linkLabel="Manage groups"
              />
              <ul className="mt-4 space-y-2">
                {(content.recentGroups || []).map((g) => (
                  <li
                    key={g.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{g.name}</p>
                      <p className="text-[11px] text-zinc-500">
                        {g.memberCount} members · {formatDateTime(g.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${statusPill(g.status)}`}
                    >
                      {titleCaseWords(g.status)}
                    </span>
                  </li>
                ))}
                {(!content.recentGroups || content.recentGroups.length === 0) && (
                  <li className="py-6 text-center text-sm text-zinc-500">No groups yet.</li>
                )}
              </ul>
            </section>

            <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <SectionHeading
                title="Recent discussions"
                hint="Latest activity across forum threads."
                to="/moderator/forum/forum-control"
                linkLabel="Manage discussions"
              />
              <ul className="mt-4 space-y-2">
                {(content.recentDiscussions || []).map((d) => (
                  <li
                    key={d.id}
                    className="rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-medium text-white">{d.title}</p>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${statusPill(d.status)}`}
                      >
                        {titleCaseWords(d.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {d.groupName || 'Ungrouped'} · {d.commentCount} comments
                      {d.isLocked ? ' · locked' : ''}
                      {d.isSticky ? ' · sticky' : ''}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-600">{formatDateTime(d.updatedAt)}</p>
                  </li>
                ))}
                {(!content.recentDiscussions || content.recentDiscussions.length === 0) && (
                  <li className="py-6 text-center text-sm text-zinc-500">No discussions yet.</li>
                )}
              </ul>
            </section>
          </div>
        )}

        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <SectionHeading
            title="Forum team workload"
            hint="Open tickets and reports held by Forum Moderators."
            to="/moderator/forum/user-team"
            linkLabel="User & Team"
          />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wide text-zinc-600">
                  <th className="pb-2 pr-4 font-medium">Moderator</th>
                  <th className="pb-2 pr-4 font-medium">Role</th>
                  <th className="pb-2 pr-4 font-medium text-right">Tickets</th>
                  <th className="pb-2 pr-4 font-medium text-right">Reports</th>
                  <th className="pb-2 font-medium text-right">Total open</th>
                </tr>
              </thead>
              <tbody>
                {workload.map((s) => (
                  <tr key={String(s.staffId)} className="border-b border-white/[0.04] text-zinc-300">
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-2 font-medium text-white">
                        <Users className="h-3.5 w-3.5 text-violet-300" />
                        {s.name}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-zinc-500">{s.role}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{s.openTickets}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{s.openReports}</td>
                    <td className="py-3 text-right tabular-nums text-white">{s.totalOpen}</td>
                  </tr>
                ))}
                {workload.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500">
                      No Forum Moderator accounts yet.
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
