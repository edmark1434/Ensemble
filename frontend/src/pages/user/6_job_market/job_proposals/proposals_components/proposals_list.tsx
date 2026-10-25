import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Percent,
  RefreshCcw,
  Clock,
  Calendar,
  Star,
  ChevronRight,
  ChevronDown,
  Edit2,
  ExternalLink,
  MessageSquare,
  Loader2,
  CheckCircle2,
  XCircle,
  User,
  Users,
  Briefcase,
  Tag,
} from "lucide-react";
import toast from "react-hot-toast";
import type { ViewType } from "./proposals_list_viewtype";
import { CreditIcon } from "@/components/ui/credit-icon";
import { JobRichText } from "../../job_components/JobRichText";
import { openMarketplaceConversation } from "@/components/ui/inbox/marketplace_conversation";
import { constructAvatarUrl, getFallbackAvatarUrl } from "@/lib/accountAvatars";

export type ProposalStatus =
  | "Pending"
  | "Shortlisted"
  | "Accepted"
  | "Rejected"
  | "Hired"
  | "Withdrawn"
  | "Archived"
  | "Approved";

export interface ProposalItemData {
  id: string;
  jobId: string;
  contractId?: string;
  jobTitle: string;
  jobCategory?: string;
  jobBanner?: string;
  partyName: string;
  clientAccountId?: string;
  freelancerAccountId?: string;
  freelancerType?: string;
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
  freelancerRating?: number;
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
  proposedByName?: string;
  includedTeamMembers?: {
    account_id: string;
    display_name: string;
    handle?: string;
    role?: string;
    avatar_path?: string;
    is_leader?: boolean;
    is_proposer?: boolean;
  }[];
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
  onHireCandidate?: (proposal: ProposalItemData) => void;
  onShortlistCandidate?: (proposal: ProposalItemData) => void;
}

export const ProposalCardSkeleton: React.FC<{ viewType?: ViewType; showFilters?: boolean }> = ({
  viewType = "list",
}) => {
  return (
    <div
      className={`rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 animate-pulse ${
        viewType === "list"
          ? "flex flex-col lg:flex-row lg:items-center justify-between gap-5"
          : "space-y-4"
      }`}
    >
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

      <div
        className={
          viewType === "list"
            ? "w-64 space-y-2 shrink-0"
            : "h-12 w-full rounded-xl bg-gray-100 dark:bg-white/5"
        }
      />
    </div>
  );
};

interface ProposalLifecycleStepperProps {
  status?: string;
}

