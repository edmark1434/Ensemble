import { useCallback, useEffect, useState } from 'react';
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
  UsersRound,
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
import type { Alert, ForumOverview } from '../shared/moderatorTypes';
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

function statusPill(status: string) {
  const s = status.toLowerCase();
  if (s === 'active') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
  if (s === 'removed' || s === 'inactive') return 'bg-rose-500/15 text-rose-200 border-rose-500/25';
  return 'bg-zinc-500/15 text-zinc-300 border-white/10';
}

export default function ForumModeratorDashboard() {
  const { user } = useGlobalState();
  const navigate = useNavigate();
  const [data, setData] = useState<ForumOverview | null>(null);
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
      const res = await api.get('/api/moderator/forum/overview');
      if (res.data?.success) setData(res.data.data);
      else setError(res.data?.message || 'Failed to load forum dashboard');
    } catch {
      setError('Failed to load forum dashboard');
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
  const content = forumContent.available ? forumContent : null;

  const kpiCards = [
    {
      label: 'Open forum tickets',
      value: summary.openTickets,
      sub: `${summary.totalTickets} total · ${summary.inProgressTickets ?? 0} in progress`,
      icon: Ticket,
      accent: 'text-violet-300',
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
      label: 'Open forum reports',
      value: summary.flaggedContent,
      sub: `${summary.totalReports} total · ${summary.unassignedReports ?? 0} unassigned`,
      icon: Flag,
      accent: 'text-fuchsia-300',
    },
    {
      label: 'Forum groups',
      value: content?.totalGroups ?? '—',
      sub: content
        ? `${content.activeGroups} active · ${content.inactiveGroups ?? 0} inactive`
        : 'Mongo unavailable',
      icon: UsersRound,
      accent: 'text-sky-300',
    },
    {
      label: 'Discussions',
      value: content?.totalDiscussions ?? '—',
      sub: content
        ? `${content.removedDiscussions} removed · ${content.totalComments} comments`
        : 'Mongo unavailable',
      icon: MessagesSquare,
      accent: 'text-indigo-300',
    },
  ];

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
        <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between md:px-8">
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
            className="flex items-center gap-2 self-start rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
        {notice && (
          <div className="flex items-start gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3 text-sm text-violet-100">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
            <p>{notice}</p>
          </div>
        )}

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
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
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

        {content && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MiniStat
              icon={UsersRound}
              label="Active groups"
              value={content.activeGroups}
              sub={`${content.inactiveGroups ?? 0} inactive`}
            />
            <MiniStat
              icon={MessageSquare}
              label="Comments"
              value={content.totalComments}
              sub="Across all discussions"
            />
            <MiniStat
              icon={Lock}
              label="Locked threads"
              value={content.lockedDiscussions ?? 0}
              sub="Temporarily closed for posting"
            />
            <MiniStat
              icon={Pin}
              label="Sticky threads"
              value={content.stickyDiscussions ?? 0}
              sub="Pinned in group feeds"
            />
          </div>
        )}

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

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="xl:col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-white">Forum ticket queue</h2>
                <p className="mt-1 text-xs text-zinc-600">
                  Forums / posts / groups / comments tickets only — click a row to open.
                </p>
              </div>
              <Link
                to="/moderator/forum/ticket-management"
                className="text-xs font-medium text-violet-300 hover:underline"
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
                  {recentTickets.map((t) => (
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-white">Forum reports</h2>
                <p className="mt-1 text-xs text-zinc-600">All forum-target reports, assigned or not.</p>
              </div>
              <Link
                to="/moderator/forum/reports"
                className="text-xs font-medium text-violet-300 hover:underline"
              >
                Open desk
              </Link>
            </div>
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
                    <p className="line-clamp-1 text-sm text-white">{r.reason}</p>
                    <p className="text-[11px] text-zinc-500">
                      {r.targetLabel || r.targetId} · {r.targetType}
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
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-white">Recent groups</h2>
                  <p className="mt-1 text-xs text-zinc-600">Newest community groups from Mongo.</p>
                </div>
                <Link
                  to="/moderator/forum/forum-discussion"
                  className="text-xs font-medium text-violet-300 hover:underline"
                >
                  Member POV
                </Link>
              </div>
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
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${statusPill(g.status)}`}>
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
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-white">Recent discussions</h2>
                  <p className="mt-1 text-xs text-zinc-600">Latest activity across forum threads.</p>
                </div>
                <Link
                  to="/moderator/forum/forum-discussion"
                  className="text-xs font-medium text-violet-300 hover:underline"
                >
                  Browse feed
                </Link>
              </div>
              <ul className="mt-4 space-y-2">
                {(content.recentDiscussions || []).map((d) => (
                  <li
                    key={d.id}
                    className="rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-medium text-white">{d.title}</p>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${statusPill(d.status)}`}>
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
  icon: typeof UsersRound;
  label: string;
  value: string | number;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="rounded-xl bg-violet-500/15 p-2.5 text-violet-300">
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
