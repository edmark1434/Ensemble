import React from "react";
import { User, Users, ArrowRight, X, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface JobPostTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: "single" | "team") => void;
}

export const JobPostTypeModal: React.FC<JobPostTypeModalProps> = ({
  isOpen,
  onClose,
  onSelectType,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Animated Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Animated Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 26, stiffness: 360 }}
            className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-[#12141f] border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden p-6 sm:p-7 text-left z-10"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-all active:scale-90"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="mb-6 pr-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                How many freelancers are you hiring?
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Choose the structure that best fits your workflow and collaboration needs.
              </p>
            </div>

            {/* Choices Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Individual */}
              <div
                onClick={() => onSelectType("single")}
                className="group cursor-pointer rounded-2xl border border-gray-200 dark:border-white/10 p-5 bg-white dark:bg-white/[0.02] hover:bg-gray-50/80 dark:hover:bg-white/[0.05] hover:border-gray-400 dark:hover:border-white/20 transition-all duration-200 hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-zinc-200 flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      Individual Hire
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-zinc-300">
                      1 Position
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed mb-4">
                    Standard 4-step wizard for standalone projects, tasks, or hiring an individual specialist.
                  </p>
                  <div className="space-y-1.5 text-[11px] text-gray-600 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                      <span>Single contract lifecycle</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                      <span>Direct proposal bidding</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between pt-3 border-t border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-900 dark:text-white">
                  <span>Continue with 1 Hire</span>
                  <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform text-gray-400 dark:text-zinc-400" />
                </div>
              </div>

              {/* Option 2: Team / Multi-Role */}
              <div
                onClick={() => onSelectType("team")}
                className="group cursor-pointer rounded-2xl border border-gray-200 dark:border-white/10 p-5 bg-white dark:bg-white/[0.02] hover:bg-gray-50/80 dark:hover:bg-white/[0.05] hover:border-gray-400 dark:hover:border-white/20 transition-all duration-200 hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-zinc-200 flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      Team Project
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-zinc-300">
                      2+ Positions
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed mb-4">
                    5-step wizard with milestone allocation. Define milestones, task checklists, and review applicants.
                  </p>
                  <div className="space-y-1.5 text-[11px] text-gray-600 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                      <span>Client-defined milestones & tasks</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                      <span>Budget % per milestone & slot</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between pt-3 border-t border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-900 dark:text-white">
                  <span>Continue with Team</span>
                  <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform text-gray-400 dark:text-zinc-400" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default JobPostTypeModal;
