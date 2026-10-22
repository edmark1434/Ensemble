import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Sparkles, X, ArrowRight, UserCheck, Coins } from 'lucide-react';
import { useTourStore, type UserPlatformRole } from '@/lib/tour_state';
import useGlobalState from '@/lib/global_state';

interface TourWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (role: UserPlatformRole) => void;
}

export const TourWelcomeModal: React.FC<TourWelcomeModalProps> = ({ isOpen, onClose, onStart }) => {
  const user = useGlobalState((state) => state.user);
  const userRole = useTourStore((state) => state.userRole);
  const setRole = useTourStore((state) => state.setRole);

  if (!isOpen) return null;

  const displayName = user?.display_name || user?.name || user?.username || 'Creator';
  const firstName = displayName.split(' ')[0];

  const roleConfigs: Record<UserPlatformRole, { label: string; icon: typeof Coins; desc: string; badge: string }> = {
    freelancer: {
      label: 'Freelancer',
      icon: Coins,
      desc: 'Focus on finding editing jobs, submitting milestone proposals, and earning with escrow protection.',
      badge: '~2 mins • 24 key steps',
    },
    client: {
      label: 'Client',
      icon: UserCheck,
      desc: 'Focus on posting video editing jobs, hiring talent via gigs, and managing project milestones.',
      badge: '~2 mins • 19 key steps',
    },
    explorer: {
      label: 'Explorer',
      icon: Compass,
      desc: 'Explore the full creative suite: cloud video editor, community forums, and asset marketplace.',
      badge: '~1.5 mins • 17 key steps',
    },
  };

  const currentConfig = roleConfigs[userRole];

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
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0c0e17] text-gray-900 dark:text-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top highlight bar */}
          <div className="h-1.5 w-full bg-zinc-900 dark:bg-zinc-100" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
            title="Skip for now"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-6 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white ring-1 ring-zinc-200 dark:ring-white/10">
                <Compass className="h-6 w-6" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                  <Sparkles className="h-3 w-3" /> Platform Walkthrough
                </span>
                <h2 className="mt-2 text-xl font-bold tracking-tight">
                  Welcome to Ensemble, {displayName}!
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                  Take a quick walkthrough to discover your creative workspace, tools, and escrow features. If you are already familiar with Ensemble, feel free to skip!
                </p>
              </div>
            </div>

            {/* Role Track Selector */}
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-zinc-900/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                  Your Platform Perspective
                </span>
                <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                  Switch anytime
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['freelancer', 'client', 'explorer'] as UserPlatformRole[]).map((r) => {
                  const cfg = roleConfigs[r];
                  const Icon = cfg.icon;
                  const isSelected = userRole === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex flex-col items-center justify-center rounded-lg p-2.5 text-center transition-all border ${
                        isSelected
                          ? 'border-zinc-900 dark:border-white bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white shadow-xs font-semibold'
                          : 'border-gray-200 dark:border-white/5 bg-white dark:bg-white/[0.02] text-gray-600 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-white/10'
                      }`}
                    >
                      <Icon className={`h-4 w-4 mb-1 ${isSelected ? 'text-zinc-900 dark:text-white' : 'text-gray-400 dark:text-zinc-500'}`} />
                      <span className="text-[11px] leading-tight capitalize">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-gray-600 dark:text-zinc-400 pt-1 leading-relaxed">
                {currentConfig.desc}
              </p>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  <Sparkles className="h-3 w-3" />
                  {currentConfig.badge}
                </span>
              </div>
            </div>

            {/* Quick Overview */}
            <div className="space-y-2 text-xs text-gray-500 dark:text-zinc-400">
              <p className="font-semibold text-gray-700 dark:text-zinc-300">
                What this quick walkthrough covers:
              </p>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-700 dark:bg-zinc-300" /> Profile & Verification
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-700 dark:bg-zinc-300" /> Job Market & Proposals
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-700 dark:bg-zinc-300" /> Gigs & Video Services
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-700 dark:bg-zinc-300" /> Projects & Cloud Editor
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-700 dark:bg-zinc-300" /> Deliveries & Milestones
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-700 dark:bg-zinc-300" /> Credits, Inbox & Ask AI
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-white transition-colors"
              >
                Skip (I know Ensemble)
              </button>

              <button
                type="button"
                onClick={() => onStart(userRole)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-black dark:bg-white dark:hover:bg-zinc-100 dark:active:bg-zinc-200 px-5 py-2.5 text-xs font-bold text-white dark:text-zinc-900 transition-colors shadow-lg shadow-black/10"
              >
                Start Walkthrough
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
