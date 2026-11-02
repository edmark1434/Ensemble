import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Lock, MessagesSquare, Send } from "lucide-react";
import api from "@/lib/axios";
import socket from "@/lib/socket";
import toast from "react-hot-toast";
import useGlobalState from "@/lib/global_state";
import UserHeader from "@/components/nav/user_header";
import {
  Avatar,
  Card,
  RoleChip,
  StatusPill,
  VisibilityPill,
  formatWhen,
  isClosedStatus,
  titleCase,
} from "./disputeUi";

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

const MAX_LENGTH = 2000;

function upsertDiscussionMessage(list: DiscussionMessage[], next: DiscussionMessage) {
  const idx = list.findIndex((item) => String(item.id) === String(next.id));
  if (idx === -1) return [...list, next];
  const copy = [...list];
  copy[idx] = { ...copy[idx], ...next };
  return copy;
}

function PartyCard({ role, person }: { role: "disputer" | "disputee"; person?: DiscussionPerson }) {
  const name = person?.name || "Unknown";
  const content = (
    <>
      <Avatar name={name} role={role} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">{name}</span>
        <span className="block truncate text-xs text-gray-500 dark:text-zinc-400">
          {person?.handle ? `@${person.handle} · ` : ""}
          {role === "disputer" ? "Filed the dispute" : "Named in the dispute"}
        </span>
      </span>
    </>
  );
  const className =
    "flex min-w-0 items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 dark:border-white/10";
  if (!person?.accountId) return <div className={className}>{content}</div>;
  return (
    <Link
      to={`/profile/${person.accountId}`}
      className={`${className} transition hover:border-gray-300 hover:bg-gray-50 dark:hover:border-white/20 dark:hover:bg-white/[0.03]`}
    >
      {content}
    </Link>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-44 rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-dark-surface" />
      <div className="h-64 rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-dark-surface" />
    </div>
  );
}

