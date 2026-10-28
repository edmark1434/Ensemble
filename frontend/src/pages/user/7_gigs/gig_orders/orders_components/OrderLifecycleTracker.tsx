import React from "react";
import { Check } from "lucide-react";

export interface OrderLifecycleTrackerProps {
  currentStatus: string;
  className?: string;
  compact?: boolean;
}

export const ORDER_LIFECYCLE_STAGES = [
  {
    step: "01",
    key: "Pending",
    badgeLabel: "PENDING",
    badgeColor: "border-amber-400/70 text-amber-600 dark:text-amber-400 bg-amber-500/10",
    activeRing: "ring-2 ring-amber-500/40 border-amber-500/60 dark:border-amber-400/60",
    title: "Order Submitted",
    description: "Client selected tier, submitted project brief, and answered workflow questions.",
  },
  {
    step: "02",
    key: "Accepted",
    badgeLabel: "ACCEPTED",
    badgeColor: "border-blue-400/70 text-blue-600 dark:text-blue-400 bg-blue-500/10",
    activeRing: "ring-2 ring-blue-500/40 border-blue-500/60 dark:border-blue-400/60",
    title: "Seller Accepted",
    description: "Seller confirmed capacity and timeline. Awaiting client escrow confirmation.",
  },
  {
    step: "03",
    key: "In Contract",
    badgeLabel: "IN CONTRACT",
    badgeColor: "border-purple-400/70 text-purple-600 dark:text-purple-400 bg-purple-500/10",
    activeRing: "ring-2 ring-purple-500/40 border-purple-500/60 dark:border-purple-400/60",
    title: "Escrow & In Contract",
    description: "Escrow deposit secured, active contract established, and production proceeds.",
  },
  {
    step: "04",
    key: "Completed",
    badgeLabel: "COMPLETED",
    badgeColor: "border-emerald-400/70 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    activeRing: "ring-2 ring-emerald-500/40 border-emerald-500/60 dark:border-emerald-400/60",
    title: "Delivered & Completed",
    description: "Deliverables approved by client, contract finalized, and funds released.",
  },
];

export const getOrderStageIndex = (status: string): number => {
  const norm = (status || "").toLowerCase();
  if (norm === "completed" || norm === "done") return 4;
  if (norm === "in contract" || norm === "in_contract") return 3;
  if (norm === "accepted" || norm === "approved") return 2;
  return 1; // Pending
};

export const OrderLifecycleTracker: React.FC<OrderLifecycleTrackerProps> = ({
  currentStatus,
  className = "",
  compact = false,
}) => {
  const isRejected = (currentStatus || "").toLowerCase() === "rejected";
  const isWithdrawn = (currentStatus || "").toLowerCase() === "withdrawn";
  const isCancelled = (currentStatus || "").toLowerCase() === "cancelled";
  const isInactive = isRejected || isWithdrawn || isCancelled;
  const activeStage = getOrderStageIndex(currentStatus);

  return (
    <div className={`space-y-3 font-['Plus_Jakarta_Sans'] ${className}`}>
      {/* 4 Lifecycle Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {ORDER_LIFECYCLE_STAGES.map((stage, idx) => {
          const stepNumber = idx + 1;
          const isCurrent = !isInactive && activeStage === stepNumber;
          const isPast = !isInactive && activeStage > stepNumber;
          const isFuture = !isInactive && activeStage < stepNumber;

          return (
            <div
              key={stage.step}
              className={`rounded-2xl border bg-white dark:bg-dark-surface p-4 transition-all flex flex-col justify-between text-left space-y-3 ${
                isCurrent
                  ? `${stage.activeRing} shadow-md`
                  : isPast
                  ? "border-gray-200 dark:border-white/10 opacity-90"
                  : isFuture
                  ? "border-gray-200/70 dark:border-white/5 opacity-60"
                  : "border-gray-200 dark:border-white/10 opacity-50"
              }`}
            >
              {/* Top Row: Step Number & Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-white/5 text-[11px] font-bold text-gray-700 dark:text-zinc-300">
                    {stage.step}
                  </span>
                  {isPast && (
                    <span className="h-4 w-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>

                <span
                  className={`px-2 py-0.5 rounded-md border text-[10px] font-bold tracking-wider uppercase ${stage.badgeColor}`}
                >
                  {stage.badgeLabel}
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-1">
                <h4
                  className={`text-xs font-bold ${
                    isCurrent
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-700 dark:text-zinc-300"
                  }`}
                >
                  {stage.title}
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                  {stage.description}
                </p>
              </div>

              {/* Bottom Progress Line */}
              <div className="h-1 w-full rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isPast
                      ? "bg-emerald-500 w-full"
                      : isCurrent
                      ? "bg-blue-500 w-full"
                      : "w-0"
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Inactive Alert Banner (if Rejected, Cancelled, Withdrawn) */}
      {isInactive && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/50 dark:bg-rose-500/10 p-3 text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center justify-between">
          <span>
            {isRejected
              ? "This order was declined by the seller."
              : isWithdrawn
              ? "This order was withdrawn by the client."
              : "This order was cancelled."}
          </span>
          <span className="uppercase text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-rose-200/50 dark:bg-rose-500/20">
            {currentStatus}
          </span>
        </div>
      )}
    </div>
  );
};

export default OrderLifecycleTracker;
