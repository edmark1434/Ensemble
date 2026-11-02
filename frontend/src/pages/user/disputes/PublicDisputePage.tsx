import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "@/lib/axios";
import socket from "@/lib/socket";
import toast from "react-hot-toast";
import useGlobalState from "@/lib/global_state";

type DiscussionMessage = {
  id: string;
  authorName?: string;
  authorRole?: string | null;
  body?: string;
  createdAt?: string | null;
  audience?: string;
};

type DiscussionPerson = {
  accountId?: string | null;
  name?: string;
  handle?: string | null;
};

type Discussion = {
  id: string;
  number?: string | null;
  title?: string;
  type?: string;
  status?: string;
  description?: string | null;
  initiator?: DiscussionPerson;
  respondent?: DiscussionPerson;
  isParty?: boolean;
  canComment?: boolean;
  chatId?: string | null;
  messages: DiscussionMessage[];
};

function upsertDiscussionMessage(list: DiscussionMessage[], next: DiscussionMessage) {
  const idx = list.findIndex((item) => String(item.id) === String(next.id));
  if (idx === -1) return [...list, next];
  const copy = [...list];
  copy[idx] = { ...copy[idx], ...next };
  return copy;
}

function label(value?: string | null) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function when(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function party(person?: DiscussionPerson) {
  if (!person) return "Unknown";
  return person.handle ? `${person.name || "Unknown"} (@${person.handle})` : person.name || "Unknown";
}

function partyLink(person?: DiscussionPerson) {
  if (!person?.accountId) return <span>{party(person)}</span>;
  return (
    <Link to={`/profile/${person.accountId}`} className="font-medium underline-offset-2 hover:underline">
      {party(person)}
    </Link>
  );
}

function roleLabel(role?: string | null) {
  const value = String(role || "").toLowerCase();
  if (value === "disputer") return "Disputer";
  if (value === "disputee") return "Disputee";
  if (value === "staff") return "Staff";
  if (value === "community" || value === "public") return "Community";
  return null;
}

export default function PublicDisputePage() {
  const { id } = useParams();
  const isAuthenticated = useGlobalState((state) => state.isAuthenticated);
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.get(`/api/accounts/disputes/${id}`)
      .then((res) => {
        if (!cancelled) setDiscussion(res.data?.data || null);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err?.response?.data?.message || "This dispute is not available.";
        setError(message);
        setDiscussion(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const onLive = (payload: {
      id?: string;
      _id?: string;
      conversationId?: string;
      conversation_id?: string;
      disputeId?: string;
      authorName?: string;
      author_name?: string;
      authorRole?: string;
      author_role?: string;
      body?: string;
      message_content?: string;
      createdAt?: string;
      created_at?: string;
      audience?: string;
    }) => {
      if (payload?.disputeId && String(payload.disputeId) !== String(id)) return;
      const room = payload?.conversationId || payload?.conversation_id;
      if (
        room &&
        discussion?.chatId &&
        String(room) !== String(discussion.chatId) &&
        !String(payload?.disputeId || "")
      ) {
        return;
      }
      const messageId = payload?.id || payload?._id;
      if (!messageId) return;
      const audience = String(payload.audience || "").toLowerCase();
      if (audience && !["parties", "public"].includes(audience)) return;
      setDiscussion((current) => {
        if (!current) return current;
        return {
          ...current,
          messages: upsertDiscussionMessage(current.messages || [], {
            id: String(messageId),
            authorName: payload.authorName || payload.author_name || "Member",
            authorRole: payload.authorRole || payload.author_role || null,
            body: payload.body || payload.message_content || "",
            createdAt: payload.createdAt || payload.created_at || new Date().toISOString(),
            audience: payload.audience,
          }),
        };
      });
    };

    const join = () => {
      socket.emit("joinDisputeDiscussion", { disputeId: String(id) });
      if (discussion?.chatId) {
        socket.emit("joinRoom", { conversation_id: String(discussion.chatId) });
      }
    };

    if (!socket.connected) socket.connect();
    join();
    socket.on("connect", join);
    socket.on("disputeMessage", onLive);
    socket.on("disputeMessageUpdated", onLive);
    return () => {
      socket.off("connect", join);
      socket.off("disputeMessage", onLive);
      socket.off("disputeMessageUpdated", onLive);
      socket.emit("leaveDisputeDiscussion", { disputeId: String(id) });
      if (discussion?.chatId) {
        socket.emit("leaveRoom", { conversation_id: String(discussion.chatId) });
      }
    };
  }, [id, discussion?.chatId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [discussion?.messages?.length]);

  const sendComment = async () => {
    if (!id || !comment.trim() || sending) return;
    const text = comment.trim();
    const pendingId = `pending-${Date.now()}`;
    setDiscussion((current) =>
      current
        ? {
            ...current,
            messages: [
              ...(current.messages || []),
              {
                id: pendingId,
                authorName: "You",
                authorRole: current.isParty ? undefined : "community",
                body: text,
                createdAt: new Date().toISOString(),
                audience: "public",
              },
            ],
          }
        : current
    );
    setComment("");
    setSending(true);
    try {
      const res = await api.post(`/api/accounts/disputes/${id}/messages`, { body: text });
      toast.success(res.data?.message || "Comment posted to the discussion.");
      const saved = res.data?.data?.message as DiscussionMessage | undefined;
      const nextChatId = res.data?.data?.chatId;
      setDiscussion((current) => {
        if (!current) return current;
        const withoutPending = (current.messages || []).filter((item) => String(item.id) !== pendingId);
        return {
          ...current,
          chatId: nextChatId ? String(nextChatId) : current.chatId,
          messages: saved?.id
            ? upsertDiscussionMessage(withoutPending, {
                id: String(saved.id),
                authorName: saved.authorName || "You",
                authorRole: saved.authorRole || null,
                body: saved.body || text,
                createdAt: saved.createdAt || new Date().toISOString(),
                audience: saved.audience || "public",
              })
            : withoutPending,
        };
      });
      if (!saved?.id) {
        const refresh = await api.get(`/api/accounts/disputes/${id}`);
        if (refresh.data?.data) setDiscussion(refresh.data.data);
      }
    } catch (err: any) {
      setDiscussion((current) =>
        current
          ? {
              ...current,
              messages: (current.messages || []).filter((item) => String(item.id) !== pendingId),
            }
          : current
      );
      setComment(text);
      toast.error(err?.response?.data?.message || "Could not send that comment.");
    } finally {
      setSending(false);
    }
  };

  const closed = String(discussion?.status || "").toLowerCase() === "closed";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 text-gray-900 dark:text-white">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">
        Public dispute forum
      </p>
      {loading ? <p className="mt-4 text-sm text-gray-500">Loading discussion…</p> : null}
      {error ? (
        <div className="mt-4 rounded-2xl border border-gray-200 p-5 dark:border-white/10">
          <p className="text-sm text-gray-700 dark:text-zinc-300">{error}</p>
          <Link to="/home" className="mt-3 inline-block text-sm font-medium underline">
            Back home
          </Link>
        </div>
      ) : null}
      {discussion ? (
        <article className="mt-4 space-y-5">
          <header className="rounded-2xl border border-gray-200 p-5 dark:border-white/10">
            <p className="text-xs text-gray-500 dark:text-zinc-500">{discussion.number || "Dispute"}</p>
            <h1 className="mt-1 text-2xl font-bold">{discussion.title || "Dispute"}</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
              {partyLink(discussion.initiator)} vs {partyLink(discussion.respondent)} ·{" "}
              {discussion.type || "Contract"}
            </p>
            <p className="mt-3 text-sm">
              Status: <span className="font-semibold">{label(discussion.status)}</span>
            </p>
            {discussion.description ? (
              <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-zinc-300">{discussion.description}</p>
            ) : null}
            <p className="mt-3 text-xs text-gray-500 dark:text-zinc-500">
              This discussion is public. Anyone signed in can read the thread and leave a reply.
            </p>
          </header>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Discussion</h2>
              <span className="text-xs text-gray-500 dark:text-zinc-500">
                {discussion.messages.length} {discussion.messages.length === 1 ? "reply" : "replies"}
              </span>
            </div>
            {discussion.messages.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-white/10">
                No messages in this discussion yet. Be the first to reply.
              </p>
            ) : (
              discussion.messages.map((message) => {
                const role = roleLabel(message.authorRole);
                return (
                  <div key={message.id} className="rounded-2xl border border-gray-200 px-4 py-3 dark:border-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-zinc-500">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-800 dark:text-zinc-200">
                          {message.authorName || "Member"}
                        </span>
                        {role ? (
                          <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] uppercase tracking-wide dark:border-white/10">
                            {role}
                          </span>
                        ) : null}
                      </span>
                      <span>{when(message.createdAt)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-zinc-200">
                      {message.body}
                    </p>
                  </div>
                );
              })
            )}
            <div ref={threadEndRef} />
          </section>

          <section className="rounded-2xl border border-gray-200 p-4 dark:border-white/10">
            <h2 className="text-sm font-semibold">Join the discussion</h2>
            {!isAuthenticated ? (
              <>
                <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
                  Sign in to reply in this public dispute forum.
                </p>
                <Link to="/login" className="mt-3 inline-block text-sm font-medium underline">
                  Sign in to comment
                </Link>
              </>
            ) : discussion.canComment ? (
              <>
                <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
                  {discussion.isParty
                    ? "You’re a party on this dispute. Your reply is visible to everyone viewing this page."
                    : "Your reply is public and visible to everyone viewing this dispute."}
                </p>
                <div className="mt-3 space-y-2">
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    maxLength={2000}
                    rows={4}
                    placeholder="Write a public reply"
                    className="w-full resize-none rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none dark:border-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => void sendComment()}
                    disabled={sending || !comment.trim()}
                    className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
                  >
                    {sending ? "Sending…" : "Post reply"}
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
                {closed
                  ? "This dispute is closed. The discussion is read-only."
                  : "You cannot comment on this dispute right now."}
              </p>
            )}
          </section>
        </article>
      ) : null}
    </main>
  );
}
