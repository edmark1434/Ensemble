import React from "react";
import { TrendingUp } from "lucide-react";

export const Profile_Projects: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-3">
      <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-500/5 border border-purple-200 dark:border-purple-500/10 text-purple-500 dark:text-purple-400/80 filter drop-shadow-[0_0_8px_rgba(168,85,247,0.15)]">
        <TrendingUp className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-extrabold text-gray-900 dark:text-white tracking-wider uppercase">Operations Performance Monitor</h4>
        <p className="text-[11px] text-gray-600 dark:text-zinc-400 max-w-sm leading-relaxed font-medium">
          All production pipelines clearing. System records indicate 0 active development milestones waiting on critical milestone reviews right now.
        </p>
      </div>
    </div>
  );
};