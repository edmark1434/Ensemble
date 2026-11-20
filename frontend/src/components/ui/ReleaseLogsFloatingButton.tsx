import React, { useMemo, useState } from "react";
import { ScrollText } from "lucide-react";
import { HomeBannerInfo } from "@/pages/user/1_home/home_components/home_banner_info";
import { APP_VERSION } from "@/version.tsx";

/**
 * Compact icon button that smoothly expands on hover to show
 * the latest System Release Logs version and opens the HomeBannerInfo modal on click.
 */
export const ReleaseLogsFloatingButton: React.FC = () => {
  const [hovered, setHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const versionLabel = useMemo(() => {
    const raw = String(APP_VERSION || "V1.7.23").split("|")[0].trim();
    return raw || "V1.7.23";
  }, []);

  return (
    <>
      <button
        type="button"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setIsModalOpen(true)}
        title={`System Release Logs — What's New in ${versionLabel}?`}
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        className="pointer-events-auto flex w-fit items-center rounded-xl border border-zinc-200 dark:border-white/15 bg-white/95 dark:bg-[#15161b]/95 p-1.5 shadow-lg backdrop-blur-md transition-all duration-300 ease-out hover:border-zinc-300 dark:hover:border-white/25 cursor-pointer text-left"
      >
        <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800 dark:bg-white/10 dark:text-zinc-100">
          <ScrollText className="h-3.5 w-3.5" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-sky-500 ring-2 ring-white dark:ring-[#15161b]" />
        </span>

        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            hovered ? "ml-2.5 max-w-[220px] opacity-100 pr-1.5" : "ml-0 max-w-0 opacity-0 pr-0"
          }`}
        >
          <div className="whitespace-nowrap leading-tight">
            <div className="text-[11px] font-bold text-zinc-900 dark:text-white">
              System Release Logs
            </div>
            <div className="text-[10.5px] font-medium text-zinc-500 dark:text-zinc-400">
              What&apos;s New in {versionLabel}?
            </div>
          </div>
        </div>
      </button>

      <HomeBannerInfo isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
