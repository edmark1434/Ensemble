import React from "react";
import { LayoutGrid, List } from "lucide-react";
import { motion } from "framer-motion";

export type ViewType = "list" | "grid";

interface OrdersListViewTypeProps {
  viewType: ViewType;
  onViewTypeChange: (type: ViewType) => void;
}

export const OrdersListViewType: React.FC<OrdersListViewTypeProps> = ({
  viewType,
  onViewTypeChange,
}) => {
  const options: { type: ViewType; icon: React.ReactNode; label: string }[] = [
    { type: "list", icon: <List className="h-4 w-4" />, label: "List View" },
    { type: "grid", icon: <LayoutGrid className="h-4 w-4" />, label: "Grid View" },
  ];

  return (
    <div className="flex items-center gap-1 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-1 backdrop-blur-sm">
      {options.map((opt) => {
        const isActive = viewType === opt.type;

        return (
          <button
            key={opt.type}
            onClick={() => onViewTypeChange(opt.type)}
            className={`relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${
              isActive ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeOrdersViewType"
                className="absolute inset-0 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{opt.icon}</span>
            <span className="relative z-10 hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default OrdersListViewType;