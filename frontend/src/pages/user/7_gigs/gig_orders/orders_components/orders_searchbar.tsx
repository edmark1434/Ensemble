import React from "react";
import { Search, X } from "lucide-react";

interface OrdersSearchbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const OrdersSearchbar: React.FC<OrdersSearchbarProps> = ({
  searchQuery,
  setSearchQuery,
}) => {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center w-full">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-zinc-500" />
        <input
          type="text"
          placeholder="Search orders by gig title, client name, or pitch keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 pl-11 pr-10 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default OrdersSearchbar;