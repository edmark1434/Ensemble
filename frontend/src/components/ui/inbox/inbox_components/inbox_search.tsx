// src/components/ui/inbox/inbox_components/inbox_search.tsx
import React from "react";
import { Search, PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface InboxSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeTab: "direct" | "marketplace";
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const InboxSearch: React.FC<InboxSearchProps> = ({
  searchQuery,
  onSearchChange,
  activeTab,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  return (
    <div
      className={`p-3 border-b border-gray-200 dark:border-white/10 flex-shrink-0 bg-white dark:bg-dark-surface flex items-center justify-center ${
        isCollapsed ? "px-2" : "gap-2"
      }`}
    >
      {!isCollapsed && (
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-zinc-500" />
          <input
            type="text"
            placeholder={
              activeTab === "direct"
                ? "Search conversations..."
                : "Search marketplace orders..."
            }
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-gray-300 dark:border-white/15 bg-gray-50 dark:bg-white/5 pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          />
        </div>
      )}

      {/* Sidebar Collapse Toggle Button */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className="p-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:bg-white/10 transition flex-shrink-0"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4 text-blue-400" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
};