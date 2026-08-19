import React, { useState } from "react";
import { ChevronDown, Award } from "lucide-react";

interface Step {
  check: boolean;
  label: string;
  action: () => void;
}

interface ProfileSetupWidgetProps {
  completionScore: number;
  completionSteps: Step[];
  nextStep?: Step;
  getProgressColor: (score: number) => string;
}

export const ProfileSetupWidget: React.FC<ProfileSetupWidgetProps> = ({
  completionScore,
  completionSteps,
  nextStep,
  getProgressColor,
}) => {
  const [isProfileSetupExpanded, setIsProfileSetupExpanded] = useState(true);

  return (
    <div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-md border border-gray-200/80 dark:border-white/10 rounded-2xl p-4 shadow-sm flex flex-col gap-2.5 transition-all duration-300 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Bar Row */}
      <div className="flex items-center justify-between gap-4">
        <div
          className="flex items-center gap-2.5 cursor-pointer group select-none min-w-0"
          onClick={() => setIsProfileSetupExpanded(!isProfileSetupExpanded)}
        >
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors">
              Profile Setup
            </h3>
            <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
              ({completionScore}%)
            </span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${isProfileSetupExpanded ? "rotate-180" : ""}`} />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {nextStep && (
            <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400 hidden sm:inline">
              Next: <strong className="text-gray-800 dark:text-zinc-200">{nextStep.label}</strong>
            </span>
          )}
          {nextStep && (
            <button
              onClick={nextStep.action}
              className="px-3.5 py-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-[11px] font-bold rounded-xl transition-all shadow-sm shadow-blue-600/20 whitespace-nowrap cursor-pointer"
            >
              Complete Now
            </button>
          )}
        </div>
      </div>

      {/* Slim Progress Bar */}
      <div className="h-1.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-out rounded-full ${getProgressColor(completionScore)}`}
          style={{ width: `${completionScore}%` }}
        />
      </div>

      {/* Collapsible Checklist Pills (5 items grid) */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 transition-all duration-300 overflow-hidden ${
          isProfileSetupExpanded ? "pt-1.5 opacity-150 max-h-[300px]" : "max-h-0 opacity-0 p-0 m-0 border-0"
        }`}
      >
        {completionSteps.map((step, idx) => (
          <button
            key={idx}
            onClick={!step.check ? step.action : undefined}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-left transition-all border ${
              step.check 
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 cursor-default' 
                : 'bg-gray-50 dark:bg-white/[0.02] border-gray-200/60 dark:border-white/5 text-gray-600 dark:text-zinc-400 hover:border-blue-500/30 hover:bg-blue-500/5 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer shadow-2xs'
            }`}
            title={!step.check ? 'Click to complete step' : 'Completed'}
          >
            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[9px] ${
              step.check ? 'bg-emerald-500 text-white font-bold' : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-zinc-400 font-mono'
            }`}>
              {step.check ? "✓" : idx + 1}
            </div>
            <span className="truncate">{step.label}</span>
          </button>
        ))}
      </div>

      {/* Note for earning badge */}
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-600 dark:text-amber-400/90 pt-0.5">
        <Award className="w-3.5 h-3.5 shrink-0" />
        <span>Complete the account setup to earn a badge</span>
      </div>
    </div>
  );
};