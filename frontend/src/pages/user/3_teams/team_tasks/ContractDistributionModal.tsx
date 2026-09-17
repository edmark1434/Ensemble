import { useMemo, useState } from "react";
import { ArrowRightLeft, CheckCircle2, History, Info, ShieldCheck, X } from "lucide-react";
import type { TeamContractBudget, TeamContractDistribution, TeamTaskMember, TeamWorkspaceTask } from "./types";

export default function ContractDistributionModal({
  open,
  onClose,
  contractTitle,
  budget,
  members,
  tasks,
  distributions,
  projectLeadName,
  saving,
  onDistribute,
}: {
  open: boolean;
  onClose: () => void;
  contractTitle: string;
  budget?: TeamContractBudget;
  members: TeamTaskMember[];
  tasks: TeamWorkspaceTask[];
  distributions?: TeamContractDistribution[];
  projectLeadName: string;
  saving: boolean;
  onDistribute: (recipientAccountId: string, amountCredits: number) => Promise<void>;
}) {
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [amount, setAmount] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const memberTaskStats = useMemo(() => {
    const counts = new Map<string, { total: number; completed: number }>();
    for (const m of members) counts.set(m.account_id, { total: 0, completed: 0 });
    for (const task of tasks) {
      for (const assignee of task.assignees || []) {
        const current = counts.get(assignee.account_id) || { total: 0, completed: 0 };
        current.total += 1;
        if (task.status === "completed") current.completed += 1;
        counts.set(assignee.account_id, current);
      }
    }
    return counts;
  }, [members, tasks]);

  if (!open) return null;

  const releasedCredits = budget?.released_credits || 0;
  const distributedCredits = budget?.distributed_credits || 0;
  const remainingCredits = budget?.remaining_distributable_credits || 0;
  const teamBalance = budget?.team_available_balance || 0;
  const maxAllowed = Math.min(remainingCredits, teamBalance);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (!selectedRecipientId) {
      setErrorMessage("Please select a workspace member who contributed to this contract.");
      return;
    }
    const parsedAmount = parseInt(amount, 10);
    if (!Number.isSafeInteger(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage("Enter a valid whole credit amount greater than zero.");
      return;
    }
    if (parsedAmount > maxAllowed) {
      setErrorMessage(
        `Amount cannot exceed the remaining contract budget of ${maxAllowed.toLocaleString()} credits.`
      );
      return;
    }
    await onDistribute(selectedRecipientId, parsedAmount);
    setSelectedRecipientId("");
    setAmount("");
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-white p-6 shadow-2xl dark:bg-[#11131d]">
        <div className="flex items-start justify-between border-b border-gray-200 pb-4 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-400">
                Strict Contract Isolation
              </span>
              <span className="flex items-center gap-1 text-xs text-zinc-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Led by {projectLeadName}
              </span>
            </div>
            <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              Distribute Contract Funds
            </h2>
            <p className="line-clamp-1 text-xs text-zinc-400">{contractTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Budget Cards */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Released Escrow</p>
            <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
              {releasedCredits.toLocaleString()} <span className="text-xs font-normal text-zinc-500">cr</span>
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Paid Out</p>
            <p className="mt-1 text-sm font-bold text-amber-500">
              {distributedCredits.toLocaleString()} <span className="text-xs font-normal text-zinc-500">cr</span>
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Remaining Budget</p>
            <p className="mt-1 text-sm font-bold text-emerald-400">
              {remainingCredits.toLocaleString()} <span className="text-xs font-normal text-zinc-500">cr</span>
            </p>
          </div>
        </div>

        {releasedCredits <= 0 ? (
          <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-300">
            <div className="flex items-center gap-2 font-semibold">
              <Info className="h-4 w-4 shrink-0" />
              Escrow funds not released yet
            </div>
            <p className="mt-1 text-amber-400/90">
              Contract funds cannot be distributed until the client completes and releases the escrow payment for this specific contract.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300">
                Workspace Member (Whitelisted Contributors Only)
              </label>
              <select
                value={selectedRecipientId}
                onChange={(e) => setSelectedRecipientId(e.target.value)}
                className="mt-1.5 w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-[#0c0d14] dark:text-white"
              >
                <option value="">Select contributing workspace member...</option>
                {members.map((member) => {
                  const stats = memberTaskStats.get(member.account_id) || { total: 0, completed: 0 };
                  return (
                    <option key={member.account_id} value={member.account_id}>
                      {member.display_name} (@{member.handle}) — {stats.completed}/{stats.total} completed tasks
                    </option>
                  );
                })}
              </select>
              <p className="mt-1 text-[11px] text-zinc-500">
                Only members enrolled in this contract workspace are eligible to receive payouts from this budget.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300">
                  Credits to Distribute
                </label>
                <span className="text-[11px] text-zinc-400">
                  Available Cap: <strong className="text-emerald-400">{maxAllowed.toLocaleString()} cr</strong>
                </span>
              </div>
              <input
                type="number"
                min="1"
                max={maxAllowed}
                step="1"
                placeholder={`1 - ${maxAllowed.toLocaleString()}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-[#0c0d14] dark:text-white"
              />
            </div>

            {errorMessage && (
              <p className="rounded-lg bg-red-500/10 p-2.5 text-xs text-red-400">{errorMessage}</p>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-white/5 dark:border-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || maxAllowed <= 0 || !selectedRecipientId || !amount}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                {saving ? "Distributing..." : "Distribute Credits"}
              </button>
            </div>
          </form>
        )}

        {/* Previous Contract Distributions Audit Trail */}
        {distributions && distributions.length > 0 && (
          <div className="mt-6 border-t border-gray-200 pt-4 dark:border-white/10">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-white">
              <History className="h-3.5 w-3.5 text-zinc-400" />
              Contract Distribution History ({distributions.length})
            </h3>
            <div className="mt-2.5 max-h-40 space-y-2 overflow-y-auto">
              {distributions.map((d) => (
                <div
                  key={d.distribution_id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/50 p-2.5 text-xs dark:border-white/10 dark:bg-white/[0.02]"
                >
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{d.recipient_name}</span>{" "}
                    <span className="text-zinc-500">(@{d.recipient_handle})</span>
                    <p className="text-[10px] text-zinc-400">{new Date(d.created_at).toLocaleString()}</p>
                  </div>
                  <span className="font-semibold text-emerald-400">
                    +{d.amount_credits.toLocaleString()} cr
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
