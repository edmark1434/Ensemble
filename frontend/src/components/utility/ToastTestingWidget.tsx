import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, XCircle, Loader2, Info } from "lucide-react";
import { showSuccessToast, showErrorToast, showLoadingToast, dismissToast, toastConfig } from "./toast";
import toast from "react-hot-toast";

export const ToastTestingWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [toastText, setToastText] = useState("This is a test notification!");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[99999] flex items-end justify-end p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-full max-w-sm bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Info className="w-5 h-5" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Toast Testing Mode</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Custom Text
                </label>
                <input
                  type="text"
                  value={toastText}
                  onChange={(e) => setToastText(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition"
                  placeholder="Enter test message..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => showSuccessToast(toastText)}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-lg text-xs font-semibold transition"
                >
                  <CheckCircle className="w-4 h-4" /> Success
                </button>
                <button
                  onClick={() => showErrorToast(toastText)}
                  className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg text-xs font-semibold transition"
                >
                  <XCircle className="w-4 h-4" /> Error
                </button>
                <button
                  onClick={() => {
                    const id = showLoadingToast(toastText);
                    setTimeout(() => dismissToast(id), 3000); // Auto dismiss after 3s for testing
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg text-xs font-semibold transition"
                  title="Auto dismisses after 3 seconds"
                >
                  <Loader2 className="w-4 h-4" /> Loading (3s)
                </button>
                <button
                  onClick={() => toast(toastText, toastConfig.custom)}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg text-xs font-semibold transition"
                >
                  <Info className="w-4 h-4" /> Custom
                </button>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-white/5 border-t border-gray-200 dark:border-white/10 text-center">
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                Press <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300">Alt</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300">O</kbd> to toggle this widget
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
