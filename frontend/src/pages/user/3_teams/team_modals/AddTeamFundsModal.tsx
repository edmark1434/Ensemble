import React, { useState, useEffect } from "react";
import { X, ArrowRight, LoaderCircle } from "lucide-react";
import { CreditIcon } from "@/components/ui/credit-icon";
import api from "@/lib/axios";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";

interface AddTeamFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
  teamBalance: number;
  userBalance: number;
  onSuccess: (result: { added_credits: number; team_wallet: any; user_balance_credits: number }) => void;
}

export const AddTeamFundsModal: React.FC<AddTeamFundsModalProps> = ({
  isOpen,
  onClose,
  teamId,
  teamName,
  teamBalance,
  userBalance,
  onSuccess,
}) => {
  const [amountStr, setAmountStr] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setAmountStr("");
      setErrorMessage("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const parsedAmount = parseInt(amountStr, 10);
  const validAmount = Number.isSafeInteger(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
  const exceedsBalance = validAmount > userBalance;

  const handleQuickSelect = (val: number) => {
    const target = Math.min(val, userBalance);
    setAmountStr(String(target));
    setErrorMessage("");
  };

  const handleMax = () => {
    setAmountStr(String(userBalance));
    setErrorMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validAmount || validAmount <= 0) {
      setErrorMessage("Enter a valid whole number of credits to add.");
      return;
    }
    if (validAmount > userBalance) {
      setErrorMessage(`Cannot exceed your personal balance (${userBalance.toLocaleString()} credits).`);
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await api.post(`/api/teams/${teamId}/wallet/funds`, {
        amount_credits: validAmount,
      });

      const result = response.data?.data;
      showSuccessToast(`Successfully added ${validAmount.toLocaleString()} credits to ${teamName}!`);
      onSuccess(result);
      onClose();
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Failed to add funds to team";
      setErrorMessage(msg);
      showErrorToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CreditIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Add Fund to Team
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Transfer personal credits to <span className="font-semibold text-gray-700 dark:text-zinc-200">{teamName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1 text-gray-400 hover:text-gray-600 dark:text-zinc-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Balance overview cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-3">
              <p className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">Your Personal Balance</p>
              <div className="mt-1 flex items-center gap-1.5 font-bold text-gray-900 dark:text-white text-base">
                <CreditIcon className="h-4 w-4 text-amber-500" />
                {userBalance.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-3">
              <p className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">Team Available Balance</p>
              <div className="mt-1 flex items-center gap-1.5 font-bold text-emerald-500 dark:text-emerald-400 text-base">
                <CreditIcon className="h-4 w-4 text-amber-500" />
                {teamBalance.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="team-fund-amount" className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                Amount to Transfer
              </label>
              <button
                type="button"
                onClick={handleMax}
                disabled={userBalance <= 0 || isSubmitting}
                className="text-[11px] font-semibold text-blue-500 hover:text-blue-400 disabled:opacity-40"
              >
                Use Max ({userBalance.toLocaleString()})
              </button>
            </div>
            <div className="relative">
              <input
                id="team-fund-amount"
                type="number"
                min="1"
                max={userBalance}
                step="1"
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  setErrorMessage("");
                }}
                placeholder="0"
                className="w-full rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 px-4 py-2.5 text-lg font-bold text-gray-900 dark:text-white outline-none focus:border-emerald-500 transition"
              />
              <span className="absolute right-3.5 top-3 text-xs font-semibold text-gray-400 dark:text-zinc-500 select-none">
                CREDITS
              </span>
            </div>
          </div>

          {/* Quick chips */}
          <div className="flex flex-wrap gap-2">
            {[50, 100, 250, 500, 1000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleQuickSelect(val)}
                disabled={userBalance < val || isSubmitting}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                  validAmount === val
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30"
                }`}
              >
                +{val}
              </button>
            ))}
          </div>

          {/* Transfer Preview */}
          {validAmount > 0 && !exceedsBalance && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-gray-600 dark:text-zinc-300">
                <span>Personal after transfer:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {(userBalance - validAmount).toLocaleString()} credits
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-600 dark:text-zinc-300">
                <span>Team after transfer:</span>
                <span className="font-semibold text-emerald-400">
                  {(teamBalance + validAmount).toLocaleString()} credits
                </span>
              </div>
            </div>
          )}

          {/* Error display */}
          {(errorMessage || exceedsBalance) && (
            <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {errorMessage || `Amount exceeds your personal balance of ${userBalance.toLocaleString()} credits.`}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || validAmount <= 0 || exceedsBalance}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:scale-[0.98] transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Adding Funds...
                </>
              ) : (
                <>
                  Transfer to Team
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
