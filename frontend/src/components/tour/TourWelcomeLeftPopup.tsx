import React from 'react';
import { Compass, Sparkles, X, ChevronRight } from 'lucide-react';
import useGlobalState from '@/lib/global_state';

interface TourWelcomeLeftPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onClick: () => void;
  userName?: string;
}

export const TourWelcomeLeftPopup: React.FC<TourWelcomeLeftPopupProps> = ({
  isOpen,
  onClose,
  onClick,
  userName,
}) => {
  const isSidebarCollapsed = useGlobalState((state) => state.isSidebarCollapsed);

  if (!isOpen) return null;

  const displayName = userName ? userName.split(' ')[0] : 'there';

  return (
    <div
      role="region"
      aria-label="Platform Walkthrough Welcome"
      className={`fixed z-[65] bottom-6 transition-all duration-300 ease-out font-['Plus_Jakarta_Sans',sans-serif] ${
        isSidebarCollapsed
          ? 'left-4 sm:left-[84px]'
          : 'left-4 sm:left-[272px]'
      }`}
    >
      <div
        onClick={onClick}
        className="group relative w-[310px] sm:w-[330px] max-w-[calc(100vw-32px)] cursor-pointer overflow-hidden rounded-2xl border border-amber-500/35 dark:border-amber-500/25 bg-white/95 dark:bg-[#121214]/95 p-4 shadow-[0_12px_36px_rgba(0,0,0,0.14)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/60 dark:hover:border-amber-500/40 hover:shadow-amber-500/10"
      >
        {/* Subtle Ambient Glow */}
        <div className="pointer-events-none absolute -top-12 -right-12 h-28 w-28 rounded-full bg-amber-500/15 blur-2xl transition-opacity group-hover:opacity-100 dark:bg-amber-500/10" />

        {/* Header row: Icon, Greeting, and Close button */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform duration-200">
              <Compass className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-bold text-gray-900 dark:text-white">
                  Welcome back, {displayName}!
                </span>
                <span className="inline-flex shrink-0 items-center rounded-full bg-amber-500/15 px-1.5 py-0.2 text-[9px] font-bold text-amber-700 dark:text-amber-300">
                  Guide
                </span>
              </div>
              <p className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                Platform Walkthrough
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Dismiss welcome popup"
            className="rounded-lg p-1 text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Prompt description */}
        <p className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-zinc-300">
          Explore tools, workspaces, contracts, and escrow features with the interactive guide.
        </p>

        {/* Action button */}
        <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/5">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform duration-150">
            <Sparkles className="h-3 w-3" />
            Open Walkthrough Guide
          </span>
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-zinc-300 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-150">
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TourWelcomeLeftPopup;
