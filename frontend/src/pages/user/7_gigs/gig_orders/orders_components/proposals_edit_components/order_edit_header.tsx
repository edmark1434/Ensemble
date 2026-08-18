import React from "react";
import { ArrowLeft, Check } from "lucide-react";

export const PROPOSAL_EDIT_WIZARD_STEPS = [
  { id: 1, label: "Cover Pitch" },
  { id: 2, label: "Terms & TOS" },
  { id: 3, label: "Milestones" },
  { id: 4, label: "Review & Save" },
];

interface OrderEditHeaderProps {
  currentSlide: number;
  onReturn: () => void;
}

export const OrderEditHeader: React.FC<OrderEditHeaderProps> = ({
  currentSlide,
  onReturn,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
      <button
        type="button"
        onClick={onReturn}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white dark:bg-zinc-800/80 hover:bg-gray-50 dark:hover:bg-zinc-700/80 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition shrink-0 focus:outline-none shadow-sm"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Cancel & Return</span>
      </button>

      <div className="flex items-center w-full max-w-lg mx-auto md:mx-0 relative justify-between z-0">
        {PROPOSAL_EDIT_WIZARD_STEPS.map((step, idx) => {
          const isCompleted = currentSlide > step.id;
          const isActive = currentSlide === step.id;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center relative z-10 select-none">
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center border text-xs font-bold transition-all duration-300 shadow-sm dark:shadow-md ${
                    isCompleted
                      ? "bg-emerald-500 border-emerald-500 text-white dark:text-[#080a12]"
                      : isActive
                      ? "bg-blue-50 dark:bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-400 ring-4 ring-blue-500/10"
                      : "bg-white dark:bg-dark-surface border-gray-200 dark:border-white/10 text-gray-400 dark:text-zinc-500"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider mt-2 transition-colors absolute -bottom-5 whitespace-nowrap ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400"
                      : isCompleted
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-gray-400 dark:text-zinc-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {idx < PROPOSAL_EDIT_WIZARD_STEPS.length - 1 && (
                <div className="flex-1 h-[2px] bg-gray-200 dark:bg-white/5 mx-3 relative top-[-6px] z-0">
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-500"
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

export default OrderEditHeader;