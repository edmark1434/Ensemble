import React from "react";
import { Clock } from "lucide-react";

export const Profile_History: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-3">
      <div className="p-3 rounded-xl bg-gray-100 dark:bg-zinc-500/5 border border-gray-200 dark:border-white/5 text-gray-500 dark:text-zinc-400">
        <Clock className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-extrabold text-gray-900 dark:text-white tracking-wider uppercase">Transactional Timeline Ledger</h4>
        <p className="text-[11px] text-gray-500 dark:text-zinc-500 max-w-sm leading-relaxed font-medium">
          Ecosystem smart records are empty. Historical smart contracts and completed workload sequences index here securely upon payment closure.
        </p>
      </div>
    </div>
  );
};