import React from "react";
import { ArrowLeft, Check } from "lucide-react";

export interface StepConfig {
  id: number;
  label: string;
}

export const GIG_WIZARD_STEPS: StepConfig[] = [
  { id: 1, label: "Core Info" },
  { id: 2, label: "Delivery" },
  { id: 3, label: "Tiers" },
  { id: 4, label: "Milestones" },
  { id: 5, label: "Forms" },
  { id: 6, label: "Review" },
];

interface GigCreateHeaderProps {
  currentSlide: number;
  onReturn: () => void;
}

export const GigCreateHeader: React.FC<GigCreateHeaderProps> = ({
  currentSlide,
  onReturn,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
      {/* Compact Gray Pill Return Button */}
      <button
        onClick={onReturn}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gray-100 dark:bg-zinc-800/80 hover:bg-gray-200 dark:hover:bg-zinc-700/80 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition shrink-0 focus:outline-none shadow-sm"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Return</span>
      </button>

      {/* Stepper Assembly */}
      <div className="flex items-center w-full max-w-lg mx-auto md:mx-0 relative justify-between z-0">
        {GIG_WIZARD_STEPS.map((step, idx) => {
          const isCompleted = currentSlide > step.id;
          const isActive = currentSlide === step.id;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center relative z-10 select-none">
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center border text-xs font-bold transition-all duration-300 shadow-md ${
                    isCompleted
                      ? "bg-green-500 border-green-500 text-white"
                      : isActive
                      ? "bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-400 ring-4 ring-blue-500/10"
                      : "bg-white dark:bg-dark-surface border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-500"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider mt-2 transition-colors absolute -bottom-5 whitespace-nowrap ${
                    isActive ? "text-blue-600 dark:text-blue-400" : isCompleted ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-zinc-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {idx < GIG_WIZARD_STEPS.length - 1 && (
                <div className="flex-1 h-[2px] bg-white dark:bg-white/5 shadow-sm dark:shadow-none mx-2 sm:mx-4 relative top-[-6px] z-0">
                  <div
                    className="absolute inset-y-0 left-0 bg-green-500 transition-all duration-500"
                    style={{ width: isCompleted ? "100%" : "0%" }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default GigCreateHeader;
