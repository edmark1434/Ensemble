import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ShieldCheck, X } from 'lucide-react';

interface ReviewThankYouModalProps {
  isOpen: boolean;
  onClose: () => void;
  counterpartyName: string;
  isMutualComplete?: boolean;
}

export const ReviewThankYouModal: React.FC<ReviewThankYouModalProps> = ({
  isOpen,
  onClose,
  counterpartyName,
  isMutualComplete = false,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl text-center select-none animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Success Check Icon */}
        <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
          <CheckCircle2 className="w-7 h-7" />
        </div>

        {/* Title & Subtitle */}
        <h3 className="text-lg font-bold text-zinc-950 dark:text-white tracking-tight mb-1">
          Thank You for Your Review!
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
          Your rating and feedback have been submitted successfully.
        </p>

        {/* Double-Blind Reassurance Card */}
        <div className="p-3.5 mb-5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-left flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed">
            {isMutualComplete ? (
              <>
                <span className="font-semibold text-zinc-900 dark:text-white block mb-0.5">
                  Mutual Reviews Complete
                </span>
                Both parties have submitted feedback! Reviews and star ratings are now published to your profiles, and this workspace is archived.
              </>
            ) : (
              <>
                <span className="font-semibold text-zinc-900 dark:text-white block mb-0.5">
                  Double-Blind Protection Active
                </span>
                Your review remains private and hidden until{' '}
                <span className="font-semibold text-zinc-900 dark:text-white">
                  @{counterpartyName}
                </span>{' '}
                also submits their feedback. Once both reviews are in, ratings will unlock on your profiles.
              </>
            )}
          </div>
        </div>

        {/* Done / Back to Workspace Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 font-bold text-xs shadow-xs transition cursor-pointer"
        >
          Back to Workspace
        </button>
      </div>
    </div>,
    document.body
  );
};

export default ReviewThankYouModal;
