import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import api from "@/lib/axios";
import ModeratorTicketDetailModal from "../shared/ModeratorTicketDetailModal";
import type { MarketplaceTicket } from "./marketplaceTypes";

export default function TicketManagement() {
  const [tickets, setTickets] = useState<MarketplaceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/moderator/marketplace/tickets");
      if (res.data?.success) setTickets(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="relative z-10 min-h-screen px-6 py-8 md:ml-72 md:px-10" style={{ animation: "fadeIn 420ms ease" }}>
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-400">Marketplace Moderator</p>
        <h1 className="text-2xl font-bold text-white">Ticket Management</h1>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-rose-400" />
          </div>
        ) : tickets.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">No marketplace tickets right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="pb-2">Ticket</th>
                  <th className="pb-2">Requester</th>
                  <th className="pb-2">Priority</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Assignee</th>
                  <th className="pb-2">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tickets.map((t) => (
                  <tr key={t.id} onClick={() => setSelectedId(t.id)} className="cursor-pointer hover:bg-white/[0.02]">
                    <td className="py-2.5 text-zinc-200">{t.subject}</td>
                    <td className="py-2.5 text-zinc-400">@{t.requester.username}</td>
                    <td className="py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          t.priority === "high"
                            ? "bg-red-500/15 text-red-300"
                            : t.priority === "medium"
                              ? "bg-amber-500/15 text-amber-300"
                              : "bg-zinc-500/15 text-zinc-300"
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-2.5 text-zinc-400">{t.status.replace("_", " ")}</td>
                    <td className="py-2.5 text-zinc-400">{t.assignee?.name || "Unassigned"}</td>
                    <td className="py-2.5 text-zinc-500">{new Date(t.updatedAt).toLocaleDateString()}</td>
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
          endpointBase="/api/moderator/tickets"
          accent="rose"
          onClose={() => setSelectedId(null)}
          onUpdated={() => void load()}
        />
      )}
    </main>
  );
}
