import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import api from "@/lib/axios";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast.ts";
import type { Dispute } from "../shared/moderatorTypes";
import { PriorityBadge } from "../shared/ui";

const STATUS_OPTIONS = ["open", "under_review", "closed"];

function titleCaseLabel(value: string) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export default function JobsDisputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/moderator/jobs/disputes");
      if (res.data?.success) setDisputes(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateStatus = async (dispute: Dispute, status: string) => {
    setSavingId(dispute.id);
    try {
      const payload: { status: string; outcome?: string } = { status };
      if (status === "closed") payload.outcome = "resolved";
      await api.patch(`/api/moderator/jobs/disputes/${dispute.id}`, payload);
      showSuccessToast(`Dispute ${dispute.number} marked ${titleCaseLabel(status)}`);
      await load();
    } catch {
      showErrorToast("Failed to update dispute");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className="relative z-10 min-h-screen px-6 py-8 md:ml-72 md:px-10" style={{ animation: "fadeIn 420ms ease" }}>
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400">Jobs &amp; Gigs Moderator</p>
        <h1 className="text-2xl font-bold text-white">Disputes</h1>
        <p className="mt-1 text-sm text-zinc-500">Job, gig and contract disputes with credits held in escrow.</p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
        ) : disputes.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">No job/gig disputes right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="pb-2">Dispute</th>
                  <th className="pb-2">Title</th>
                  <th className="pb-2">Parties</th>
                  <th className="pb-2">Entity</th>
                  <th className="pb-2">Credits</th>
                  <th className="pb-2">Priority</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {disputes.map((d) => (
                  <tr key={d.id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 text-zinc-300">{d.number}</td>
                    <td className="py-2.5 text-zinc-200">{d.title}</td>
                    <td className="py-2.5 text-zinc-400">
                      @{d.initiator.username} → @{d.respondent.username}
                    </td>
                    <td className="py-2.5 text-zinc-400">
                      {d.relatedEntityType}
                      {d.relatedEntityId ? ` · ${d.relatedEntityId}` : ""}
                    </td>
                    <td className="py-2.5 text-zinc-300">{d.creditAmount.toLocaleString()}</td>
                    <td className="py-2.5">
                      <PriorityBadge priority={d.priority} />
                    </td>
                    <td className="py-2.5">
                      <select
                        value={d.status}
                        disabled={savingId === d.id}
                        onChange={(e) => void updateStatus(d, e.target.value)}
                        className="rounded-lg border border-white/10 bg-[#0f1016] px-2 py-1 text-xs text-white disabled:opacity-50"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {titleCaseLabel(s)}
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
