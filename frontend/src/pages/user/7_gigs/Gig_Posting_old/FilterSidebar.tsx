import React from "react";
import { Star } from "lucide-react";

interface FilterSidebarProps {
  filters: {
    minPrice: string;
    maxPrice: string;
    priceSort: "inc" | "dec" | null;
    slotsValue: string;
    slotsSort: "inc" | "dec" | null;
    minRating: number;
  };
  setters: {
    setMinPrice: (v: string) => void;
    setMaxPrice: (v: string) => void;
    setPriceSort: (v: "inc" | "dec" | null) => void;
    setSlotsValue: (v: string) => void;
    setSlotsSort: (v: "inc" | "dec" | null) => void;
    setMinRating: (v: number) => void;
  };
  onClear: () => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ filters, setters, onClear }) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-dark-surface/60 p-5 backdrop-blur-sm space-y-6">

      {/* Sidebar Header Title Banner */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
          Filter Options
        </h2>
      </div>

      {/* 1. PRICE RANGE OPTION (With Increasng / Decreasing Checkbox Sort Arrays) */}
      <div className="space-y-3">
        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
          Budget Range (Credits)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => setters.setMinPrice(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => setters.setMaxPrice(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        {/* Toggle Controls */}
        <div className="flex flex-col gap-2 pt-1">
          <label className="flex items-center gap-2.5 text-xs text-zinc-400 hover:text-zinc-300 cursor-pointer select-none transition-colors">
            <input
              type="checkbox"
              className="accent-blue-500 h-3.5 w-3.5 rounded border-white/10 bg-white/5"
              checked={filters.priceSort === "inc"}
              onChange={() => setters.setPriceSort(filters.priceSort === "inc" ? null : "inc")}
            />
            <span>Increasing Price</span>
          </label>
          <label className="flex items-center gap-2.5 text-xs text-zinc-400 hover:text-zinc-300 cursor-pointer select-none transition-colors">
            <input
              type="checkbox"
              className="accent-blue-500 h-3.5 w-3.5 rounded border-white/10 bg-white/5"
              checked={filters.priceSort === "dec"}
              onChange={() => setters.setPriceSort(filters.priceSort === "dec" ? null : "dec")}
            />
            <span>Decreasing Price</span>
          </label>
        </div>
      </div>

      {/* 2. SLOTS SYSTEM FILTERS (With Increasng / Decreasing Checkbox Sort Arrays) */}
      <div className="space-y-3">
        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
          Slots Available
        </label>
        <input
          type="number"
          placeholder="Minimum slot threshold"
          value={filters.slotsValue}
          onChange={(e) => setters.setSlotsValue(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
        />

        {/* Toggle Controls */}
        <div className="flex flex-col gap-2 pt-1">
          <label className="flex items-center gap-2.5 text-xs text-zinc-400 hover:text-zinc-300 cursor-pointer select-none transition-colors">
            <input
              type="checkbox"
              className="accent-blue-500 h-3.5 w-3.5 rounded border-white/10 bg-white/5"
              checked={filters.slotsSort === "inc"}
              onChange={() => setters.setSlotsSort(filters.slotsSort === "inc" ? null : "inc")}
            />
            <span>Increasing Slots</span>
          </label>
          <label className="flex items-center gap-2.5 text-xs text-zinc-400 hover:text-zinc-300 cursor-pointer select-none transition-colors">
            <input
              type="checkbox"
              className="accent-blue-500 h-3.5 w-3.5 rounded border-white/10 bg-white/5"
              checked={filters.slotsSort === "dec"}
              onChange={() => setters.setSlotsSort(filters.slotsSort === "dec" ? null : "dec")}
            />
            <span>Decreasing Slots</span>
          </label>
        </div>
      </div>

      {/* 3. INTERACTIVE STAR-RATING MATRIX */}
      <div className="space-y-3">
        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
          Client Rating Threshold
        </label>
        <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setters.setMinRating(filters.minRating === star ? star - 1 : star)}
                className="transition-transform active:scale-95 focus:outline-none group"
              >
                <Star
                  className={`h-4 w-4 transition-colors ${
                    filters.minRating >= star 
                      ? "fill-yellow-500 text-yellow-500" 
                      : "text-zinc-700 group-hover:text-zinc-500"
                  }`}
                />
              </button>
            ))}
          </div>
          {filters.minRating > 0 ? (
            <span className="text-[11px] text-zinc-400 font-bold ml-1">
              {filters.minRating.toFixed(1)} & Up
            </span>
          ) : (
            <span className="text-[11px] text-zinc-600 font-medium ml-1">
              Select rating
            </span>
          )}
        </div>
      </div>

      {/* Global Filter Clear Submission Button */}
      <div className="pt-2">
        <button
          onClick={onClear}
          className="w-full py-2.5 text-xs font-bold text-zinc-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl border border-dashed border-white/10 hover:border-red-500/20 transition-all active:scale-[0.98]"
        >
          Clear All Active Filters
        </button>
      </div>

    </div>
  );
};

export default FilterSidebar;