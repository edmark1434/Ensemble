import { useEffect, useMemo, useState } from "react";
import { Flag, Hand, Loader2, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/axios";
import { ReportCaseDetailModal } from "@/pages/admin/moderation/CaseDetailModals";
import { PriorityBadge, StatusBadge, titleCaseWords } from "../shared/ui";
import type { UserReport } from "../shared/moderatorTypes";

const STATUS_FILTERS = ["all", "open", "in_review", "resolved", "closed"] as const;

function SummaryCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{sub}</p>
    </div>
  );
}

export default function SupportUserTeam() {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/moderator/support/reports", {
        params: status === "all" ? {} : { status },
      });
      if (res.data?.success) setReports(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter(
      (r) =>
        r.number?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q) ||
        r.reporter.username?.toLowerCase().includes(q) ||
        r.targetLabel?.toLowerCase().includes(q) ||
        r.targetType?.toLowerCase().includes(q) ||
        r.assignee?.name?.toLowerCase().includes(q)
    );
  }, [reports, search]);

  const counts = useMemo(
    () => ({
      total: reports.length,
      open: reports.filter((r) => ["open", "in_review", "in_progress"].includes(String(r.status).toLowerCase()))
        .length,
      high: reports.filter(
        (r) =>
          String(r.priority).toLowerCase() === "high" &&
          !["resolved", "closed", "dismissed"].includes(String(r.status).toLowerCase())
      ).length,
      unassigned: reports.filter(
        (r) =>
          !r.assignee && !["resolved", "closed", "dismissed"].includes(String(r.status).toLowerCase())
      ).length,
    }),
    [reports]
  );

  return (
    <main
      className="relative z-10 min-h-screen px-6 py-8 md:ml-72 md:px-10"
      style={{ animation: "fadeIn 420ms ease" }}
    >
      {selectedId != null && (
        <ReportCaseDetailModal
          reportId={selectedId}
          endpointBase="/api/moderator/support/reports"
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
          <h1 className="text-2xl font-bold text-white">User reports</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Triage member reports from the database — assign, prioritize, resolve, or escalate via
            Restrictions.
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
        <SummaryCard label="Reports filed" value={counts.total} sub="In current database scan" />
        <SummaryCard label="Open / in review" value={counts.open} sub="Awaiting triage" />
        <SummaryCard label="High priority" value={counts.high} sub="Open and urgent" />
        <SummaryCard label="Unassigned" value={counts.unassigned} sub="Need a handler" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1016]">
        <div className="flex flex-col gap-4 border-b border-white/[0.06] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-sky-300" />
              <h2 className="text-sm font-semibold text-white">Report desk</h2>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Click a row to open detail, assign staff, update priority, and resolve.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search report #, reason, target…"
              className="w-full rounded-xl border border-white/[0.08] bg-[#14151c] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-sky-500/40"
            />
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
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-3 font-medium">Report</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">Reporter</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Assignee</th>
                  <th className="px-5 py-3 font-medium">Filed</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={String(r.id)}
                    onClick={() => setSelectedId(r.id)}
                    className="cursor-pointer border-b border-white/[0.04] transition hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-white">{r.number}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{r.reason}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-zinc-200">{r.targetLabel || r.targetId || "—"}</p>
                      <p className="text-xs capitalize text-zinc-500">{r.targetType}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-zinc-200">{r.reporter.name}</p>
                      <p className="text-xs text-zinc-500">@{r.reporter.username || "—"}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <PriorityBadge priority={r.priority} />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3.5 text-zinc-300">
                      {r.assignee ? (
                        r.assignee.name
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-200/90">
                          <Hand className="h-3.5 w-3.5" />
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-zinc-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-sm text-zinc-500">
                      No user reports match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <p className="mt-4 flex items-center gap-2 text-xs text-zinc-600">
        <ShieldAlert className="h-3.5 w-3.5" />
        Issue account restrictions from the{" "}
        <Link to="/moderator/support/restrictions" className="text-sky-300 hover:underline">
          Restrictions
        </Link>{" "}
        tab after reviewing a report.
      </p>
    </main>
  );
}
