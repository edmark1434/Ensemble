import { useEffect, useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import api from "@/lib/axios";
import ModeratorTicketDetailModal from "../shared/ModeratorTicketDetailModal";
import { PriorityBadge, StatusBadge } from "../shared/ui";
import type { SupportTicket } from "../shared/moderatorTypes";

export default function SupportChat() {
  const [chats, setChats] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/moderator/support/chat");
      if (res.data?.success) setChats(res.data.data);
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
        <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-400">Support Moderator</p>
        <h1 className="text-2xl font-bold text-white">Chat Support</h1>
        <p className="mt-1 text-sm text-zinc-500">Live chat conversations routed to the support desk.</p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <MessageSquare className="h-8 w-8 text-zinc-600" />
            <p className="text-sm text-zinc-500">No live chat conversations waiting right now.</p>
            <p className="max-w-md text-xs text-zinc-600">
              Chat-channel tickets appear here as members open live conversations. Open one to reply in the shared thread view.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {chats.map((c) => (
              <li
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 hover:bg-white/[0.04]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-200">{c.subject}</p>
                  <p className="text-[11px] text-zinc-500">
                    @{c.requester.username} · {c.messageCount} message(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={c.priority} />
                  <StatusBadge status={c.status} />
                </div>
              </li>
            ))}
          </ul>
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
