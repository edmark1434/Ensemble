import React from "react";

interface Category {
  label: string;
  count: number;
}

interface CategoriesSidebarProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

const CategoriesSidebar: React.FC<CategoriesSidebarProps> = ({
  categories,
  activeCategory,
  onCategoryChange
}) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0f1a]/60 p-5 backdrop-blur-sm">
      <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4">
        Gig Categories
      </h2>
      <div className="space-y-1">
        {categories.map((cat) => (
          <button
            key={cat.label}
            onClick={() => onCategoryChange(cat.label)}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all ${
              activeCategory === cat.label
                ? "bg-blue-500/10 text-blue-400"
                : "text-zinc-400 hover:bg-white/5"
            }`}
          >
            <span>{cat.label}</span>
            <span className="text-[10px] opacity-40 font-mono">{cat.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoriesSidebar;