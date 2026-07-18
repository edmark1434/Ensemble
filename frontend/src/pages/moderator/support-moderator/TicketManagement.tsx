import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import api from "@/lib/axios";
import ModeratorTicketDetailModal from "../shared/ModeratorTicketDetailModal";
import { TicketsTable } from "../shared/ui";
import type { SupportTicket } from "../shared/moderatorTypes";

const STATUS_FILTERS = ["all", "open", "in_progress", "resolved", "closed"];

export default function SupportTicketManagement() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/moderator/support/tickets", {
        params: status === "all" ? {} : { status },
      });
      if (res.data?.success) setTickets(res.data.data);
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
          <h1 className="text-2xl font-bold text-white">Ticket Management</h1>
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
        ) : tickets.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">No support tickets in this view.</p>
        ) : (
          <TicketsTable tickets={tickets} onSelect={setSelectedId} />
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
