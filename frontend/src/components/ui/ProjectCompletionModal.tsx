import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Award, CheckCircle2, ShieldCheck, Star, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ProjectCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRateNow: () => void;
  projectTitle: string;
  totalMilestones?: number;
  counterpartyName: string;
  isClient: boolean;
}

export const ProjectCompletionModal: React.FC<ProjectCompletionModalProps> = ({
  isOpen,
  onClose,
  onRateNow,
  projectTitle,
  totalMilestones = 0,
  counterpartyName,
}) => {
  useEffect(() => {
    if (!isOpen) {
      confetti.reset();
      return;
    }

    // Confetti cannon blast
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    };

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });

    return () => {
      confetti.reset();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl text-center select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          title="Later"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Celebration Trophy Icon */}
        <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-xs">
          <Award className="w-7 h-7" />
        </div>

        {/* Title & Subtitle */}
        <h3 className="text-lg font-bold text-zinc-950 dark:text-white tracking-tight mb-1">
          Congratulations!
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
          All project milestones have been successfully completed and approved.
        </p>

        {/* Project Summary Card (Crisp & Monochromatic) */}
        <div className="p-3.5 mb-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-left space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Project
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-200/60 dark:bg-zinc-700/60 px-2 py-0.5 rounded-md">
              <CheckCircle2 className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
              Complete
            </span>
          </div>
          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {projectTitle || 'Contract Workspace'}
          </div>
          {totalMilestones > 0 && (
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Total {totalMilestones} {totalMilestones === 1 ? 'Milestone' : 'Milestones'} Delivered
            </div>
          )}
        </div>

        {/* Double-Blind Callout (Crisp & Neutral) */}
        <div className="p-3.5 mb-5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-left flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed">
            <span className="font-semibold text-zinc-900 dark:text-white block mb-0.5">
              Double-Blind Review
            </span>
            Please rate <span className="font-semibold text-zinc-900 dark:text-white">@{counterpartyName}</span> to finalize project closeout. Neither party will see the other&apos;s review until both have submitted.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={onRateNow}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>Rate and Review Now</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-1.5 px-4 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-medium transition cursor-pointer"
          >
            I&apos;ll do this later
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProjectCompletionModal;
