import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Compass, X } from 'lucide-react';
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
  const [autoExpanded, setAutoExpanded] = useState(true);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setAutoExpanded(true);
    const timer = setTimeout(() => {
      setAutoExpanded(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const displayName = userName ? userName.split(' ')[0] : 'there';
  const expanded = autoExpanded || hovered;

  return (
    <div
      role="region"
      aria-label="Platform Walkthrough Welcome"
      className={`fixed z-[30] bottom-6 transition-all duration-300 ease-out font-['Plus_Jakarta_Sans',sans-serif] ${
        isSidebarCollapsed
          ? 'left-4 sm:left-[84px]'
          : 'left-4 sm:left-[272px]'
      }`}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onClick}
        title={`Welcome back, ${displayName}! Open Platform Walkthrough`}
        className="relative overflow-hidden flex w-fit items-center rounded-xl border border-zinc-200 dark:border-white/15 bg-white/95 dark:bg-[#15161b]/95 p-1.5 shadow-lg backdrop-blur-md transition-all duration-300 ease-out hover:border-zinc-300 dark:hover:border-white/25 cursor-pointer"
      >
        <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800 dark:bg-white/10 dark:text-zinc-100">
          <Compass className="h-3.5 w-3.5" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-zinc-900 dark:bg-white ring-2 ring-white dark:ring-[#15161b]" />
        </span>

        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            expanded ? 'ml-2.5 max-w-[260px] opacity-100' : 'ml-0 max-w-0 opacity-0'
          }`}
        >
          <div className="whitespace-nowrap pr-1 leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-[11.5px] font-bold text-zinc-900 dark:text-white">
                Welcome back, {displayName}!
              </span>
              <span className="inline-flex shrink-0 items-center rounded-full border border-zinc-200 dark:border-white/15 bg-zinc-100 dark:bg-white/10 px-1.5 py-0.2 text-[9px] font-bold text-zinc-700 dark:text-zinc-300">
                Guide
              </span>
            </div>
            <div className="text-[10.5px] font-medium text-zinc-500 dark:text-zinc-400">
              Platform Walkthrough
            </div>
          </div>
        </div>

        <div
          className={`flex items-center overflow-hidden transition-all duration-300 ease-out ${
            expanded ? 'ml-1.5 max-w-[32px] opacity-100' : 'ml-0 max-w-0 opacity-0'
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Dismiss welcome popup"
            className="shrink-0 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {autoExpanded && (
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 5, ease: 'linear' }}
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left bg-zinc-900/70 dark:bg-white/70"
          />
        )}
      </div>
    </div>
  );
};

export default TourWelcomeLeftPopup;
