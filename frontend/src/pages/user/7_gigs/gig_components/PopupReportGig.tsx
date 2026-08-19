import React, { useState } from "react";
import { Flag, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PopupReportGigProps {
  isOpen: boolean;
  gigTitle?: string;
  onClose: () => void;
  onSubmitReport: (reason: string, details: string) => void;
}

const REPORT_REASONS = [
  "Inappropriate content",
  "Misleading or scam offer",
  "Duplicate or spam post",
  "Incorrect price / details",
  "Other reason",
];

const AUTO_CLOSE_MS = 2200;

const PopupReportGig: React.FC<PopupReportGigProps> = ({
  isOpen,
  gigTitle,
  onClose,
  onSubmitReport,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) return;

    onSubmitReport(selectedReason, details);
    setIsSubmitted(true);

    setTimeout(() => {
      handleResetAndClose();
    }, AUTO_CLOSE_MS);
  };

  const handleResetAndClose = () => {
    setIsSubmitted(false);
    setSelectedReason("");
    setDetails("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            onClick={handleResetAndClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-dark-surface p-5 shadow-2xl z-10"
          >
            <AnimatePresence mode="wait">
              {!isSubmitted ? (
                /* --- FORM VIEW --- */
                <motion.div
                  key="report-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
                        <Flag className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white leading-tight">
                          Report Service
                        </h3>
                        {gigTitle && (
                          <p className="text-[11px] text-zinc-400 truncate max-w-[210px]">
                            {gigTitle}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleResetAndClose}
                      className="rounded-lg p-1 text-zinc-500 hover:bg-white/10 hover:text-white transition shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Reason Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block">
                        Select Reason
                      </label>
                      <div className="grid grid-cols-1 gap-1">
                        {REPORT_REASONS.map((reason) => {
                          const isSelected = selectedReason === reason;
                          return (
                            <button
                              key={reason}
                              type="button"
                              onClick={() => setSelectedReason(reason)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-between border ${
                                isSelected
                                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                                  : "bg-white/5 border-white/5 text-zinc-300 hover:bg-white/10"
                              }`}
                            >
                              <span>{reason}</span>
                              {isSelected && (
                                <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Additional Information */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block">
                        Details (Optional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Briefly describe the issue..."
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-500/50 placeholder:text-zinc-600 resize-none"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleResetAndClose}
                        className="flex-1 py-2 rounded-lg border border-white/10 text-xs font-bold text-zinc-400 hover:text-white transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!selectedReason}
                        className="flex-1 py-2 rounded-lg bg-red-500 text-xs font-bold text-white hover:bg-red-600 transition disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-red-500/20"
                      >
                        Submit Report
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                /* --- SUCCESS ANIMATED STATE WITH TIMER BAR --- */
                <motion.div
                  key="report-success"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="py-5 flex flex-col items-center justify-center text-center space-y-3 relative"
                >
                  <div className="relative flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0.8 }}
                      animate={{ scale: 1.4, opacity: 0 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="absolute h-12 w-12 rounded-full bg-emerald-500/30"
                    />

                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 18,
                      }}
                      className="h-11 w-11 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10 z-10"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </motion.div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">Report Submitted</h4>
                    <p className="text-xs text-zinc-400 mt-0.5 max-w-[240px]">
                      Thank you. Our moderation team will review this service shortly.
                    </p>
                  </div>

                  <button
                    onClick={handleResetAndClose}
                    className="px-4 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-semibold text-zinc-400 hover:text-white hover:bg-white/10 transition"
                  >
                    Dismiss Now
                  </button>

                  <div className="absolute -bottom-5 left-0 right-0 h-0.5 bg-white/5 overflow-hidden rounded-b-2xl">
                    <motion.div
                      initial={{ width: "100%" }}
                      animate={{ width: "0%" }}
                      transition={{ duration: AUTO_CLOSE_MS / 1000, ease: "linear" }}
                      className="h-full bg-emerald-500"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PopupReportGig;