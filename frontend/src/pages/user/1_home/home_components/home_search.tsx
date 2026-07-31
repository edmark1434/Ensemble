// src/pages/user/1_home/home_components/home_search.tsx
import React from "react";
import { Search, X } from "lucide-react";

interface HomeSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const HomeSearch: React.FC<HomeSearchProps> = ({ searchQuery, setSearchQuery }) => {
  return (
    <div className="mb-12 relative max-w-3xl mx-auto z-20">
      <div className="relative flex items-center rounded-xl border border-white/10 bg-white/5 p-1.5 backdrop-blur-xl shadow-xl focus-within:border-blue-500/50 focus-within:shadow-blue-500/5 transition duration-300">
        <div className="flex items-center justify-center pl-3 pr-2 text-zinc-400">
          <Search className="h-5 w-5" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search assets, libraries, effects, or templates across the ecosystem..."
          className="w-full bg-transparent px-2 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition mr-1"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};