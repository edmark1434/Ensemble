import { useEffect, useState } from "react";
import { Loader2, Plus, ShieldAlert, ShieldCheck, X } from "lucide-react";
import api from "@/lib/axios";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast.ts";
import type { RestrictionsData } from "../marketplace-moderator/marketplaceTypes";

function IssueViolationModal({ onClose, onIssued }: { onClose: () => void; onIssued: () => void }) {
  const [accountId, setAccountId] = useState("");
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [points, setPoints] = useState("10");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!accountId.trim() || !title.trim()) return;
    setSaving(true);
    try {
      await api.post("/api/moderator/jobs/restrictions/violations", {
        accountId: accountId.trim(),
        title: title.trim(),
        reason: reason.trim(),
        points: Number(points) || 0,
      });
      showSuccessToast("Violation issued");
      onIssued();
      onClose();
    } catch {
      showErrorToast("Failed to issue violation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1016] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Issue Violation</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Account ID
            <input
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="Account ID"
              className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fraudulent job posting"
              className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Reason
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Points
            <input
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              type="number"
              className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white outline-none"
            />
          </label>
          <button
            type="button"
            disabled={saving || !accountId.trim() || !title.trim()}
            onClick={() => void submit()}
            className="w-full rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Issue violation"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JobsRestrictions() {
  const [data, setData] = useState<RestrictionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIssueModal, setShowIssueModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/moderator/jobs/restrictions");
      if (res.data?.success) setData(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const setRestriction = async (accountId: number | string, status: "suspended" | "banned" | "active") => {
    try {
      await api.patch(`/api/moderator/jobs/restrictions/accounts/${accountId}`, { status });
      showSuccessToast(status === "active" ? "Account reinstated" : `Account ${status}`);
      void load();
    } catch {
      showErrorToast("Failed to update account restriction");
    }
  };

  return (
    <main className="relative z-10 min-h-screen px-6 py-8 md:pl-[260px] md:px-10" style={{ animation: "fadeIn 420ms ease" }}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400">Jobs &amp; Gigs Moderator</p>
          <h1 className="text-2xl font-bold text-white">Restrictions</h1>
          <p className="mt-1 text-sm text-zinc-500">Restrict accounts from the jobs &amp; gigs marketplace.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowIssueModal(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          Issue Violation
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldAlert className="h-4 w-4 text-emerald-400" />
              Restricted accounts
            </p>
            {data.restrictedAccounts.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-500">No restricted accounts.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-left text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
                      <th className="pb-2">Account</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.restrictedAccounts.map((a) => (
                      <tr key={a.accountId}>
                        <td className="py-2.5 text-zinc-200">
                          {a.name} <span className="text-zinc-500">@{a.handle}</span>
                        </td>
                        <td className="py-2.5">
                          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-300">
                            {a.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => void setRestriction(a.accountId, "active")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Reinstate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
            <p className="mb-3 text-sm font-semibold text-white">Violation history</p>
            {data.violations.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-500">No violations issued yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
                      <th className="pb-2">Account</th>
                      <th className="pb-2">Title</th>
                      <th className="pb-2">Points</th>
                      <th className="pb-2">Issued by</th>
                      <th className="pb-2">Date</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.violations.map((v) => (
                      <tr key={v.id}>
                        <td className="py-2.5 text-zinc-200">@{v.account.handle}</td>
                        <td className="py-2.5 text-zinc-300">{v.title}</td>
                        <td className="py-2.5 text-zinc-400">{v.points}</td>
                        <td className="py-2.5 text-zinc-400">{v.issuedBy}</td>
                        <td className="py-2.5 text-zinc-500">{new Date(v.createdAt).toLocaleDateString()}</td>
                        <td className="py-2.5 text-right">
                          {v.account.status?.toLowerCase() !== "suspended" && v.account.status?.toLowerCase() !== "banned" && (
                            <button
                              type="button"
                              onClick={() => void setRestriction(v.account.accountId, "suspended")}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-300 hover:bg-red-500/20"
                            >
                              Suspend
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
        </div>
      ) : null}

      {showIssueModal && <IssueViolationModal onClose={() => setShowIssueModal(false)} onIssued={() => void load()} />}
    </main>
  );
}
