import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  ExternalLink,
  CheckCircle2,
  Users,
  Table,
  LayoutGrid,
  Star,
  MessageSquare,
  CheckSquare,
  Paperclip,
  Clock,
  Eye,
  Info,
  Tag,
  Pencil,
  Power,
} from "lucide-react";
import { CreditIcon } from "@/components/ui/credit-icon";
import { openMarketplaceConversation } from "@/components/ui/inbox/marketplace_conversation";
import ProposalsList, { type ProposalStatus } from "../proposals_components/proposals_list";
import { useJobs } from "@/hooks/useJobs";
import { constructAvatarUrl } from "@/lib/accountAvatars";
import api from "@/lib/axios";
import type { ProposalsMainContext } from "../proposals_main";
import { continueIfAccountVerified } from "@/lib/accountVerification";
import toast from "react-hot-toast";
import { getImageUrl } from "@/lib/utils";
import { getDefaultJobBannerForJob } from "@/lib/defaultJobBanners";

type ProposalSubTab = "all" | "pending" | "shortlisted" | "offersAndHired" | "inactive";

const SUB_TAB_META: Record<
  ProposalSubTab,
  {
    description: string;
    tags: { label: string; className: string }[];
  }
> = {
  all: {
    description: "All candidate applications received for this job post across all lifecycle stages.",
    tags: [
      {
        label: "PENDING",
        className: "bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-400/50",
      },
      {
        label: "SHORTLISTED",
        className: "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/50",
      },
      {
        label: "ACCEPTED",
        className: "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/50",
      },
      {
        label: "HIRED",
        className: "bg-purple-50 text-purple-900 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-400/50",
      },
      {
        label: "DECLINED",
        className: "bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-400/50",
      },
      {
        label: "WITHDRAWN",
        className: "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-700/40 dark:text-zinc-200 dark:border-zinc-500/50",
      },
    ],
  },
  pending: {
    description: "Fresh candidate applications waiting for your initial review, pitch evaluation, and screening check.",
    tags: [
      {
        label: "PENDING",
        className: "bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-400/50",
      },
    ],
  },
  shortlisted: {
    description: "Top candidate proposals you have starred or bookmarked for prioritized review and interview.",
    tags: [
      {
        label: "SHORTLISTED",
        className: "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/50",
      },
    ],
  },
  offersAndHired: {
    description: "Candidates you have extended contract offers to (awaiting acceptance) and active hired contracts.",
    tags: [
      {
        label: "ACCEPTED (OFFER)",
        className: "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/50",
      },
      {
        label: "HIRED",
        className: "bg-purple-50 text-purple-900 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-400/50",
      },
    ],
  },
  inactive: {
    description: "Candidate proposals you have declined, or applicants who withdrew their submission.",
    tags: [
      {
        label: "DECLINED",
        className: "bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-400/50",
      },
      {
        label: "WITHDRAWN",
        className: "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-700/40 dark:text-zinc-200 dark:border-zinc-500/50",
      },
    ],
  },
};

const getTimeAgo = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " mins ago";
  return Math.floor(seconds) + " seconds ago";
};

