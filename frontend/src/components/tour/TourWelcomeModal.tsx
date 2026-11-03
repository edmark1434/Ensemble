import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Coins, UserCheck, Layers, Sparkles, X, ArrowRight } from 'lucide-react';
import { useTourStore, getActiveTourSteps, type UserPlatformRole } from '@/lib/tour_state';
import useGlobalState from '@/lib/global_state';

interface TourWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (role: UserPlatformRole) => void;
}

const WALKTHROUGH_VIDEOS = [
  '/gallery_images/new/vids/vid_asset.mp4',
  '/gallery_images/new/vids/vid_captioning.mp4',
  '/gallery_images/new/vids/vid_collab.mp4',
  '/gallery_images/new/vids/vid_deadair.mp4',
  '/gallery_images/new/vids/vid_track.mp4',
  '/gallery_images/new/vids/vid_videochat.mp4',
];

export const TourWelcomeModal: React.FC<TourWelcomeModalProps> = ({ isOpen, onClose, onStart }) => {
  const user = useGlobalState((state) => state.user);
  const userRole = useTourStore((state) => state.userRole);
  const setRole = useTourStore((state) => state.setRole);

  const [currentVideo, setCurrentVideo] = useState(() => {
    const idx = Math.floor(Math.random() * WALKTHROUGH_VIDEOS.length);
    return WALKTHROUGH_VIDEOS[idx];
  });

  const handleVideoEnded = () => {
    setCurrentVideo((prev) => {
      const candidates = WALKTHROUGH_VIDEOS.filter((v) => v !== prev);
      const nextIdx = Math.floor(Math.random() * candidates.length);
      return candidates[nextIdx] || WALKTHROUGH_VIDEOS[0];
    });
  };

  if (!isOpen) return null;

  const displayName = user?.display_name || user?.name || user?.username || 'Creator';

  // Normalize legacy 'explorer' to 'all'
  const activeRole: UserPlatformRole = userRole === 'explorer' ? 'all' : (userRole || 'all');

  const roleConfigs: Record<
    'all' | 'freelancer' | 'client' | 'creator',
    { label: string; icon: typeof Globe; desc: string; time: string }
  > = {
    all: {
      label: 'Explore All',
      icon: Globe,
      desc: 'Experience the complete ecosystem: cloud video editor, job market, gigs, and creator asset library.',
      time: '~3 mins',
    },
    freelancer: {
      label: 'Freelancer',
      icon: Coins,
      desc: 'Focus on finding editing jobs, submitting milestone proposals, and earning with platform escrow protection.',
      time: '~2 mins',
    },
    client: {
      label: 'Client',
      icon: UserCheck,
      desc: 'Focus on posting video editing jobs, ordering vetted gig packages, and managing project milestones.',
      time: '~2 mins',
    },
    creator: {
      label: 'Asset Creator',
      icon: Layers,
      desc: 'Upload video assets & templates to the marketplace, get moderator approval, and earn credits from downloads.',
      time: '~1 min',
    },
  };

  const currentConfig = roleConfigs[activeRole as keyof typeof roleConfigs] || roleConfigs.all;
  const currentStepCount = getActiveTourSteps(activeRole).length;
  const PERSPECTIVES: Array<'all' | 'freelancer' | 'client' | 'creator'> = ['all', 'freelancer', 'client', 'creator'];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4">
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
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#121214] text-gray-900 dark:text-zinc-100 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top highlight bar */}
          <div className="h-1.5 w-full bg-amber-500" />

          {/* Video Header Banner */}
          <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-black select-none">
            <video
              key={currentVideo}
              src={currentVideo}
              autoPlay
              muted
              playsInline
              onEnded={handleVideoEnded}
              onError={handleVideoEnded}
              poster="/gallery_images/new/gallery/collab.png"
              className="h-full w-full object-cover transition-opacity duration-700 opacity-90"
            />

            {/* Neutral Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-black/40 dark:from-[#121214] dark:via-[#121214]/70 dark:to-black/60" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent pointer-events-none" />

            {/* Top Bar inside Banner */}
            <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-amber-300 border border-amber-500/30 shadow-md">
                <Sparkles className="h-3 w-3 text-amber-400" /> Platform Walkthrough
              </span>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 backdrop-blur-md text-zinc-300 hover:bg-black/80 hover:text-white transition-colors border border-white/10"
                title="Skip for now"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Welcome Title & Intro at bottom of Banner */}
            <div className="absolute bottom-3 left-5 right-5 z-10">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white drop-shadow-sm">
                Welcome to Ensemble, {displayName}!
              </h2>
              <p className="text-xs text-gray-600 dark:text-zinc-300 mt-0.5 drop-shadow-sm">
                Interactive guide to your workspace, tools, and escrow features.
              </p>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 space-y-4">
            {/* Perspective Track Selector */}
            <div className="rounded-xl border border-gray-200 dark:border-zinc-800/80 bg-gray-50/70 dark:bg-zinc-900/60 p-3.5 sm:p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Your Platform Perspective
                </span>
                <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                  Switch anytime
                </span>
              </div>

              {/* 4 Cards: [Explore All], [Freelancer], [Client], [Asset Creator] */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PERSPECTIVES.map((r) => {
                  const cfg = roleConfigs[r];
                  const Icon = cfg.icon;
                  const isSelected = activeRole === r;
                  const count = getActiveTourSteps(r).length;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex flex-col items-center justify-center rounded-xl p-2.5 sm:p-3 text-center transition-all border ${
                        isSelected
                          ? 'border-amber-500/90 dark:border-amber-400/90 bg-amber-500/15 text-amber-950 dark:text-amber-200 shadow-sm font-semibold'
                          : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-gray-600 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-zinc-700 dark:hover:text-zinc-200'
                      }`}
                    >
                      <Icon className={`h-4 w-4 mb-1.5 ${isSelected ? 'text-amber-500 dark:text-amber-400' : 'text-gray-400 dark:text-zinc-500'}`} />
                      <span className="text-xs leading-tight font-semibold">{cfg.label}</span>
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">{count} steps</span>
                    </button>
                  );
                })}
              </div>

              {/* Perspective Description */}
              <p className="text-xs text-gray-600 dark:text-zinc-300 pt-0.5 leading-relaxed">
                {currentConfig.desc}
              </p>

              {/* Estimated Duration Badge */}
              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/80 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  {currentConfig.time} • {currentStepCount} key steps
                </span>
              </div>
            </div>

            {/* Quick Overview Highlights */}
            <div className="space-y-1.5 text-xs text-gray-500 dark:text-zinc-400">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                Walkthrough Highlights:
              </p>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" /> Profile & Verification
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" /> Job Market & Proposals
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" /> Gigs & Video Services
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" /> Projects & Cloud Editor
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" /> Deliveries & Escrow
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" /> Credits, Inbox & Ask AI
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
              >
                Skip (I know Ensemble)
              </button>

              <button
                type="button"
                onClick={() => onStart(activeRole)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-black dark:bg-zinc-100 dark:hover:bg-white dark:active:bg-zinc-200 px-5 py-2.5 text-xs font-bold text-white dark:text-zinc-900 transition-colors shadow-lg shadow-black/10"
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
