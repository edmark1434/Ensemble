import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import api from "@/lib/axios";
import ModeratorDisputeDetailModal from "../shared/ModeratorDisputeDetailModal";
import { PriorityBadge, StatusBadge } from "../shared/ui";
import type { Dispute } from "../shared/moderatorTypes";

const STATUS_FILTERS = ["all", "open", "under_review", "resolved", "closed"];

export default function SupportDisputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<number | string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/moderator/support/disputes", {
        params: status === "all" ? {} : { status },
      });
      if (res.data?.success) setDisputes(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <main className="relative z-10 min-h-screen px-6 py-8 md:ml-72 md:px-10" style={{ animation: "fadeIn 420ms ease" }}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-400">Support Moderator</p>
          <h1 className="text-2xl font-bold text-white">Disputes</h1>
          <p className="mt-1 text-sm text-zinc-500">Open a dispute to discuss it in chat and resolve it.</p>
        </div>
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                status === s
                  ? "border-sky-400/40 bg-sky-500/15 text-sky-200"
                  : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
          </div>
        ) : disputes.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">No disputes in this view.</p>
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
                  <tr key={d.id} onClick={() => setSelectedId(d.id)} className="cursor-pointer hover:bg-white/[0.02]">
                    <td className="py-2.5 text-zinc-300">{d.number}</td>
                    <td className="py-2.5 text-zinc-200">{d.title}</td>
                    <td className="py-2.5 text-zinc-400">
                      @{d.initiator.username} → @{d.respondent.username}
                    </td>
                    <td className="py-2.5 text-zinc-400">
                      {d.relatedEntityType || "—"}
                      {d.relatedEntityId ? ` · ${d.relatedEntityId}` : ""}
                    </td>
                    <td className="py-2.5 text-zinc-300">{d.creditAmount.toLocaleString()}</td>
                    <td className="py-2.5">
                      <PriorityBadge priority={d.priority} />
                    </td>
                    <td className="py-2.5">
                      <StatusBadge status={d.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedId !== null && (
        <ModeratorDisputeDetailModal
          disputeId={selectedId}
          endpointBase="/api/moderator/support/disputes"
          accent="sky"
          onClose={() => setSelectedId(null)}
          onUpdated={() => void load()}
        />
      )}
    </main>
  );
}
