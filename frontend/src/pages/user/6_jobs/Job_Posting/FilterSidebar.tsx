import React from "react";

interface FilterSidebarProps {
  filters: {
    minPrice: string;
    maxPrice: string;
    priceSort: "inc" | "dec" | null;
    selectedDiffs: string[];
    posValue: string;
    posSort: "inc" | "dec" | null;
    ratingSort: boolean;
  };
  setters: {
    setMinPrice: (v: string) => void;
    setMaxPrice: (v: string) => void;
    setPriceSort: (v: "inc" | "dec" | null) => void;
    setSelectedDifficulty: (v: (prev: string[]) => string[]) => void;
    setPosValue: (v: string) => void;
    setPosSort: (v: "inc" | "dec" | null) => void;
    setRatingSort: (v: boolean) => void;
  };
  onClear: () => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ filters, setters, onClear }) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0f1a]/60 p-5 backdrop-blur-sm space-y-6">
      <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Filter Options</h2>

      {/* Price Range */}
      <div className="space-y-3">
        <label className="text-[11px] font-bold text-zinc-400 uppercase">Price Range (₱)</label>
        <div className="flex gap-2">
          <input type="number" placeholder="Min" value={filters.minPrice} onChange={e => setters.setMinPrice(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50" />
          <input type="number" placeholder="Max" value={filters.maxPrice} onChange={e => setters.setMaxPrice(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50" />
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
            <input type="checkbox" className="accent-blue-500" checked={filters.priceSort === "inc"} onChange={() => setters.setPriceSort(filters.priceSort === "inc" ? null : "inc")} /> Increasing Price
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
            <input type="checkbox" className="accent-blue-500" checked={filters.priceSort === "dec"} onChange={() => setters.setPriceSort(filters.priceSort === "dec" ? null : "dec")} /> Decreasing Price
          </label>
        </div>
      </div>

      {/* Difficulty */}
      <div className="space-y-3">
        <label className="text-[11px] font-bold text-zinc-400 uppercase">Difficulty</label>
        <div className="flex flex-col gap-2">
          {["Beginner", "Intermediate", "Expert"].map(d => (
            <label key={d} className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
              <input type="checkbox" className="accent-blue-500" checked={filters.selectedDiffs.includes(d)} onChange={() => setters.setSelectedDifficulty(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])} /> {d}
            </label>
          ))}
        </div>
      </div>

      {/* Positions */}
      <div className="space-y-3">
        <label className="text-[11px] font-bold text-zinc-400 uppercase">Positions</label>
        <input type="number" placeholder="Exact value" value={filters.posValue} onChange={e => setters.setPosValue(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none" />
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
            <input type="checkbox" checked={filters.posSort === "inc"} onChange={() => setters.setPosSort(filters.posSort === "inc" ? null : "inc")} /> Increasing Slots
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
            <input type="checkbox" checked={filters.posSort === "dec"} onChange={() => setters.setPosSort(filters.posSort === "dec" ? null : "dec")} /> Decreasing Slots
          </label>
        </div>
      </div>

      {/* Top Rated */}
      <div className="space-y-3">
        <label className="text-[11px] font-bold text-zinc-400 uppercase">Client Rating</label>
        <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
          <input type="checkbox" checked={filters.ratingSort} onChange={() => setters.setRatingSort(!filters.ratingSort)} /> Top Rated First
        </label>
      </div>

      <button onClick={onClear} className="w-full py-2 text-xs font-bold text-zinc-500 hover:text-red-400 transition-colors border-t border-white/5 pt-4">
        Clear All Filters
      </button>
    </div>
  );
};

export default FilterSidebar;