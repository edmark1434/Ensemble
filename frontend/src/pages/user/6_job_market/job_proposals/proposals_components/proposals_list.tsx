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
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import type { ViewType } from "./proposals_list_viewtype";
import { CreditIcon } from "@/components/ui/credit-icon";
import { JobRichText } from "../../job_components/JobRichText";
import { openMarketplaceConversation } from "@/components/ui/inbox/marketplace_conversation";
import { getFallbackAvatarUrl } from "@/lib/accountAvatars";

export type ProposalStatus = "Pending" | "Shortlisted" | "Accepted" | "Rejected" | "Hired" | "Withdrawn" | "Archived" | "Approved";

export interface ProposalItemData {
  id: string;
  jobId: string;
  contractId?: string;
  jobTitle: string;
  jobBanner?: string;
  partyName: string;
  clientAccountId?: string;
  freelancerAccountId?: string;
  clientTeamId?: string;
  freelancerTeamId?: string;
  clientTeamVisibility?: string;
  freelancerTeamVisibility?: string;
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
  totalApplicants?: number;
  avgBid?: number;
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
  jobDescription?: string;
  jobHiringType?: string;
  job_milestone_id?: string;
  target_milestone_tasks?: string[];
  target_milestone_title?: string;
  target_milestone_description?: string;
  target_milestone_budget?: number;
  target_milestone_slots?: number;
  viewedAt?: string | null;
  shortlistedAt?: string | null;
  actingTeamId?: string;
  screeningAnswers?: any[];
  attachments?: any[];
  milestones: {
    id: string;
    name: string;
    description: string;
    hours: number;
    revisions: number;
  }[];
}

export interface ProposalsListProps {
  proposals: ProposalItemData[];
  loading?: boolean;
  viewType?: ViewType;
  showFilters?: boolean;
  onUpdateStatus?: (id: string, newStatus: ProposalStatus, reason?: string) => void | Promise<void>;
}