export default function PublicDisputePage() {
  const { id } = useParams();
  const navigate = useNavigate();
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
      if (!payload?.disputeId || String(payload.disputeId) !== String(id)) return;
      const messageId = payload?.id || payload?._id;
      if (!messageId) return;
      const audience = String(payload.audience || "").toLowerCase();
      if (!["parties", "public"].includes(audience)) {
        // A message moved back to a private audience leaves the public thread.
        setDiscussion((current) =>
          current
            ? {
                ...current,
                messages: (current.messages || []).filter((item) => String(item.id) !== String(messageId)),
              }
            : current
        );
        return;
      }
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

    const onVisibility = (payload: { disputeId?: string; visibility?: boolean }) => {
      if (String(payload?.disputeId || "") !== String(id) || payload?.visibility !== false) return;
      setDiscussion(null);
      setError("Staff made this dispute private. The public discussion is no longer available.");
    };

    const join = () => socket.emit("joinDisputeDiscussion", { disputeId: String(id) });

    if (!socket.connected) socket.connect();
    join();
    socket.on("connect", join);
    socket.on("disputeMessage", onLive);
    socket.on("disputeMessageUpdated", onLive);
    socket.on("disputeVisibilityChanged", onVisibility);
    return () => {
      socket.off("connect", join);
      socket.off("disputeMessage", onLive);
      socket.off("disputeMessageUpdated", onLive);
      socket.off("disputeVisibilityChanged", onVisibility);
      socket.emit("leaveDisputeDiscussion", { disputeId: String(id) });
    };
  }, [id]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

  const closed = isClosedStatus(discussion?.status);
  const messages = discussion?.messages || [];

  return (
    <div className="min-h-screen bg-gray-50 font-['Plus_Jakarta_Sans'] dark:bg-dark-base">
      <UserHeader pageTitle="Dispute" />
      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 text-gray-900 dark:text-white">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/home"))}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        {loading ? <LoadingState /> : null}

        {!loading && error ? (
          <Card className="px-6 py-10 text-center">
            <Lock className="mx-auto h-6 w-6 text-gray-400 dark:text-zinc-500" />
            <p className="mt-3 text-sm font-semibold">This discussion isn’t available</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">{error}</p>
            <Link
              to="/home"
              className="mt-4 inline-block rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
            >
              Back home
            </Link>
          </Card>
        ) : null}

        {!loading && discussion ? (
          <>
            <Card className="space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                  {discussion.number || "Dispute"}
                </span>
                <span className="text-gray-300 dark:text-zinc-600">·</span>
                <span className="text-xs text-gray-500 dark:text-zinc-400">{titleCase(discussion.type, "Contract")}</span>
                <span className="ml-auto flex items-center gap-1.5">
                  <VisibilityPill isPublic />
                  <StatusPill status={discussion.status} />
                </span>
              </div>

              <h1 className="text-xl font-bold leading-snug sm:text-2xl">{discussion.title || "Dispute"}</h1>

              <div className="grid gap-2 sm:grid-cols-2">
                <PartyCard role="disputer" person={discussion.initiator} />
                <PartyCard role="disputee" person={discussion.respondent} />
              </div>

              {discussion.description ? (
                <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/[0.03]">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">
                    Original complaint
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-zinc-300">
                    {discussion.description}
                  </p>
                </div>
              ) : null}
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-3 dark:border-white/5">
                <h2 className="flex items-center gap-2 text-sm font-bold">
                  <MessagesSquare className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
                  Discussion
                </h2>
                <span className="text-xs text-gray-500 dark:text-zinc-400">
                  {messages.length} {messages.length === 1 ? "reply" : "replies"}
                </span>
              </div>

              {messages.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-gray-500 dark:text-zinc-400">
                  No replies yet. {discussion.canComment ? "Start the discussion below." : ""}
                </p>
              ) : (
                <ol className="divide-y divide-gray-100 dark:divide-white/5">
                  {messages.map((message) => {
                    const pending = String(message.id).startsWith("pending-");
                    return (
                      <li key={message.id} className={`flex gap-3 px-5 py-4 ${pending ? "opacity-60" : ""}`}>
                        <Avatar name={message.authorName} role={message.authorRole} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {message.authorName || "Member"}
                            </span>
                            <RoleChip role={message.authorRole} />
                            <span className="ml-auto text-[11px] text-gray-400 dark:text-zinc-500">
                              {pending ? "Sending…" : formatWhen(message.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700 dark:text-zinc-300">
                            {message.body}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
              <div ref={threadEndRef} />
            </Card>

            <Card className="sticky bottom-4 p-4">
              {!isAuthenticated ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-gray-600 dark:text-zinc-400">Sign in to join this discussion.</p>
                  <Link
                    to="/login"
                    className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-zinc-200"
                  >
                    Sign in
                  </Link>
                </div>
              ) : discussion.canComment ? (
                <div className="space-y-2">
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                        event.preventDefault();
                        void sendComment();
                      }
                    }}
                    maxLength={MAX_LENGTH}
                    rows={3}
                    placeholder="Write a reply…"
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-white/30"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-gray-500 dark:text-zinc-500">
                      {discussion.isParty
                        ? "You’re a party on this dispute. Your reply is public."
                        : "Your reply is public and visible to everyone viewing this dispute."}
                      <span className="ml-2 tabular-nums text-gray-400 dark:text-zinc-600">
                        {comment.length}/{MAX_LENGTH}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => void sendComment()}
                      disabled={sending || !comment.trim()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-zinc-200"
                    >
                      {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      {sending ? "Sending" : "Post reply"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400">
                  <Lock className="h-4 w-4 shrink-0" />
                  {closed
                    ? "This dispute is closed. The discussion is read-only."
                    : "You can’t reply to this dispute right now."}
                </p>
              )}
            </Card>
          </>
        ) : null}
      </main>
    </div>
  );
}
