import { useEffect, useMemo, useState } from "react";
import { Flag, Loader2, RefreshCw, Search, ShieldAlert } from "lucide-react";
import api from "@/lib/axios";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast.ts";
import { PriorityBadge, StatusBadge, titleCaseWords } from "../shared/ui";
import type { UserReport } from "../shared/moderatorTypes";

const STATUS_OPTIONS = ["open", "in_review", "resolved", "closed"];
const STATUS_FILTERS = ["all", ...STATUS_OPTIONS] as const;

export default function SupportUserTeam() {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | string | null>(null);
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [search, setSearch] = useState("");

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

  const updateStatus = async (report: UserReport, nextStatus: string) => {
    setSavingId(report.id);
    try {
      await api.patch(`/api/moderator/support/reports/${report.id}`, { status: nextStatus });
      showSuccessToast(`Report ${report.number} marked ${titleCaseWords(nextStatus)}`);
      await load();
    } catch {
      showErrorToast("Failed to update report");
    } finally {
      setSavingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter(
      (r) =>
        r.number?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q) ||
        r.reporter.username?.toLowerCase().includes(q) ||
        r.targetLabel?.toLowerCase().includes(q) ||
        r.targetType?.toLowerCase().includes(q)
    );
  }, [reports, search]);

  const summary = useMemo(
    () => ({
      total: filtered.length,
      open: filtered.filter((r) => r.status === "open" || r.status === "in_review").length,
      high: filtered.filter((r) => r.priority === "high").length,
    }),
    [filtered]
  );

  return (
    <main className="relative z-10 min-h-screen px-6 py-8 md:ml-72 md:px-10" style={{ animation: "fadeIn 420ms ease" }}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-400">Support Moderator</p>
          <h1 className="text-2xl font-bold text-white">User &amp; Team Reports</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Triage member reports from the `reports` table and escalate serious cases via Restrictions.
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

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-[#14151c] px-4 py-3">
          <p className="text-lg font-bold text-white">{summary.total}</p>
          <p className="text-[11px] text-zinc-500">Reports in view</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#14151c] px-4 py-3">
          <p className="text-lg font-bold text-sky-300">{summary.open}</p>
          <p className="text-[11px] text-zinc-500">Open / in review</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#14151c] px-4 py-3">
          <p className="text-lg font-bold text-red-300">{summary.high}</p>
          <p className="text-[11px] text-zinc-500">High priority</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#14151c] px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search report #, reason, target…"
            className="w-72 rounded-lg border border-white/10 bg-[#0f1016] py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-sky-500/40"
          />
        </div>
        <div className="h-6 w-px bg-white/[0.06]" />
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                status === s
                  ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
                  : "border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {titleCaseWords(s)}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Flag className="h-7 w-7 text-zinc-600" />
            <p className="text-sm text-zinc-500">No user reports to triage in this view.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="pb-3">Report</th>
                  <th className="pb-3">Reporter</th>
                  <th className="pb-3">Target</th>
                  <th className="pb-3">Reason</th>
                  <th className="pb-3">Priority</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Created</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.03]">
                    <td className="py-3 font-mono text-[11px] text-zinc-400">{r.number}</td>
                    <td className="py-3 text-zinc-300">@{r.reporter.username}</td>
                    <td className="py-3 text-zinc-400">
                      <p className="truncate">{r.targetLabel || r.targetId || "—"}</p>
                      <p className="text-[10px] capitalize text-zinc-600">{r.targetType}</p>
                    </td>
                    <td className="max-w-[220px] py-3">
                      <p className="truncate text-zinc-200">{r.reason}</p>
                      {r.description && <p className="truncate text-[10px] text-zinc-600">{r.description}</p>}
                    </td>
                    <td className="py-3">
                      <PriorityBadge priority={r.priority} />
                    </td>
                    <td className="py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-3 text-xs text-zinc-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="py-3">
                      <select
                        value={r.status}
                        disabled={savingId === r.id}
                        onChange={(e) => void updateStatus(r, e.target.value)}
                        className="rounded-lg border border-white/10 bg-[#0f1016] px-2 py-1 text-xs text-white disabled:opacity-50"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {titleCaseWords(s)}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 flex items-center gap-2 text-xs text-zinc-600">
        <ShieldAlert className="h-3.5 w-3.5" />
        Issue account restrictions from the Restrictions tab after reviewing a report.
      </p>
    </main>
  );
}
