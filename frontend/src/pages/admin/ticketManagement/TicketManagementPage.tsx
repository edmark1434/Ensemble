import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  LayoutGrid,
  Loader2,
  RefreshCw,
  Search,
  Ticket,
  UserCog,
} from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '@/lib/axios';
import useGlobalState from '@/lib/global_state';
import {
  ChartCard,
  DonutChart,
  HorizontalBarChart,
  VerticalBarChart,
} from '../analytics/components/AnalyticsCharts';
import TicketDetailModal from './TicketDetailModal';
import TicketFiltersPanel from './TicketFiltersPanel';
import {
  DEFAULT_TICKET_FILTERS,
  filterTickets,
  formatEscalatedLabel,
  type TicketFilterState,
} from './ticketFilterUtils';
import type { SupportTicket, TicketsOverview } from './ticketTypes';
import { TICKET_TYPE_OPTIONS } from './ticketTypes';

type TabId = 'overview' | 'tickets' | 'assignments';

const TABS: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'tickets', label: 'Support tickets', icon: Ticket },
  { id: 'assignments', label: 'Assignments', icon: UserCog },
];

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatStatusLabel(value: string) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function badgeClass(kind: 'status' | 'priority', value: string) {
  const v = value.toLowerCase().replace(/_/g, ' ');
  if (kind === 'priority') {
    if (v === 'high') return 'bg-red-500/15 text-red-300 border-red-500/25';
    if (v === 'medium') return 'bg-amber-500/15 text-amber-200 border-amber-500/25';
    return 'bg-zinc-500/15 text-zinc-300 border-white/10';
  }
  if (v === 'open' || v === 'pending review') return 'bg-red-500/15 text-red-300';
  if (v === 'in progress' || v === 'under review' || v === 'in review' || v === 'escalated' || v === 'awaiting response') {
    return 'bg-amber-500/15 text-amber-200';
  }
  if (v === 'sanctioned') return 'bg-violet-500/15 text-violet-300';
  if (v === 'dismissed' || v === 'withdrawn') return 'bg-zinc-500/15 text-zinc-300';
  if (v === 'resolved' || v === 'closed') return 'bg-emerald-500/15 text-emerald-300';
  return 'bg-zinc-500/15 text-zinc-300';
}

