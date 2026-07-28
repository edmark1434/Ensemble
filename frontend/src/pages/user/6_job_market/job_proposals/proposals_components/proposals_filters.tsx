import React from "react";
import { Filter, RotateCcw } from "lucide-react";

interface FilterState {
  minPrice: string;
  maxPrice: string;
  selectedStatus: string[];
}

interface SetterState {
  setMinPrice: (val: string) => void;
  setMaxPrice: (val: string) => void;
  setSelectedStatus: React.Dispatch<React.SetStateAction<string[]>>;
}

interface ProposalsFiltersProps {
  filters: FilterState;
  setters: SetterState;
  onClear: () => void;
}

export const ProposalsFilters: React.FC<ProposalsFiltersProps> = ({
  filters,
  setters,
  onClear,
}) => {
  const statusOptions = ["Pending", "Accepted", "Declined", "Withdrawn"];

  const toggleStatus = (status: string) => {
    setters.setSelectedStatus((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0f1a]/80 p-5 backdrop-blur-sm space-y-4 text-left">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-blue-400" /> Filter Proposals
        </span>
        <button
          onClick={onClear}
          className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>

      {/* Bid Range Filters */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-zinc-400 uppercase">Bid Amount Range (PHP)</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => setters.setMinPrice(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => setters.setMaxPrice(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50"
          />
        </div>
      </div>

      {/* Status Badges Filter */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-zinc-400 uppercase">Status State</label>
        <div className="flex flex-wrap gap-1.5">
          {statusOptions.map((st) => {
            const isSelected = filters.selectedStatus.includes(st);
            return (
              <button
                key={st}
                onClick={() => toggleStatus(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                  isSelected
                    ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                    : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProposalsFilters;