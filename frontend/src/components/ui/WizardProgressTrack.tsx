import React from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

export interface WizardStep {
  id: number;
  label: string;
}

export interface WizardProgressTrackProps {
  steps: WizardStep[];
  currentStep: number;
  className?: string;
  hasReachedReview?: boolean;
  onJumpToReview?: () => void;
  maxReachedStep?: number;
  onStepClick?: (stepId: number) => void;
}

export const WizardProgressTrack: React.FC<WizardProgressTrackProps> = ({
  steps,
  currentStep,
  className = "",
  hasReachedReview,
  onJumpToReview,
  maxReachedStep,
  onStepClick,
}) => {
  const effectiveMaxStep = Math.max(
    currentStep,
    maxReachedStep ?? currentStep,
    hasReachedReview ? steps.length : 1
  );

  return (
    <div className={`flex items-start w-full relative z-0 select-none ${className}`}>
      {steps.map((step, idx) => {
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;
        const isReachable = Boolean(onStepClick && step.id <= effectiveMaxStep);
        const canClick = isReachable && !isActive;

        const showJumpButton = step.id === steps.length && Boolean(hasReachedReview && currentStep < steps.length);

        const handleNodeClick = () => {
          if (showJumpButton && onJumpToReview) {
            onJumpToReview();
          } else if (canClick && onStepClick) {
            onStepClick(step.id);
          }
        };

        return (
          <React.Fragment key={step.id}>
            {/* Step Node */}
            <div className="flex flex-col items-center relative z-10 shrink-0">
              {/* Reusable Gray Floating Jump to Review Pill */}
              {showJumpButton && onJumpToReview && (
                <button
                  type="button"
                  onClick={onJumpToReview}
                  className="absolute -top-10 group bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-200 dark:hover:bg-white text-white dark:text-zinc-900 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-1 whitespace-nowrap z-50 animate-bounce cursor-pointer border border-zinc-700/80 dark:border-zinc-300/80"
                  title="Jump directly to Review step"
                >
                  <span>Jump Here</span>
                  <span>🚀</span>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-zinc-800 group-hover:border-t-zinc-900 dark:border-t-zinc-200 dark:group-hover:border-t-white transition-colors" />
                </button>
              )}

              {/* Step Circle Button */}
              <button
                type="button"
                onClick={handleNodeClick}
                disabled={!canClick && !showJumpButton}
                title={
                  canClick
                    ? `Go to Step ${step.id}: ${step.label}`
                    : isActive
                    ? `Current Step: ${step.label}`
                    : `Step ${step.id} locked (complete previous steps first)`
                }
                className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 outline-none ${
                  canClick || showJumpButton
                    ? "cursor-pointer hover:scale-110 active:scale-95"
                    : "cursor-default"
                } ${
                  isCompleted
                    ? "bg-emerald-500 text-white border-2 border-emerald-500 shadow-sm shadow-emerald-500/25 hover:bg-emerald-600 hover:border-emerald-600"
                    : isActive
                    ? "bg-blue-600 text-white dark:bg-blue-500 border-2 border-blue-600 dark:border-blue-500 shadow-md shadow-blue-500/25 ring-4 ring-blue-500/15"
                    : isReachable
                    ? "bg-white dark:bg-zinc-900 border-2 border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 shadow-2xs hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    : "bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 shadow-2xs opacity-60 cursor-not-allowed"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4 stroke-[2.5] text-white" />
                ) : (
                  <span>{step.id}</span>
                )}
              </button>

              {/* Step Label Button/Text */}
              <button
                type="button"
                onClick={handleNodeClick}
                disabled={!canClick && !showJumpButton}
                className={`text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider mt-2 transition-colors whitespace-nowrap outline-none ${
                  canClick
                    ? "cursor-pointer hover:underline"
                    : "cursor-default"
                } ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400 font-extrabold"
                    : isCompleted
                    ? "text-zinc-700 dark:text-zinc-300 font-semibold hover:text-zinc-950 dark:hover:text-white"
                    : isReachable
                    ? "text-blue-600 dark:text-blue-400 font-medium"
                    : "text-zinc-400 dark:text-zinc-500 opacity-60 cursor-not-allowed"
                }`}
              >
                {step.label}
              </button>
            </div>

            {/* Connecting Track Line between Nodes */}
            {idx < steps.length - 1 && (
              <div className="flex-1 flex items-center px-1.5 sm:px-2 pt-4 sm:pt-4.5">
                <div className="w-full h-[2px] bg-zinc-200 dark:bg-zinc-800 rounded-full relative overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
                    initial={false}
                    animate={{ width: isCompleted ? "100%" : "0%" }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default WizardProgressTrack;
