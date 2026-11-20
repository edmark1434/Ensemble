import React from "react";
import { Flame } from "lucide-react";
import { WarmTooltip } from "@/components/ui/WarmTooltip";
import useGlobalState from "@/lib/global_state";

/**
 * Shining "New" pill for services published within the last 7 days,
 * with a theme-aware hover tooltip.
 */
export const NewListingBadge: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);
  const isDark = theme === "dark";

  return (
    <WarmTooltip
      content="7-day fresh service"
      side="top"
      size="sm"
      delay={150}
      surfaceColor={isDark ? "#18181b" : "#ffffff"}
      inkColor={isDark ? "#f4f4f5" : "#18181b"}
    >
      <span className="relative overflow-hidden inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100/95 text-sky-900 border border-sky-400 dark:bg-sky-600/95 dark:text-white dark:border-sky-400/80 backdrop-blur-md shadow-xs cursor-default">
        <Flame className="relative z-10 h-2.5 w-2.5" />
        <span className="relative z-10">New</span>
        <span className="absolute inset-0 -translate-x-full animate-badge-shine bg-gradient-to-r from-transparent via-white/60 dark:via-white/30 to-transparent pointer-events-none" />
      </span>
    </WarmTooltip>
  );
};
