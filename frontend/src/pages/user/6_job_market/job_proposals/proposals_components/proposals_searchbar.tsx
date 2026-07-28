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
    <div className="relative w-full mb-6">
      <div className="relative flex items-center w-full">
        <Search className="absolute left-4 h-4 w-4 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search proposals by job title, client name, or pitch keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-[#0d0f1a] pl-11 pr-10 py-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-blue-500/50 transition shadow-lg"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3.5 p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ProposalsSearchbar;