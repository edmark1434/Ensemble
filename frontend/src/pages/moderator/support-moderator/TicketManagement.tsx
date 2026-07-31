import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Hand,
  Inbox,
  LayoutGrid,
  Loader2,
  RefreshCw,
  Search,
  Ticket,
  UserCog,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import api from "@/lib/axios";
import useGlobalState from "@/lib/global_state";
import {
  ChartCard,
  DonutChart,
  HorizontalBarChart,
  VerticalBarChart,
} from "@/pages/admin/analytics/components/AnalyticsCharts";
import TicketFiltersPanel from "@/pages/admin/ticketManagement/TicketFiltersPanel";
import {
  DEFAULT_TICKET_FILTERS,
  filterTickets,
  formatEscalatedLabel,
  type TicketAssigneeFilter,
  type TicketFilterState,
  type TicketFlagFilter,
} from "@/pages/admin/ticketManagement/ticketFilterUtils";
import { TICKET_TYPE_OPTIONS, type SupportTicket } from "@/pages/admin/ticketManagement/ticketTypes";
import ModeratorTicketDetailModal from "../shared/ModeratorTicketDetailModal";
import type { Alert, SupportOverview } from "../shared/moderatorTypes";

type TabId = "overview" | "tickets" | "mine" | "assignments";

const TABS: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "tickets", label: "Support tickets", icon: Ticket },
  { id: "mine", label: "My tickets", icon: Inbox },
  { id: "assignments", label: "Assignments", icon: UserCog },
];

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatStatusLabel(value: string) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function badgeClass(kind: "status" | "priority", value: string) {
  const v = value.toLowerCase().replace(/_/g, " ");
  if (kind === "priority") {
    if (v === "high") return "bg-red-500/15 text-red-300 border-red-500/25";
    if (v === "medium") return "bg-amber-500/15 text-amber-200 border-amber-500/25";
    return "bg-sky-500/15 text-sky-300 border-sky-500/25";
  }
  if (v === "open" || v === "pending review") return "bg-rose-500/15 text-rose-200 border-rose-500/25";
  if (
    v === "in progress" ||
    v === "under review" ||
    v === "in review" ||
    v === "escalated" ||
    v === "awaiting response"
  ) {
    return "bg-amber-500/15 text-amber-200 border-amber-500/25";
  }
  if (v === "sanctioned") return "bg-violet-500/15 text-violet-200 border-violet-500/25";
  if (v === "dismissed" || v === "withdrawn") return "bg-zinc-500/15 text-zinc-300 border-white/10";
  if (v === "resolved" || v === "closed") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/25";
  return "bg-zinc-500/15 text-zinc-300 border-white/10";
}

function SummaryCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{sub}</p>
    </div>
  );
}

function filtersFromSearchParams(params: URLSearchParams): TicketFilterState {
  const next = { ...DEFAULT_TICKET_FILTERS };
  const assignee = params.get("assignee");
  const flag = params.get("flag");
  const priority = params.get("priority");
  const status = params.get("status");
  const search = params.get("search");
  const type = params.get("type");
  if (assignee === "assigned" || assignee === "unassigned" || assignee === "all") {
    next.assignee = assignee as TicketAssigneeFilter;
  }
  if (
    flag === "awaiting" ||
    flag === "escalated" ||
    flag === "open_only" ||
    flag === "has_report" ||
    flag === "has_dispute" ||
    flag === "all"
  ) {
    next.flag = flag as TicketFlagFilter;
  }
  if (priority) next.priority = priority;
  if (status) next.status = status;
  if (search) next.search = search;
  if (type) next.type = type;
  return next;
}

function hasTicketFilterParams(params: URLSearchParams) {
  return ["assignee", "flag", "priority", "status", "search", "type"].some((k) => params.has(k));
}

