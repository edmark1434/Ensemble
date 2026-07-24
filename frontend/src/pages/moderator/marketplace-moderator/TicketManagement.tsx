import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import api from "@/lib/axios";
import ModeratorTicketDetailModal from "../shared/ModeratorTicketDetailModal";
import { TicketsTable } from "../shared/ui";
import type { SupportTicket } from "../shared/moderatorTypes";

export default function TicketManagement() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | string | null>(null);

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
          <TicketsTable tickets={tickets} onSelect={setSelectedId} />
        )}
      </div>

      {selectedId !== null && (
        <ModeratorTicketDetailModal
          ticketId={selectedId}
          endpointBase="/api/moderator/marketplace/tickets"
          accent="rose"
          onClose={() => setSelectedId(null)}
          onUpdated={() => void load()}
        />
      )}
    </main>
  );
}
