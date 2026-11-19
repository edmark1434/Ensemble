import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, CheckCircle2, ArrowRight, Compass, ShieldCheck, X } from 'lucide-react';
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
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 12 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-6 md:p-8 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
              <Award className="h-6 w-6" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                <CheckCircle2 className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                <span>Walkthrough Completed</span>
              </span>
              <h2 className="mt-2.5 text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                You're Ready to Create on Ensemble!
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
                You're now familiar with all the essential tabs, features, and workflows on the platform.
              </p>
            </div>

            {/* Account Verification Requirement & Note */}
            <div className="flex items-start gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 p-3.5 text-left">
              <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5 text-zinc-600 dark:text-zinc-400" />
              <div className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                <strong className="block text-zinc-900 dark:text-zinc-100 font-semibold mb-0.5">
                  Account Verification Reminder
                </strong>
                To participate in transactions (funding escrow, releasing milestone payouts, cashing out, or selling assets), make sure to verify your account if you haven't yet. (If you're already verified, you're all set to transact!)
              </div>
            </div>

            {/* Other Walkthroughs Hint Box */}
            <div className="flex items-start gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 p-3.5 text-left">
              <Compass className="h-5 w-5 shrink-0 mt-0.5 text-zinc-600 dark:text-zinc-400" />
              <div className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                <strong className="block text-zinc-900 dark:text-zinc-100 font-semibold mb-0.5">
                  Explore other platform perspectives?
                </strong>
                You can revisit this guide anytime from your top-right <span className="font-semibold text-zinc-900 dark:text-zinc-200">Profile Menu</span> or <span className="font-semibold text-zinc-900 dark:text-zinc-200">Settings &rarr; Help & Support</span> to view the Freelancer, Client, Asset Creator, or Explore All walkthroughs.
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/settings', { state: { activeTab: 'verification' } });
                }}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap"
              >
                Verification Status
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/profile');
                }}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap"
              >
                Setup Profile
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/home');
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Return to Home</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
