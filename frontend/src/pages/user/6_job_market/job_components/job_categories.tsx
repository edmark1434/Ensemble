import React from "react";
import { motion } from "framer-motion";

export interface Category {
  label: string;
  count: number;
}

interface JobCategoriesProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

const JobCategories: React.FC<JobCategoriesProps> = ({
  categories,
  activeCategory,
  onCategoryChange
}) => {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm dark:shadow-none p-5 space-y-3">
      <h2 className="text-xs font-extrabold text-gray-900 dark:text-white uppercase tracking-[0.15em]">
        Categories
      </h2>

      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.label;

          return (
            <button
              key={cat.label}
              type="button"
              aria-pressed={isActive}
              onClick={() => onCategoryChange(cat.label)}
              className={`relative flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                isActive
                  ? "border-blue-500 text-white"
                  : "border-gray-300 dark:border-white/15 bg-white dark:bg-white/[0.04] text-gray-700 dark:text-zinc-300 hover:border-gray-400 dark:hover:border-white/30 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeJobCategoryPill"
                  className="absolute inset-0 rounded-full bg-blue-500"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}

              <span className="relative z-10">{cat.label}</span>
              <span
                className={`relative z-10 min-w-[18px] rounded-full px-1.5 text-center text-[10px] font-bold tabular-nums leading-4 ${
                  isActive
                    ? "bg-white/25 text-white"
                    : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-zinc-300"
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default JobCategories;