import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

export interface GigFilterState {
  minPrice: string;
  maxPrice: string;
  priceSort: "inc" | "dec" | null;
  tiersCount: string;
  tiersSort: "inc" | "dec" | null;
  dateSort: "inc" | "dec" | null;
  revisions: string;
  deliveryDays: string;
  ratingSort: boolean;
}

export interface GigFilterSetters {
  setMinPrice: (v: string) => void;
  setMaxPrice: (v: string) => void;
  setPriceSort: (v: "inc" | "dec" | null) => void;
  setTiersCount: (v: string) => void;
  setTiersSort: (v: "inc" | "dec" | null) => void;
  setDateSort: (v: "inc" | "dec" | null) => void;
  setRevisions: (v: string) => void;
  setDeliveryDays: (v: string) => void;
  setRatingSort: (v: boolean) => void;
}

interface GigFiltersProps {
  filters: GigFilterState;
  setters: GigFilterSetters;
  onClear: () => void;
}

const GigFilters: React.FC<GigFiltersProps> = ({ filters, setters, onClear }) => {
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

      {/* Date Posted */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
            Date Posted
          </label>
          <div className="flex gap-1 bg-gray-50 dark:bg-white/5 p-0.5 rounded-lg border border-gray-200 dark:border-white/5">
            <button
              title="Oldest First"
              onClick={() => setters.setDateSort(filters.dateSort === "inc" ? null : "inc")}
              className={`p-1 rounded text-xs transition ${
                filters.dateSort === "inc"
                  ? "bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30"
                  : "text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
              }`}
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              title="Newest First"
              onClick={() => setters.setDateSort(filters.dateSort === "dec" ? null : "dec")}
              className={`p-1 rounded text-xs transition ${
                filters.dateSort === "dec"
                  ? "bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30"
                  : "text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
              }`}
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-2 pt-1 border-t border-gray-200 dark:border-white/5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
            Price Range (Credits)
          </label>
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

      {/* Number of Tiers */}
      <div className="space-y-2 pt-1 border-t border-gray-200 dark:border-white/5">
        <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
          Number of Tiers
        </label>
        <div className="flex gap-2">
          {["1", "2", "3"].map((num) => (
            <button
              key={num}
              onClick={() => setters.setTiersCount(filters.tiersCount === num ? "" : num)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                filters.tiersCount === num
                  ? "bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30"
                  : "bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/10"
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Number of Revisions */}
      <div className="space-y-2 pt-1 border-t border-gray-200 dark:border-white/5">
        <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
          Min Revisions
        </label>
        <input
          type="number"
          placeholder="Minimum revisions included"
          min="0"
          value={filters.revisions}
          onChange={(e) => setters.setRevisions(e.target.value)}
          className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 placeholder:text-gray-400 dark:placeholder:text-zinc-600"
        />
      </div>

      {/* Days of Delivery */}
      <div className="space-y-2 pt-1 border-t border-gray-200 dark:border-white/5">
        <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
          Max Days of Delivery
        </label>
        <input
          type="number"
          placeholder="Maximum days to deliver"
          min="1"
          value={filters.deliveryDays}
          onChange={(e) => setters.setDeliveryDays(e.target.value)}
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

export default GigFilters;
