import { useEffect, useState } from "react";
import { Info, Loader2 } from "lucide-react";
import api from "@/lib/axios";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast.ts";
import type { UserReport } from "../shared/moderatorTypes";
import { titleCaseWords } from "../shared/ui";

const STATUS_OPTIONS = ["open", "in_review", "resolved", "closed"];

export default function ForumManagement() {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/moderator/forum/reports");
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
      await api.patch(`/api/moderator/forum/reports/${report.id}`, { status });
      showSuccessToast(`Report ${report.number} marked ${titleCaseWords(status)}`);
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
        <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-400">Forum Moderator</p>
        <h1 className="text-2xl font-bold text-white">Forum Management</h1>
        <p className="mt-1 text-sm text-zinc-500">Review flagged discussions, comments and threads reported by the community.</p>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3 text-sm text-violet-100">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
        <p>
          This queue handles community reports. To moderate content directly, use the <strong>Forum Groups</strong> and{" "}
          <strong>Discussions</strong> tabs (requires MongoDB to be connected).
        </p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
          </div>
        ) : reports.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">No flagged forum content.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="pb-2">Report</th>
                  <th className="pb-2">Target</th>
                  <th className="pb-2">Reason</th>
                  <th className="pb-2">Reporter</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 text-zinc-300">{r.number}</td>
                    <td className="py-2.5 text-zinc-400">
                      {r.targetLabel || r.targetId || "—"}
                      <span className="ml-1 text-[10px] text-zinc-600">({r.targetType})</span>
                    </td>
                    <td className="py-2.5 text-zinc-300">{r.reason}</td>
                    <td className="py-2.5 text-zinc-400">@{r.reporter.username}</td>
                    <td className="py-2.5 text-zinc-400">{titleCaseWords(r.status)}</td>
                    <td className="py-2.5">
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
    </main>
  );
}
