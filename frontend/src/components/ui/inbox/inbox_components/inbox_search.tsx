import React from "react";
import { Search } from "lucide-react";

interface InboxSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeTab: "direct" | "marketplace";
}

export const InboxSearch: React.FC<InboxSearchProps> = ({
  searchQuery,
  onSearchChange,
  activeTab,
}) => {
  return (
    <div className="p-4 border-b border-white/10 flex-shrink-0 bg-[#0d0f1a]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder={
            activeTab === "direct"
              ? "Search conversations..."
              : "Search marketplace orders..."
          }
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-xl border border-white/15 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        />
      </div>
    </div>
  );
};