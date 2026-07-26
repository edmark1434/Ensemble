import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquare, RefreshCw } from "lucide-react";
import api from "@/lib/axios";
import ModeratorTicketDetailModal from "../shared/ModeratorTicketDetailModal";
import { PriorityBadge, StatusBadge } from "../shared/ui";
import type { SupportTicket } from "../shared/moderatorTypes";

function relativeTime(value: string | null | undefined) {
  if (!value) return "—";
  const diffMs = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SupportChat() {
  const [chats, setChats] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | string | null>(null);

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

  const waiting = useMemo(
    () => chats.filter((c) => !["resolved", "closed"].includes(c.status)).length,
    [chats]
  );

  return (
    <main className="relative z-10 min-h-screen px-6 py-8 md:ml-72 md:px-10" style={{ animation: "fadeIn 420ms ease" }}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-400">Support Moderator</p>
          <h1 className="text-2xl font-bold text-white">Chat Support</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Live chat-channel tickets (`chat` / `live` / `messenger`). Open one to reply in the ticket thread.
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

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.08] bg-[#14151c] px-4 py-3">
          <p className="text-lg font-bold text-white">{chats.length}</p>
          <p className="text-[11px] text-zinc-500">Chat tickets</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#14151c] px-4 py-3">
          <p className="text-lg font-bold text-sky-300">{waiting}</p>
          <p className="text-[11px] text-zinc-500">Waiting / open</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#14151c] px-4 py-3">
          <p className="text-lg font-bold text-violet-300">
            {chats.reduce((acc, c) => acc + (c.messageCount || 0), 0)}
          </p>
          <p className="text-[11px] text-zinc-500">Messages in queue</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] text-zinc-600">
              <MessageSquare className="h-7 w-7" />
            </span>
            <div>
              <p className="text-sm font-medium text-zinc-400">No live chat conversations waiting</p>
              <p className="mt-1 max-w-md text-xs text-zinc-600">
                Tickets with channel set to chat, live, or messenger appear here. For web tickets, use Ticket Management
                to open the conversation thread and escalate or resolve.
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {chats.map((c) => (
              <li
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 transition hover:bg-white/[0.04]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-zinc-500">{c.number}</span>
                    <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] capitalize text-sky-300">
                      {c.channel}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm font-medium text-zinc-200">{c.subject}</p>
                  <p className="text-[11px] text-zinc-500">
                    @{c.requester.username} · {c.messageCount} message(s) · last {relativeTime(c.lastMessageAt || c.updatedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
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
