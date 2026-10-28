import React from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import WizardProgressTrack, { type WizardStep } from "@/components/ui/WizardProgressTrack";

export const GIG_WIZARD_STEPS: WizardStep[] = [
  { id: 1, label: "Identity" },
  { id: 2, label: "Core Specs" },
  { id: 3, label: "Deliverables" },
  { id: 4, label: "Milestones" },
  { id: 5, label: "Tiers" },
  { id: 6, label: "Review" },
];

interface GigCreateHeaderProps {
  currentSlide: number;
  onReturn: () => void;
  isDraftRestored?: boolean;
  onClearDraft?: () => void;
  hasReachedReview?: boolean;
  onJumpToReview?: () => void;
  maxReachedStep?: number;
  onStepClick?: (stepId: number) => void;
}

export const GigCreateHeader: React.FC<GigCreateHeaderProps> = ({
  currentSlide,
  onReturn,
  isDraftRestored,
  onClearDraft,
  hasReachedReview,
  onJumpToReview,
  maxReachedStep,
  onStepClick,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
      {/* Return button and Draft status pill */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <button
          type="button"
          onClick={onReturn}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gray-100 dark:bg-zinc-800/80 hover:bg-gray-200 dark:hover:bg-zinc-700/80 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition shrink-0 focus:outline-none cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return</span>
        </button>

        {isDraftRestored && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-xs text-zinc-600 dark:text-zinc-300 shadow-2xs">
            <span className="flex items-center gap-1.5 font-medium">
              <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
              <span>Draft restored</span>
            </span>
            {onClearDraft && (
              <>
                <span className="h-3 w-[1px] bg-zinc-300 dark:bg-zinc-700" />
                <button
                  type="button"
                  onClick={onClearDraft}
                  className="text-[11px] font-bold text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition cursor-pointer"
                  title="Clear draft and reset fields"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Stepper Assembly */}
      <div className="w-full max-w-xl md:max-w-2xl mx-auto md:mx-0">
        <WizardProgressTrack
          steps={GIG_WIZARD_STEPS}
          currentStep={currentSlide}
          hasReachedReview={hasReachedReview}
          onJumpToReview={onJumpToReview}
          maxReachedStep={maxReachedStep}
          onStepClick={onStepClick}
        />
      </div>
    </div>
  );
};

export default GigCreateHeader;
