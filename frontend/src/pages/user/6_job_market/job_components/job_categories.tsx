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
    <div className="rounded-2xl border border-white/10 bg-[#0d0f1a]/60 p-5 backdrop-blur-sm space-y-3">
      <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
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
                  ? "text-blue-400 border border-blue-500/30"
                  : "text-zinc-400 bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white"
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
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/20"
                    : "bg-white/10 text-zinc-400"
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