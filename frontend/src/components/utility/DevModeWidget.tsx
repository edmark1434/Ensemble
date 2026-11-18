import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Code, Coins, Loader2 } from "lucide-react";
import api from "@/lib/axios";
import { showSuccessToast, showErrorToast } from "./toast";
import useGlobalState from "@/lib/global_state";

export const DevModeWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState<number>(100);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleAddCredits = async () => {
    if (amount <= 0) {
      showErrorToast("Amount must be greater than 0");
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post("/api/accounts/dev/add-credits", { amount });
      showSuccessToast(res.data.message || `Added ${amount} credits!`);
      
      // 1. Store in sessionStorage so animation persists even if the user or browser reloads
      try {
        sessionStorage.setItem(
          "ensemble:pending_credits_delta",
          JSON.stringify({ diff: amount, time: Date.now() })
        );
      } catch (_) {}

      // 2. Update global user state immediately for instant live header animation without needing reload
      const curUser = useGlobalState.getState().user;
      if (curUser) {
        const curBal = Number(curUser.wallet?.balance_credits || 0);
        const nextBal = curBal + amount;
        useGlobalState.getState().setUser({
          ...curUser,
          wallet: {
            ...(curUser.wallet || {}),
            balance_credits: nextBal,
          },
        });
      }

      // Close the widget gracefully
      setTimeout(() => {
        setIsOpen(false);
      }, 350);
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || "Failed to add credits");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed top-24 right-6 z-[99999] flex items-start justify-end p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="w-full max-w-sm bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <Code className="w-5 h-5" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Developer Mode</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 p-3 rounded-xl">
                <p className="text-xs text-purple-800 dark:text-purple-200 leading-relaxed">
                  <strong>Notice:</strong> Adding credits updates your balance globally in real time with live header animation, and persists even across page reloads.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Credit Amount to Add
                </label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-500" />
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition"
                    placeholder="e.g. 100"
                  />
                </div>
              </div>

              <button
                onClick={handleAddCredits}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-xl text-sm font-semibold transition"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                Inject Credits
              </button>
            </div>
            
            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-white/5 border-t border-gray-200 dark:border-white/10 text-center">
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                Press <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300">Alt</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300">I</kbd> to toggle this widget
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
