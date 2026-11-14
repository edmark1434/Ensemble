import React from "react";
import { useNavigate } from "react-router-dom";
import { Zap, X, ArrowUpRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

export interface AssetLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  limit?: number | null;
  used?: number;
  planName?: string;
  message?: string;
}

export const AssetLimitModal: React.FC<AssetLimitModalProps> = ({
  isOpen,
  onClose,
  limit = 1,
  used = 1,
  planName = "Free",
  message,
}) => {
  const navigate = useNavigate();

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        >
          {/* Backdrop click handler */}
          <div className="absolute inset-0" onClick={onClose} />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-6 sm:p-7 shadow-2xl dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 dark:shadow-black/50 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient amber glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center text-center">
              {/* Amber icon badge */}
              <div className="mb-4 relative flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 shadow-[0_0_20px_rgba(251,191,36,0.15)]">
                <Zap className="h-7 w-7 fill-amber-500/70" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black">
                  !
                </span>
              </div>

              {/* Title */}
              <h3
                className="text-lg font-bold text-gray-900 dark:text-white mb-1.5 tracking-tight"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Upload Limit Reached
              </h3>

              {/* Pill badge */}
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Sparkles className="h-3 w-3" />
                <span>{planName} Plan • {used} of {limit ?? 1} used</span>
              </div>

              {/* Message */}
              <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed mb-6 px-1">
                {message || (
                  <>
                    You have reached your limit of {limit ?? 1} asset {limit === 1 ? "post" : "posts"} on the {planName} plan. Upgrade to <strong className="text-gray-900 dark:text-zinc-200">Premium</strong> for 20 posts or <strong className="text-gray-900 dark:text-zinc-200">Business</strong> for unlimited posts.
                  </>
                )}
              </p>

              {/* Actions */}
              <div className="flex flex-col gap-2 w-full">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate("/credits-subscriptions");
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 py-3 text-xs font-bold uppercase tracking-wider text-black transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-amber-500/20"
                >
                  <Zap className="h-4 w-4 fill-black text-black" />
                  <span>Upgrade Plan</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 border border-transparent dark:border-white/10 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 transition-all hover:text-gray-900 dark:hover:text-white"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default AssetLimitModal;
