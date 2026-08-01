import { useEffect, useMemo, useState } from "react";
import { Hand, Inbox, Loader2, RefreshCw, Search, Ticket } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import api from "@/lib/axios";
import TicketFiltersPanel from "@/pages/admin/ticketManagement/TicketFiltersPanel";
import {
  DEFAULT_TICKET_FILTERS,
  filterTickets,
  formatEscalatedLabel,
  type TicketFilterState,
  type TicketFlagFilter,
  type TicketAssigneeFilter,
} from "@/pages/admin/ticketManagement/ticketFilterUtils";
import {
  FORUM_TICKET_TYPES,
  JOBS_TICKET_TYPES,
  MARKETPLACE_TICKET_TYPES,
  SUPPORT_TICKET_TYPES,
} from "@/pages/admin/ticketManagement/ticketTypes";
import ModeratorTicketDetailModal from "./ModeratorTicketDetailModal";
import { PriorityBadge, StatusBadge, type Accent } from "./ui";
import type { SupportTicket } from "./moderatorTypes";

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortId(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  const s = String(value);
  return s.length > 10 ? `${s.slice(0, 8)}…` : s;
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

const QUEUE_TYPES: Record<string, readonly string[]> = {
  support: SUPPORT_TICKET_TYPES,
  forum: FORUM_TICKET_TYPES,
  marketplace: MARKETPLACE_TICKET_TYPES,
  jobs: JOBS_TICKET_TYPES,
};

const ACCENT_LABEL: Record<Accent, string> = {
  sky: "text-sky-400",
  violet: "text-violet-400",
  emerald: "text-emerald-400",
  rose: "text-rose-400",
};

const ACCENT_SPIN: Record<Accent, string> = {
  sky: "text-sky-400",
  violet: "text-violet-400",
  emerald: "text-emerald-400",
  rose: "text-rose-400",
};

const ACCENT_FOCUS: Record<Accent, string> = {
  sky: "focus:border-sky-500/40",
  violet: "focus:border-violet-500/40",
  emerald: "focus:border-emerald-500/40",
  rose: "focus:border-rose-500/40",
};

const ACCENT_ICON: Record<Accent, string> = {
  sky: "text-sky-300",
  violet: "text-violet-300",
  emerald: "text-emerald-300",
  rose: "text-rose-300",
};

/**
 * Shared moderator ticket desk with admin-style desk filters + quick chips.
 */
export default function ModeratorTicketDesk({
  title = "Ticket Management",
  subtitle,
  roleLabel,
  endpointBase,
  listPath,
  accent = "sky",
  queueKey = "support",
}: {
  title?: string;
  subtitle?: string;
  roleLabel: string;
  endpointBase: string;
  listPath?: string;
  accent?: Accent;
  queueKey?: keyof typeof QUEUE_TYPES;
}) {
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<TicketFilterState>(() => {
    const next = { ...DEFAULT_TICKET_FILTERS };
    const assignee = searchParams.get("assignee");
    const flag = searchParams.get("flag");
    const priority = searchParams.get("priority");
    const status = searchParams.get("status");
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
    return next;
  });
  const [selectedId, setSelectedId] = useState<number | string | null>(null);

  const typeCatalog = [...QUEUE_TYPES[queueKey]];

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const res = await api.get(listPath || endpointBase);
      if (res.data?.success) {
        const rows = (res.data.data || []) as SupportTicket[];
        // Hard-scope specialist queues so cross-queue tickets never appear in the desk.
        const allowed = new Set(typeCatalog.map((t) => t.toLowerCase()));
        setTickets(
          queueKey === "support"
            ? rows
            : rows.filter((t) => allowed.has(String(t.type || t.category || "").toLowerCase()))
        );
      } else setError("Failed to load tickets");
    } catch {
      setError("Failed to load tickets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listPath, endpointBase]);

  const filtered = useMemo(() => filterTickets(tickets, filters), [tickets, filters]);

  const moderators = useMemo(() => {
    const map = new Map<string, { staffId: number | string; name: string; role: string }>();
    for (const t of tickets) {
      if (t.assignee?.staffId) {
        map.set(String(t.assignee.staffId), {
          staffId: t.assignee.staffId,
          name: t.assignee.name,
          role: t.assignee.role,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [tickets]);

  const channels = useMemo(() => {
    const set = new Set(tickets.map((t) => String(t.channel || "web").toLowerCase()));
    return [...set].sort();
  }, [tickets]);

  const summary = useMemo(() => {
    const open = tickets.filter((t) => t.status === "Open" || t.status === "In Progress");
    return {
      open: open.length,
      unassigned: tickets.filter((t) => !t.assignee && (t.status === "Open" || t.status === "In Progress")).length,
      high: tickets.filter(
        (t) =>
          String(t.priority).toLowerCase() === "high" &&
          (t.status === "Open" || t.status === "In Progress")
      ).length,
      awaiting: tickets.filter((t) => t.waitingForResponse).length,
    };
  }, [tickets]);

  const quickCounts = useMemo(
    () => ({
      all: tickets.length,
      open_only: summary.open,
      awaiting: summary.awaiting,
      escalated: tickets.filter((t) => t.isEscalated).length,
      unassigned: summary.unassigned,
      high: summary.high,
    }),
    [tickets, summary]
  );

  if (loading) {
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center md:pl-[260px]">
        <Loader2 className={`h-8 w-8 animate-spin ${ACCENT_SPIN[accent]}`} />
      </main>
    );
  }

  if (error && tickets.length === 0) {
    return (
      <main className="relative z-10 p-8 md:pl-[260px]">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          {error}
          <button type="button" onClick={() => void load()} className="mt-4 block text-sm underline">
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      className="relative z-10 min-h-screen px-6 py-8 md:pl-[260px] md:px-10"
      style={{ animation: "fadeIn 420ms ease" }}
    >
      {selectedId !== null && (
        <ModeratorTicketDetailModal
          ticketId={selectedId}
          endpointBase={endpointBase}
          accent={accent}
          onClose={() => setSelectedId(null)}
          onUpdated={() => void load(true)}
        />
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${ACCENT_LABEL[accent]}`}>
            {roleLabel}
          </p>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Open tickets" value={summary.open} sub="Active queue" />
        <SummaryCard label="Unassigned" value={summary.unassigned} sub="Need a handler" />
        <SummaryCard label="High priority" value={summary.high} sub="Open and urgent" />
        <SummaryCard label="Awaiting reply" value={summary.awaiting} sub="User message waiting" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1016]">
        <div className="flex flex-col gap-4 border-b border-white/[0.06] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Ticket className={`h-4 w-4 ${ACCENT_ICON[accent]}`} />
              <h2 className="text-sm font-semibold text-white">Ticket desk</h2>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Assign, escalate, and reply from the detail modal.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search number, subject, requester…"
              className={`w-full rounded-xl border border-white/[0.08] bg-[#14151c] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 ${ACCENT_FOCUS[accent]}`}
            />
          </div>
        </div>

        <TicketFiltersPanel
          filters={filters}
          onChange={setFilters}
          ticketTypes={typeCatalog}
          channels={channels}
          moderators={moderators}
          accent={accent}
          showQueue={false}
          resultCount={filtered.length}
          totalCount={tickets.length}
          variant="desk"
          hideSearch
          quickCounts={quickCounts}
        />

        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] text-zinc-600">
                <Inbox className="h-7 w-7" />
              </span>
              <div>
                <p className="text-sm font-medium text-zinc-400">No tickets match these filters</p>
                <p className="mt-0.5 text-xs text-zinc-600">Try clearing search or switching filters.</p>
              </div>
            </div>
          ) : (
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
                {filtered.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
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
                        acc {shortId(t.requester.accountId)}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-300">{t.type || t.category || "—"}</td>
                    <td className="px-4 py-3.5">
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={t.status} />
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
                    <td className="px-5 py-3.5 text-xs text-zinc-500">
                      {formatDateTime(t.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
