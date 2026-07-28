import React from "react";

export interface CategoryItem {
  label: string;
  count: number;
}

interface ProposalsCategoriesProps {
  categories: CategoryItem[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export const ProposalsCategories: React.FC<ProposalsCategoriesProps> = ({
  categories,
  activeCategory,
  onCategoryChange,
}) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0f1a]/80 p-5 backdrop-blur-sm space-y-3 text-left">
      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
        Proposal Categories
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.label;
          return (
            <button
              key={cat.label}
              onClick={() => onCategoryChange(cat.label)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? "bg-white/20 text-white" : "bg-white/5 text-zinc-500"
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

export default ProposalsCategories;