import React, { useState } from "react";
import { Package, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

interface ProfileAssetsProps {
  accountId?: string;
  isOwner?: boolean;
}

export const Profile_Assets: React.FC<ProfileAssetsProps> = ({ isOwner = false }) => {
  const [assets] = useState<any[]>([]);

  return (
    <div className="flex-1 space-y-4 text-left">
      {/* Header Bar matching Introduction, Portfolio, Gallery & Services */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-2">
        <h4 className="text-xs font-extrabold text-gray-900 dark:text-white tracking-wider uppercase flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
          {isOwner ? "My Assets" : "Assets"}
          <span className="text-[10px] font-medium text-gray-500 dark:text-zinc-500 lowercase">
            ({assets.length})
          </span>
        </h4>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-500 dark:text-zinc-500 font-medium">
            {assets.length} active assets
          </span>

          {isOwner && (
            <button
              onClick={() => {}}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload Asset</span>
            </button>
          )}
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="py-2">
          <EmptyState
            title="No Assets Found"
            description={
              isOwner
                ? "You haven't uploaded any plugins, digital presets, or media templates yet. Share your resources with the community!"
                : "This user hasn't uploaded any downloadable assets or presets yet."
            }
            actionLabel={isOwner ? "Upload Asset" : undefined}
            onAction={isOwner ? () => {} : undefined}
            className="!p-6 !py-8 [&_dotlottie-wc]:!h-20 [&_dotlottie-wc]:!w-20 [&_.grayscale]:!h-20 [&_.grayscale]:!w-20 [&_.grayscale]:!mb-2 [&_h3]:!text-sm [&_p]:!text-xs [&_button]:!mt-4 [&_button]:!py-2 [&_button]:!px-4 [&_button]:!text-xs"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Asset item cards go here */}
        </div>
      )}
    </div>
  );
};