import { useEffect, useMemo, useState } from "react";
import { Inbox, Loader2, RefreshCw } from "lucide-react";
import api from "@/lib/axios";
import TicketFiltersPanel from "@/pages/admin/ticketManagement/TicketFiltersPanel";
import {
  DEFAULT_TICKET_FILTERS,
  filterTickets,
  type TicketFilterState,
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

function relativeTime(value: string | null | undefined) {
  if (!value) return "—";
  const diffMs = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

function shortId(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  const s = String(value);
  return s.length > 10 ? `${s.slice(0, 8)}…` : s;
}

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#14151c] px-4 py-3">
      <p className={`text-lg font-bold leading-tight ${tone}`}>{value}</p>
      <p className="text-[11px] text-zinc-500">{label}</p>
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

/**
 * Shared moderator ticket desk with full filters + search.
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
  /** GET list URL; defaults to endpointBase */
  listPath?: string;
  accent?: Accent;
  queueKey?: keyof typeof QUEUE_TYPES;
}) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TicketFilterState>(DEFAULT_TICKET_FILTERS);
  const [selectedId, setSelectedId] = useState<number | string | null>(null);

  const typeCatalog = [...QUEUE_TYPES[queueKey]];

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(listPath || endpointBase);
      if (res.data?.success) setTickets(res.data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listPath, endpointBase]);

  const filtered = useMemo(() => filterTickets(tickets, filters), [tickets, filters]);

  const channels = useMemo(() => {
    const set = new Set(tickets.map((t) => String(t.channel || "web").toLowerCase()));
    return [...set].sort();
  }, [tickets]);

  const summary = useMemo(
    () => ({
      total: filtered.length,
      open: filtered.filter((t) => t.status === "Open" || t.status === "In Progress").length,
      unassigned: filtered.filter((t) => !t.assignee).length,
      high: filtered.filter((t) => t.priority === "High").length,
      awaiting: filtered.filter((t) => t.waitingForResponse).length,
    }),
    [filtered]
  );

  return (
    <main className="relative z-10 min-h-screen px-6 py-8 md:ml-72 md:px-10" style={{ animation: "fadeIn 420ms ease" }}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${ACCENT_LABEL[accent]}`}>{roleLabel}</p>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryChip label="In view" value={summary.total} tone="text-white" />
        <SummaryChip label="Open / In Progress" value={summary.open} tone={ACCENT_LABEL[accent]} />
        <SummaryChip label="Unassigned" value={summary.unassigned} tone="text-amber-300" />
        <SummaryChip label="High Priority" value={summary.high} tone="text-red-300" />
        <SummaryChip label="Awaiting Reply" value={summary.awaiting} tone="text-amber-200" />
      </div>

      <div className="mb-4">
        <TicketFiltersPanel
          filters={filters}
          onChange={setFilters}
          ticketTypes={typeCatalog}
          channels={channels}
          accent={accent}
          showQueue={false}
          resultCount={filtered.length}
          totalCount={tickets.length}
        />
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className={`h-6 w-6 animate-spin ${ACCENT_SPIN[accent]}`} />
          </div>
        ) : filtered.length === 0 ? (
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="pb-3">Ticket</th>
                  <th className="pb-3">Subject</th>
                  <th className="pb-3">Requester</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Flags</th>
                  <th className="pb-3">Channel</th>
                  <th className="pb-3">Priority</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-center">Msgs</th>
                  <th className="pb-3">Assignee</th>
                  <th className="pb-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className="cursor-pointer transition hover:bg-white/[0.03]"
                  >
                    <td className="py-3 font-mono text-[11px] text-zinc-400">{t.number}</td>
                    <td className="max-w-[240px] py-3">
                      <p className="truncate font-medium text-zinc-200">{t.subject}</p>
                      {t.relatedDisputeId && <p className="text-[10px] text-amber-400/80">Linked Dispute</p>}
                    </td>
                    <td className="min-w-[140px] py-3">
                      <p className="text-zinc-300">{t.requester.name}</p>
                      <p className="text-[11px] text-zinc-500">@{t.requester.username || "—"}</p>
                      <p className="font-mono text-[10px] text-zinc-600">acc {shortId(t.requester.accountId)}</p>
                    </td>
                    <td className="py-3 text-zinc-400">{t.type || t.category || "—"}</td>
                    <td className="py-3">
                      <div className="flex min-w-[120px] flex-col gap-1">
                        {t.waitingForResponse && (
                          <span className="w-fit rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200">
                            Awaiting Reply
                          </span>
                        )}
                        {t.isEscalated && (
                          <span className="w-fit rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-200">
                            Escalated{t.escalatedBy?.name ? `: ${t.escalatedBy.name}` : ""}
                          </span>
                        )}
                        {!t.waitingForResponse && !t.isEscalated && <span className="text-zinc-600">—</span>}
                      </div>
                    </td>
                    <td className="py-3 capitalize text-zinc-500">{t.channel || "web"}</td>
                    <td className="py-3">
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className="py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="py-3 text-center tabular-nums text-zinc-300">{t.messageCount}</td>
                    <td className="py-3 text-zinc-400">
                      {t.assignee?.name || <span className="text-amber-300/80">Unassigned</span>}
                    </td>
                    <td className="py-3 text-xs text-zinc-500" title={new Date(t.updatedAt).toLocaleString()}>
                      {relativeTime(t.lastMessageAt || t.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedId !== null && (
        <ModeratorTicketDetailModal
          ticketId={selectedId}
          endpointBase={endpointBase}
          accent={accent}
          onClose={() => setSelectedId(null)}
          onUpdated={() => void load()}
        />
      )}
    </main>
  );
}
