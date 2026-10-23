import React from "react";
import { ArrowLeft } from "lucide-react";
import WizardProgressTrack, { type WizardStep } from "@/components/ui/WizardProgressTrack";

export const PROPOSAL_EDIT_WIZARD_STEPS: WizardStep[] = [
  { id: 1, label: "Cover Pitch" },
  { id: 2, label: "Terms & TOS" },
  { id: 3, label: "Milestones" },
  { id: 4, label: "Review & Save" },
];

interface ProposalEditHeaderProps {
  currentSlide: number;
  onReturn: () => void;
  hasReachedReview?: boolean;
  onJumpToReview?: () => void;
  maxReachedStep?: number;
  onStepClick?: (stepId: number) => void;
}

export const ProposalEditHeader: React.FC<ProposalEditHeaderProps> = ({
  currentSlide,
  onReturn,
  hasReachedReview,
  onJumpToReview,
  maxReachedStep,
  onStepClick,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
      <button
        type="button"
        onClick={onReturn}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white dark:bg-zinc-800/80 hover:bg-gray-50 dark:hover:bg-zinc-700/80 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition shrink-0 focus:outline-none shadow-sm cursor-pointer"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Cancel & Return</span>
      </button>

      <div className="w-full max-w-lg mx-auto md:mx-0">
        <WizardProgressTrack
          steps={PROPOSAL_EDIT_WIZARD_STEPS}
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

export default ProposalEditHeader;
