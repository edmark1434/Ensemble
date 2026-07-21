import { useEffect, useState } from "react";
import { Archive, Loader2, Play, Users } from "lucide-react";
import api from "@/lib/axios";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast.ts";
import type { ForumGroupModeration } from "../shared/moderatorTypes";

export default function ForumGroups() {
  const [groups, setGroups] = useState<ForumGroupModeration[]>([]);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/moderator/forum/groups");
      if (res.data?.success) {
        setAvailable(res.data.data.available);
        setGroups(res.data.data.groups);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const setStatus = async (group: ForumGroupModeration, status: "active" | "inactive") => {
    setSavingId(group.id);
    try {
      await api.patch(`/api/moderator/forum/groups/${group.id}`, { status });
      showSuccessToast(status === "active" ? `"${group.name}" reactivated` : `"${group.name}" archived`);
      await load();
    } catch {
      showErrorToast("Failed to update group");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className="relative z-10 min-h-screen px-6 py-8 md:ml-72 md:px-10" style={{ animation: "fadeIn 420ms ease" }}>
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-400">Forum Moderator</p>
        <h1 className="text-2xl font-bold text-white">Forum Groups</h1>
        <p className="mt-1 text-sm text-zinc-500">Archive misbehaving groups or bring them back.</p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
          </div>
        ) : !available ? (
          <p className="py-12 text-center text-sm text-zinc-500">
            MongoDB is not connected — forum group moderation is unavailable.
          </p>
        ) : groups.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">No forum groups yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="pb-2">Group</th>
                  <th className="pb-2">Members</th>
                  <th className="pb-2">Discussions</th>
                  <th className="pb-2">Tags</th>
                  <th className="pb-2">Created</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {groups.map((g) => (
                  <tr key={g.id} className="hover:bg-white/[0.02]">
                    <td className="max-w-[260px] py-2.5">
                      <p className="truncate text-zinc-200">{g.name}</p>
                      {g.description && <p className="truncate text-[11px] text-zinc-500">{g.description}</p>}
                    </td>
                    <td className="py-2.5 text-zinc-400">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-zinc-600" />
                        {g.memberCount}
                      </span>
                    </td>
                    <td className="py-2.5 text-zinc-400">{g.discussionCount}</td>
                    <td className="max-w-[180px] truncate py-2.5 text-zinc-500">
                      {g.tags.map((t) => t.tag_name).filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="py-2.5 text-zinc-500">
                      {g.createdAt ? new Date(g.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                          g.status === "active" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
                        }`}
                      >
                        {g.status}
                      </span>
                    </td>
                    <td className="py-2.5">
                      {g.status === "active" ? (
                        <button
                          type="button"
                          disabled={savingId === g.id}
                          onClick={() => void setStatus(g, "inactive")}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                        >
                          {savingId === g.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                          Archive
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={savingId === g.id}
                          onClick={() => void setStatus(g, "active")}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                        >
                          {savingId === g.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
