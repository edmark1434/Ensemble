import React from "react";
import { motion } from "framer-motion";

export interface Category {
  label: string;
  count: number;
}

interface GigCategoriesProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

const GigCategories: React.FC<GigCategoriesProps> = ({
  categories,
  activeCategory,
  onCategoryChange
}) => {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/60 shadow-sm dark:shadow-none p-5 backdrop-blur-sm space-y-3">
      <h2 className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-[0.2em]">
        Categories
      </h2>

      {/* Horizontal wrapping pill collection */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.label;

          return (
            <button
              key={cat.label}
              onClick={() => onCategoryChange(cat.label)}
              className={`relative flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200 focus:outline-none ${
                isActive
                  ? "text-blue-600 dark:text-blue-400 border border-blue-500/30 bg-blue-50 dark:bg-transparent"
                  : "text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {/* Smooth Animated Background Pill indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeCategoryPill"
                  className="absolute inset-0 rounded-full bg-blue-500/15"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}

              <span className="relative z-10">{cat.label}</span>
              <span
                className={`relative z-10 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
                  isActive
                    ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20"
                    : "bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-zinc-400"
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

export default GigCategories;