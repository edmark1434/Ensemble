import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, CheckCircle2, ArrowRight, HelpCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TourGraduationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TourGraduationModal: React.FC<TourGraduationModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0c0e17] text-gray-900 dark:text-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-1.5 w-full bg-emerald-500" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-6 md:p-8 text-center space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20">
              <Award className="h-8 w-8" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" /> Walkthrough Completed
              </span>
              <h2 className="mt-2 text-xl font-bold tracking-tight">
                You're Ready to Create on Ensemble!
              </h2>
              <p className="mt-2 text-xs text-gray-500 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
                You're now familiar with all the essential tabs, buttons, and workflows on the platform.
              </p>
            </div>

            {/* Re-entry Hint Box */}
            <div className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-zinc-900/50 p-3.5 text-left">
              <HelpCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
              <div className="text-[11px] text-gray-600 dark:text-zinc-300 leading-relaxed">
                <strong className="block text-gray-900 dark:text-white mb-0.5">Need a refresher later?</strong>
                You can reopen this walkthrough anytime from <span className="font-semibold text-amber-600 dark:text-amber-400">Settings &rarr; Help & Support</span> or your <span className="font-semibold text-amber-600 dark:text-amber-400">User Profile Menu</span> in the top header.
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/profile');
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                View My Profile
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/home');
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 px-5 py-2.5 text-xs font-bold text-zinc-950 transition-colors shadow-lg shadow-amber-500/10"
              >
                Go to Home
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
