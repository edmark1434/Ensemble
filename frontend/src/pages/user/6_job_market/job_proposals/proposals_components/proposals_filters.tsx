import React from "react";
import { ArrowUp, ArrowDown, RotateCcw } from "lucide-react";

export interface ProposalFilterState {
  minPrice: string;
  maxPrice: string;
  priceSort: "inc" | "dec" | null;
  milestonesValue: string;
  milestonesSort: "inc" | "dec" | null;
  revisionRateSort: "inc" | "dec" | null;
  dateSort: "inc" | "dec" | null;
}

export interface ProposalFilterSetters {
  setMinPrice: (v: string) => void;
  setMaxPrice: (v: string) => void;
  setPriceSort: (v: "inc" | "dec" | null) => void;
  setMilestonesValue: (v: string) => void;
  setMilestonesSort: (v: "inc" | "dec" | null) => void;
  setRevisionRateSort: (v: "inc" | "dec" | null) => void;
  setDateSort: (v: "inc" | "dec" | null) => void;
}

interface ProposalsFiltersProps {
  filters: ProposalFilterState;
  setters: ProposalFilterSetters;
  onClear: () => void;
}

export const ProposalsFilters: React.FC<ProposalsFiltersProps> = ({
  filters,
  setters,
  onClear,
}) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0f1a]/60 p-4 backdrop-blur-sm space-y-4 text-left">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
          Filter & Sorting
        </h2>
        <button
          onClick={onClear}
          className="text-[10px] font-semibold text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"
        >
          <RotateCcw className="h-3 w-3" /> Reset All
        </button>
      </div>

      {/* 1. Bid Price Range & Asc/Desc Sort */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Escrow Bid Range (₱)
          </label>
          <div className="flex gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
            <button
              title="Lowest Bid First"
              onClick={() =>
                setters.setPriceSort(filters.priceSort === "inc" ? null : "inc")
              }
              className={`p-1 rounded text-xs transition ${
                filters.priceSort === "inc"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              title="Highest Bid First"
              onClick={() =>
                setters.setPriceSort(filters.priceSort === "dec" ? null : "dec")
              }
              className={`p-1 rounded text-xs transition ${
                filters.priceSort === "dec"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min Bid"
            value={filters.minPrice}
            onChange={(e) => setters.setMinPrice(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50 placeholder:text-zinc-600"
          />
          <input
            type="number"
            placeholder="Max Bid"
            value={filters.maxPrice}
            onChange={(e) => setters.setMaxPrice(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50 placeholder:text-zinc-600"
          />
        </div>
      </div>

      {/* 2. No. of Milestones */}
      <div className="space-y-2 pt-2 border-t border-white/5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            No. of Milestones
          </label>
          <div className="flex gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
            <button
              title="Fewer Milestones First"
              onClick={() =>
                setters.setMilestonesSort(
                  filters.milestonesSort === "inc" ? null : "inc"
                )
              }
              className={`p-1 rounded text-xs transition ${
                filters.milestonesSort === "inc"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              title="More Milestones First"
              onClick={() =>
                setters.setMilestonesSort(
                  filters.milestonesSort === "dec" ? null : "dec"
                )
              }
              className={`p-1 rounded text-xs transition ${
                filters.milestonesSort === "dec"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>
        </div>
        <input
          type="number"
          placeholder="Exact count (e.g. 3)"
          value={filters.milestonesValue}
          onChange={(e) => setters.setMilestonesValue(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50 placeholder:text-zinc-600"
        />
      </div>

      {/* 3. Additional Work / Revision Rate Sort */}
      <div className="space-y-2 pt-2 border-t border-white/5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Overage Revision Rate (%)
          </label>
          <div className="flex gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
            <button
              title="Lowest Rate First"
              onClick={() =>
                setters.setRevisionRateSort(
                  filters.revisionRateSort === "inc" ? null : "inc"
                )
              }
              className={`p-1 rounded text-xs transition ${
                filters.revisionRateSort === "inc"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              title="Highest Rate First"
              onClick={() =>
                setters.setRevisionRateSort(
                  filters.revisionRateSort === "dec" ? null : "dec"
                )
              }
              className={`p-1 rounded text-xs transition ${
                filters.revisionRateSort === "dec"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Date Proposed Sort */}
      <div className="space-y-2 pt-2 border-t border-white/5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Date Proposed
          </label>
          <div className="flex gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
            <button
              title="Oldest First"
              onClick={() =>
                setters.setDateSort(filters.dateSort === "inc" ? null : "inc")
              }
              className={`p-1 rounded text-xs transition ${
                filters.dateSort === "inc"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              title="Newest First"
              onClick={() =>
                setters.setDateSort(filters.dateSort === "dec" ? null : "dec")
              }
              className={`p-1 rounded text-xs transition ${
                filters.dateSort === "dec"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProposalsFilters;