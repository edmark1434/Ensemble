import React, { useState } from "react";
import { Package, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

interface ProfileAssetsProps {
  accountId?: string;
  isOwner?: boolean;
  isLoading?: boolean;
}

export const Profile_Assets: React.FC<ProfileAssetsProps> = ({ isOwner = false, isLoading = false }) => {
  const [assets] = useState<any[]>([]);

  return (
    <div className="flex-1 space-y-4 text-left">
      {/* Permanent Header Bar */}
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

      {isLoading ? (
        <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/40 p-4 animate-pulse"
            >
              <div>
                <div className="mb-3 h-36 w-full rounded-xl bg-gray-200 dark:bg-zinc-800" />
                <div className="mb-2 flex items-center gap-1.5">
                  <div className="h-4 w-12 rounded bg-gray-200 dark:bg-zinc-800" />
                  <div className="h-4 w-16 rounded bg-gray-200 dark:bg-zinc-800" />
                </div>
                <div className="mb-2 h-5 w-24 rounded bg-gray-200 dark:bg-zinc-800" />
                <div className="mb-1.5 h-4 w-3/4 rounded bg-gray-200 dark:bg-zinc-800" />
                <div className="mb-1 h-3 w-full rounded bg-gray-200 dark:bg-zinc-800" />
                <div className="mb-3 h-3 w-2/3 rounded bg-gray-200 dark:bg-zinc-800" />
                <div className="flex gap-1.5 mb-1">
                  <div className="h-4 w-14 rounded-md bg-gray-200 dark:bg-zinc-800" />
                  <div className="h-4 w-14 rounded-md bg-gray-200 dark:bg-zinc-800" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-white/5 flex items-center justify-between">
                <div className="h-3 w-20 rounded bg-gray-200 dark:bg-zinc-800" />
                <div className="h-4 w-14 rounded-md bg-gray-200 dark:bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      ) : assets.length === 0 ? (
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
          {/* Asset item cards */}
        </div>
      )}
    </div>
  );
};