const ProposalLifecycleStepper: React.FC<ProposalLifecycleStepperProps> = ({ status }) => {
  const s = (status || "").toLowerCase();

  if (s === "rejected") {
    return (
      <div className="flex items-center text-[10px] sm:text-[11px] gap-1.5 whitespace-nowrap">
        <span className="flex items-center gap-1 font-semibold text-gray-400 dark:text-zinc-500 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-400 shrink-0" /> 01 PENDING
        </span>
        <div className="h-0.5 w-3 sm:w-4 rounded-full bg-rose-400/40 shrink-0" />
        <span className="flex items-center gap-1 font-semibold text-rose-500 dark:text-rose-400 shrink-0">
          <XCircle className="w-2.5 h-2.5 shrink-0" /> REJECTED
        </span>
      </div>
    );
  }

  if (s === "withdrawn" || s === "archived") {
    return (
      <div className="flex items-center text-[10px] sm:text-[11px] gap-1.5 whitespace-nowrap">
        <span className="flex items-center gap-1 font-semibold text-gray-400 dark:text-zinc-500 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-400 shrink-0" /> 01 PENDING
        </span>
        <div className="h-0.5 w-3 sm:w-4 rounded-full bg-gray-300 dark:bg-zinc-700 shrink-0" />
        <span className="flex items-center gap-1 font-semibold text-gray-500 dark:text-zinc-400 shrink-0">
          <XCircle className="w-2.5 h-2.5 shrink-0" /> WITHDRAWN
        </span>
      </div>
    );
  }

  const isHired = s === "hired";
  const isAccepted = isHired || s === "accepted" || s === "approved";
  const isShortlisted = isAccepted || s === "shortlisted";

  return (
    <div className="flex items-center text-[10px] sm:text-[11px] gap-1 sm:gap-1.5 whitespace-nowrap overflow-x-auto no-scrollbar">
      {/* 01 PENDING */}
      <span
        className={`flex items-center gap-1 font-semibold shrink-0 ${
          s === "pending" || !s
            ? "text-amber-600 dark:text-amber-400"
            : "text-gray-400 dark:text-zinc-500"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
            s === "pending" || !s ? "bg-amber-500" : "bg-gray-400"
          }`}
        />
        01 PENDING
      </span>

      {/* Divider 1-2 */}
      <div
        className={`h-0.5 w-2.5 sm:w-3.5 rounded-full shrink-0 ${
          isShortlisted ? "bg-blue-500/40" : "bg-gray-200 dark:bg-white/10"
        }`}
      />

      {/* 02 SHORTLISTED */}
      <span
        className={`flex items-center gap-1 font-semibold shrink-0 ${
          isShortlisted
            ? "text-blue-600 dark:text-blue-400"
            : "text-gray-400 dark:text-zinc-500"
        }`}
      >
        <Star
          className={`w-2.5 h-2.5 shrink-0 ${
            isShortlisted ? "fill-blue-500 text-blue-500" : ""
          }`}
        />
        02 SHORTLISTED
      </span>

      {/* Divider 2-3 */}
      <div
        className={`h-0.5 w-2.5 sm:w-3.5 rounded-full shrink-0 ${
          isAccepted ? "bg-emerald-500/40" : "bg-gray-200 dark:bg-white/10"
        }`}
      />

      {/* 03 ACCEPTED */}
      <span
        className={`flex items-center gap-1 font-semibold shrink-0 ${
          isAccepted
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-gray-400 dark:text-zinc-500"
        }`}
      >
        <CheckCircle2
          className={`w-2.5 h-2.5 shrink-0 ${
            isAccepted ? "text-emerald-500" : ""
          }`}
        />
        03 ACCEPTED
      </span>

      {/* Divider 3-4 */}
      <div
        className={`h-0.5 w-2.5 sm:w-3.5 rounded-full shrink-0 ${
          isHired ? "bg-purple-500/40" : "bg-gray-200 dark:bg-white/10"
        }`}
      />

      {/* 04 HIRED */}
      <span
        className={`flex items-center gap-1 font-semibold shrink-0 ${
          isHired
            ? "text-purple-600 dark:text-purple-400"
            : "text-gray-400 dark:text-zinc-500"
        }`}
      >
        <CheckCircle2
          className={`w-2.5 h-2.5 shrink-0 ${
            isHired ? "text-purple-500" : ""
          }`}
        />
        04 HIRED
      </span>
    </div>
  );
};

