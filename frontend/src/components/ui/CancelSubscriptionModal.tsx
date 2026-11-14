import React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, XCircle, Loader2 } from "lucide-react";

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isCancelling?: boolean;
  planName?: string;
  endDate?: string | null;
}

export const CancelSubscriptionModal: React.FC<CancelSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isCancelling = false,
  planName = "current",
  endDate = null,
}) => {
  if (!isOpen) return null;

  const formattedDate = endDate
    ? new Date(endDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "the end of your current billing period";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isCancelling) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] p-6 shadow-2xl space-y-5 animate-scale-up">
        {/* Header with warning badge */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 shadow-sm">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
              Cancel Subscription?
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Please confirm if you want to cancel your {planName} membership.
            </p>
          </div>
        </div>

        {/* Warning details card */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-300 leading-relaxed space-y-1.5">
          <p className="font-semibold">What happens next:</p>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800/90 dark:text-amber-200/90">
            <li>You will retain all benefits until <strong>{formattedDate}</strong>.</li>
            <li>No further automatic payments will be charged to your account.</li>
            <li>Your account will automatically revert to the Free tier limits.</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isCancelling}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Keep Subscription
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isCancelling}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCancelling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {isCancelling ? "Cancelling..." : "Yes, Cancel Subscription"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CancelSubscriptionModal;
