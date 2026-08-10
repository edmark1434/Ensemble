import React from "react";
import { Image as ImageIcon } from "lucide-react";

export const Profile_Assets: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-3">
      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/10 text-amber-500 dark:text-amber-400/80 filter drop-shadow-[0_0_8px_rgba(234,179,8,0.15)]">
        <ImageIcon className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-extrabold text-gray-900 dark:text-white tracking-wider uppercase">Open Asset Registry</h4>
        <p className="text-[11px] text-gray-600 dark:text-zinc-400 max-w-sm leading-relaxed font-medium">
          No active plug-ins, digital extensions, presets, or media templates loaded. Custom utility packs expose download endpoints directly inside this sub-viewport.
        </p>
      </div>
    </div>
  );
};