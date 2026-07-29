import React from "react";
import { Search, X } from "lucide-react";

interface ProposalsSearchbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const ProposalsSearchbar: React.FC<ProposalsSearchbarProps> = ({
  searchQuery,
  setSearchQuery,
}) => {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center w-full">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Search proposals by job title, client name, or pitch keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-full border border-white/10 bg-white/5 pl-11 pr-10 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500/50 transition-all shadow-lg"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ProposalsSearchbar;