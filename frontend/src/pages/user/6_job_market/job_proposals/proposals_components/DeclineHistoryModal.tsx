import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, X, Clock, AlertCircle, FileText, ArrowRight } from "lucide-react";
import { CreditIcon } from "@/components/ui/credit-icon";

export interface DeclineHistoryItem {
  contract_id: string;
  rate_credits: number;
  created_at: string;
  starts_at?: string;
  rejected_at?: string;
  status: string;
  reject_reason?: string;
}

interface DeclineHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: DeclineHistoryItem[];
  candidateName?: string;
  originalBidAmount?: number;
}

export const DeclineHistoryModal: React.FC<DeclineHistoryModalProps> = ({
  isOpen,
  onClose,
  history = [],
  candidateName = "Candidate",
  originalBidAmount,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300000] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Window: max-h-[85vh] with flex flex-col to keep header & footer fixed and body scrollable */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="relative z-10 w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl text-left my-4 overflow-hidden"
        >
          {/* Header (Pinned) */}
          <div className="shrink-0 p-5 sm:p-6 pb-4 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-3 bg-zinc-50/60 dark:bg-zinc-900/60">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs">
                  <History className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
                  Contract Offer Decline History
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700">
                  {history.length} {history.length === 1 ? "Event" : "Events"}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 pl-10 leading-relaxed">
                Chronological record of formal contract counter-offers extended to{" "}
                <strong className="text-zinc-900 dark:text-white font-semibold">
                  {candidateName}
                </strong>{" "}
                that were declined.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body: Scrollable list of Decline Events */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3.5 pr-2 sm:pr-3.5">
            {history.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
                No contract offers have been declined for this proposal yet.
              </div>
            ) : (
              history.map((item, idx) => {
                const dateObj = new Date(item.rejected_at || item.created_at);
                const formattedDate = !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "Recently";

                const isCounter =
                  originalBidAmount &&
                  Number(originalBidAmount) !== Number(item.rate_credits);

                return (
                  <div
                    key={item.contract_id || idx}
                    className="p-4 sm:p-4.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-2xs space-y-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition"
                  >
                    {/* Top Row: Rate & Decline Badge */}
                    <div className="flex items-center justify-between gap-2.5 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Offered Rate:
                        </span>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                          <CreditIcon className="h-4 w-4 text-amber-500" />
                          <span className="text-sm sm:text-base font-black text-zinc-900 dark:text-white">
                            {Number(item.rate_credits || 0).toLocaleString()}
                          </span>
                          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            Credits
                          </span>
                        </div>

                        {isCounter && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                            <span>vs</span>
                            <strong className="text-zinc-900 dark:text-white font-bold">
                              {Number(originalBidAmount).toLocaleString()} Cr
                            </strong>
                            <span>proposed</span>
                          </span>
                        )}
                      </div>

                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30">
                        Offer Declined
                      </span>
                    </div>

                    {/* Decline Reason / Rationale Box */}
                    <div className="p-3.5 rounded-xl border-l-4 border-l-rose-500 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                        Decline Rationale
                      </span>
                      <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed pl-5">
                        "{item.reject_reason || "Applicant declined the contract offer."}"
                      </p>
                    </div>

                    {/* Footer Info: Date & Ref */}
                    <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-zinc-400" />
                        <span>Declined on {formattedDate}</span>
                      </div>
                      <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                        Ref: #{item.contract_id.slice(0, 8)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}

            {/* Informational Guidance Banner */}
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 text-xs text-zinc-600 dark:text-zinc-300 flex items-start gap-2.5">
              <FileText className="h-4 w-4 shrink-0 text-zinc-500 mt-0.5" />
              <span className="leading-relaxed">
                Declining an offer returned <strong>100% of upfront escrow credits</strong> to the client's wallet. The proposal remains active in <strong>Shortlisted</strong> status so terms can be renegotiated and new offers extended.
              </span>
            </div>
          </div>

          {/* Action Footer (Pinned) */}
          <div className="shrink-0 p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 flex justify-end bg-zinc-50/60 dark:bg-zinc-900/60">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer shadow-sm"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DeclineHistoryModal;
