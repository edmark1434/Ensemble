import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import api from "@/lib/axios";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast.ts";
import type { UserReport } from "../shared/moderatorTypes";

const STATUS_OPTIONS = ["open", "in_review", "resolved", "closed"];

export default function SupportUserTeam() {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/moderator/support/reports");
      if (res.data?.success) setReports(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateStatus = async (report: UserReport, status: string) => {
    setSavingId(report.id);
    try {
      await api.patch(`/api/moderator/support/reports/${report.id}`, { status });
      showSuccessToast(`Report ${report.number} marked ${status.replace("_", " ")}`);
      await load();
    } catch {
      showErrorToast("Failed to update report");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className="relative z-10 min-h-screen px-6 py-8 md:ml-72 md:px-10" style={{ animation: "fadeIn 420ms ease" }}>
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-400">Support Moderator</p>
        <h1 className="text-2xl font-bold text-white">User & Team Reports</h1>
        <p className="mt-1 text-sm text-zinc-500">Triage member reports and take action on flagged accounts and content.</p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
          </div>
        ) : reports.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">No user reports to triage.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="pb-2">Report</th>
                  <th className="pb-2">Reporter</th>
                  <th className="pb-2">Target</th>
                  <th className="pb-2">Reason</th>
                  <th className="pb-2">Priority</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 text-zinc-300">{r.number}</td>
                    <td className="py-2.5 text-zinc-400">@{r.reporter.username}</td>
                    <td className="py-2.5 text-zinc-400">
                      {r.targetLabel || r.targetId || "—"}
                      <span className="ml-1 text-[10px] text-zinc-600">({r.targetType})</span>
                    </td>
                    <td className="py-2.5 text-zinc-300">{r.reason}</td>
                    <td className="py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          r.priority === "high"
                            ? "bg-red-500/15 text-red-300"
                            : r.priority === "medium"
                              ? "bg-amber-500/15 text-amber-300"
                              : "bg-zinc-500/15 text-zinc-300"
                        }`}
                      >
                        {r.priority}
                      </span>
                    </td>
                    <td className="py-2.5 text-zinc-400">{r.status.replace("_", " ")}</td>
                    <td className="py-2.5">
                      <select
                        value={r.status}
                        disabled={savingId === r.id}
                        onChange={(e) => void updateStatus(r, e.target.value)}
                        className="rounded-lg border border-white/10 bg-[#0f1016] px-2 py-1 text-xs text-white disabled:opacity-50"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s.replace("_", " ")}
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
    </main>
  );
}
