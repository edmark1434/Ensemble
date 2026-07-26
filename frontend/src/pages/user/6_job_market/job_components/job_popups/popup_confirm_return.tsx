import React from "react";
import { AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PopupConfirmReturnProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const PopupConfirmReturn: React.FC<PopupConfirmReturnProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onCancel}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f1a] p-5 shadow-2xl z-10"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Unsaved Changes</h3>
                  <p className="text-xs text-zinc-400">Are you sure you want to leave?</p>
                </div>
              </div>
              <button
                onClick={onCancel}
                className="rounded-lg p-1 text-zinc-500 hover:bg-white/10 hover:text-white transition shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body Description */}
            <p className="text-xs text-zinc-300 leading-relaxed bg-white/5 border border-white/5 p-3 rounded-xl mb-4">
              All unsaved inputs and draft details for this job post will be permanently lost if you return now.
            </p>

            {/* Actions */}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/10 transition"
              >
                Continue Editing
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 py-2 rounded-xl bg-red-500 text-xs font-bold text-white hover:bg-red-600 transition shadow-lg shadow-red-500/20"
              >
                Discard & Leave
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PopupConfirmReturn;