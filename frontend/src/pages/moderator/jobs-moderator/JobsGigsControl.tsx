import { useEffect, useState } from "react";
import { Archive, History, Loader2, Play, Search, X } from "lucide-react";
import api from "@/lib/axios";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast.ts";
import type { JobsGigsPosting, UserJobsHistory } from "../shared/moderatorTypes";

const TYPE_TABS = ["all", "job", "gig"] as const;
const STATUS_TABS = ["all", "active", "paused", "closed", "archived"] as const;

function postingStatusClass(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-500/15 text-emerald-300";
    case "paused":
      return "bg-amber-500/15 text-amber-300";
    case "archived":
      return "bg-red-500/15 text-red-300";
    default:
      return "bg-zinc-500/15 text-zinc-300";
  }
}

function UserHistoryModal({ accountId, onClose }: { accountId: number; onClose: () => void }) {
  const [history, setHistory] = useState<UserJobsHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get(`/api/moderator/jobs/users/${accountId}/history`);
        if (active && res.data?.success) setHistory(res.data.data);
      } catch {
        if (active) showErrorToast("Failed to load user history");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [accountId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1016] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">User History</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
        ) : !history ? (
          <p className="py-10 text-center text-sm text-zinc-500">Could not load this user's history.</p>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
              <p className="text-sm font-semibold text-white">
                {history.account.name} <span className="font-normal text-zinc-500">@{history.account.handle}</span>
              </p>
              <p className="text-xs text-zinc-500">
                Account status: <span className="capitalize text-zinc-300">{history.account.status}</span>
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-white">Jobs posted ({history.jobs.length})</p>
              {history.jobs.length === 0 ? (
                <p className="text-sm text-zinc-500">No jobs posted.</p>
              ) : (
                <ul className="space-y-1.5">
                  {history.jobs.map((j) => (
                    <li key={j.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
                      <div>
                        <p className="text-zinc-200">{j.title}</p>
                        <p className="text-[11px] text-zinc-500">
                          {j.paymentType} · {j.rateCreditsMin.toLocaleString()}–{j.rateCreditsMax.toLocaleString()} credits · {new Date(j.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${postingStatusClass(j.status)}`}>{j.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-white">Gigs offered ({history.gigs.length})</p>
              {history.gigs.length === 0 ? (
                <p className="text-sm text-zinc-500">No gigs offered.</p>
              ) : (
                <ul className="space-y-1.5">
                  {history.gigs.map((g) => (
                    <li key={g.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
                      <div>
                        <p className="text-zinc-200">{g.title}</p>
                        <p className="text-[11px] text-zinc-500">
                          {g.paymentType} · {new Date(g.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${postingStatusClass(g.status)}`}>{g.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-white">Contracts ({history.contracts.length})</p>
              {history.contracts.length === 0 ? (
                <p className="text-sm text-zinc-500">No contracts.</p>
              ) : (
                <ul className="space-y-1.5">
                  {history.contracts.map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
                      <div>
                        <p className="text-zinc-200">{c.relatedTitle || `${c.type} contract #${c.id}`}</p>
                        <p className="text-[11px] text-zinc-500">
                          as {c.role} · {c.rateCredits.toLocaleString()} credits · {new Date(c.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="rounded-full bg-zinc-500/15 px-2 py-0.5 text-[10px] font-medium capitalize text-zinc-300">{c.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JobsGigsControl() {
  const [postings, setPostings] = useState<JobsGigsPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_TABS)[number]>("all");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_TABS)[number]>("all");
  const [search, setSearch] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [historyAccountId, setHistoryAccountId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/moderator/jobs/postings", {
        params: {
          type: typeFilter === "all" ? undefined : typeFilter,
          status: statusFilter === "all" ? undefined : statusFilter,
          search: search.trim() || undefined,
        },
      });
      if (res.data?.success) setPostings(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => void load(), search ? 350 : 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter, search]);

  const updatePosting = async (posting: JobsGigsPosting, status: string) => {
    const key = `${posting.type}-${posting.id}`;
    setSavingKey(key);
    try {
      await api.patch(`/api/moderator/jobs/postings/${posting.type}/${posting.id}`, { status });
      showSuccessToast(`${posting.postNumber} marked ${status}`);
      await load();
    } catch {
      showErrorToast("Failed to update posting");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <main className="relative z-10 min-h-screen px-6 py-8 md:ml-72 md:px-10" style={{ animation: "fadeIn 420ms ease" }}>
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400">Jobs &amp; Gigs Moderator</p>
        <h1 className="text-2xl font-bold text-white">Jobs &amp; Gigs Control</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage job and gig postings across the marketplace.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, author or post ID"
            className="w-64 rounded-lg border border-white/10 bg-[#14151c] py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500/40"
          />
        </div>

        <div className="flex gap-2">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setTypeFilter(tab)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition ${
                typeFilter === tab
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {tab === "all" ? "All types" : `${tab}s`}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition ${
                statusFilter === tab
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
        ) : postings.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">No job or gig postings in this view.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="pb-2">Post ID</th>
                  <th className="pb-2">Title</th>
                  <th className="pb-2">Author</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Date Created</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {postings.map((p) => {
                  const key = `${p.type}-${p.id}`;
                  const saving = savingKey === key;
                  return (
                    <tr key={key} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 text-zinc-300">{p.postNumber}</td>
                      <td className="max-w-[220px] truncate py-2.5 text-zinc-200">{p.title}</td>
                      <td className="py-2.5">
                        <button
                          type="button"
                          onClick={() => setHistoryAccountId(p.author.accountId)}
                          title="View user history"
                          className="text-zinc-400 underline-offset-2 hover:text-emerald-300 hover:underline"
                        >
                          @{p.author.handle}
                        </button>
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                            p.type === "job" ? "bg-sky-500/15 text-sky-300" : "bg-violet-500/15 text-violet-300"
                          }`}
                        >
                          {p.type}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${postingStatusClass(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-zinc-500">
                        {new Date(p.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setHistoryAccountId(p.author.accountId)}
                            title="User history"
                            className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
                          >
                            <History className="h-3.5 w-3.5" />
                          </button>
                          {p.status === "archived" ? (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void updatePosting(p, "active")}
                              title="Restore posting"
                              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-1.5 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                            >
                              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void updatePosting(p, "archived")}
                              title="Archive posting"
                              className="rounded-lg border border-red-500/30 bg-red-500/10 p-1.5 text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                            >
                              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {historyAccountId !== null && (
        <UserHistoryModal accountId={historyAccountId} onClose={() => setHistoryAccountId(null)} />
      )}
    </main>
  );
}