export const ProposalsIncomingPage: React.FC = () => {
  const { jobPostId } = useParams<{ jobPostId: string }>();
  const navigate = useNavigate();

  const { searchQuery, viewType } = useOutletContext<ProposalsMainContext>();

  const [proposals, setProposals] = useState<any[]>([]);
  const [targetJob, setTargetJob] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<ProposalSubTab>("all");
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingJob, setIsUpdatingJob] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "matrix">("cards");
  const { fetchProposalsByJob, fetchJobs, updateProposalStatus, updateJob } = useJobs();

  useEffect(() => {
    const loadData = async () => {
      if (!jobPostId) return;
      try {
        const fetchedProposals = await fetchProposalsByJob(jobPostId);
        const mapped = fetchedProposals.map((p: any) => ({
          id: p.proposal_id,
          jobId: p.job_id,
          jobTitle: p.job_title || "Unknown Job",
          jobCategory: p.job_category || "Uncategorized",
          partyName: p.freelancer_name || p.freelancer_handle || "Unknown",
          partyAvatar: constructAvatarUrl(p.freelancer_avatar_path, p.freelancer_name || p.freelancer_handle),
          freelancerAccountId: p.freelancer_account_id,
          freelancerType: p.freelancer_type || (p.freelancer_team_id || p.acting_team_id ? "Team" : "User"),
          freelancerTeamId: p.freelancer_team_id,
          actingTeamId: p.acting_team_id,
          partyAccountId: p.freelancer_account_id,
          bidAmount: parseFloat(p.rate_credits) || 0,
          additionalWorkRate: parseFloat(p.revision_price_credits) || 0,
          status: p.status,
          submittedAt: new Date(p.created_at).toLocaleDateString(),
          coverLetter: p.letter || "",
          rejectionReason: p.reject_reason,
          milestones: p.milestones || [],
          job_milestone_id: p.job_milestone_id,
          target_milestone_title: p.target_milestone_title,
          target_milestone_budget: p.target_milestone_budget,
          target_milestone_slots: p.target_milestone_slots,
          target_milestone_order: p.target_milestone_order,
          screening_answers: p.screening_answers || [],
          attachments: p.attachments || [],
          rating: p.freelancer_rating != null ? Number(p.freelancer_rating) : 5.0,
          freelancerRating: p.freelancer_rating != null ? Number(p.freelancer_rating) : 5.0,
          viewedAt: p.viewed_at,
          shortlistedAt: p.shortlisted_at,
          type: "incoming",
        }));
        setProposals(mapped);

        // Fetch single job details to display title, budget, thumbnail, and milestones
        let found: any = null;
        try {
          const singleRes = await api.get(`/api/jobs/${jobPostId}`);
          if (singleRes.data?.data) {
            found = singleRes.data.data;
          }
        } catch {
          // fallback
        }

        if (!found) {
          const jobs = await fetchJobs();
          found = jobs.find((j: any) => j.job_id === jobPostId);
        }

        if (found) {
          setTargetJob({
            id: found.job_id,
            title: found.title,
            category: found.category,
            difficulty: found.experience_level,
            status: found.status || "Open",
            rateCreditsMin: found.rate_credits_min,
            rateCreditsMax: found.rate_credits_max,
            priceRange: !found.rate_credits_max
              ? `${found.rate_credits_min?.toLocaleString() || 0}+`
              : `${found.rate_credits_min?.toLocaleString() || 0} ~ ${found.rate_credits_max?.toLocaleString() || 0}`,
            timeAgo: found.created_at ? getTimeAgo(new Date(found.created_at)) : null,
            hiring_type: found.hiring_type || "single",
            budget_credits: found.budget_credits,
            milestones: Array.isArray(found.milestones) ? found.milestones : [],
            thumbnail: getImageUrl(found.thumbnail_path) || getDefaultJobBannerForJob(found.job_id),
          });
        }
      } catch (err) {
        console.error("Failed to load incoming proposals", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [jobPostId]);

  const handleToggleJobStatus = async () => {
    if (!targetJob?.id || isUpdatingJob) return;
    const newStatus = targetJob.status?.toLowerCase() === "closed" ? "Open" : "Closed";
    try {
      setIsUpdatingJob(true);
      if (updateJob) {
        await updateJob(targetJob.id, { status: newStatus });
      }
      setTargetJob((prev: any) => ({ ...prev, status: newStatus }));
      toast.success(`Job post marked as ${newStatus}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update job status");
    } finally {
      setIsUpdatingJob(false);
    }
  };

  const handleUpdateStatus = async (
    id: string,
    newStatus: ProposalStatus,
    reason?: string
  ) => {
    try {
      if (updateProposalStatus) {
        await updateProposalStatus(id, {
          status: newStatus,
          rejectReason: reason,
        });
      }
      setProposals((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: newStatus, rejectionReason: reason || p.rejectionReason }
            : p
        )
      );
    } catch (err: any) {
      console.error("Failed to persist proposal status:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to update proposal status");
    }
  };

  const milestones = targetJob?.milestones || [];
  const hasMilestones = milestones.length > 0;

  // Applicant counts per milestone
  const milestoneApplicantCounts = useMemo(() => {
    return milestones.reduce((acc: any, m: any) => {
      acc[m.job_milestone_id] = proposals.filter(
        (p) => p.job_milestone_id === m.job_milestone_id || p.target_milestone_title === m.title
      ).length;
      return acc;
    }, {});
  }, [milestones, proposals]);

  // Hired counts per milestone
  const milestoneHiredCounts = useMemo(() => {
    return milestones.reduce((acc: any, m: any) => {
      acc[m.job_milestone_id] = proposals.filter(
        (p) =>
          (p.job_milestone_id === m.job_milestone_id || p.target_milestone_title === m.title) &&
          (p.status === "Hired" || p.status === "Accepted")
      ).length;
      return acc;
    }, {});
  }, [milestones, proposals]);

  const totalJobSlots = milestones.reduce((sum: number, m: any) => sum + Math.max(1, m.slots_count || 1), 0);
  const totalHiredSlots = proposals.filter((p) => p.status === "Hired" || p.status === "Accepted").length;
  const activeMilestone = milestones.find((m: any) => m.job_milestone_id === selectedMilestoneId);

  // 5 Sub-Tab Counts
  const counts = useMemo(() => {
    const pool = selectedMilestoneId === "all"
      ? proposals
      : proposals.filter(
          (p) => p.job_milestone_id === selectedMilestoneId || p.target_milestone_title === activeMilestone?.title
        );

    return {
      all: pool.length,
      pending: pool.filter((p) => p.status === "Pending").length,
      shortlisted: pool.filter((p) => p.status === "Shortlisted").length,
      offersAndHired: pool.filter((p) => ["Approved", "Accepted", "Hired"].includes(p.status)).length,
      inactive: pool.filter((p) => ["Rejected", "Withdrawn", "Archived"].includes(p.status)).length,
    };
  }, [proposals, selectedMilestoneId, activeMilestone]);

  // Filter Engine
  const filtered = useMemo(() => {
    return proposals.filter((p) => {
      // 1. Must match target job
      if (jobPostId && p.jobId !== jobPostId) return false;

      // 2. Milestone role filter (if applicable)
      if (selectedMilestoneId !== "all") {
        const matchesMilestone =
          p.job_milestone_id === selectedMilestoneId ||
          p.target_milestone_title === activeMilestone?.title;
        if (!matchesMilestone) return false;
      }

      // 3. Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          p.jobTitle?.toLowerCase().includes(q) ||
          p.partyName?.toLowerCase().includes(q) ||
          p.coverLetter?.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // 4. Sub-tab status filter
      if (activeSubTab === "pending") return p.status === "Pending";
      if (activeSubTab === "shortlisted") return p.status === "Shortlisted";
      if (activeSubTab === "offersAndHired") {
        return ["Approved", "Accepted", "Hired"].includes(p.status);
      }
      if (activeSubTab === "inactive") {
        return ["Rejected", "Withdrawn", "Archived"].includes(p.status);
      }
      return true; // "all"
    });
  }, [proposals, jobPostId, selectedMilestoneId, activeMilestone, searchQuery, activeSubTab]);

  const currentMeta = SUB_TAB_META[activeSubTab];

  if (isLoading) {
    return (
      <div className="space-y-4 text-left w-full">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
          <div className="h-4 w-48 rounded bg-gray-200 dark:bg-white/10 animate-pulse" />
          <div className="h-3 w-20 rounded bg-gray-100 dark:bg-white/5 animate-pulse" />
        </div>
        <ProposalsList
          proposals={[]}
          loading={true}
          viewType={viewType}
          showFilters={false}
        />
      </div>
    );
  }

  const subTabs = [
    { key: "all", label: "All", count: counts.all },
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "shortlisted", label: "Shortlisted", count: counts.shortlisted },
    { key: "offersAndHired", label: "Offers & Hired", count: counts.offersAndHired },
    { key: "inactive", label: "Inactive", count: counts.inactive },
  ] as const;

  const isClosed = targetJob?.status?.toLowerCase() === "closed";

  return (
    <div className="space-y-4 text-left w-full">
      {/* Target Job Header Bar / Currently Opened Job Indicator */}
      <div className="p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            {/* Return Button */}
            <button
              onClick={() => navigate("/jobs/proposals")}
              className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition shrink-0 cursor-pointer"
              title="Return to Job Posts Selection"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            {/* Thumbnail */}
            <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-white/10 shrink-0">
              <img
                src={targetJob?.thumbnail || "/placeholder.svg"}
                alt={targetJob?.title || "Job Cover"}
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg";
                }}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Title & Metadata */}
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                  Target Job Post
                </span>
                <span className="text-gray-300 dark:text-zinc-600">•</span>
                
                {/* Status Indicator Tag */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    isClosed
                      ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isClosed ? "bg-rose-500" : "bg-emerald-500 animate-pulse"
                    }`}
                  />
                  <span>{isClosed ? "Closed" : "Open"}</span>
                </span>

                {targetJob?.category && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700/60">
                    {targetJob.category}
                  </span>
                )}
                {targetJob?.difficulty && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700/60">
                    {targetJob.difficulty}
                  </span>
                )}
                {targetJob?.timeAgo && (
                  <span className="text-[11px] text-gray-400 dark:text-zinc-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {targetJob.timeAgo}
                  </span>
                )}
              </div>

              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                {targetJob?.title || "Job Post"}
              </h2>
            </div>
          </div>

          {/* Right Action Controls & Budget Strip */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
            {targetJob?.priceRange && (
              <div className="px-3 py-1.5 rounded-xl bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                <CreditIcon className="h-3.5 w-3.5" />
                <span>{targetJob.priceRange} Cr</span>
              </div>
            )}

            {/* Toggle Status (Close / Reopen) */}
            <button
              type="button"
              disabled={isUpdatingJob}
              onClick={handleToggleJobStatus}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                isClosed
                  ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                  : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-gray-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400"
              }`}
              title={isClosed ? "Reopen job to receive proposals" : "Close job to stop receiving proposals"}
            >
              {isClosed ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Reopen Post</span>
                </>
              ) : (
                <>
                  <Power className="h-3.5 w-3.5 text-rose-500" />
                  <span>Close Post</span>
                </>
              )}
            </button>

            {/* View Public Listing */}
            <button
              type="button"
              onClick={() => navigate(`/jobs/${jobPostId}/page`)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-xs font-bold text-gray-700 dark:text-zinc-200 transition flex items-center gap-1.5 cursor-pointer"
              title="View Public Marketplace Listing"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">View Post</span>
            </button>

            {/* Edit Post */}
            <button
              type="button"
              onClick={() => navigate(`/jobs/edit/${jobPostId}`)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-xs font-bold text-gray-700 dark:text-zinc-200 transition flex items-center gap-1.5 cursor-pointer"
              title="Edit Job Details"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Milestone Sub-Tabs for Multi-Hire Jobs (if any) */}
      {hasMilestones && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scroll-thin">
            <button
              type="button"
              onClick={() => setSelectedMilestoneId("all")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedMilestoneId === "all"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 hover:border-blue-500/40"
              }`}
            >
              <span>All Milestone Roles</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  selectedMilestoneId === "all"
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-zinc-300"
                }`}
              >
                {proposals.length}
              </span>
            </button>

            {milestones.map((m: any, idx: number) => {
              const isSelected = selectedMilestoneId === m.job_milestone_id;
              const mCount = milestoneApplicantCounts[m.job_milestone_id] || 0;
              const mHired = milestoneHiredCounts[m.job_milestone_id] || 0;
              const mNeeded = Math.max(1, m.slots_count || 1);
              const isFilled = mHired >= mNeeded;

              return (
                <button
                  key={m.job_milestone_id || idx}
                  type="button"
                  onClick={() => setSelectedMilestoneId(m.job_milestone_id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 hover:border-blue-500/40"
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isSelected ? "bg-white/20 text-white" : "bg-blue-500/10 text-blue-500 dark:text-blue-400"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="truncate max-w-[260px] md:max-w-none">{m.title}</span>
                  {isFilled ? (
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✓ Filled
                    </span>
                  ) : (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isSelected ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-zinc-300"
                      }`}
                    >
                      {mCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5 Horizontal Proposal Status Sub-Tabs & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {subTabs.map((tab) => {
            const isActive = activeSubTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveSubTab(tab.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-2 shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm font-bold"
                    : "bg-white dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* View Mode: Cards vs Matrix */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <div className="flex items-center p-0.5 rounded-xl bg-gray-100 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                viewMode === "cards"
                  ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                viewMode === "matrix"
                  ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              <Table className="h-3.5 w-3.5" /> Matrix
            </button>
          </div>

          <span className="text-xs text-zinc-400 font-medium hidden sm:inline">
            {filtered.length} {filtered.length === 1 ? "applicant" : "applicants"}
          </span>
        </div>
      </div>

      {/* Expectation & Status Tag Context Strip */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
            <Info className="h-4 w-4" />
          </div>
          <p className="text-zinc-700 dark:text-zinc-300 font-medium text-xs">
            {currentMeta.description}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">
            Expected Tags:
          </span>
          {currentMeta.tags.map((tag) => (
            <span
              key={tag.label}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-xs ${tag.className}`}
            >
              <Tag className="h-2.5 w-2.5 shrink-0 opacity-90" />
              <span>{tag.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Main Content: Cards or Comparison Matrix */}
      {filtered.length === 0 ? (
        proposals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/20 py-16 px-6 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Briefcase className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              No Proposals Received Yet
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              You haven't received any candidate proposals for this job post yet. Once applicants submit their pitches, milestones, and quotes, they will appear here under Pending.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => navigate(`/jobs/${jobPostId}/page`)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View Public Listing
              </button>
              <button
                type="button"
                onClick={() => navigate(`/jobs/edit/${jobPostId}`)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit Job Details
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/20 p-12 text-center space-y-2">
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              No proposals match "{activeSubTab}" filter
            </p>
            <p className="text-xs text-zinc-400">
              {searchQuery
                ? `No applicants matching "${searchQuery}" found in this category.`
                : `No candidates have applied under ${activeSubTab} review currently.`}
            </p>
            {activeSubTab !== "all" && (
              <button
                type="button"
                onClick={() => setActiveSubTab("all")}
                className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                View All Proposals ({counts.all})
              </button>
            )}
          </div>
        )
      ) : viewMode === "matrix" ? (
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 dark:bg-white/[0.03] text-gray-500 dark:text-zinc-400 font-semibold border-b border-gray-200 dark:border-white/10 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Freelancer</th>
                  <th className="py-3 px-4">Proposed Bid</th>
                  <th className="py-3 px-4">Milestones</th>
                  <th className="py-3 px-4">Screening Q's</th>
                  <th className="py-3 px-4">Work Samples</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-700 dark:text-zinc-300">
                {filtered.map((p) => {
                  const isShortlisted = p.status === "Shortlisted";
                  const ansCount = Array.isArray(p.screening_answers) ? p.screening_answers.length : 0;
                  const attachCount = Array.isArray(p.attachments) ? p.attachments.length : 0;
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {p.partyAvatar ? (
                            <img
                              src={p.partyAvatar}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-white/10"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 font-bold flex items-center justify-center text-xs">
                              {p.partyName?.charAt(0)?.toUpperCase() || "F"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-gray-900 dark:text-white block truncate">
                              {p.partyName}
                            </span>
                            <div className="flex items-center gap-1 text-[11px] text-amber-500">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              <span className="font-semibold">{Number(p.freelancerRating ?? 5.0).toFixed(1)}</span>
                              <span className="text-gray-400 dark:text-zinc-500 text-[10px] ml-1">
                                {p.submittedAt}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
                          <CreditIcon className="w-3.5 h-3.5 text-blue-500" />
                          <span>{p.bidAmount.toLocaleString()} Credits</span>
                        </div>
                        {targetJob?.budget_credits && (
                          <span className="text-[10px] text-gray-400 dark:text-zinc-500 block">
                            {p.bidAmount <= targetJob.budget_credits
                              ? `${Math.round(((targetJob.budget_credits - p.bidAmount) / targetJob.budget_credits) * 100)}% under budget`
                              : `${Math.round(((p.bidAmount - targetJob.budget_credits) / targetJob.budget_credits) * 100)}% over budget`}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {p.milestones?.length || 0} Phase{p.milestones?.length === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {ansCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckSquare className="w-3 h-3" />
                            {ansCount} Answered
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-zinc-500 text-[11px]">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {attachCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <Paperclip className="w-3 h-3" />
                            {attachCount} Sample{attachCount === 1 ? "" : "s"}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-zinc-500 text-[11px]">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === "Shortlisted"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                              : p.status === "Accepted" || p.status === "Hired"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : p.status === "Rejected"
                              ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                              : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateStatus(
                                p.id,
                                isShortlisted ? "Pending" : "Shortlisted"
                              )
                            }
                            title={isShortlisted ? "Remove from Shortlist" : "Add to Shortlist"}
                            className={`p-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                              isShortlisted
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                                : "bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            }`}
                          >
                            <Star className={`w-3.5 h-3.5 ${isShortlisted ? "fill-amber-500 text-amber-500" : ""}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void openMarketplaceConversation({
                                contextType: "job_proposal",
                                contextId: p.id,
                                navigate,
                              })
                            }
                            title="Message Freelancer"
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-zinc-400 hover:text-blue-500 transition cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/jobs/proposals/received/${p.id}`)}
                            title="View Full Proposal"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition cursor-pointer"
                          >
                            <Eye className="w-3 h-3" /> View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <ProposalsList
          proposals={filtered}
          viewType={viewType}
          showFilters={false}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  );
};

export default ProposalsIncomingPage;
