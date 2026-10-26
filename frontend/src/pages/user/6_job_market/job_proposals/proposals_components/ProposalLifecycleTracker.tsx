import React from "react";
import { Check } from "lucide-react";

export interface ProposalLifecycleTrackerProps {
  currentStatus: string;
  className?: string;
  compact?: boolean;
}

export const LIFECYCLE_STAGES = [
  {
    step: "01",
    key: "Pending",
    badgeLabel: "PENDING",
    badgeColor: "border-amber-400/70 text-amber-600 dark:text-amber-400 bg-amber-500/10",
    activeRing: "ring-2 ring-amber-500/40 border-amber-500/60 dark:border-amber-400/60",
    title: "Discovery & Proposal Pitch",
    description: "Freelancers submit their bid, cover letter, and proposed milestones within the client's budget.",
  },
  {
    step: "02",
    key: "Shortlisted",
    badgeLabel: "SHORTLISTED",
    badgeColor: "border-blue-400/70 text-blue-600 dark:text-blue-400 bg-blue-500/10",
    activeRing: "ring-2 ring-blue-500/40 border-blue-500/60 dark:border-blue-400/60",
    title: "Evaluation & Shortlisting",
    description: "Clients review applicants, inspect past work samples, and shortlist top contenders.",
  },
  {
    step: "03",
    key: "Accepted",
    badgeLabel: "OFFER SENT",
    badgeColor: "border-emerald-400/70 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    activeRing: "ring-2 ring-emerald-500/40 border-emerald-500/60 dark:border-emerald-400/60",
    title: "Extend Formal Offer",
    description: "Client extends a formal contract offer with escrow locked upfront. Awaiting candidate signature and acceptance.",
  },
  {
    step: "04",
    key: "Hired",
    badgeLabel: "HIRED",
    badgeColor: "border-purple-400/70 text-purple-600 dark:text-purple-400 bg-purple-500/10",
    activeRing: "ring-2 ring-purple-500/40 border-purple-500/60 dark:border-purple-400/60",
    title: "Escrow & Contract Hired",
    description: "Escrow deposit is secured, an active contract is formed, and progress begins in the Delivery Dashboard.",
  },
];

export const getStageIndex = (status: string): number => {
  const norm = (status || "").toLowerCase();
  if (norm === "hired") return 4;
  if (norm === "accepted" || norm === "approved") return 3;
  if (norm === "shortlisted") return 2;
  return 1; // Pending or default
};

export const ProposalLifecycleTracker: React.FC<ProposalLifecycleTrackerProps> = ({
  currentStatus,
  className = "",
  compact = false,
}) => {
  const isRejected = (currentStatus || "").toLowerCase() === "rejected";
  const isWithdrawn = (currentStatus || "").toLowerCase() === "withdrawn";
  const isArchived = ["archived", "closed"].includes((currentStatus || "").toLowerCase());
  const isInactive = isRejected || isWithdrawn || isArchived;
  const activeStage = getStageIndex(currentStatus);

  return (
    <div className={`space-y-3 font-['Plus_Jakarta_Sans'] ${className}`}>
      {/* 4 Lifecycle Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {LIFECYCLE_STAGES.map((stage, idx) => {
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
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${stage.badgeColor}`}
                >
                  {stage.badgeLabel}
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-snug">
                  {stage.title}
                </h4>
                {!compact && (
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed line-clamp-3">
                    {stage.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProposalLifecycleTracker;
