import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw, ShieldAlert, ShieldCheck, X } from "lucide-react";
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
      await api.post("/api/moderator/support/restrictions/violations", {
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
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white"
          >
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
              className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white outline-none focus:border-sky-500/40"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Abusive behaviour in tickets"
              className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white outline-none focus:border-sky-500/40"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Reason
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white outline-none focus:border-sky-500/40"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Points
            <input
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              type="number"
              className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white outline-none focus:border-sky-500/40"
            />
          </label>
          <button
            type="button"
            disabled={saving || !accountId.trim() || !title.trim()}
            onClick={() => void submit()}
            className="w-full rounded-xl bg-sky-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Issue violation"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{sub}</p>
    </div>
  );
}

export default function SupportRestrictions() {
  const [data, setData] = useState<RestrictionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIssueModal, setShowIssueModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/moderator/support/restrictions");
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
      await api.patch(`/api/moderator/support/restrictions/accounts/${accountId}`, { status });
      showSuccessToast(status === "active" ? "Account reinstated" : `Account ${status}`);
      void load();
    } catch {
      showErrorToast("Failed to update account restriction");
    }
  };

  const counts = useMemo(() => {
    if (!data) return { restricted: 0, violations: 0, points: 0 };
    return {
      restricted: data.restrictedAccounts.length,
      violations: data.violations.length,
      points: data.violations.reduce((acc, v) => acc + (Number(v.points) || 0), 0),
    };
  }, [data]);

  return (
    <main
      className="relative z-10 min-h-screen px-6 py-8 md:ml-72 md:px-10"
      style={{ animation: "fadeIn 420ms ease" }}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-400">
            Support Moderator
          </p>
          <h1 className="text-2xl font-bold text-white">Violations &amp; Restrictions</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Issue violations and manage suspended or banned accounts from the database.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowIssueModal(true)}
            className="flex items-center gap-2 rounded-xl bg-sky-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            <Plus className="h-4 w-4" />
            Issue Violation
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Restricted accounts" value={counts.restricted} sub="Suspended or banned" />
        <SummaryCard label="Violations logged" value={counts.violations} sub="In violation history" />
        <SummaryCard label="Points issued" value={counts.points} sub="Across all violations" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1016]">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-sky-300" />
                <h2 className="text-sm font-semibold text-white">Restricted accounts</h2>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Accounts currently suspended or banned. Reinstate to restore access.
              </p>
            </div>
            <div className="overflow-x-auto">
              {data.restrictedAccounts.length === 0 ? (
                <p className="px-5 py-12 text-center text-sm text-zinc-500">No restricted accounts.</p>
              ) : (
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wide text-zinc-500">
                      <th className="px-5 py-3 font-medium">Account</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.restrictedAccounts.map((a) => (
                      <tr key={a.accountId} className="border-b border-white/[0.04]">
                        <td className="px-5 py-3.5 text-zinc-200">
                          {a.name} <span className="text-zinc-500">@{a.handle}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-300">
                            {a.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
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
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1016]">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-sky-300" />
                <h2 className="text-sm font-semibold text-white">Violation history</h2>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Logged violations from support actions. Suspend accounts that still need a restriction.
              </p>
            </div>
            <div className="overflow-x-auto">
              {data.violations.length === 0 ? (
                <p className="px-5 py-12 text-center text-sm text-zinc-500">No violations issued yet.</p>
              ) : (
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wide text-zinc-500">
                      <th className="px-5 py-3 font-medium">Account</th>
                      <th className="px-4 py-3 font-medium">Title</th>
                      <th className="px-4 py-3 font-medium">Points</th>
                      <th className="px-4 py-3 font-medium">Issued by</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-5 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.violations.map((v) => (
                      <tr key={v.id} className="border-b border-white/[0.04]">
                        <td className="px-5 py-3.5 text-zinc-200">@{v.account.handle}</td>
                        <td className="px-4 py-3.5 text-zinc-300">{v.title}</td>
                        <td className="px-4 py-3.5 text-zinc-400">{v.points}</td>
                        <td className="px-4 py-3.5 text-zinc-400">{v.issuedBy}</td>
                        <td className="px-4 py-3.5 text-zinc-500">
                          {new Date(v.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {v.account.status?.toLowerCase() !== "suspended" &&
                            v.account.status?.toLowerCase() !== "banned" && (
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
              )}
            </div>
          </section>
        </div>
      ) : null}

      {showIssueModal && (
        <IssueViolationModal onClose={() => setShowIssueModal(false)} onIssued={() => void load()} />
      )}
    </main>
  );
}
