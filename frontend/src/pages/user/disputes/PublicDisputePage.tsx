import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import useGlobalState from "@/lib/global_state";

type DiscussionMessage = {
  id: string;
  authorName?: string;
  body?: string;
  createdAt?: string | null;
  audience?: string;
};

type Discussion = {
  id: string;
  number?: string | null;
  title?: string;
  type?: string;
  status?: string;
  description?: string | null;
  initiator?: { name?: string; handle?: string | null };
  respondent?: { name?: string; handle?: string | null };
  canComment?: boolean;
  messages: DiscussionMessage[];
};

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

function party(person?: { name?: string; handle?: string | null }) {
  if (!person) return "Unknown";
  return person.handle ? `${person.name || "Unknown"} (@${person.handle})` : person.name || "Unknown";
}

export default function PublicDisputePage() {
  const { id } = useParams();
  const isAuthenticated = useGlobalState((state) => state.isAuthenticated);
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

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

  const sendComment = async () => {
    if (!id || !comment.trim() || sending) return;
    setSending(true);
    try {
      const res = await api.post(`/api/accounts/disputes/${id}/messages`, { body: comment.trim() });
      setComment("");
      toast.success(res.data?.message || "Comment posted to the discussion.");
      const refresh = await api.get(`/api/accounts/disputes/${id}`);
      setDiscussion(refresh.data?.data || discussion);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not send that comment.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 text-gray-900 dark:text-white">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">Dispute discussion</p>
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
              {party(discussion.initiator)} vs {party(discussion.respondent)} · {discussion.type || "Contract"}
            </p>
            <p className="mt-3 text-sm">
              Status: <span className="font-semibold">{label(discussion.status)}</span>
            </p>
            {discussion.description ? (
              <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-zinc-300">{discussion.description}</p>
            ) : null}
          </header>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Discussion</h2>
            {discussion.messages.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-white/10">
                No messages in this discussion yet.
              </p>
            ) : (
              discussion.messages.map((message) => (
                <div key={message.id} className="rounded-2xl border border-gray-200 px-4 py-3 dark:border-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-zinc-500">
                    <span>{message.authorName || "Staff"}</span>
                    <span>{when(message.createdAt)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-zinc-200">
                    {message.body}
                  </p>
                </div>
              ))
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 p-4 dark:border-white/10">
            <h2 className="text-sm font-semibold">Add a comment</h2>
            {!isAuthenticated ? (
              <>
                <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
                  Sign in as a party on this dispute to comment.
                </p>
                <Link to="/login" className="mt-3 inline-block text-sm font-medium underline">
                  Sign in to comment
                </Link>
              </>
            ) : discussion.canComment ? (
              <>
                <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
                  Staff made this dispute public, so both parties can write in this discussion.
                </p>
                <div className="mt-3 space-y-2">
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    maxLength={2000}
                    rows={4}
                    placeholder="Write a comment"
                    className="w-full resize-none rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none dark:border-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => void sendComment()}
                    disabled={sending || !comment.trim()}
                    className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
                  >
                    {sending ? "Sending…" : "Post comment"}
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
                Only the two parties can comment after staff make a dispute public.
              </p>
            )}
          </section>
        </article>
      ) : null}
    </main>
  );
}
