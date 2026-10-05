import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

export interface GigFilterState {
  minPrice: string;
  maxPrice: string;
  priceSort: "inc" | "dec" | null;
  tiersCount: string;
  tiersSort: "inc" | "dec" | null;
  dateSort: "inc" | "dec" | null;
  deliverySort: "inc" | "dec" | null;
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
  setDeliverySort: (v: "inc" | "dec" | null) => void;
  setRevisions: (v: string) => void;
  setDeliveryDays: (v: string) => void;
  setRatingSort: (v: boolean) => void;
}

interface GigBudgetMatch {
  credits: number | null;
  profileCredits: number | null;
  enabled: boolean;
  onToggle: () => void;
  onChange: (value: number) => void;
  nearRatio: number;
}

interface GigFiltersProps {
  filters: GigFilterState;
  setters: GigFilterSetters;
  onClear: () => void;
  budget?: GigBudgetMatch;
}

const BUDGET_SLIDER_MAX = 50000;
const BUDGET_SLIDER_STEP = 250;

const formatCompact = (value: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value).toLowerCase();

type Sort = "inc" | "dec" | null;

const labelClass = "text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider";
const hintClass = "text-[11px] leading-snug text-gray-500 dark:text-zinc-400";
const inputClass =
  "w-full rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-white/[0.04] px-3 py-2 text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition";
const chipBase = "rounded-lg border text-xs font-semibold transition";
const chipActive = "border-blue-500 bg-blue-500 text-white dark:border-blue-500 dark:bg-blue-500/90";
const chipIdle =
  "border-gray-300 dark:border-white/15 bg-white dark:bg-white/[0.04] text-gray-700 dark:text-zinc-300 hover:border-gray-400 dark:hover:border-white/30";

const Section: React.FC<{ children: React.ReactNode; first?: boolean }> = ({ children, first }) => (
  <div className={`space-y-2.5 ${first ? "" : "pt-4 border-t border-gray-200 dark:border-white/10"}`}>{children}</div>
);

const Switch: React.FC<{ on: boolean }> = ({ on }) => (
  <div className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${on ? "bg-blue-500" : "bg-gray-300 dark:bg-white/20"}`}>
    <div className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${on ? "translate-x-4" : "translate-x-0"}`} />
  </div>
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

const GigFilters: React.FC<GigFiltersProps> = ({ filters, setters, onClear, budget }) => {
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
        {budget && budget.credits !== null ? (
          <>
            <button type="button" onClick={budget.onToggle} className="w-full flex items-center justify-between">
              <span className={labelClass}>Match My Budget</span>
              <Switch on={budget.enabled} />
            </button>
            <p className={hintClass}>
              Services starting at or up to {Math.round((budget.nearRatio - 1) * 100)}% above your budget. Ones within budget show first.
            </p>
            {budget.enabled && (
              <div className="space-y-2.5 pt-1">
                <div>
                  <input
                    type="range"
                    min={0}
                    max={BUDGET_SLIDER_MAX}
                    step={BUDGET_SLIDER_STEP}
                    value={Math.min(budget.credits, BUDGET_SLIDER_MAX)}
                    onChange={(e) => budget.onChange(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[10px] font-medium text-gray-500 dark:text-zinc-400">
                    <span>0</span>
                    <span>{formatCompact(BUDGET_SLIDER_MAX)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] px-2.5 py-2">
                    <div className="text-[10px] font-medium text-gray-500 dark:text-zinc-400">Profile budget</div>
                    <div className="text-xs font-bold tabular-nums text-gray-900 dark:text-white">
                      {budget.profileCredits !== null ? `${formatCompact(budget.profileCredits)} credits` : "Not set"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-2">
                    <div className="text-[10px] font-medium text-blue-600/80 dark:text-blue-300/80">Adjusted</div>
                    <div className="text-xs font-bold tabular-nums text-blue-700 dark:text-blue-300">{formatCompact(budget.credits)} credits</div>
                  </div>
                </div>
                {budget.profileCredits !== null && budget.credits !== budget.profileCredits && (
                  <button
                    type="button"
                    onClick={() => budget.onChange(budget.profileCredits as number)}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Use profile budget
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <p className={hintClass}>Set a budget on your profile to see services that fit it.</p>
        )}
      </Section>

      <Section>
        <div className="flex items-center justify-between">
          <span className={labelClass}>Date Posted</span>
          <SortToggle value={filters.dateSort} onChange={setters.setDateSort} upTitle="Oldest first" downTitle="Newest first" />
        </div>
      </Section>

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
        <span className={`${labelClass} block`}>Number of Tiers</span>
        <div className="flex gap-2">
          {["1", "2", "3"].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setters.setTiersCount(filters.tiersCount === num ? "" : num)}
              className={`${chipBase} flex-1 py-2 ${filters.tiersCount === num ? chipActive : chipIdle}`}
            >
              {num}
            </button>
          ))}
        </div>
      </Section>

      <Section>
        <span className={`${labelClass} block`}>Min Revisions</span>
        <input
          type="number"
          placeholder="Minimum revisions included"
          min="0"
          value={filters.revisions}
          onChange={(e) => setters.setRevisions(e.target.value)}
          className={inputClass}
        />
      </Section>

      <Section>
        <div className="flex items-center justify-between">
          <span className={labelClass}>Days of Delivery</span>
          <SortToggle value={filters.deliverySort} onChange={setters.setDeliverySort} upTitle="Fastest first" downTitle="Slowest first" />
        </div>
        <input
          type="number"
          placeholder="Maximum days to deliver"
          min="1"
          value={filters.deliveryDays}
          onChange={(e) => setters.setDeliveryDays(e.target.value)}
          className={inputClass}
        />
      </Section>

      <Section>
        <button type="button" onClick={() => setters.setRatingSort(!filters.ratingSort)} className="w-full flex items-center justify-between">
          <span className={labelClass}>Top Rated First</span>
          <Switch on={filters.ratingSort} />
        </button>
      </Section>
    </div>
  );
};

export default GigFilters;