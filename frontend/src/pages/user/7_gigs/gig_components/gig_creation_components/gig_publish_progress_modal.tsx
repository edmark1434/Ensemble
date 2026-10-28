import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  CheckCircle2,
  Film,
  FileCheck,
  Coins,
  Loader2,
  Sparkles,
} from "lucide-react";

export interface GigPublishProgress {
  stage: "preparing" | "uploading_media" | "saving_service" | "completed";
  percentage: number;
  currentFileName?: string;
  currentFileIndex?: number;
  totalFiles?: number;
  uploadedBytes: number;
  totalBytes: number;
  statusText: string;
}

interface GigPublishProgressModalProps {
  isOpen: boolean;
  progress: GigPublishProgress | null;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const GigPublishProgressModal: React.FC<GigPublishProgressModalProps> = ({
  isOpen,
  progress,
}) => {
  if (!isOpen || !progress) return null;

  const isComplete = progress.stage === "completed" || progress.percentage >= 100;
  const isSavingListing = progress.stage === "saving_service" || progress.percentage >= 88;
  const isMediaDone = isSavingListing || isComplete;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10006] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-6 sm:p-8 shadow-2xl overflow-hidden"
        >
          {/* Top Decorative Gradient Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500" />

          {/* Central Animated Status Icon */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-3">
              {isComplete ? (
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 animate-bounce" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/10 relative">
                  <UploadCloud className="h-8 w-8 animate-pulse text-blue-600 dark:text-blue-400" />
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500" />
                  </span>
                </div>
              )}
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-zinc-950 dark:text-white">
              {isComplete
                ? "Service Published Successfully!"
                : "Publishing Your Service Offering"}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
              {isComplete
                ? "Your gig is now broadcasted and indexed on the live marketplace."
                : "Uploading your portfolio video samples and configuring live market indexing."}
            </p>
          </div>

          {/* Real-time Progress Bar Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 mb-5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate pr-2">
                {progress.statusText}
              </span>
              <span className="font-extrabold text-blue-600 dark:text-blue-400 shrink-0 text-sm">
                {progress.percentage}%
              </span>
            </div>

            {/* Progress Track */}
            <div className="h-3 w-full bg-zinc-200/70 dark:bg-zinc-700/60 rounded-full overflow-hidden p-0.5 border border-zinc-200 dark:border-zinc-700">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 shadow-sm relative overflow-hidden"
                initial={{ width: "5%" }}
                animate={{ width: `${Math.max(5, Math.min(100, progress.percentage))}%` }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </motion.div>
            </div>

            {/* Byte transfer details */}
            <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-0.5 font-medium">
              <span>
                {progress.totalBytes > 0
                  ? `${formatBytes(progress.uploadedBytes)} of ${formatBytes(progress.totalBytes)} uploaded`
                  : progress.stage === "uploading_media"
                  ? "Processing files..."
                  : "Syncing data..."}
              </span>
              {progress.totalFiles && progress.totalFiles > 0 ? (
                <span>
                  Asset {progress.currentFileIndex || 1} of {progress.totalFiles}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  Live Broadcast
                </span>
              )}
            </div>
          </div>

          {/* Sequential Step Checklist */}
          <div className="space-y-2.5 mb-5">
            {/* Step 1: Media & Sample Uploads */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-800/20 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    isMediaDone
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {isMediaDone ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Film className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 block truncate">
                    Portfolio Media & Samples Upload
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">
                    {progress.currentFileName
                      ? `Uploading ${progress.currentFileName}`
                      : isMediaDone
                      ? "All sample files securely staged"
                      : "Preparing media uploads..."}
                  </span>
                </div>
              </div>
              <div className="shrink-0">
                {isMediaDone ? (
                  <span className="text-[10px] font-bold text-emerald-500">Done</span>
                ) : (
                  <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
                )}
              </div>
            </div>

            {/* Step 2: Service Configuration & Milestones */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-800/20 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    isSavingListing || isComplete
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {isSavingListing || isComplete ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <FileCheck className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 block truncate">
                    Pricing Tiers & Milestones Setup
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">
                    Roadmap phases & deliverable agreements
                  </span>
                </div>
              </div>
              <div className="shrink-0">
                {isSavingListing || isComplete ? (
                  <span className="text-[10px] font-bold text-emerald-500">Done</span>
                ) : (
                  <span className="text-[10px] text-zinc-400 font-medium">Pending</span>
                )}
              </div>
            </div>

            {/* Step 3: 50 Credits & Marketplace Broadcast */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-800/20 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    isComplete
                      ? "bg-emerald-500/10 text-emerald-500"
                      : isSavingListing
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : isSavingListing ? (
                    <Coins className="h-3.5 w-3.5" />
                  ) : (
                    <Coins className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 block truncate">
                    50 Credits Deduction & Market Broadcast
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">
                    Bayesian discovery indexing enabled
                  </span>
                </div>
              </div>
              <div className="shrink-0">
                {isComplete ? (
                  <span className="text-[10px] font-bold text-emerald-500">Done</span>
                ) : isSavingListing ? (
                  <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
                ) : (
                  <span className="text-[10px] text-zinc-400 font-medium">Pending</span>
                )}
              </div>
            </div>
          </div>

          {/* Informative connection banner */}
          <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-300 leading-relaxed flex items-start gap-2">
            <span className="text-blue-500 font-bold shrink-0">💡</span>
            <span>
              Uploading high-resolution video samples and master deliverables may take
              several moments depending on file size and connection speed. Please keep this tab
              open while processing.
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
