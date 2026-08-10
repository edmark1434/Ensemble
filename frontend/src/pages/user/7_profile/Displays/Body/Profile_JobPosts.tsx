import React from "react";
import { FileText } from "lucide-react";

export const Profile_JobPosts: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-3">
      <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/10 text-blue-500 dark:text-blue-400/80 filter drop-shadow-[0_0_8px_rgba(59,130,246,0.15)]">
        <FileText className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-extrabold text-gray-900 dark:text-white tracking-wider uppercase">Active Procurement Logs</h4>
        <p className="text-[11px] text-gray-600 dark:text-zinc-400 max-w-sm leading-relaxed font-medium">
          No active public contract proposals initialized. Recruitment cycles track contract deployments down the downstream gateway mesh dynamically.
        </p>
      </div>
    </div>
  );
};