export const ProposalCardSkeleton: React.FC<{ viewType?: ViewType; showFilters?: boolean }> = ({
  viewType = "list",
}) => {
  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 animate-pulse ${
      viewType === "list" ? "flex flex-col lg:flex-row lg:items-center justify-between gap-5" : "space-y-4"
    }`}>
      <div className="space-y-3 flex-1">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-white/10 shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-white/10" />
            <div className="h-3 w-44 rounded bg-gray-100 dark:bg-white/5" />
          </div>
        </div>
        <div className="h-3.5 w-full rounded bg-gray-100 dark:bg-white/5" />
        <div className="h-3.5 w-3/4 rounded bg-gray-100 dark:bg-white/5" />
      </div>

      <div className={viewType === "list" ? "w-64 space-y-2 shrink-0" : "h-12 w-full rounded-xl bg-gray-100 dark:bg-white/5"} />
    </div>
  );
};

export const ProposalsList: React.FC<ProposalsListProps> = ({
  proposals,
  loading = false,
  viewType = "list",
  showFilters = true,
  onUpdateStatus,
}) => {
  const navigate = useNavigate();

  const gridColsClass = showFilters
    ? "grid-cols-1 md:grid-cols-2"
    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

  if (loading) {
    return (
      <div
        className={
          viewType === "grid"
            ? `grid ${gridColsClass} gap-4`
            : "space-y-3.5"
        }
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <ProposalCardSkeleton key={i} viewType={viewType} showFilters={showFilters} />
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
      case "Hired":
        return "border-purple-400/70 text-purple-600 dark:text-purple-400 bg-purple-500/10";
      case "Accepted":
      case "Approved":
      case "approved":
        return "border-emerald-400/70 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10";
      case "Shortlisted":
        return "border-blue-400/70 text-blue-600 dark:text-blue-400 bg-blue-500/10";
      case "Rejected":
        return "border-red-400/70 text-red-600 dark:text-red-400 bg-red-500/10";
      case "Withdrawn":
      case "Archived":
        return "border-gray-300 dark:border-white/20 text-gray-600 dark:text-zinc-400 bg-gray-100 dark:bg-white/5";
      default:
        return "border-amber-400/70 text-amber-600 dark:text-amber-400 bg-amber-500/10";
    }
  };

  const formatStatusText = (status: ProposalStatus | string) => {
    switch (status) {
      case "Hired":
        return "HIRED";
      case "Accepted":
      case "Approved":
      case "approved":
        return "ACCEPTED";
      case "Shortlisted":
        return "SHORTLISTED";
      case "Rejected":
        return "REJECTED";
      case "Withdrawn":
      case "Archived":
        return "WITHDRAWN";
      default:
        return "PENDING";
    }
  };

  return (
    <motion.div
      layout
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={
        viewType === "grid"
          ? `grid ${gridColsClass} gap-4`
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

          const isHired = item.status === "Hired" || item.status === "Accepted";
          const isShortlisted = item.status === "Shortlisted";

          if (viewType === "list") {
            return (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={() =>
                  navigate(
                    item.type === "incoming"
                      ? `/jobs/proposals/received/${item.id}`
                      : `/jobs/proposals/sent/${item.id}`
                  )
                }
                className="group rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 backdrop-blur-sm shadow-sm hover:border-blue-500/30 hover:shadow-md cursor-pointer transition-all duration-200 text-left flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                {/* Left Column: Applicant + Role + Pitch */}
                <div className="space-y-3 min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 dark:text-blue-400 text-sm font-bold shrink-0 overflow-hidden">
                      {item.partyAvatar ? (
                        <img src={item.partyAvatar} alt={item.partyName} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getFallbackAvatarUrl(item.partyName); }} className="w-full h-full object-cover" />
                      ) : (
                        item.partyName[0]
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors truncate">
                          {item.partyName}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400 shrink-0">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          <span className="font-bold text-gray-700 dark:text-zinc-200">
                            {item.rating != null ? Number(item.rating).toFixed(1) : "5.0"}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${renderStatusBadge(
                            item.status
                          )}`}
                        >
                          {formatStatusText(item.status)}
                        </span>
                      </div>

                      {item.target_milestone_title ? (
                        <div className="pt-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 truncate max-w-[320px]" title={item.target_milestone_title}>
                            <span className="opacity-70 text-[10px]">Role:</span>
                            <span className="font-semibold truncate">{item.target_milestone_title}</span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400 truncate pt-0.5">
                          <span>For:</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/jobs/postings/${item.jobId}`);
                            }}
                            className="font-medium text-gray-600 dark:text-zinc-300 hover:text-blue-400 hover:underline transition-colors truncate inline-flex items-center gap-1"
                            title="View Job Post Details"
                          >
                            <span className="truncate">{item.jobTitle}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed line-clamp-2 max-w-2xl">
                    <JobRichText content={item.coverLetter} truncate={2} />
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 inline text-gray-400" />
                      {item.submittedAgo || item.submittedAt}
                    </span>
                  </div>

                  {item.type === "sent" && (
                    <div className="pt-2 mt-1 border-t border-gray-100 dark:border-white/5">
                      <div className="flex items-center text-[10px] sm:text-[11px] gap-1 sm:gap-1.5 flex-wrap">
                        <span className={`flex items-center gap-1 font-semibold ${item.status ? "text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-zinc-500"}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" /> 01 PENDING
                        </span>
                        <div className={`h-0.5 w-3 sm:w-4 rounded-full ${item.shortlistedAt || item.status === "Shortlisted" || item.status === "Accepted" || item.status === "Approved" || item.status === "Hired" ? "bg-blue-500/40" : "bg-gray-200 dark:bg-white/10"}`} />
                        <span className={`flex items-center gap-1 font-semibold ${item.shortlistedAt || item.status === "Shortlisted" || item.status === "Accepted" || item.status === "Approved" || item.status === "Hired" ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-zinc-500"}`}>
                          <Star className={`w-2.5 h-2.5 shrink-0 ${item.shortlistedAt || item.status === "Shortlisted" ? "fill-blue-500 text-blue-500" : ""}`} /> 02 SHORTLISTED
                        </span>
                        <div className={`h-0.5 w-3 sm:w-4 rounded-full ${item.status === "Accepted" || item.status === "Approved" || item.status === "Hired" ? "bg-emerald-500/40" : "bg-gray-200 dark:bg-white/10"}`} />
                        <span className={`flex items-center gap-1 font-semibold ${item.status === "Accepted" || item.status === "Approved" || item.status === "Hired" ? "text-emerald-600 dark:text-emerald-400" : item.status === "Rejected" ? "text-red-500" : "text-gray-400 dark:text-zinc-500"}`}>
                          <CheckCircle2 className="w-2.5 h-2.5 shrink-0" /> 03 ACCEPTED
                        </span>
                        <div className={`h-0.5 w-3 sm:w-4 rounded-full ${item.status === "Hired" ? "bg-purple-500/40" : "bg-gray-200 dark:bg-white/10"}`} />
                        <span className={`flex items-center gap-1 font-semibold ${item.status === "Hired" ? "text-purple-600 dark:text-purple-400" : "text-gray-400 dark:text-zinc-500"}`}>
                          <CheckCircle2 className="w-2.5 h-2.5 shrink-0" /> 04 HIRED
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Bid + Specs + Actions */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4 shrink-0 lg:pl-6 lg:border-l border-gray-100 dark:border-white/5">
                  <div className="text-left sm:text-right lg:text-right space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block">
                      {item.target_milestone_title ? "Fixed Budget" : "Proposed Bid"}
                    </span>
                    <div className="flex items-center sm:justify-end gap-1.5 text-amber-500 dark:text-amber-400">
                      <CreditIcon className="h-4 w-4 shrink-0" />
                      <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
                        {item.bidAmount.toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                        Credits
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-zinc-400">
                      <span>~{totalDays}d ({totalHours}h)</span>
                      <span className="text-gray-300 dark:text-zinc-700">•</span>
                      <span>{item.milestones.length || 1} {item.milestones.length === 1 ? "Step" : "Steps"}</span>
                      <span className="text-gray-300 dark:text-zinc-700">•</span>
                      <span>{revisionsSummary} {revisionsSummary === "1" ? "Rev" : "Revs"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Chat button */}
                    <button
                      type="button"
                      title="Chat with Candidate"
                      onClick={(e) => {
                        e.stopPropagation();
                        void openMarketplaceConversation({
                          contextType: "job_proposal",
                          contextId: item.id,
                          navigate,
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-semibold text-gray-700 dark:text-zinc-200 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                      <span>Chat</span>
                    </button>

                    {/* Shortlist */}
                    {item.type === "incoming" && !isHired && (
                      <button
                        type="button"
                        title={isShortlisted ? "Remove from Shortlist" : "Save to Shortlist"}
                        onClick={async (e) => {
                          e.stopPropagation();
                          const nextStatus = isShortlisted ? "Pending" : "Shortlisted";
                          try {
                            await onUpdateStatus?.(item.id, nextStatus as ProposalStatus);
                            toast.success(nextStatus === "Shortlisted" ? "Added to shortlist!" : "Removed from shortlist.");
                          } catch {
                            toast.error("Failed to update status");
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border cursor-pointer ${
                          isShortlisted
                            ? "bg-amber-500/15 text-amber-500 border-amber-500/30 hover:bg-amber-500/25"
                            : "bg-white dark:bg-white/5 text-gray-600 dark:text-zinc-300 border-gray-200 dark:border-white/10 hover:border-amber-500/40 hover:text-amber-500"
                        }`}
                      >
                        <Star className={`h-3.5 w-3.5 ${isShortlisted ? "fill-amber-500 text-amber-500" : ""}`} />
                        <span>{isShortlisted ? "Shortlisted" : "Shortlist"}</span>
                      </button>
                    )}

                    {/* Primary Action Button */}
                    {item.type === "incoming" && (
                      isHired ? (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Hired</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/jobs/proposals/received/${item.id}`);
                          }}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <span>{item.target_milestone_title ? "Slot & Hire" : "Hire Candidate"}</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      )
                    )}

                    {/* Edit for sent proposals */}
                    {item.type === "sent" && item.status === "Pending" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/jobs/proposals/edit/${item.id}`);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-semibold text-gray-700 dark:text-zinc-200 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                    )}

                    {/* Details button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(
                          item.type === "incoming"
                            ? `/jobs/proposals/received/${item.id}`
                            : `/jobs/proposals/sent/${item.id}`
                        );
                      }}
                      className="p-1.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer"
                      title="View Proposal Details"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          }

          // Grid View
          return (
            <motion.div
              layout
              key={item.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={() =>
                navigate(
                  item.type === "incoming"
                    ? `/jobs/proposals/received/${item.id}`
                    : `/jobs/proposals/sent/${item.id}`
                )
              }
              className="group rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 backdrop-blur-sm shadow-sm hover:border-blue-500/30 hover:shadow-md cursor-pointer transition-all duration-200 text-left flex flex-col justify-between gap-4"
            >
              <div className="space-y-3.5">
                {/* 1. Header Row */}
                <div className="flex items-start justify-between gap-3 border-b border-gray-100 dark:border-white/5 pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 dark:text-blue-400 text-sm font-bold shrink-0 overflow-hidden">
                      {item.partyAvatar ? (
                        <img src={item.partyAvatar} alt={item.partyName} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getFallbackAvatarUrl(item.partyName); }} className="w-full h-full object-cover" />
                      ) : (
                        item.partyName[0]
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors truncate">
                          {item.partyName}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400 shrink-0">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          <span className="font-bold text-gray-700 dark:text-zinc-200">
                            {item.rating != null ? Number(item.rating).toFixed(1) : "5.0"}
                          </span>
                        </div>
                      </div>

                      {item.target_milestone_title ? (
                        <div className="pt-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 truncate max-w-[200px]" title={item.target_milestone_title}>
                            <span className="opacity-70 text-[10px]">Role:</span>
                            <span className="font-semibold truncate">{item.target_milestone_title}</span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400 truncate pt-0.5">
                          <span>For:</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/jobs/postings/${item.jobId}`);
                            }}
                            className="font-medium text-gray-600 dark:text-zinc-300 hover:text-blue-400 hover:underline transition-colors truncate inline-flex items-center gap-1"
                            title="View Job Post Details"
                          >
                            <span className="truncate">{item.jobTitle}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${renderStatusBadge(
                      item.status
                    )}`}
                  >
                    {formatStatusText(item.status)}
                  </span>
                </div>

                {/* 2. Proposed Bid & Key Specs Strip */}
                <div className="rounded-xl bg-gray-50/80 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 p-3 space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block">
                        {item.target_milestone_title ? "Fixed Budget" : "Proposed Bid"}
                      </span>
                      <div className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400 mt-0.5">
                        <CreditIcon className="h-4 w-4 shrink-0" />
                        <span className="text-lg font-black tracking-tight text-gray-900 dark:text-white">
                          {item.bidAmount.toLocaleString()}
                        </span>
                        <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                          Credits
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block">
                        Timeline
                      </span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-zinc-200">
                        ~{totalDays}d ({totalHours}h)
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-1.5 border-t border-gray-200/50 dark:border-white/5 text-[11px] text-gray-500 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-1">
                      <Layers className="h-3 w-3 text-gray-400 dark:text-zinc-500" />
                      <span>{item.milestones.length || 1} {item.milestones.length === 1 ? "Step" : "Steps"}</span>
                    </span>
                    <span className="text-gray-300 dark:text-zinc-700">•</span>
                    <span className="inline-flex items-center gap-1">
                      <RefreshCcw className="h-3 w-3 text-gray-400 dark:text-zinc-500" />
                      <span>{revisionsSummary} {revisionsSummary === "1" ? "Rev" : "Revs"}</span>
                    </span>
                    {item.additionalWorkRate > 0 && (
                      <>
                        <span className="text-gray-300 dark:text-zinc-700">•</span>
                        <span className="inline-flex items-center gap-1 text-gray-500 dark:text-zinc-400">
                          <Percent className="h-3 w-3 text-gray-400 dark:text-zinc-500" />
                          <span>+{item.additionalWorkRate}% Overtime</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 3. Cover Letter Pitch Snippet */}
                <div className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed line-clamp-3 min-h-[2.5rem]">
                  <JobRichText content={item.coverLetter} truncate={3} />
                </div>

                {item.type === "sent" && (
                  <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                    <div className="flex items-center text-[10px] gap-1 sm:gap-1.5 justify-between">
                      <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> Sent
                      </span>
                      <div className="h-0.5 flex-1 bg-emerald-500/40 rounded-full mx-1" />
                      <span className={`flex items-center gap-1 font-semibold ${item.viewedAt ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-zinc-500"}`}>
                        <CheckCircle2 className="w-3 h-3 shrink-0" /> {item.viewedAt ? "Viewed" : "Unread"}
                      </span>
                      <div className={`h-0.5 flex-1 rounded-full mx-1 ${item.shortlistedAt || item.status === "Shortlisted" || item.status === "Accepted" || item.status === "Hired" ? "bg-amber-500/40" : "bg-gray-200 dark:bg-white/10"}`} />
                      <span className={`flex items-center gap-1 font-semibold ${item.shortlistedAt || item.status === "Shortlisted" || item.status === "Accepted" || item.status === "Hired" ? "text-amber-500" : "text-gray-400 dark:text-zinc-500"}`}>
                        <Star className={`w-3 h-3 shrink-0 ${item.shortlistedAt || item.status === "Shortlisted" ? "fill-amber-500 text-amber-500" : ""}`} /> Shortlist
                      </span>
                      <div className={`h-0.5 flex-1 rounded-full mx-1 ${item.status === "Accepted" || item.status === "Hired" ? "bg-emerald-500/40" : "bg-gray-200 dark:bg-white/10"}`} />
                      <span className={`flex items-center gap-1 font-semibold ${item.status === "Accepted" || item.status === "Hired" ? "text-emerald-500" : item.status === "Rejected" ? "text-red-500" : "text-gray-400 dark:text-zinc-500"}`}>
                        {item.status === "Accepted" || item.status === "Hired" ? "Hired" : item.status === "Rejected" ? "Closed" : "Offer"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Action Area */}
              <div className="pt-3 border-t border-gray-100 dark:border-white/5 space-y-2.5">
                {/* Secondary tools & timestamp row */}
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-zinc-400">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    {item.submittedAgo || item.submittedAt}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Chat button */}
                    <button
                      type="button"
                      title="Chat with Candidate"
                      onClick={(e) => {
                        e.stopPropagation();
                        void openMarketplaceConversation({
                          contextType: "job_proposal",
                          contextId: item.id,
                          navigate,
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-semibold text-gray-700 dark:text-zinc-200 flex items-center gap-1 transition cursor-pointer"
                    >
                      <MessageSquare className="h-3 w-3 text-blue-500" />
                      <span>Chat</span>
                    </button>

                    {/* Shortlist button */}
                    {item.type === "incoming" && !isHired && (
                      <button
                        type="button"
                        title={isShortlisted ? "Remove from Shortlist" : "Save to Shortlist"}
                        onClick={async (e) => {
                          e.stopPropagation();
                          const nextStatus = isShortlisted ? "Pending" : "Shortlisted";
                          try {
                            await onUpdateStatus?.(item.id, nextStatus as ProposalStatus);
                            toast.success(nextStatus === "Shortlisted" ? "Added to shortlist!" : "Removed from shortlist.");
                          } catch {
                            toast.error("Failed to update status");
                          }
                        }}
                        className={`p-1.5 rounded-lg text-xs font-semibold flex items-center justify-center transition border cursor-pointer ${
                          isShortlisted
                            ? "bg-amber-500/15 text-amber-500 border-amber-500/30 hover:bg-amber-500/25"
                            : "bg-white dark:bg-white/5 text-gray-400 border-gray-200 dark:border-white/10 hover:border-amber-500/40 hover:text-amber-500"
                        }`}
                      >
                        <Star className={`h-3.5 w-3.5 ${isShortlisted ? "fill-amber-500 text-amber-500" : ""}`} />
                      </button>
                    )}

                    {/* Details button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(
                          item.type === "incoming"
                            ? `/jobs/proposals/received/${item.id}`
                            : `/jobs/proposals/sent/${item.id}`
                        );
                      }}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer"
                      title="View Proposal Details"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Primary Action Button */}
                {item.type === "incoming" && (
                  isHired ? (
                    <div className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Candidate Hired</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/jobs/proposals/received/${item.id}`);
                      }}
                      className="w-full py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>{item.target_milestone_title ? "Slot & Hire Candidate" : "Hire Candidate"}</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )
                )}

                {item.type === "sent" && item.status === "Pending" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/jobs/proposals/edit/${item.id}`);
                    }}
                    className="w-full py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-900 dark:text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit Proposal</span>
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProposalsList;
