import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Percent,
  RefreshCcw,
  Clock,
  Calendar,
  Star,
  ChevronRight,
  Edit2,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import type { ViewType } from "./proposals_list_viewtype";
import { CreditIcon } from "@/components/ui/credit-icon";
import { JobRichText } from "../../job_components/JobRichText";

export type ProposalStatus = "Pending" | "Shortlisted" | "Accepted" | "Rejected";

export interface ProposalItemData {
  id: string;
  jobId: string;
  contractId?: string;
  jobTitle: string;
  partyName: string;
  clientAccountId?: string;
  freelancerAccountId?: string;
  clientName?: string;
  clientAvatar?: string;
  partyAvatar?: string;
  freelancerName?: string;
  freelancerAvatar?: string;
  rating?: number;
  bidAmount: number;
  additionalWorkRate: number;
  coverLetter: string;
  tosContent: string;
  tosTitle?: string;
  tosDescription?: string;
  submittedAt: string;
  submittedAgo?: string;
  jobPostedAt?: string;
  jobStatus?: string;
  jobDeletedAt?: string;
  updatedAt?: string;
  updatedAgo?: string;
  status: ProposalStatus | string;
  type: "incoming" | "sent";
  rejectionReason?: string;
  milestones: {
    id: string;
    name: string;
    description: string;
    hours: number;
    revisions: number;
  }[];
}

interface ProposalsListProps {
  proposals: ProposalItemData[];
  loading?: boolean;
  viewType?: ViewType;
}

export const ProposalCardSkeleton: React.FC<{ viewType?: ViewType }> = ({
  viewType = "list",
}) => {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 animate-pulse space-y-4">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-white/10" />
          <div className="space-y-1.5">
            <div className="h-4 w-28 rounded bg-gray-100 dark:bg-white/10" />
            <div className="h-3 w-40 rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
          </div>
        </div>
        <div className="h-6 w-16 rounded-full bg-gray-100 dark:bg-white/10" />
      </div>

      {/* Bid Banner Skeleton */}
      <div className="h-11 w-full rounded-xl bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />

      {/* Pitch Skeleton */}
      <div className="space-y-1.5">
        <div className="h-3.5 w-full rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
        <div className="h-3.5 w-4/5 rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
      </div>

      {/* Pills Skeleton */}
      <div className="flex gap-2 pt-1">
        <div className="h-6 w-24 rounded-md bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
        <div className="h-6 w-24 rounded-md bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
        <div className="h-6 w-24 rounded-md bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
      </div>

      {/* Footer Skeleton */}
      <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
        <div className="h-3 w-36 rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
        <div className="h-3 w-16 rounded bg-gray-100 dark:bg-white/10" />
      </div>
    </div>
  );
};

