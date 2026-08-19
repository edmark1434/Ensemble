import React, { useState } from "react";
import { Activity } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

interface ProfileProjectsProps {
  accountId?: string;
  isOwner?: boolean;
}

export const Profile_Projects: React.FC<ProfileProjectsProps> = ({ isOwner = false }) => {
  const [projects] = useState<any[]>([]);

  return (
    <div className="flex-1 space-y-4 text-left">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-2">
        <h4 className="text-xs font-extrabold text-gray-900 dark:text-white tracking-wider uppercase flex items-center gap-2">
          <Activity className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
          {isOwner ? "My Operations" : "Operations"}
          <span className="text-[10px] font-medium text-gray-500 dark:text-zinc-500 lowercase">
            ({projects.length})
          </span>
        </h4>

        <span className="text-[10px] text-gray-500 dark:text-zinc-500 font-medium">
          {projects.length} active milestones
        </span>
      </div>

      {projects.length === 0 ? (
        <div className="py-2">
          <EmptyState
            title="No Active Operations"
            description={
              isOwner
                ? "All production pipelines clearing. System records indicate 0 active development milestones waiting on critical milestone reviews right now."
                : "This user currently has no active operational milestones or production pipelines running."
            }
            className="!p-6 !py-8 [&_dotlottie-wc]:!h-20 [&_dotlottie-wc]:!w-20 [&_.grayscale]:!h-20 [&_.grayscale]:!w-20 [&_.grayscale]:!mb-2 [&_h3]:!text-sm [&_p]:!text-xs [&_button]:!mt-4 [&_button]:!py-2 [&_button]:!px-4 [&_button]:!text-xs"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Active project cards */}
        </div>
      )}
    </div>
  );
};