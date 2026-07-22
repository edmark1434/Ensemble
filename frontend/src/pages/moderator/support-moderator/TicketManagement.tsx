import { useEffect, useMemo, useState } from "react";
import { Inbox, Loader2, RefreshCw, Search } from "lucide-react";
import api from "@/lib/axios";
import ModeratorTicketDetailModal from "../shared/ModeratorTicketDetailModal";
import { PriorityBadge, StatusBadge } from "../shared/ui";
import type { SupportTicket } from "../shared/moderatorTypes";

const STATUS_FILTERS = ["all", "open", "in_progress", "escalated", "resolved", "closed"] as const;
const PRIORITY_FILTERS = ["all", "high", "medium", "low"] as const;

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

export default function SupportTicketManagement() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [priority, setPriority] = useState<(typeof PRIORITY_FILTERS)[number]>("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/moderator/support/tickets", {
        params: {
          status: status === "all" ? undefined : status,
          priority: priority === "all" ? undefined : priority,
          category: category === "all" ? undefined : category,
          search: search.trim() || undefined,
        },
      });
      if (res.data?.success) setTickets(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => void load(), search ? 350 : 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, priority, category, search]);

  const categories = useMemo(() => {
    const set = new Set(tickets.map((t) => t.category).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [tickets]);

  const summary = useMemo(
    () => ({
      total: tickets.length,
      open: tickets.filter((t) => t.status === "open" || t.status === "in_progress").length,
      unassigned: tickets.filter((t) => !t.assignee).length,
      high: tickets.filter((t) => t.priority === "high").length,
      messages: tickets.reduce((acc, t) => acc + (t.messageCount || 0), 0),
    }),
    [tickets]
  );

  return (
    <main className="relative z-10 min-h-screen px-6 py-8 md:ml-72 md:px-10" style={{ animation: "fadeIn 420ms ease" }}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-400">Support Moderator</p>
          <h1 className="text-2xl font-bold text-white">Ticket Management</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Triage, chat, escalate and resolve general support tickets (billing, account, security, disputes…).
          </p>
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
        <SummaryChip label="Open / in progress" value={summary.open} tone="text-sky-300" />
        <SummaryChip label="Unassigned" value={summary.unassigned} tone="text-amber-300" />
        <SummaryChip label="High priority" value={summary.high} tone="text-red-300" />
        <SummaryChip label="Messages" value={summary.messages} tone="text-violet-300" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#14151c] px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject, ticket #, requester…"
            className="w-72 rounded-lg border border-white/10 bg-[#0f1016] py-2 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-sky-500/40"
          />
        </div>

        <div className="h-6 w-px bg-white/[0.06]" />

        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition ${
                status === s
                  ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
                  : "border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-white/[0.06]" />

        <div className="flex flex-wrap gap-1.5">
          {PRIORITY_FILTERS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition ${
                priority === p
                  ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
                  : "border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {p === "all" ? "All priorities" : p}
            </button>
          ))}
        </div>

        {categories.length > 1 && (
          <>
            <div className="h-6 w-px bg-white/[0.06]" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#0f1016] px-3 py-1.5 text-xs text-zinc-300 outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "All categories" : c}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] text-zinc-600">
              <Inbox className="h-7 w-7" />
            </span>
            <div>
              <p className="text-sm font-medium text-zinc-400">No tickets in this view</p>
              <p className="mt-0.5 text-xs text-zinc-600">Try clearing search or switching filters.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="pb-3">Ticket</th>
                  <th className="pb-3">Subject</th>
                  <th className="pb-3">Requester</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Channel</th>
                  <th className="pb-3">Priority</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-center">Msgs</th>
                  <th className="pb-3">Assignee</th>
                  <th className="pb-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className="cursor-pointer transition hover:bg-white/[0.03]"
                  >
                    <td className="py-3 font-mono text-[11px] text-zinc-400">{t.number}</td>
                    <td className="max-w-[240px] py-3">
                      <p className="truncate font-medium text-zinc-200">{t.subject}</p>
                      {t.relatedDisputeId && <p className="text-[10px] text-amber-400/80">Linked dispute</p>}
                    </td>
                    <td className="py-3">
                      <p className="text-zinc-300">@{t.requester.username}</p>
                      <p className="text-[10px] text-zinc-600">{t.requester.name}</p>
                    </td>
                    <td className="py-3 capitalize text-zinc-400">{t.category || "—"}</td>
                    <td className="py-3 capitalize text-zinc-500">{t.channel || "web"}</td>
                    <td className="py-3">
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className="py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="py-3 text-center tabular-nums text-zinc-300">{t.messageCount}</td>
                    <td className="py-3 text-zinc-400">{t.assignee?.name || <span className="text-amber-300/80">Unassigned</span>}</td>
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
          endpointBase="/api/moderator/support/tickets"
          accent="sky"
          onClose={() => setSelectedId(null)}
          onUpdated={() => void load()}
        />
      )}
    </main>
  );
}
