import { useEffect, useMemo, useState } from "react";
import { Coins, Hand, Loader2, RefreshCw, Scale, Search } from "lucide-react";
import api from "@/lib/axios";
import ModeratorDisputeDetailModal from "../shared/ModeratorDisputeDetailModal";
import { PriorityBadge, StatusBadge, titleCaseWords } from "../shared/ui";
import type { Dispute } from "../shared/moderatorTypes";

const STATUS_FILTERS = ["all", "open", "under_review", "resolved", "closed"] as const;

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

function SummaryCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{sub}</p>
    </div>
  );
}

export default function SupportDisputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [entityType, setEntityType] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/moderator/support/disputes", {
        params: {
          status: status === "all" ? undefined : status,
          entityType: entityType === "all" ? undefined : entityType,
          search: search.trim() || undefined,
        },
      });
      if (res.data?.success) setDisputes(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => void load(), search ? 350 : 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, entityType, search]);

  const entityTypes = useMemo(() => {
    const set = new Set(disputes.map((d) => d.relatedEntityType).filter(Boolean) as string[]);
    return ["all", ...Array.from(set).sort()];
  }, [disputes]);

  const summary = useMemo(() => {
    const open = disputes.filter((d) => d.status === "open" || d.status === "under_review");
    return {
      total: disputes.length,
      open: open.length,
      credits: open.reduce((acc, d) => acc + (d.creditAmount || 0), 0),
      unassigned: disputes.filter(
        (d) => !d.assignee && (d.status === "open" || d.status === "under_review")
      ).length,
    };
  }, [disputes]);

  return (
    <main
      className="relative z-10 min-h-screen px-6 py-8 md:ml-72 md:px-10"
      style={{ animation: "fadeIn 420ms ease" }}
    >
      {selectedId !== null && (
        <ModeratorDisputeDetailModal
          disputeId={selectedId}
          endpointBase="/api/moderator/support/disputes"
          accent="sky"
          onClose={() => setSelectedId(null)}
          onUpdated={() => void load()}
        />
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-400">
            Support Moderator
          </p>
          <h1 className="text-2xl font-bold text-white">Disputes</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Open a dispute to discuss it in Mongo chat, assign a handler, and resolve it with notes.
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

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="In view" value={summary.total} sub="Matching current filters" />
        <SummaryCard label="Open / under review" value={summary.open} sub="Active cases" />
        <SummaryCard
          label="Credits at risk"
          value={summary.credits.toLocaleString()}
          sub="Held in open disputes"
        />
        <SummaryCard label="Unassigned open" value={summary.unassigned} sub="Need a handler" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1016]">
        <div className="flex flex-col gap-4 border-b border-white/[0.06] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-sky-300" />
              <h2 className="text-sm font-semibold text-white">Dispute desk</h2>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Click a row to open chat, assign staff, and resolve with notes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, number, party…"
                className="w-full rounded-xl border border-white/[0.08] bg-[#14151c] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-sky-500/40"
              />
            </div>
            {entityTypes.length > 1 && (
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="rounded-xl border border-white/[0.08] bg-[#14151c] px-3 py-2.5 text-xs text-zinc-300 outline-none"
              >
                {entityTypes.map((e) => (
                  <option key={e} value={e}>
                    {e === "all" ? "All entities" : e}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] px-3 py-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                status === s
                  ? "bg-sky-500/15 text-sky-100"
                  : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
              }`}
            >
              {titleCaseWords(s)}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
            </div>
          ) : (
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-3 font-medium">Dispute</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Parties</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">Credits</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Assignee</th>
                  <th className="px-5 py-3 font-medium">Opened</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => setSelectedId(d.id)}
                    className="cursor-pointer border-b border-white/[0.04] transition hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-3.5 font-mono text-[11px] text-zinc-400">{d.number}</td>
                    <td className="max-w-[220px] px-4 py-3.5">
                      <p className="truncate font-medium text-zinc-200">{d.title}</p>
                      {d.reason && <p className="truncate text-[10px] text-zinc-600">{d.reason}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-400">
                      <p>@{d.initiator.username}</p>
                      <p className="text-[10px] text-zinc-600">vs @{d.respondent.username}</p>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-400">
                      <span className="capitalize">{d.relatedEntityType || "—"}</span>
                      {d.relatedEntityId ? (
                        <p className="max-w-[120px] truncate font-mono text-[10px] text-zinc-600">
                          {d.relatedEntityId}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 text-amber-300/90">
                        <Coins className="h-3.5 w-3.5" />
                        {d.creditAmount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <PriorityBadge priority={d.priority} />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3.5 text-zinc-300">
                      {d.assignee ? (
                        d.assignee.name
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-200/90">
                          <Hand className="h-3.5 w-3.5" />
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td
                      className="px-5 py-3.5 text-xs text-zinc-500"
                      title={new Date(d.openedAt).toLocaleString()}
                    >
                      {relativeTime(d.openedAt)}
                    </td>
                  </tr>
                ))}
                {disputes.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-16 text-center text-sm text-zinc-500">
                      No disputes match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