export default function SupportTicketManagement() {
  const { user } = useGlobalState();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTab = searchParams.get("tab") as TabId | null;
  const valid: TabId[] = ["overview", "tickets", "mine", "assignments"];
  const initialTab: TabId =
    paramTab && valid.includes(paramTab)
      ? paramTab
      : hasTicketFilterParams(searchParams)
        ? "tickets"
        : "overview";

  const [data, setData] = useState<SupportOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabId>(initialTab);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | string | null>(null);
  const [ticketFilters, setTicketFilters] = useState<TicketFilterState>(() =>
    filtersFromSearchParams(searchParams)
  );
  const [myFilters, setMyFilters] = useState<TicketFilterState>({
    ...DEFAULT_TICKET_FILTERS,
    flag: "open_only",
  });

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const res = await api.get("/api/moderator/support/overview");
      if (res.data?.success) setData(res.data.data);
      else setError("Failed to load ticket management data");
    } catch {
      setError("Failed to load ticket management data");
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
    else if (!paramTab && hasTicketFilterParams(searchParams)) setTab("tickets");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramTab]);

  const switchTab = (id: TabId) => {
    setTab(id);
    if (id === "overview") {
      setSearchParams({}, { replace: true });
      return;
    }
    const next = new URLSearchParams();
    next.set("tab", id);
    setSearchParams(next, { replace: true });
  };

  const handleAlertClick = (alert: Alert) => {
    const action = alert.action;
    if (!action?.tab) return;
    if (action.tab === "disputes") {
      window.location.assign("/moderator/support/disputes");
      return;
    }
    if (action.tab === "user-team" || action.tab === "reports") {
      window.location.assign("/moderator/support/user-team");
      return;
    }
    if (action.ticketFilters) {
      setTicketFilters({
        ...DEFAULT_TICKET_FILTERS,
        ...(action.ticketFilters as Partial<TicketFilterState>),
      });
    }
    if (action.tab === "ticket-management" || action.tab === "tickets") {
      switchTab("tickets");
      return;
    }
    if (action.tab === "mine" || action.tab === "my-tickets") {
      switchTab("mine");
      return;
    }
    if (valid.includes(action.tab as TabId)) switchTab(action.tab as TabId);
  };

  const allTickets = useMemo(() => data?.tickets || data?.recentTickets || [], [data]);

  const myStaffId = useMemo(() => {
    const fromOverview = data?.currentStaffId;
    const fromUser = user?.staffId ?? user?.staff_id ?? null;
    const id = fromOverview ?? fromUser;
    return id != null && id !== "" ? String(id) : null;
  }, [data?.currentStaffId, user]);

  const myTickets = useMemo(() => {
    if (!myStaffId) return [];
    return allTickets.filter(
      (t) =>
        t.assignee?.staffId != null &&
        String(t.assignee.staffId).toLowerCase() === myStaffId.toLowerCase()
    );
  }, [allTickets, myStaffId]);

  const filteredTickets = useMemo(
    () => filterTickets(allTickets, ticketFilters),
    [allTickets, ticketFilters]
  );

  const filteredMyTickets = useMemo(
    () => filterTickets(myTickets, myFilters),
    [myTickets, myFilters]
  );

  const ticketTypes = useMemo(() => {
    const fromData = [
      ...new Set(allTickets.map((t) => t.type || t.category).filter(Boolean) as string[]),
    ];
    return [...new Set([...TICKET_TYPE_OPTIONS, ...fromData])];
  }, [allTickets]);

  const ticketChannels = useMemo(() => {
    const fromData = [
      ...new Set(allTickets.map((t) => String(t.channel || "web").toLowerCase()).filter(Boolean)),
    ];
    return fromData.length ? fromData.sort() : ["web", "email", "in_app"];
  }, [allTickets]);

  const recentActivity = data?.recentActivity || data?.ticketLog || [];

  const mySummary = useMemo(() => {
    const open = myTickets.filter((t) => t.status === "Open" || t.status === "In Progress");
    return {
      openTickets: open.length,
      unassignedTickets: 0,
      highPriorityTickets: open.filter((t) => String(t.priority).toLowerCase() === "high").length,
      awaitingReplyTickets: myTickets.filter((t) => t.waitingForResponse).length,
      totalTickets: myTickets.length,
      openDisputes: 0,
      openReports: 0,
    };
  }, [myTickets]);

  if (loading) {
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center md:ml-72">
        <Loader2 className="h-10 w-10 animate-spin text-sky-400" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="relative z-10 p-8 md:ml-72">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          {error || "Failed to load ticket management data"}
          <button type="button" onClick={() => void load()} className="mt-4 block text-sm underline">
            Retry
          </button>
        </div>
      </main>
    );
  }

  const { summary, charts, alerts, staffWorkload } = data;

  return (
    <main className="relative z-10 min-h-screen md:ml-72">
      {selectedTicketId != null && (
        <ModeratorTicketDetailModal
          ticketId={selectedTicketId}
          endpointBase="/api/moderator/support/tickets"
          accent="sky"
          onClose={() => setSelectedTicketId(null)}
          onUpdated={() => void load(true)}
        />
      )}

      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#07080e]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between md:px-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/80">
              Support desk
            </p>
            <h1 className="text-xl font-bold text-white">Ticket management</h1>
            <p className="mt-1 text-xs text-zinc-500">
              {summary.openTickets} open tickets · {summary.totalTickets} total · @
              {user?.username || "support"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 self-start rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-zinc-300 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        <div className="flex gap-1 overflow-x-auto px-4 pb-0 md:px-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                tab === id
                  ? "border-sky-400 text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
        {alerts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {alerts.map((a) => {
              const clickable = Boolean(a.action?.tab);
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={!clickable}
                  onClick={() => handleAlertClick(a)}
                  title={clickable ? "Open related queue" : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-xs transition ${
                    a.severity === "warning"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
                      : a.severity === "error"
                        ? "border-red-500/30 bg-red-500/10 text-red-200"
                        : a.severity === "success"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                          : "border-white/10 bg-white/[0.03] text-zinc-300"
                  } ${clickable ? "cursor-pointer hover:brightness-110" : "cursor-default"}`}
                >
                  {a.severity === "success" ? (
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                  )}
                  {a.message}
                </button>
              );
            })}
          </div>
        )}

        {tab === "overview" && (
          <OverviewTab
            summary={summary}
            charts={charts}
            recentActivity={recentActivity}
            staffWorkload={staffWorkload}
          />
        )}
        {tab === "tickets" && (
          <TicketsTab
            title="Ticket desk"
            subtitle="Triage tickets across Support, Forums, Marketplace, and Jobs queues (Admin tickets stay with Admin)."
            tickets={filteredTickets}
            allTickets={allTickets}
            totalCount={allTickets.length}
            summary={summary}
            ticketTypes={ticketTypes}
            channels={ticketChannels}
            moderators={staffWorkload.map((s) => ({
              staffId: s.staffId,
              name: s.name,
              role: s.role,
            }))}
            filters={ticketFilters}
            onFiltersChange={setTicketFilters}
            onOpenTicket={setSelectedTicketId}
            showQueue
          />
        )}
        {tab === "mine" && (
          <TicketsTab
            title="My tickets"
            subtitle="Tickets currently assigned to you. Reply, update status, or escalate from the detail modal."
            tickets={filteredMyTickets}
            allTickets={myTickets}
            totalCount={myTickets.length}
            summary={mySummary}
            ticketTypes={ticketTypes}
            channels={ticketChannels}
            moderators={staffWorkload.map((s) => ({
              staffId: s.staffId,
              name: s.name,
              role: s.role,
            }))}
            filters={myFilters}
            onFiltersChange={setMyFilters}
            onOpenTicket={setSelectedTicketId}
            showQueue={false}
            emptyHint={
              myStaffId
                ? "No tickets assigned to you. Pick up unassigned tickets from Support tickets."
                : "Could not resolve your staff profile. Re-login and try again."
            }
          />
        )}
        {tab === "assignments" && <AssignmentsTab workload={staffWorkload} />}
      </div>
    </main>
  );
}

function OverviewTab({
  summary,
  charts,
  recentActivity,
  staffWorkload,
}: {
  summary: SupportOverview["summary"];
  charts: SupportOverview["charts"];
  recentActivity: SupportOverview["ticketLog"];
  staffWorkload: SupportOverview["staffWorkload"];
}) {
  const typeChart = charts.ticketTypes || charts.ticketCategories;
  const priorityChart = charts.openByPriority || charts.priorityMix;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="Open tickets" value={summary.openTickets} sub={`${summary.totalTickets} total filed`} />
        <SummaryCard label="Unassigned" value={summary.unassignedTickets} sub="Need a designated handler" />
        <SummaryCard label="High priority" value={summary.highPriorityTickets} sub="Open and urgent" />
        <SummaryCard
          label="Awaiting reply"
          value={summary.awaitingReplyTickets ?? 0}
          sub="User message waiting"
        />
        <SummaryCard label="Open disputes" value={summary.openDisputes} sub="Managed in Disputes" />
        <SummaryCard label="Open reports" value={summary.openReports} sub="Managed in Reports" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard>
          <DonutChart
            title="Ticket status mix"
            segments={charts.ticketStatusMix.map((s) => ({
              label: s.label,
              value: s.value,
              color: s.color || "#38bdf8",
            }))}
          />
        </ChartCard>
        <section className="flex flex-col justify-center overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1016] p-6">
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-sky-300" />
            <p className="text-sm font-semibold text-white">Related queues</p>
          </div>
          <p className="mt-3 text-3xl font-semibold tabular-nums text-white">
            {summary.openDisputes + summary.openReports}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {summary.openDisputes} disputes · {summary.openReports} reports
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/moderator/support/disputes"
              className="inline-flex w-fit items-center rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-100 hover:bg-sky-500/20"
            >
              Disputes
            </Link>
            <Link
              to="/moderator/support/user-team"
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
            data={typeChart.map((c) => ({ label: c.label, value: c.value }))}
            color="#38bdf8"
          />
        </ChartCard>
        <ChartCard>
          <HorizontalBarChart
            title="Open tickets by priority"
            data={priorityChart.map((p) => ({ label: p.label, value: p.value }))}
          />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1016]">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h3 className="text-sm font-semibold text-white">Recent desk activity</h3>
            <p className="mt-1 text-xs text-zinc-500">Latest ticket and dispute events</p>
          </div>
          <ul className="divide-y divide-white/[0.04] px-2 py-1">
            {recentActivity.slice(0, 12).map((a) => (
              <li key={a.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                <div>
                  <span className="text-zinc-500">{a.type}</span>{" "}
                  <span className="font-medium text-white">{a.ref}</span>
                  <p className="text-xs text-zinc-500">{a.label}</p>
                </div>
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] ${badgeClass("status", a.status)}`}
                >
                  {formatStatusLabel(a.status)}
                </span>
              </li>
            ))}
            {recentActivity.length === 0 && (
              <li className="px-3 py-10 text-center text-sm text-zinc-500">No recent activity.</li>
            )}
          </ul>
        </section>
        <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1016]">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h3 className="text-sm font-semibold text-white">Staff workload snapshot</h3>
            <p className="mt-1 text-xs text-zinc-500">Open tickets, disputes, and reports by handler</p>
          </div>
          <ul className="divide-y divide-white/[0.04] px-2 py-1">
            {staffWorkload.slice(0, 8).map((s) => (
              <li key={s.staffId} className="flex items-center justify-between px-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium text-white">{s.name}</p>
                  <p className="text-xs text-zinc-500">{s.role}</p>
                </div>
                <span className="tabular-nums text-zinc-300">{s.totalOpen} open</span>
              </li>
            ))}
            {staffWorkload.length === 0 && (
              <li className="px-3 py-10 text-center text-sm text-zinc-500">No staff workload yet.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

function TicketsTab({
  title,
  subtitle,
  tickets,
  allTickets,
  totalCount,
  summary,
  ticketTypes,
  channels,
  moderators,
  filters,
  onFiltersChange,
  onOpenTicket,
  showQueue = true,
  emptyHint = "No tickets match this filter.",
}: {
  title: string;
  subtitle: string;
  tickets: SupportTicket[];
  allTickets: SupportTicket[];
  totalCount: number;
  summary: {
    openTickets: number;
    unassignedTickets: number;
    highPriorityTickets: number;
    awaitingReplyTickets?: number;
  };
  ticketTypes: string[];
  channels: string[];
  moderators: { staffId: number | string; name: string; role: string }[];
  filters: TicketFilterState;
  onFiltersChange: (next: TicketFilterState) => void;
  onOpenTicket: (id: number | string) => void;
  showQueue?: boolean;
  emptyHint?: string;
}) {
  const shortId = (value: string | number | null | undefined) => {
    if (value == null || value === "") return "—";
    const s = String(value);
    return s.length > 10 ? `${s.slice(0, 8)}…` : s;
  };

  const quickCounts = useMemo(() => {
    const openOnly = allTickets.filter((t) => t.status === "Open" || t.status === "In Progress").length;
    const awaiting = allTickets.filter((t) => t.waitingForResponse).length;
    const escalated = allTickets.filter((t) => t.isEscalated).length;
    const unassigned = allTickets.filter((t) => !t.assignee).length;
    const high = allTickets.filter((t) => String(t.priority).toLowerCase() === "high").length;
    return {
      all: allTickets.length,
      open_only: openOnly,
      awaiting,
      escalated,
      unassigned,
      high,
    };
  }, [allTickets]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Open tickets" value={summary.openTickets} sub="Active support queue" />
        <SummaryCard label="Unassigned" value={summary.unassignedTickets} sub="Need a designated handler" />
        <SummaryCard label="High priority" value={summary.highPriorityTickets} sub="Open and urgent" />
        <SummaryCard
          label="Awaiting reply"
          value={summary.awaitingReplyTickets ?? 0}
          sub="User message waiting"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1016]">
        <div className="flex flex-col gap-4 border-b border-white/[0.06] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-sky-300" />
              <h2 className="text-sm font-semibold text-white">{title}</h2>
            </div>
            <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              placeholder="Search number, subject, requester…"
              className="w-full rounded-xl border border-white/[0.08] bg-[#14151c] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-sky-500/40"
            />
          </div>
        </div>

        <TicketFiltersPanel
          filters={filters}
          onChange={onFiltersChange}
          ticketTypes={ticketTypes}
          channels={channels}
          moderators={moderators}
          accent="sky"
          showQueue={showQueue}
          showAdminToggle={false}
          resultCount={tickets.length}
          totalCount={totalCount}
          variant="desk"
          hideSearch
          quickCounts={quickCounts}
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3 font-medium">Ticket</th>
                <th className="px-4 py-3 font-medium">Requester</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Handler</th>
                <th className="px-4 py-3 font-medium">Flags</th>
                <th className="px-5 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr
                  key={String(t.id)}
                  onClick={() => onOpenTicket(t.id)}
                  className="cursor-pointer border-b border-white/[0.04] transition hover:bg-white/[0.03]"
                >
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-white">{t.number}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{t.subject}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-zinc-200">{t.requester.name}</p>
                    <p className="text-xs text-zinc-500">@{t.requester.username || "—"}</p>
                    <p className="font-mono text-[10px] text-zinc-600">
                      acc {shortId(t.requester.accountId)} · usr {shortId(t.requester.userId)}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-zinc-300">{t.type || t.category || "—"}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${badgeClass("priority", t.priority)}`}
                    >
                      {formatStatusLabel(t.priority)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${badgeClass("status", t.status)}`}
                    >
                      {formatStatusLabel(t.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-zinc-300">
                    {t.assignee ? (
                      <>
                        <p>{t.assignee.name}</p>
                        <p className="text-[11px] text-zinc-500">{t.assignee.role}</p>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-200/90">
                        <Hand className="h-3.5 w-3.5" />
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-1">
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
                      {!t.waitingForResponse && !t.isEscalated && (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-zinc-500">{formatDateTime(t.updatedAt)}</td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-sm text-zinc-500">
                    {emptyHint}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AssignmentsTab({ workload }: { workload: SupportOverview["staffWorkload"] }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Staff on desk" value={workload.length} sub="Handlers with workload rows" />
        <SummaryCard
          label="Open tickets"
          value={workload.reduce((s, w) => s + w.openTickets, 0)}
          sub="Assigned across staff"
        />
        <SummaryCard
          label="Open disputes"
          value={workload.reduce((s, w) => s + (w.openDisputes ?? 0), 0)}
          sub="Assigned dispute load"
        />
        <SummaryCard
          label="Open reports"
          value={workload.reduce((s, w) => s + w.openReports, 0)}
          sub="Assigned report load"
        />
      </div>

      <ChartCard>
        <HorizontalBarChart
          title="Open workload by staff member"
          data={workload.map((s) => ({ label: s.name.slice(0, 16), value: s.totalOpen }))}
        />
      </ChartCard>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1016]">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-2">
            <UserCog className="h-4 w-4 text-sky-300" />
            <h2 className="text-sm font-semibold text-white">Assignment desk</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Open tickets, disputes, and reports currently assigned to each staff member.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3 font-medium">Staff</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Tickets</th>
                <th className="px-4 py-3 font-medium">Disputes</th>
                <th className="px-4 py-3 font-medium">Reports</th>
                <th className="px-5 py-3 font-medium">Total open</th>
              </tr>
            </thead>
            <tbody>
              {workload.map((s) => (
                <tr key={String(s.staffId)} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                  <td className="px-5 py-3.5 font-medium text-white">{s.name}</td>
                  <td className="px-4 py-3.5 text-zinc-400">{s.role}</td>
                  <td className="px-4 py-3.5 tabular-nums text-zinc-300">{s.openTickets}</td>
                  <td className="px-4 py-3.5 tabular-nums text-zinc-300">{s.openDisputes ?? 0}</td>
                  <td className="px-4 py-3.5 tabular-nums text-zinc-300">{s.openReports}</td>
                  <td className="px-5 py-3.5 tabular-nums font-medium text-white">{s.totalOpen}</td>
                </tr>
              ))}
              {workload.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-sm text-zinc-500">
                    No staff workload to show.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
