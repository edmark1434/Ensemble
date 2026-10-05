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

type Sort = "inc" | "dec" | null;

const labelClass = "text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider";
const inputClass =
  "w-full rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-white/[0.04] px-3 py-2 text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition";
const chipBase = "rounded-lg border text-xs font-semibold transition";
const chipActive = "border-blue-500 bg-blue-500 text-white dark:border-blue-500 dark:bg-blue-500/90";
const chipIdle =
  "border-gray-300 dark:border-white/15 bg-white dark:bg-white/[0.04] text-gray-700 dark:text-zinc-300 hover:border-gray-400 dark:hover:border-white/30";

const Section: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="space-y-2.5 pt-4 border-t border-gray-200 dark:border-white/10">{children}</div>
);

const SortToggle: React.FC<{ value: Sort; onChange: (v: Sort) => void; upTitle: string; downTitle: string }> = ({
  value,
  onChange,
  upTitle,
  downTitle,
}) => (
  <div className="flex gap-1">
    {([
      ["inc", upTitle, ArrowUp],
      ["dec", downTitle, ArrowDown],
    ] as const).map(([dir, title, Icon]) => (
      <button
        key={dir}
        type="button"
        title={title}
        aria-pressed={value === dir}
        onClick={() => onChange(value === dir ? null : dir)}
        className={`${chipBase} p-1.5 ${value === dir ? chipActive : chipIdle}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
    ))}
  </div>
);

const JobFilters: React.FC<JobFiltersProps> = ({ filters, setters, onClear }) => {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm dark:shadow-none p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-extrabold text-gray-900 dark:text-white uppercase tracking-[0.15em]">Filter Options</h2>
        <button
          onClick={onClear}
          className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        >
          Reset All
        </button>
      </div>

      <Section>
        <div className="flex items-center justify-between">
          <span className={labelClass}>Price Range (Credits)</span>
          <SortToggle value={filters.priceSort} onChange={setters.setPriceSort} upTitle="Lowest price first" downTitle="Highest price first" />
        </div>
        <div className="flex gap-2">
          <input type="number" placeholder="Min" value={filters.minPrice} onChange={(e) => setters.setMinPrice(e.target.value)} className={inputClass} />
          <input type="number" placeholder="Max" value={filters.maxPrice} onChange={(e) => setters.setMaxPrice(e.target.value)} className={inputClass} />
        </div>
      </Section>

      <Section>
        <span className={`${labelClass} block`}>Difficulty</span>
        <div className="flex flex-wrap gap-1.5">
          {["Beginner", "Intermediate", "Expert"].map((d) => {
            const isSelected = filters.selectedDiffs.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={isSelected}
                onClick={() =>
                  setters.setSelectedDifficulty((prev) =>
                    prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
                  )
                }
                className={`${chipBase} px-2.5 py-1.5 ${isSelected ? chipActive : chipIdle}`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </Section>

      <Section>
        <div className="flex items-center justify-between">
          <span className={labelClass}>Positions Needed</span>
          <SortToggle value={filters.posSort} onChange={setters.setPosSort} upTitle="Fewest positions first" downTitle="Most positions first" />
        </div>
        <input
          type="number"
          placeholder="Exact positions needed"
          value={filters.posValue}
          onChange={(e) => setters.setPosValue(e.target.value)}
          className={inputClass}
        />
      </Section>

      <Section>
        <button type="button" onClick={() => setters.setRatingSort(!filters.ratingSort)} className="w-full flex items-center justify-between">
          <span className={labelClass}>Top Rated First</span>
          <div className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${filters.ratingSort ? "bg-blue-500" : "bg-gray-300 dark:bg-white/20"}`}>
            <div className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${filters.ratingSort ? "translate-x-4" : "translate-x-0"}`} />
          </div>
        </button>
      </Section>
    </div>
  );
};

export default JobFilters;