export const ProposalsList: React.FC<ProposalsListProps> = ({
  proposals,
  loading = false,
  viewType = "list",
  showFilters = true,
  onUpdateStatus,
  onHireCandidate,
  onShortlistCandidate,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);
  const [expandedMilestones, setExpandedMilestones] = useState<Record<string, boolean>>({});

  const toggleMilestones = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedMilestones((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
        <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium">
          No proposals found matching your criteria.
        </p>
      </div>
    );
  }

  const getProposalStatusBadgeConfig = (status: ProposalStatus | string) => {
    switch (status) {
      case "Hired":
        return {
          label: "HIRED",
          className: "bg-purple-50 text-purple-900 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-400/50",
        };
      case "Accepted":
      case "Approved":
      case "approved":
        return {
          label: "ACCEPTED",
          className: "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/50",
        };
      case "Shortlisted":
        return {
          label: "SHORTLISTED",
          className: "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/50",
        };
      case "Rejected":
        return {
          label: "DECLINED",
          className: "bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-400/50",
        };
      case "Withdrawn":
      case "Archived":
        return {
          label: "WITHDRAWN",
          className: "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-700/40 dark:text-zinc-200 dark:border-zinc-500/50",
        };
      case "Pending":
      default:
        return {
          label: "PENDING",
          className: "bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-400/50",
        };
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
          const revisionsArr = (item.milestones || []).map((m) => m.revisions);
          const minRev = revisionsArr.length ? Math.min(...revisionsArr) : 0;
          const maxRev = revisionsArr.length ? Math.max(...revisionsArr) : 0;
          const revisionsSummary =
            minRev === maxRev ? `${minRev}` : `${minRev}-${maxRev}`;

          // Estimated total time calculation
          const totalHours = (item.milestones || []).reduce((acc, m) => acc + (m.hours || 0), 0);
          const totalDays = Math.ceil(totalHours / 8) || 1;

          const isHired = item.status === "Hired" || item.status === "Accepted";
          const isShortlisted = item.status === "Shortlisted";
          const isTeam =
            item.freelancerType === "Team" ||
            Boolean(item.freelancerTeamId || item.actingTeamId);
          const isMilestonesExpanded = Boolean(expandedMilestones[item.id]);

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
                      : `/jobs/proposals/sent/${item.id}`,
                    { state: { returnTo: location.pathname + location.search } }
                  )
                }
                className="group rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 backdrop-blur-sm shadow-sm hover:border-blue-500/30 hover:shadow-md cursor-pointer transition-all duration-200 text-left flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                {/* Left Column: Proposer (Solo/Team & Rating) + Target listing + Pitch */}
                <div className="space-y-3 min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 dark:text-blue-400 text-sm font-bold shrink-0 overflow-hidden">
                      {item.partyAvatar ? (
                        <img
                          src={item.partyAvatar}
                          alt={item.partyName}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = getFallbackAvatarUrl(item.partyName);
                          }}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        item.partyName[0]
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Line 1: Proposer Name + Solo/Team badge + Rating + Status tag */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors truncate">
                            {item.partyName}
                          </h3>

                          {isTeam ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-500/30 shrink-0">
                              <Users className="h-2.5 w-2.5" /> Team
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 shrink-0">
                              <User className="h-2.5 w-2.5" /> Solo
                            </span>
                          )}

                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400 shrink-0">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="font-bold text-gray-700 dark:text-zinc-200">
                              {item.rating != null ? Number(item.rating).toFixed(1) : "5.0"}
                            </span>
                          </div>
                        </div>

                        {(() => {
                          const badge = getProposalStatusBadgeConfig(item.status);
                          return (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-xs shrink-0 ${badge.className}`}
                            >
                              <Tag className="h-2.5 w-2.5 shrink-0 opacity-90" />
                              <span>{badge.label}</span>
                            </span>
                          );
                        })()}
                      </div>

                      {/* Line 2: Target Job Link & Client */}
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400 pt-1 min-w-0">
                        <span className="text-gray-400 dark:text-zinc-500 text-[11px] shrink-0 font-medium">For:</span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/jobs/postings/${item.jobId}`);
                          }}
                          className="font-medium text-gray-700 dark:text-zinc-300 hover:text-blue-500 hover:underline transition-colors truncate inline-flex items-center gap-1 min-w-0"
                          title="View Job Post Details"
                        >
                          <span className="truncate">{item.jobTitle}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                        </button>

                        {item.clientName && (
                          <>
                            <span className="text-gray-300 dark:text-zinc-700 shrink-0">•</span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 shrink-0">
                              <span className="text-zinc-400 dark:text-zinc-500">by</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (item.clientAccountId) {
                                    navigate(`/profile/${item.clientAccountId}`);
                                  }
                                }}
                                className="font-semibold text-zinc-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 transition truncate max-w-[130px] inline-flex items-center gap-1 cursor-pointer"
                                title={`Client: ${item.clientName}`}
                              >
                                <img
                                  src={item.clientAvatar || getFallbackAvatarUrl(item.clientName)}
                                  alt={item.clientName}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = getFallbackAvatarUrl(item.clientName || "Client");
                                  }}
                                  className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                                />
                                <span className="truncate">{item.clientName}</span>
                              </button>
                            </span>
                          </>
                        )}

                        {item.target_milestone_title && (
                          <>
                            <span className="text-gray-300 dark:text-zinc-700 shrink-0">•</span>
                            <span
                              className="inline-flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 truncate shrink-0 max-w-[150px]"
                              title={item.target_milestone_title}
                            >
                              <span className="opacity-70 text-[10px]">Role:</span>
                              <span className="font-semibold truncate">{item.target_milestone_title}</span>
                            </span>
                          </>
                        )}
                      </div>

                      {/* Included Team Members Line (List View) */}
                      {isTeam && Array.isArray(item.includedTeamMembers) && item.includedTeamMembers.length > 0 && (
                        <div className="flex items-center gap-2 pt-1 min-w-0">
                          <div className="flex -space-x-1.5 items-center shrink-0">
                            {item.includedTeamMembers.slice(0, 3).map((m, idx) => {
                              const mName = m.display_name || m.handle || "Member";
                              const mAvatar = constructAvatarUrl(m.avatar_path, mName);
                              return (
                                <img
                                  key={m.account_id || idx}
                                  src={mAvatar}
                                  alt={mName}
                                  title={`${mName}${m.is_leader ? " (Leader)" : ""}`}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = getFallbackAvatarUrl(mName);
                                  }}
                                  className="h-4.5 w-4.5 rounded-full object-cover border border-white dark:border-zinc-900 bg-zinc-200 dark:bg-zinc-700"
                                />
                              );
                            })}
                            {item.includedTeamMembers.length > 3 && (
                              <span className="h-4.5 w-4.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-white dark:border-zinc-900 text-[9px] font-bold text-zinc-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
                                +{item.includedTeamMembers.length - 3}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            {(() => {
                              const leader = item.includedTeamMembers.find((m: any) => m.is_leader) || item.includedTeamMembers[0];
                              const leaderName = leader?.display_name || leader?.handle || "Leader";
                              const othersCount = item.includedTeamMembers.length - 1;
                              return (
                                <span>
                                  <strong className="font-semibold text-zinc-700 dark:text-zinc-200">{leaderName}</strong>
                                  {leader?.is_leader && <span className="text-[10px] text-amber-600 dark:text-amber-400 ml-1">(Leader)</span>}
                                  {othersCount > 0 && <span className="text-zinc-400 dark:text-zinc-500 ml-1">+{othersCount} other{othersCount > 1 ? "s" : ""}</span>}
                                </span>
                              );
                            })()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pitch description */}
                  <div className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed line-clamp-2 max-w-2xl">
                    <JobRichText content={item.coverLetter} truncate={2} />
                  </div>

                  {/* Submission date */}
                  <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 inline text-gray-400" />
                      {item.submittedAgo || item.submittedAt}
                    </span>
                  </div>

                  {/* 4-Stage Lifecycle Stepper */}
                  <div className="pt-2 mt-1 border-t border-gray-100 dark:border-white/5">
                    <ProposalLifecycleStepper status={item.status} />
                  </div>
                </div>

                {/* Right Column: Bid + Specs + Expandable Milestones + Actions */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4 shrink-0 lg:pl-6 lg:border-l border-gray-100 dark:border-white/5 min-w-[260px]">
                  <div className="text-left sm:text-right lg:text-right space-y-1 w-full">
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

                    <div className="flex items-center sm:justify-end gap-2 text-[11px] text-gray-500 dark:text-zinc-400 flex-wrap">
                      <span>~{totalDays}d ({totalHours}h)</span>
                      <span className="text-gray-300 dark:text-zinc-700">•</span>
                      <span>{item.milestones?.length || 1} {item.milestones?.length === 1 ? "Milestone" : "Milestones"}</span>
                      <span className="text-gray-300 dark:text-zinc-700">•</span>
                      <span>{revisionsSummary} {revisionsSummary === "1" ? "Rev" : "Revs"}</span>

                      {item.milestones && item.milestones.length > 0 && (
                        <>
                          <span className="text-gray-300 dark:text-zinc-700">•</span>
                          <button
                            type="button"
                            onClick={(e) => toggleMilestones(item.id, e)}
                            className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            <span>{isMilestonesExpanded ? "Hide milestones" : "View milestones"}</span>
                            <ChevronDown
                              className={`h-3 w-3 transition-transform duration-200 ${
                                isMilestonesExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Expandable Milestones Accordion */}
                    <AnimatePresence>
                      {isMilestonesExpanded && item.milestones && item.milestones.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden pt-2 border-t border-gray-100 dark:border-white/5 space-y-1.5 w-full text-left"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                            Milestones Breakdown ({item.milestones.length})
                          </div>
                          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                            {item.milestones.map((m, idx) => (
                              <div
                                key={m.id || idx}
                                className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5"
                              >
                                <div className="min-w-0 pr-2">
                                  <span className="font-semibold text-gray-800 dark:text-zinc-200 block truncate">
                                    {idx + 1}. {m.name || `Phase ${idx + 1}`}
                                  </span>
                                  {m.description && (
                                    <span className="text-[11px] text-gray-500 dark:text-zinc-400 line-clamp-1">
                                      {m.description}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-zinc-400 shrink-0 font-mono">
                                  <span>{m.hours}h</span>
                                  <span>•</span>
                                  <span>{m.revisions} {m.revisions === 1 ? "rev" : "revs"}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Chat button (Only shown if applicant is shortlisted, accepted, or hired) */}
                    {(isShortlisted || isHired) && (
                      <button
                        type="button"
                        disabled={loadingChatId === item.id}
                        title={item.type === "sent" ? "Chat with Client" : "Chat with Candidate"}
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            setLoadingChatId(item.id);
                            await openMarketplaceConversation({
                              contextType: "job_proposal",
                              contextId: item.id,
                              navigate,
                              targetName: item.partyName,
                              targetAvatar: item.partyAvatar,
                              listingTitle: item.jobTitle,
                            });
                          } finally {
                            setLoadingChatId(null);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-semibold text-gray-700 dark:text-zinc-200 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {loadingChatId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                        ) : (
                          <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                        )}
                        <span>Chat</span>
                      </button>
                    )}

                    {/* Shortlist */}
                    {item.type === "incoming" && !isHired && (
                      <button
                        type="button"
                        title={isShortlisted ? "Remove from Shortlist" : "Save to Shortlist"}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (onShortlistCandidate) {
                            onShortlistCandidate(item);
                            return;
                          }
                          const nextStatus = isShortlisted ? "Pending" : "Shortlisted";
                          try {
                            await onUpdateStatus?.(item.id, nextStatus as ProposalStatus);
                            toast.success(
                              nextStatus === "Shortlisted" ? "Added to shortlist!" : "Removed from shortlist."
                            );
                          } catch {
                            toast.error("Failed to update status");
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border cursor-pointer ${
                          isShortlisted
                            ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600/30 shadow-sm shadow-amber-500/25"
                            : "bg-amber-50/80 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-300/80 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/20 hover:border-amber-400 shadow-2xs"
                        }`}
                      >
                        <Star className={`h-3.5 w-3.5 ${isShortlisted ? "fill-white text-white" : "text-amber-600 dark:text-amber-400"}`} />
                        <span>{isShortlisted ? "Shortlisted" : "Shortlist"}</span>
                      </button>
                    )}

                    {/* Primary Action Button */}
                    {item.type === "incoming" &&
                      (isHired ? (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Hired</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onHireCandidate) {
                              onHireCandidate(item);
                              return;
                            }
                            navigate(`/jobs/proposals/received/${item.id}`);
                          }}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <span>{item.target_milestone_title ? "Slot & Hire" : "Hire Candidate"}</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      ))}

                    {/* Edit for sent proposals */}
                    {item.type === "sent" && item.status === "Pending" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/jobs/proposals/edit/${item.id}`, {
                            state: { returnTo: "/jobs/proposals/sent" },
                          });
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
                            : `/jobs/proposals/sent/${item.id}`,
                          { state: { returnTo: location.pathname + location.search } }
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
                    : `/jobs/proposals/sent/${item.id}`,
                  { state: { returnTo: location.pathname + location.search } }
                )
              }
              className="group rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 backdrop-blur-sm shadow-sm hover:border-blue-500/30 hover:shadow-md cursor-pointer transition-all duration-200 text-left flex flex-col justify-between gap-4"
            >
              <div className="space-y-3.5">
                {/* 1. Header Row: Proposer (Solo/Team & Rating) + Target listing + Status tag */}
                <div className="space-y-2 border-b border-gray-100 dark:border-white/5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 dark:text-blue-400 text-sm font-bold shrink-0 overflow-hidden">
                        {item.partyAvatar ? (
                          <img
                            src={item.partyAvatar}
                            alt={item.partyName}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = getFallbackAvatarUrl(item.partyName);
                            }}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          item.partyName[0]
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors truncate">
                            {item.partyName}
                          </h3>

                          {isTeam ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-500/30 shrink-0">
                              <Users className="h-2.5 w-2.5" /> Team
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 shrink-0">
                              <User className="h-2.5 w-2.5" /> Solo
                            </span>
                          )}

                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400 shrink-0">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="font-bold text-gray-700 dark:text-zinc-200">
                              {item.rating != null ? Number(item.rating).toFixed(1) : "5.0"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {(() => {
                      const badge = getProposalStatusBadgeConfig(item.status);
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-xs shrink-0 ${badge.className}`}
                        >
                          <Tag className="h-2.5 w-2.5 shrink-0 opacity-90" />
                          <span>{badge.label}</span>
                        </span>
                      );
                    })()}
                  </div>

                  {/* Target Listing Line */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400 pt-0.5 min-w-0">
                    <span className="text-gray-400 dark:text-zinc-500 text-[11px] shrink-0 font-medium">For:</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/jobs/postings/${item.jobId}`);
                      }}
                      className="font-medium text-gray-700 dark:text-zinc-300 hover:text-blue-500 hover:underline transition-colors truncate inline-flex items-center gap-1 min-w-0"
                      title="View Job Post Details"
                    >
                      <span className="truncate max-w-[170px]">{item.jobTitle}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                    </button>

                    {item.clientName && (
                      <>
                        <span className="text-gray-300 dark:text-zinc-700 shrink-0">•</span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 shrink-0">
                          <span className="text-zinc-400 dark:text-zinc-500">by</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.clientAccountId) {
                                navigate(`/profile/${item.clientAccountId}`);
                              }
                            }}
                            className="font-semibold text-zinc-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 transition truncate max-w-[110px] inline-flex items-center gap-1 cursor-pointer"
                            title={`Client: ${item.clientName}`}
                          >
                            <img
                              src={item.clientAvatar || getFallbackAvatarUrl(item.clientName)}
                              alt={item.clientName}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = getFallbackAvatarUrl(item.clientName || "Client");
                              }}
                              className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                            />
                            <span className="truncate">{item.clientName}</span>
                          </button>
                        </span>
                      </>
                    )}
                    {item.target_milestone_title && (
                      <>
                        <span className="text-gray-300 dark:text-zinc-700 shrink-0">•</span>
                        <span
                          className="inline-flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 truncate shrink-0 max-w-[120px]"
                          title={item.target_milestone_title}
                        >
                          <span className="opacity-70 text-[10px]">Role:</span>
                          <span className="font-semibold truncate">{item.target_milestone_title}</span>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Included Team Members Line (Grid View) */}
                  {isTeam && Array.isArray(item.includedTeamMembers) && item.includedTeamMembers.length > 0 && (
                    <div className="flex items-center gap-2 pt-1 min-w-0">
                      <div className="flex -space-x-1.5 items-center shrink-0">
                        {item.includedTeamMembers.slice(0, 3).map((m, idx) => {
                          const mName = m.display_name || m.handle || "Member";
                          const mAvatar = constructAvatarUrl(m.avatar_path, mName);
                          return (
                            <img
                              key={m.account_id || idx}
                              src={mAvatar}
                              alt={mName}
                              title={`${mName}${m.is_leader ? " (Leader)" : ""}`}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = getFallbackAvatarUrl(mName);
                              }}
                              className="h-4.5 w-4.5 rounded-full object-cover border border-white dark:border-zinc-900 bg-zinc-200 dark:bg-zinc-700"
                            />
                          );
                        })}
                        {item.includedTeamMembers.length > 3 && (
                          <span className="h-4.5 w-4.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-white dark:border-zinc-900 text-[9px] font-bold text-zinc-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
                            +{item.includedTeamMembers.length - 3}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        {(() => {
                          const leader = item.includedTeamMembers.find((m: any) => m.is_leader) || item.includedTeamMembers[0];
                          const leaderName = leader?.display_name || leader?.handle || "Leader";
                          const othersCount = item.includedTeamMembers.length - 1;
                          return (
                            <span>
                              <strong className="font-semibold text-zinc-700 dark:text-zinc-200">{leaderName}</strong>
                              {leader?.is_leader && <span className="text-[10px] text-amber-600 dark:text-amber-400 ml-1">(Leader)</span>}
                              {othersCount > 0 && <span className="text-zinc-400 dark:text-zinc-500 ml-1">+{othersCount} other{othersCount > 1 ? "s" : ""}</span>}
                            </span>
                          );
                        })()}
                      </span>
                    </div>
                  )}
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
                      <span>
                        {item.milestones?.length || 1} {item.milestones?.length === 1 ? "Milestone" : "Milestones"}
                      </span>
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

                    {item.milestones && item.milestones.length > 0 && (
                      <>
                        <span className="text-gray-300 dark:text-zinc-700">•</span>
                        <button
                          type="button"
                          onClick={(e) => toggleMilestones(item.id, e)}
                          className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer ml-auto"
                        >
                          <span>{isMilestonesExpanded ? "Hide milestones" : "View milestones"}</span>
                          <ChevronDown
                            className={`h-3 w-3 transition-transform duration-200 ${
                              isMilestonesExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Expandable Milestones Accordion in Grid */}
                  <AnimatePresence>
                    {isMilestonesExpanded && item.milestones && item.milestones.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden pt-2 border-t border-gray-100 dark:border-white/5 space-y-1.5 w-full text-left"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                          Milestones Breakdown ({item.milestones.length})
                        </div>
                        <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                          {item.milestones.map((m, idx) => (
                            <div
                              key={m.id || idx}
                              className="flex items-center justify-between text-xs p-2 rounded-lg bg-white dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/5"
                            >
                              <div className="min-w-0 pr-2">
                                <span className="font-semibold text-gray-800 dark:text-zinc-200 block truncate">
                                  {idx + 1}. {m.name || `Phase ${idx + 1}`}
                                </span>
                                {m.description && (
                                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 line-clamp-1">
                                    {m.description}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-zinc-400 shrink-0 font-mono">
                                <span>{m.hours}h</span>
                                <span>•</span>
                                <span>{m.revisions} {m.revisions === 1 ? "rev" : "revs"}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 3. Cover Letter Pitch Snippet */}
                <div className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed line-clamp-3 min-h-[2.5rem]">
                  <JobRichText content={item.coverLetter} truncate={3} />
                </div>

                {/* 4. 4-Stage Lifecycle Stepper */}
                <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                  <ProposalLifecycleStepper status={item.status} />
                </div>
              </div>

              {/* 5. Action Area */}
              <div className="pt-3 border-t border-gray-100 dark:border-white/5 space-y-2.5">
                {/* Secondary tools & timestamp row */}
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-zinc-400">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    {item.submittedAgo || item.submittedAt}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Chat button (Only shown if applicant is shortlisted, accepted, or hired) */}
                    {(isShortlisted || isHired) && (
                      <button
                        type="button"
                        disabled={loadingChatId === item.id}
                        title={item.type === "sent" ? "Chat with Client" : "Chat with Candidate"}
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            setLoadingChatId(item.id);
                            await openMarketplaceConversation({
                              contextType: "job_proposal",
                              contextId: item.id,
                              navigate,
                              targetName: item.partyName,
                              targetAvatar: item.partyAvatar,
                              listingTitle: item.jobTitle,
                            });
                          } finally {
                            setLoadingChatId(null);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-semibold text-gray-700 dark:text-zinc-200 flex items-center gap-1 transition cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {loadingChatId === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                        ) : (
                          <MessageSquare className="h-3 w-3 text-blue-500" />
                        )}
                        <span>Chat</span>
                      </button>
                    )}

                    {/* Shortlist button */}
                    {item.type === "incoming" && !isHired && (
                      <button
                        type="button"
                        title={isShortlisted ? "Remove from Shortlist" : "Save to Shortlist"}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (onShortlistCandidate) {
                            onShortlistCandidate(item);
                            return;
                          }
                          const nextStatus = isShortlisted ? "Pending" : "Shortlisted";
                          try {
                            await onUpdateStatus?.(item.id, nextStatus as ProposalStatus);
                            toast.success(
                              nextStatus === "Shortlisted" ? "Added to shortlist!" : "Removed from shortlist."
                            );
                          } catch {
                            toast.error("Failed to update status");
                          }
                        }}
                        className={`p-1.5 rounded-lg text-xs font-bold flex items-center justify-center transition border cursor-pointer ${
                          isShortlisted
                            ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600/30 shadow-sm shadow-amber-500/25"
                            : "bg-amber-50/80 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/80 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/20 hover:border-amber-400 shadow-2xs"
                        }`}
                      >
                        <Star className={`h-3.5 w-3.5 ${isShortlisted ? "fill-white text-white" : "text-amber-600 dark:text-amber-400"}`} />
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
                            : `/jobs/proposals/sent/${item.id}`,
                          { state: { returnTo: location.pathname + location.search } }
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
                {item.type === "incoming" &&
                  (isHired ? (
                    <div className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Candidate Hired</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onHireCandidate) {
                          onHireCandidate(item);
                          return;
                        }
                        navigate(`/jobs/proposals/received/${item.id}`);
                      }}
                      className="w-full py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>{item.target_milestone_title ? "Slot & Hire Candidate" : "Hire Candidate"}</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ))}

                {item.type === "sent" && item.status === "Pending" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/jobs/proposals/edit/${item.id}`, {
                        state: { returnTo: "/jobs/proposals/sent" },
                      });
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
