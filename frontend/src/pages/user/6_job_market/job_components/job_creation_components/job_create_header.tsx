import React from "react";
import { ArrowLeft } from "lucide-react";
import WizardProgressTrack, { type WizardStep } from "@/components/ui/WizardProgressTrack";

export interface StepConfig {
  id: number;
  label: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 1, label: "Core Info" },
  { id: 2, label: "Budget & Skills" },
  { id: 3, label: "Terms & Workflow" },
  { id: 4, label: "Review & Post" },
];

interface JobCreateHeaderProps {
  currentSlide: number;
  onReturn: () => void;
  hasReachedReview?: boolean;
  onJumpToReview?: () => void;
  maxReachedStep?: number;
  onStepClick?: (stepId: number) => void;
}

export const JobCreateHeader: React.FC<JobCreateHeaderProps> = ({
  currentSlide,
  onReturn,
  hasReachedReview,
  onJumpToReview,
  maxReachedStep,
  onStepClick,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
      {/* Compact Gray Pill Return Button */}
      <button
        onClick={onReturn}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-100 dark:bg-zinc-800/80 hover:bg-gray-200 dark:hover:bg-zinc-700/80 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition shrink-0 focus:outline-none shadow-sm cursor-pointer"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Return</span>
      </button>

      {/* Stepper Assembly */}
      <div className="w-full max-w-xl md:max-w-2xl mx-auto md:mx-0">
        <WizardProgressTrack
          steps={WIZARD_STEPS}
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

export default JobCreateHeader;