export const ProposalsList: React.FC<ProposalsListProps> = ({
  proposals,
  loading = false,
  viewType = "list",
}) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div
        className={
          viewType === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-3.5"
        }
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <ProposalCardSkeleton key={i} viewType={viewType} />
        ))}
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm dark:shadow-none p-12 text-center">
        <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium">No proposals found matching your criteria.</p>
      </div>
    );
  }

  const renderStatusBadge = (status: ProposalStatus | string) => {
    switch (status) {
      case "Accepted":
      case "Hired":
        return "bg-emerald-100 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400";
      case "Approved":
      case "Shortlisted":
        return "bg-blue-100 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400";
      case "Rejected":
        return "bg-red-100 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400";
      default:
        return "bg-yellow-100 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30 text-yellow-600 dark:text-yellow-400";
    }
  };

  return (
    <motion.div
      layout
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={
        viewType === "grid"
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          : "space-y-3.5"
      }
    >
      <AnimatePresence mode="popLayout">
        {proposals.map((item) => {
          // Revisions summary calculation
          const revisionsArr = item.milestones.map((m) => m.revisions);
          const minRev = revisionsArr.length ? Math.min(...revisionsArr) : 0;
          const maxRev = revisionsArr.length ? Math.max(...revisionsArr) : 0;
          const revisionsSummary =
            minRev === maxRev ? `${minRev}` : `${minRev}-${maxRev}`;

          // Estimated total time calculation
          const totalHours = item.milestones.reduce((acc, m) => acc + m.hours, 0);
          const totalDays = Math.ceil(totalHours / 8) || 1;

          return (
            <motion.div
              layout
              key={item.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={() =>
                navigate(
                  item.type === "incoming"
                    ? `/jobs/proposals/received/${item.id}`
                    : `/jobs/proposals/sent/${item.id}`
                )
              }
              className="group rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 backdrop-blur-sm shadow-xl hover:border-white/20 cursor-pointer transition-all duration-200 text-left space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3.5">
                {/* 1. User Header & Clickable Target Job Post Link */}
                <div className={`flex ${viewType === "grid" ? "flex-col-reverse gap-3" : "items-start justify-between gap-3"} border-b border-gray-100 dark:border-white/5 pb-3`}>
                  <div className="flex items-center gap-3 min-w-0 w-full">
                    <div className="h-9 w-9 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-bold shrink-0 overflow-hidden">
                      {item.partyAvatar ? (
                        <img src={item.partyAvatar} alt={item.partyName} className="w-full h-full object-cover" />
                      ) : (
                        item.partyName[0]
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-400 transition-colors truncate">
                          {item.partyName}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400 shrink-0">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          <span className="font-bold text-gray-700 dark:text-zinc-200">
                            {item.rating ? item.rating.toFixed(1) : "5.0"}
                          </span>
                        </div>
                      </div>

                      {/* Clickable Job Post Title */}
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400 truncate">
                        <span>Job:</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/jobs/postings/${item.jobId}`);
                          }}
                          className="font-medium text-gray-600 dark:text-zinc-300 hover:text-blue-400 hover:underline transition-colors truncate flex items-center gap-1 inline-flex"
                          title="View Job Post Details"
                        >
                          <span className="truncate">{item.jobTitle}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Badges & Actions */}
                  <div className={`flex items-center gap-2 shrink-0 ${viewType === "grid" ? "w-full justify-between" : ""}`}>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${renderStatusBadge(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Chat Button for Shortlisted Candidates */}
                      {item.status === "Shortlisted" && (
                        <button
                          title="Open Discussion Chat"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/inbox?user=${encodeURIComponent(item.partyName)}`);
                          }}
                          className="p-1.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors border border-blue-500/30"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {/* Edit Button for Own Proposals */}
                      {item.type === "sent" && item.status === "Pending" && (
                        <button
                          title="Edit Proposal"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/jobs/proposals/edit/${item.id}`);
                          }}
                          className="p-1.5 rounded-full bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white transition-colors border border-gray-200 dark:border-white/10"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Prominent Emphasized Bid Banner */}
                <div className={`p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 flex items-center ${viewType === "grid" ? "justify-between" : "justify-start gap-4"}`}>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                    PROPOSED BID
                  </span>
                  <div className="flex items-center gap-1.5 text-yellow-500">
                    <CreditIcon className="h-5 w-5 text-yellow-500 shrink-0" />
                    <span className="text-lg font-black tracking-tight">
                      {item.bidAmount.toLocaleString()}
                    </span>
                  </div>
                  {viewType === "list" && (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800/80 text-gray-600 dark:text-zinc-300 text-[10px] font-semibold">
                        <Layers className="h-3 w-3 text-gray-500 dark:text-zinc-400" />
                        {item.milestones.length} Milestones
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800/80 text-gray-600 dark:text-zinc-300 text-[10px] font-semibold">
                        <Percent className="h-3 w-3 text-gray-500 dark:text-zinc-400" />
                        +{item.additionalWorkRate}% Work Rate
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800/80 text-gray-600 dark:text-zinc-300 text-[10px] font-semibold">
                        <RefreshCcw className="h-3 w-3 text-gray-500 dark:text-zinc-400" />
                        {revisionsSummary} Revs / Step
                      </span>
                    </div>
                  )}
                </div>

                {/* 3. Cover Letter Pitch Snippet */}
                {viewType === "list" && (
                  <div className="px-1 text-gray-600 dark:text-zinc-300 italic">
                    <JobRichText content={item.coverLetter} truncate={2} />
                  </div>
                )}

                {/* 4. Sleek Gray Pill Tags (Grid View only, since List View has them in the bid banner) */}
                {viewType === "grid" && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-zinc-800/80 text-gray-600 dark:text-zinc-300 text-[10px] font-semibold" title={`${item.milestones.length} Milestones`}>
                      <Layers className="h-3 w-3 text-gray-500 dark:text-zinc-400" />
                      {item.milestones.length}
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-zinc-800/80 text-gray-600 dark:text-zinc-300 text-[10px] font-semibold" title={`+${item.additionalWorkRate}% Work Rate`}>
                      <Percent className="h-3 w-3 text-gray-500 dark:text-zinc-400" />
                      +{item.additionalWorkRate}%
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-zinc-800/80 text-gray-600 dark:text-zinc-300 text-[10px] font-semibold" title={`${revisionsSummary} Revs / Step`}>
                      <RefreshCcw className="h-3 w-3 text-gray-500 dark:text-zinc-400" />
                      {revisionsSummary}
                    </span>
                  </div>
                )}
              </div>

              {/* 5. Date Proposed & View Details Link */}
              <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-zinc-400">
                <span className="flex items-center gap-1 text-gray-500 dark:text-zinc-400">
                  <Clock className="h-3 w-3 text-gray-500 dark:text-zinc-500 shrink-0" />
                  {totalDays}d ({totalHours}h) 
                  {viewType === "list" && (
                    <>
                      • <Calendar className="h-3 w-3 text-gray-500 dark:text-zinc-500 inline ml-0.5" /> {item.submittedAgo || item.submittedAt}
                    </>
                  )}
                </span>

                <span className="flex items-center gap-1 text-xs font-bold text-blue-400 group-hover:translate-x-1 transition-transform shrink-0">
                  Details <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProposalsList;