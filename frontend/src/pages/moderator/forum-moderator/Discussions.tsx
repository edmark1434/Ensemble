import { useEffect, useState } from "react";
import { Loader2, Lock, MessageSquare, Pin, Search, Trash2, Undo2, Unlock, X } from "lucide-react";
import api from "@/lib/axios";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast.ts";
import type { ForumDiscussionDetail, ForumDiscussionModeration } from "../shared/moderatorTypes";

function authorLabel(author: { handle: string | null; name: string | null; userId: string | number | null }) {
  if (author.handle) return `@${author.handle}`;
  if (author.name) return author.name;
  return author.userId != null ? String(author.userId) : "unknown";
}

function DiscussionDetailModal({
  discussionId,
  onClose,
  onUpdated,
}: {
  discussionId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [detail, setDetail] = useState<ForumDiscussionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/moderator/forum/discussions/${discussionId}`);
      if (res.data?.success) setDetail(res.data.data);
    } catch {
      showErrorToast("Failed to load discussion");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discussionId]);

  const setStatus = async (status: "active" | "removed") => {
    setSaving(true);
    try {
      const res = await api.patch(`/api/moderator/forum/discussions/${discussionId}`, { status });
      if (res.data?.success) setDetail(res.data.data);
      showSuccessToast(status === "removed" ? "Discussion removed" : "Discussion restored");
      onUpdated();
    } catch {
      showErrorToast("Failed to update discussion");
    } finally {
      setSaving(false);
    }
  };

  const setModeration = async (changes: { isLocked?: boolean; isSticky?: boolean }) => {
    setSaving(true);
    try {
      const res = await api.patch(`/api/moderator/forum/discussions/${discussionId}`, changes);
      if (res.data?.success) setDetail(res.data.data);
      showSuccessToast("Discussion moderation updated");
      onUpdated();
    } catch {
      showErrorToast("Failed to update discussion");
    } finally {
      setSaving(false);
    }
  };

  const removeComment = async (commentId: string | number) => {
    setSaving(true);
    try {
      const res = await api.delete(`/api/moderator/forum/discussions/${discussionId}/comments/${commentId}`);
      if (res.data?.success) setDetail(res.data.data);
      showSuccessToast("Comment removed");
      onUpdated();
    } catch {
      showErrorToast("Failed to remove comment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1016] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-400">Discussion detail</p>
            <h2 className="text-lg font-bold text-white">{detail?.title || "Discussion"}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          </div>
        ) : detail ? (
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div>
              <p className="text-sm text-zinc-500">
                {authorLabel(detail.author)} · {detail.createdAt ? new Date(detail.createdAt).toLocaleString() : "—"} ·{" "}
                <span className={detail.status === "removed" ? "text-red-300" : "text-emerald-300"}>{detail.status}</span>
              </p>
              {detail.description && <p className="mt-2 text-sm text-zinc-300">{detail.description}</p>}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void setModeration({ isLocked: !detail.isLocked })}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 disabled:opacity-50"
              >
                {detail.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {detail.isLocked ? "Unlock" : "Lock"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void setModeration({ isSticky: !detail.isSticky })}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 disabled:opacity-50"
              >
                <Pin className="h-4 w-4" />
                {detail.isSticky ? "Unsticky" : "Sticky"}
              </button>
              {detail.status === "removed" ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void setStatus("active")}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  <Undo2 className="h-4 w-4" />
                  Restore discussion
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void setStatus("removed")}
                  className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove discussion
                </button>
              )}
            </div>

            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-white">
                <MessageSquare className="h-4 w-4 text-violet-400" />
                Comments ({detail.comments.length})
              </p>
              {detail.comments.map((c) => (
                <div
                  key={c.commentId}
                  className={`rounded-xl border px-4 py-3 ${
                    c.isDeleted ? "border-red-500/20 bg-red-500/5 opacity-70" : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
                    <span>
                      {authorLabel(c.author)} · {c.likeCount} like(s)
                      {c.isDeleted && " · removed"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span>{c.createdAt ? new Date(c.createdAt).toLocaleString() : "—"}</span>
                      {!c.isDeleted && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void removeComment(c.commentId)}
                          title="Remove comment"
                          className="rounded-lg border border-red-500/30 bg-red-500/10 p-1.5 text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-zinc-200">{c.comment}</p>
                </div>
              ))}
              {detail.comments.length === 0 && <p className="text-sm text-zinc-500">No comments on this discussion.</p>}
            </div>
          </div>
        ) : (
          <p className="py-12 text-center text-zinc-500">Discussion not found.</p>
        )}
      </div>
    </div>
  );
}

export default function ForumDiscussions() {
  const [discussions, setDiscussions] = useState<ForumDiscussionModeration[]>([]);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/moderator/forum/discussions", {
        params: search.trim() ? { search: search.trim() } : {},
      });
      if (res.data?.success) {
        setAvailable(res.data.data.available);
        setDiscussions(res.data.data.discussions);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => void load(), search ? 350 : 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <main className="relative z-10 min-h-screen px-6 py-8 md:ml-72 md:px-10" style={{ animation: "fadeIn 420ms ease" }}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-400">Forum Moderator</p>
          <h1 className="text-2xl font-bold text-white">Discussions</h1>
          <p className="mt-1 text-sm text-zinc-500">Open a discussion to moderate it and its comments.</p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search discussion titles"
            className="w-64 rounded-lg border border-white/10 bg-[#14151c] py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500/40"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
          </div>
        ) : !available ? (
          <p className="py-12 text-center text-sm text-zinc-500">
            MongoDB is not connected — discussion moderation is unavailable.
          </p>
        ) : discussions.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">No discussions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="pb-2">Title</th>
                  <th className="pb-2">Group</th>
                  <th className="pb-2">Author</th>
                  <th className="pb-2">Comments</th>
                  <th className="pb-2">Likes</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {discussions.map((d) => (
                  <tr key={d.id} onClick={() => setSelectedId(d.id)} className="cursor-pointer hover:bg-white/[0.02]">
                    <td className="max-w-[240px] truncate py-2.5 text-zinc-200">{d.title}</td>
                    <td className="py-2.5 text-zinc-400">{d.groupName || "—"}</td>
                    <td className="py-2.5 text-zinc-400">{authorLabel(d.author)}</td>
                    <td className="py-2.5 text-zinc-400">{d.commentCount}</td>
                    <td className="py-2.5 text-zinc-400">{d.likeCount}</td>
                    <td className="py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                          d.status === "active" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-zinc-500">
                      {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedId !== null && (
        <DiscussionDetailModal
          discussionId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={() => void load()}
        />
      )}
    </main>
  );
}
