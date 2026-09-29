// src/components/ui/inbox/inbox_components/inbox_search.tsx
import React from "react";
import { Search } from "lucide-react";

interface InboxSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeTab: "direct" | "marketplace";
  isCollapsed?: boolean;
}

export const InboxSearch: React.FC<InboxSearchProps> = ({
  searchQuery,
  onSearchChange,
  activeTab,
  isCollapsed = false,
}) => {
  if (isCollapsed) return null;

  return (
    <div className="p-3 border-b border-gray-200 dark:border-white/10 flex-shrink-0 bg-white dark:bg-dark-surface">
      <div className="relative">
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
    </div>
  );
};