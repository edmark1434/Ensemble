import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

export interface FilterState {
  minPrice: string;
  maxPrice: string;
  priceSort: "inc" | "dec" | null;
  selectedDiffs: string[];
  posValue: string;
  posSort: "inc" | "dec" | null;
  ratingSort: boolean;
}

export interface FilterSetters {
  setMinPrice: (v: string) => void;
  setMaxPrice: (v: string) => void;
  setPriceSort: (v: "inc" | "dec" | null) => void;
  setSelectedDifficulty: (v: (prev: string[]) => string[]) => void;
  setPosValue: (v: string) => void;
  setPosSort: (v: "inc" | "dec" | null) => void;
  setRatingSort: (v: boolean) => void;
}

interface JobFiltersProps {
  filters: FilterState;
  setters: FilterSetters;
  onClear: () => void;
}

const JobFilters: React.FC<JobFiltersProps> = ({ filters, setters, onClear }) => {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm dark:shadow-none p-4 backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-2">
        <h2 className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-[0.2em]">
          Filter Options
        </h2>
        <button
          onClick={onClear}
          className="text-[10px] font-semibold text-zinc-500 hover:text-red-400 transition-colors"
        >
          Reset All
        </button>
      </div>

      {/* Price Range */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
            Price Range (Credits)
          </label>

          {/* Compact Price Sort Buttons */}
          <div className="flex gap-1 bg-gray-50 dark:bg-white/5 p-0.5 rounded-lg border border-gray-200 dark:border-white/5">
            <button
              title="Increasing Price"
              onClick={() => setters.setPriceSort(filters.priceSort === "inc" ? null : "inc")}
              className={`p-1 rounded text-xs transition ${
                filters.priceSort === "inc"
                  ? "bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30"
                  : "text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
              }`}
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              title="Decreasing Price"
              onClick={() => setters.setPriceSort(filters.priceSort === "dec" ? null : "dec")}
              className={`p-1 rounded text-xs transition ${
                filters.priceSort === "dec"
                  ? "bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30"
                  : "text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
              }`}
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => setters.setMinPrice(e.target.value)}
            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 placeholder:text-gray-400 dark:placeholder:text-zinc-600"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => setters.setMaxPrice(e.target.value)}
            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 placeholder:text-gray-400 dark:placeholder:text-zinc-600"
          />
        </div>
      </div>

      {/* Difficulty Chips */}
      <div className="space-y-2 pt-1 border-t border-gray-200 dark:border-white/5">
        <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
          Difficulty
        </label>
        <div className="flex flex-wrap gap-1.5">
          {["Beginner", "Intermediate", "Expert"].map((d) => {
            const isSelected = filters.selectedDiffs.includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() =>
                  setters.setSelectedDifficulty((prev) =>
                    prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
                  )
                }
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/40 text-blue-600 dark:text-blue-400"
                    : "bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-zinc-300"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* Positions Slots */}
      <div className="space-y-2 pt-1 border-t border-gray-200 dark:border-white/5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
            Positions Needed
          </label>
          <div className="flex gap-1 bg-gray-50 dark:bg-white/5 p-0.5 rounded-lg border border-gray-200 dark:border-white/5">
            <button
              title="Increasing Slots"
              onClick={() => setters.setPosSort(filters.posSort === "inc" ? null : "inc")}
              className={`p-1 rounded text-xs transition ${
                filters.posSort === "inc"
                  ? "bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30"
                  : "text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
              }`}
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              title="Decreasing Slots"
              onClick={() => setters.setPosSort(filters.posSort === "dec" ? null : "dec")}
              className={`p-1 rounded text-xs transition ${
                filters.posSort === "dec"
                  ? "bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30"
                  : "text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
              }`}
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>
        </div>
        <input
          type="number"
          placeholder="Exact positionsNeeded"
          value={filters.posValue}
          onChange={(e) => setters.setPosValue(e.target.value)}
          className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 placeholder:text-gray-400 dark:placeholder:text-zinc-600"
        />
      </div>

      {/* Toggle for Top Rated */}
      <div className="pt-2 border-t border-gray-200 dark:border-white/5 flex items-center justify-between cursor-pointer" onClick={() => setters.setRatingSort(!filters.ratingSort)}>
        <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
          Top Rated First
        </span>
        <div
          className={`w-8 h-4 flex items-center rounded-full p-0.5 transition-colors ${
            filters.ratingSort ? "bg-blue-500" : "bg-gray-300 dark:bg-white/10"
          }`}
        >
          <div
            className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${
              filters.ratingSort ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </div>
      </div>
    </div>
  );
};

export default JobFilters;