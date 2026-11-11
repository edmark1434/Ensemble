import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Compass } from "lucide-react";
import GlideSelect, { type GlideSelectOption } from "./GlideSelect";

export interface SmartTabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  badge?: number | string;
  badgeColor?: string;
  group?: string;
}

export interface SmartTabBarProps<T extends string = string> {
  tabs: SmartTabItem<T>[];
  activeTab: T;
  onSelectTab: (tabId: T) => void;
  className?: string;
  jumpMenuTitle?: string;
}

// Helper to safely render an icon that can be a Lucide forwardRef component or ReactElement
const renderTabIcon = (
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode,
  className = "w-4 h-4"
) => {
  if (!icon) return null;
  if (React.isValidElement(icon)) {
    return icon;
  }
  const IconComponent = icon as React.ComponentType<{ className?: string }>;
  return <IconComponent className={className} />;
};

export function SmartTabBar<T extends string = string>({
  tabs,
  activeTab,
  onSelectTab,
  className = "",
  jumpMenuTitle = "All Tabs",
}: SmartTabBarProps<T>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll boundary visibility
  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleResize = () => checkScroll();
    window.addEventListener("resize", handleResize);
    el.addEventListener("scroll", checkScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      el.removeEventListener("scroll", checkScroll);
    };
  }, [checkScroll, tabs]);

  // Auto-scroll active tab into view
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const activeBtn = el.querySelector<HTMLElement>(`[data-tab-id="${activeTab}"]`);
    if (activeBtn) {
      const containerRect = el.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      if (btnRect.left < containerRect.left + 36 || btnRect.right > containerRect.right - 36) {
        activeBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
    checkScroll();
  }, [activeTab, checkScroll]);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -220, behavior: "smooth" });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 220, behavior: "smooth" });
    }
  };

  // Check if any tab has an active notification/badge count
  const totalBadges = useMemo(() => {
    return tabs.reduce((acc, tab) => {
      const b = typeof tab.badge === "number" ? tab.badge : 0;
      return acc + b;
    }, 0);
  }, [tabs]);

  // Map tabs into GlideSelectOption list
  const glideOptions: GlideSelectOption[] = useMemo(() => {
    return tabs.map((tab) => ({
      value: tab.id,
      label: (
        <span className="flex items-center gap-2 truncate">
          <span className="truncate">{tab.label}</span>
          {tab.badge !== undefined &&
            (typeof tab.badge === "number" ? tab.badge > 0 : Boolean(tab.badge)) && (
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                  tab.badgeColor ||
                  (tab.id === activeTab
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                    : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300")
                }`}
              >
                {tab.badge}
              </span>
            )}
        </span>
      ),
      icon: tab.icon ? (
        <span className="shrink-0 opacity-80">
          {renderTabIcon(tab.icon, "w-3.5 h-3.5")}
        </span>
      ) : undefined,
      tag: tab.group,
    }));
  }, [tabs, activeTab]);

  return (
    <div
      className={`relative flex items-center border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 select-none rounded-b-2xl ${className}`}
    >
      {/* Scrollable Tabs Wrapper */}
      <div className="relative flex-1 min-w-0 overflow-hidden">
        {/* Left Scroll Button & Fade Mask */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center pl-1 pr-4 bg-gradient-to-r from-zinc-50 dark:from-zinc-900 via-zinc-50/95 dark:via-zinc-900/95 to-transparent pointer-events-auto">
            <button
              type="button"
              onClick={handleScrollLeft}
              title="Scroll left"
              className="p-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 text-zinc-600 dark:text-zinc-300 shadow-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 transition cursor-pointer active:scale-95"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* The Scroll Container */}
        <div
          ref={scrollContainerRef}
          className="flex items-center overflow-x-auto scrollbar-none px-3 sm:px-5 scroll-smooth"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                data-tab-id={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-3.5 sm:px-4 text-xs font-semibold border-b-2 transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 font-bold bg-white dark:bg-zinc-900 shadow-2xs"
                    : "border-transparent text-zinc-600 hover:text-zinc-900 dark:hover:text-white dark:text-zinc-400 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40"
                }`}
              >
                {tab.icon && (
                  <span className="shrink-0 opacity-80">
                    {renderTabIcon(tab.icon, "w-4 h-4")}
                  </span>
                )}
                <span className="whitespace-nowrap">{tab.label}</span>
                {tab.badge !== undefined &&
                  (typeof tab.badge === "number" ? tab.badge > 0 : Boolean(tab.badge)) && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                        tab.badgeColor ||
                        (isActive
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                          : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300")
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
              </button>
            );
          })}
        </div>

        {/* Right Scroll Button & Fade Mask */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center pr-1 pl-4 bg-gradient-to-l from-zinc-50 dark:from-zinc-900 via-zinc-50/95 dark:via-zinc-900/95 to-transparent pointer-events-auto">
            <button
              type="button"
              onClick={handleScrollRight}
              title="Scroll right"
              className="p-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 text-zinc-600 dark:text-zinc-300 shadow-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 transition cursor-pointer active:scale-95"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Quick-Jump "Tabs ▾" Selector using GlideSelect */}
      <div className="relative shrink-0 pr-3 sm:pr-4 pl-1 border-l border-zinc-200/80 dark:border-zinc-800/80">
        <GlideSelect
          options={glideOptions}
          value={activeTab}
          onChange={(val) => onSelectTab(val as T)}
          size="sm"
          radius={12}
          fullWidth={false}
          align="right"
          menuWidth={280}
          maxVisibleItems={6.5}
          triggerLabel={
            <span className="flex items-center gap-1.5 font-medium text-xs">
              <span className="hidden md:inline">Tabs</span>
              {totalBadges > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              )}
            </span>
          }
          triggerIcon={<Compass className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
          menuHeader={
            <div className="px-1.5 py-0.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              <span>{jumpMenuTitle}</span>
              <span className="text-[9px] font-normal lowercase opacity-70">
                {tabs.length} tabs
              </span>
            </div>
          }
        />
      </div>
    </div>
  );
}

export default SmartTabBar;