export default function TicketManagementPage() {
  const { user } = useGlobalState();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTab = searchParams.get('tab') as TabId | null;
  const valid: TabId[] = ['overview', 'tickets', 'assignments'];
  const initialTab = paramTab && valid.includes(paramTab) ? paramTab : 'overview';

  const [data, setData] = useState<TicketsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabId>(initialTab);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | string | null>(null);
  const [ticketFilters, setTicketFilters] = useState<TicketFilterState>(DEFAULT_TICKET_FILTERS);
  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await api.get('/api/admin/tickets-overview');
      if (res.data?.success) setData(res.data.data);
      else setError('Failed to load ticket management data');
    } catch {
      setError('Failed to load ticket management data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (paramTab && valid.includes(paramTab)) setTab(paramTab);
  }, [paramTab]);

  const switchTab = (id: TabId) => {
    setTab(id);
    setSearchParams(id === 'overview' ? {} : { tab: id }, { replace: true });
  };

  const handleAlertClick = (alert: TicketsOverview['alerts'][number]) => {
    const action = alert.action;
    if (!action?.tab) return;
    if (action.tab === 'disputes' || action.tab === 'reports') {
      window.location.assign(
        action.tab === 'reports' ? '/admin/moderation?tab=reports' : '/admin/moderation?tab=disputes'
      );
      return;
    }
    if (action.ticketFilters) {
      setTicketFilters({
        ...DEFAULT_TICKET_FILTERS,
        ...(action.ticketFilters as Partial<TicketFilterState>),
      });
    }
    switchTab(action.tab as TabId);
  };

  const filteredTickets = useMemo(() => {
    if (!data) return [];
    // Header search still applies across tickets when on tickets tab;
    // ticketFilters.search is the dedicated ticket search.
    const merged: TicketFilterState = {
      ...ticketFilters,
      search: ticketFilters.search || (tab === 'tickets' ? search : ticketFilters.search),
    };
    return filterTickets(data.tickets, merged);
  }, [data, ticketFilters, search, tab]);

  const ticketTypes = useMemo(() => {
    if (!data) return [...TICKET_TYPE_OPTIONS];
    if (Array.isArray(data.types) && data.types.length) {
      return [...new Set([...data.types, ...TICKET_TYPE_OPTIONS])];
    }
    if (Array.isArray(data.categories) && data.categories.length) return data.categories;
    return [...TICKET_TYPE_OPTIONS];
  }, [data]);

  const ticketChannels = useMemo(() => {
    if (!data) return ['web', 'chat', 'email', 'in_app'];
    const fromData = [
      ...new Set(data.tickets.map((t) => String(t.channel || 'web').toLowerCase()).filter(Boolean)),
    ];
    return fromData.length ? fromData.sort() : ['web', 'chat', 'email', 'in_app'];
  }, [data]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center md:pl-[260px]">
        <Loader2 className="h-10 w-10 animate-spin text-rose-400" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="p-8 md:pl-[284px]">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          {error}
          <button type="button" onClick={() => void load()} className="mt-4 block text-sm underline">
            Retry
          </button>
        </div>
      </main>
    );
  }

  const { summary, charts, alerts, staffWorkload, recentActivity } = data;

  return (
    <main className="min-h-screen md:pl-[260px]">
      {selectedTicketId != null && (
        <TicketDetailModal
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
          onUpdated={() => void load(true)}
        />
      )}

      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between md:px-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400/80">Support desk</p>
            <h1 className="text-xl font-bold text-white">Ticket management</h1>
            <p className="mt-1 text-xs text-zinc-500">
              {summary.openTickets} open tickets · {summary.totalTickets} total · @{user?.username || 'admin'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 lg:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tickets…"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/15"
              />
            </div>
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-zinc-300 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto px-4 pb-0 md:px-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                tab === id ? 'border-rose-400 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
        <div className="flex flex-wrap gap-2">
          {alerts.map((a) => {
            const clickable = Boolean(a.action?.tab);
            return (
              <button
                key={a.id}
                type="button"
                disabled={!clickable}
                onClick={() => handleAlertClick(a)}
                title={clickable ? 'Open related queue' : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-xs transition ${
                  a.severity === 'warning'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                    : a.severity === 'error'
                      ? 'border-red-500/30 bg-red-500/10 text-red-200'
                      : a.severity === 'success'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                        : 'border-white/10 bg-white/[0.03] text-zinc-300'
                } ${clickable ? 'hover:brightness-110 cursor-pointer' : 'cursor-default'}`}
              >
                {a.severity === 'success' ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <AlertTriangle className="h-3 w-3 shrink-0" />}
                {a.message}
              </button>
            );
          })}
        </div>

        {tab === 'overview' && (
          <OverviewTab summary={summary} charts={charts} recentActivity={recentActivity} staffWorkload={staffWorkload} />
        )}
        {tab === 'tickets' && (
          <TicketsTab
            tickets={filteredTickets}
            totalCount={data.tickets.length}
            ticketTypes={ticketTypes}
            channels={ticketChannels}
            moderators={data.staffWorkload.map((s) => ({
              staffId: s.staffId,
              name: s.name,
              role: s.role,
            }))}
            filters={ticketFilters}
            onFiltersChange={setTicketFilters}
            onOpenTicket={setSelectedTicketId}
          />
        )}
        {tab === 'assignments' && <AssignmentsTab workload={staffWorkload} />}
      </div>
    </main>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-white">{value}</p>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

function OverviewTab({
  summary,
  charts,
  recentActivity,
  staffWorkload,
}: {
  summary: TicketsOverview['summary'];
  charts: TicketsOverview['charts'];
  recentActivity: TicketsOverview['recentActivity'];
  staffWorkload: TicketsOverview['staffWorkload'];
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <Kpi label="Open tickets" value={summary.openTickets} sub={`${summary.totalTickets} total`} />
        <Kpi label="Unassigned" value={summary.unassignedTickets} sub="Need assignee" />
        <Kpi label="High priority" value={summary.highPriorityTickets} sub="Open tickets flagged urgent" />
        <Kpi label="Awaiting reply" value={summary.awaitingReplyTickets ?? 0} sub="User message waiting" />
        <Kpi
          label="Open disputes"
          value={summary.openDisputes}
          sub={
            <Link to="/admin/moderation?tab=disputes" className="text-rose-300 hover:underline">
              Managed in Moderation
            </Link>
          }
        />
        <Kpi
          label="Open reports"
          value={summary.openReports}
          sub={
            <Link to="/admin/moderation?tab=reports" className="text-rose-300 hover:underline">
              Managed in Moderation
            </Link>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard>
          <DonutChart
            title="Ticket status mix"
            segments={charts.ticketStatusMix.map((s) => ({
              label: s.label,
              value: s.value,
              color: s.color || '#a1a1aa',
            }))}
          />
        </ChartCard>
        <section className="flex flex-col justify-center rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-transparent p-6">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-300/80">Moderation queues</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-white">
            {summary.openDisputes + summary.openReports}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {summary.openDisputes} disputes · {summary.openReports} reports
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/admin/moderation?tab=disputes"
              className="inline-flex w-fit items-center rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 hover:bg-rose-500/20"
            >
              Disputes
            </Link>
            <Link
              to="/admin/moderation?tab=reports"
              className="inline-flex w-fit items-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-500/20"
            >
              Reports
            </Link>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard>
          <VerticalBarChart
            title="Tickets by type"
            data={(charts.ticketTypes || charts.ticketCategories).map((c) => ({ label: c.label, value: c.value }))}
            color="#a78bfa"
          />
        </ChartCard>
        <ChartCard>
          <HorizontalBarChart
            title="Open tickets by priority"
            data={charts.openByPriority.map((p) => ({ label: p.label, value: p.value }))}
          />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
          <h3 className="text-sm font-semibold text-white">Recent desk activity</h3>
          <ul className="mt-4 space-y-2">
            {recentActivity.slice(0, 12).map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm">
                <div>
                  <span className="text-zinc-500">{a.type}</span>{' '}
                  <span className="font-medium text-white">{a.ref}</span>
                  <p className="text-xs text-zinc-500">{a.label}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${badgeClass('status', a.status)}`}>
                  {formatStatusLabel(a.status)}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
          <h3 className="text-sm font-semibold text-white">Staff workload snapshot</h3>
          <ul className="mt-4 space-y-2">
            {staffWorkload.slice(0, 8).map((s) => (
              <li key={s.staffId} className="flex items-center justify-between rounded-xl border border-white/[0.06] px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-white">{s.name}</p>
                  <p className="text-xs text-zinc-500">{s.role}</p>
                </div>
                <span className="text-white">{s.totalOpen} open</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function TicketsTab({
  tickets,
  totalCount,
  ticketTypes,
  channels,
  moderators,
  filters,
  onFiltersChange,
  onOpenTicket,
}: {
  tickets: SupportTicket[];
  totalCount: number;
  ticketTypes: string[];
  channels: string[];
  moderators: { staffId: number | string; name: string; role: string }[];
  filters: TicketFilterState;
  onFiltersChange: (next: TicketFilterState) => void;
  onOpenTicket: (id: number | string) => void;
}) {
  const shortId = (value: string | number | null | undefined) => {
    if (value == null || value === '') return '—';
    const s = String(value);
    return s.length > 10 ? `${s.slice(0, 8)}…` : s;
  };

  return (
    <div className="space-y-4">
      <TicketFiltersPanel
        filters={filters}
        onChange={onFiltersChange}
        ticketTypes={ticketTypes}
        channels={channels}
        moderators={moderators}
        accent="rose"
        showQueue
        showAdminToggle
        resultCount={tickets.length}
        totalCount={totalCount}
      />
      <DataTable
        columns={['Ticket', 'Subject', 'Requester', 'Type', 'Flags', 'Priority', 'Status', 'Assignee', 'Updated']}
        rows={tickets.map((t) => ({
          key: t.id,
          cells: [
            t.number,
            t.subject,
            <div key="req" className="min-w-[140px]">
              <p className="font-medium text-zinc-200">{t.requester.name}</p>
              <p className="text-[11px] text-zinc-500">@{t.requester.username || '—'}</p>
              <p className="font-mono text-[10px] text-zinc-600">acc {shortId(t.requester.accountId)}</p>
              <p className="font-mono text-[10px] text-zinc-600">usr {shortId(t.requester.userId)}</p>
            </div>,
            t.type || t.category || '—',
            <div key="flags" className="flex min-w-[140px] flex-col gap-1">
              {t.waitingForResponse && (
                <span className="w-fit rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200">
                  Awaiting Reply
                </span>
              )}
              {t.isEscalated && (
                <span className="w-fit rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-200">
                  {formatEscalatedLabel(t)}
                </span>
              )}
              {!t.waitingForResponse && !t.isEscalated && <span className="text-zinc-600">—</span>}
            </div>,
            t.priority,
            t.status,
            t.assignee?.name || '—',
            formatDateTime(t.updatedAt),
          ],
          onClick: () => onOpenTicket(t.id),
        }))}
      />
    </div>
  );
}

function AssignmentsTab({ workload }: { workload: TicketsOverview['staffWorkload'] }) {
  return (
    <>
      <ChartCard>
        <HorizontalBarChart
          title="Open workload by staff member"
          data={workload.map((s) => ({ label: s.name.slice(0, 16), value: s.totalOpen }))}
        />
      </ChartCard>
      <DataTable
        columns={['Staff', 'Role', 'Tickets', 'Disputes', 'Reports', 'Total open']}
        rows={workload.map((s) => ({
          key: s.staffId,
          cells: [s.name, s.role, String(s.openTickets), String(s.openDisputes), String(s.openReports), String(s.totalOpen)],
        }))}
      />
    </>
  );
}

function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: { key: string | number; cells: ReactNode[]; onClick?: () => void; actions?: ReactNode }[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] uppercase text-zinc-600">
              {columns.map((c) => (
                <th key={c} className="px-4 py-3">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.key}
                onClick={row.onClick}
                className={`border-b border-white/[0.04] text-zinc-300 ${row.onClick ? 'cursor-pointer hover:bg-white/[0.02]' : ''}`}
              >
                {row.cells.map((cell, j) => (
                  <td key={j} className="px-4 py-2.5">
                    {cell === 'actions' && row.actions ? row.actions : cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-zinc-500">
                  No results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
