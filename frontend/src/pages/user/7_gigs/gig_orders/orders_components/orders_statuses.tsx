import React from "react";
import { Clock, UserCheck, CheckCircle2, XCircle, Layers } from "lucide-react";
import { motion } from "framer-motion";
import type { OrderStatus } from "./orders_list";

export interface StatusFilterItem {
  label: "All" | OrderStatus;
  count: number;
}

interface OrdersStatusesProps {
  statuses: StatusFilterItem[];
  activeStatus: "All" | OrderStatus;
  onStatusChange: (status: "All" | OrderStatus) => void;
}

const getStatusIcon = (label: string, isActive: boolean) => {
  const defaultClass = isActive ? "" : "text-gray-500 dark:text-zinc-500 opacity-60";
  switch (label) {
    case "Pending":
      return <Clock className={`h-3.5 w-3.5 transition-colors ${isActive ? "text-yellow-400" : defaultClass}`} />;
    case "Shortlisted":
      return <UserCheck className={`h-3.5 w-3.5 transition-colors ${isActive ? "text-blue-400" : defaultClass}`} />;
    case "Accepted":
      return <CheckCircle2 className={`h-3.5 w-3.5 transition-colors ${isActive ? "text-emerald-400" : defaultClass}`} />;
    case "Rejected":
      return <XCircle className={`h-3.5 w-3.5 transition-colors ${isActive ? "text-red-400" : defaultClass}`} />;
    default:
      return <Layers className={`h-3.5 w-3.5 transition-colors ${isActive ? "text-gray-500 dark:text-zinc-400" : defaultClass}`} />;
  }
};

export const OrdersStatuses: React.FC<OrdersStatusesProps> = ({
  statuses,
  activeStatus,
  onStatusChange,
}) => {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 backdrop-blur-sm space-y-3 text-left">
      <h3 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
        Order Statuses
      </h3>
      <div className="flex flex-col gap-1.5">
        {statuses.map((st) => {
          const isActive = activeStatus === st.label;
          const isDisabled = st.count === 0 && !isActive;

          return (
            <button
              key={st.label}
              disabled={isDisabled}
              onClick={() => !isDisabled && onStatusChange(st.label)}
              className={`relative flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors duration-200 ${
                isDisabled ? "opacity-50 cursor-not-allowed" : ""
              } ${
                isActive
                  ? "text-gray-900 dark:text-white"
                  : isDisabled
                    ? "text-gray-400 dark:text-zinc-500"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 shadow-sm dark:shadow-none"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeStatusGlow"
                  className="absolute inset-0 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}

              <div className="relative z-10 flex items-center gap-2">
                {getStatusIcon(st.label, isActive)}
                <span>{st.label}</span>
              </div>

              <span
                className={`relative z-10 text-[10px] font-mono px-2 py-0.5 rounded-md ${
                  isActive
                    ? "bg-gray-200 dark:bg-white/20 text-gray-900 dark:text-white border border-gray-300 dark:border-white/30"
                    : "bg-white dark:bg-white/5 shadow-sm dark:shadow-none text-gray-500 dark:text-zinc-500 border border-gray-100 dark:border-white/5"
                }`}
              >
                {st.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OrdersStatuses;