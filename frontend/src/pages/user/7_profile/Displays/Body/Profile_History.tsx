import React, { useState } from "react";
import { Clock } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

interface ProfileHistoryProps {
  accountId?: string;
  isOwner?: boolean;
}

export const Profile_History: React.FC<ProfileHistoryProps> = ({ isOwner = false }) => {
  const [history] = useState<any[]>([]);

  return (
    <div className="flex-1 space-y-4 text-left">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-2">
        <h4 className="text-xs font-extrabold text-gray-900 dark:text-white tracking-wider uppercase flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
          {isOwner ? "My Timeline Ledger" : "Timeline Ledger"}
          <span className="text-[10px] font-medium text-gray-500 dark:text-zinc-500 lowercase">
            ({history.length})
          </span>
        </h4>

        <span className="text-[10px] text-gray-500 dark:text-zinc-500 font-medium">
          {history.length} settled records
        </span>
      </div>

      {history.length === 0 ? (
        <div className="py-2">
          <EmptyState
            title="Transactional Timeline Ledger"
            description={
              isOwner
                ? "Ecosystem smart records are empty. Historical smart contracts and completed workload sequences index here securely upon payment closure."
                : "No completed workload sequences or transactional history indexed for this account yet."
            }
            className="!p-6 !py-8 [&_dotlottie-wc]:!h-20 [&_dotlottie-wc]:!w-20 [&_.grayscale]:!h-20 [&_.grayscale]:!w-20 [&_.grayscale]:!mb-2 [&_h3]:!text-sm [&_p]:!text-xs [&_button]:!mt-4 [&_button]:!py-2 [&_button]:!px-4 [&_button]:!text-xs"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {/* History records */}
        </div>
      )}
    </div>
  );
};