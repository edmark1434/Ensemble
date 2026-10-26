import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext, useParams, useNavigate, useLocation } from "react-router-dom";
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
  Loader2,
  CheckSquare,
  Paperclip,
  Clock,
  Eye,
  Info,
  Tag,
  Pencil,
  Power,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  X,
  UserMinus,
  Sparkles,
  FileText,
  Layers,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useGlobalState from "@/lib/global_state";
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
import { SlideCommit } from "@/components/ui/SlideCommit";
import { ApplicationWindowTimer } from "@/pages/user/6_job_market/job_components/job_utilities/ApplicationWindowTimer";

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
    tags: [],
  },
  pending: {
    description: "Fresh candidate applications waiting for your initial review and screening.",
    tags: [
      {
        label: "PENDING",
        className: "bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-400/50",
      },
    ],
  },
  shortlisted: {
    description: "Top candidate proposals you have starred or bookmarked for prioritized review.",
    tags: [
      {
        label: "SHORTLISTED",
        className: "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/50",
      },
    ],
  },
  offersAndHired: {
    description: "Candidates you have extended contract offers to and active hired contracts.",
    tags: [
      {
        label: "OFFER SENT",
        className: "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/50",
      },
      {
        label: "HIRED",
        className: "bg-purple-50 text-purple-900 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-400/50",
      },
    ],
  },
  inactive: {
    description: "Candidate proposals you have rejected, or applicants who withdrew their submission.",
    tags: [
      {
        label: "REJECTED",
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
  const location = useLocation();
  const user = useGlobalState((state) => state.user);

  const { searchQuery, viewType } = useOutletContext<ProposalsMainContext>();

  const [proposals, setProposals] = useState<any[]>([]);
  const [targetJob, setTargetJob] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<ProposalSubTab>("all");
  const [loadingChatProposalId, setLoadingChatProposalId] = useState<string | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingJob, setIsUpdatingJob] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "matrix">("cards");
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Shortlist confirmation modal state
  const [shortlistTargetProposal, setShortlistTargetProposal] = useState<any | null>(null);
  const [isUpdatingShortlist, setIsUpdatingShortlist] = useState(false);

  // Extend Formal Contract Offer modal state
  const [offerTargetProposal, setOfferTargetProposal] = useState<any | null>(null);
  const [isAcceptConfirmOpen, setIsAcceptConfirmOpen] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToEscrow, setAgreedToEscrow] = useState(false);
  const [contractStartsAt, setContractStartsAt] = useState("");
  const [customMilestones, setCustomMilestones] = useState<any[]>([]);
  const [isCustomizingMilestones, setIsCustomizingMilestones] = useState(false);
  const [customBidAmount, setCustomBidAmount] = useState<number | "">("");
  const [isSendingOffer, setIsSendingOffer] = useState(false);

  const [showLifecycleGuide, setShowLifecycleGuide] = useState<boolean>(() => {
    const saved = localStorage.getItem("ensemble_proposals_show_guide");
    return saved !== null ? saved === "true" : false;
  });

  const toggleLifecycleGuide = () => {
    setShowLifecycleGuide((prev) => {
      const next = !prev;
      localStorage.setItem("ensemble_proposals_show_guide", String(next));
      return next;
    });
  };
  const { fetchProposalsByJob, fetchJobs, updateProposalStatus, updateJob, sendJobOffer } = useJobs();

  // Load wallet balance for escrow validation
  useEffect(() => {
    let isMounted = true;
    api.get("/api/accounts/wallet", { params: { type: "account_wallets" } })
      .then((res) => {
        if (isMounted) {
          setWalletBalance(res.data?.wallet?.balance_credits || 0);
        }
      })
      .catch((err) => console.error("Failed to load wallet balance:", err));
    return () => {
      isMounted = false;
    };
  }, []);

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
          clientAccountId: p.client_account_id,
          partyName: p.freelancer_name || p.freelancer_handle || "Unknown",
          partyAvatar: constructAvatarUrl(p.freelancer_avatar_path, p.freelancer_name || p.freelancer_handle),
          freelancerAccountId: p.freelancer_account_id,
          freelancerType: p.freelancer_type || (p.freelancer_team_id || p.acting_team_id ? "Team" : "User"),
          freelancerTeamId: p.freelancer_team_id,
          actingTeamId: p.acting_team_id || p.freelancer_team_id,
          includedTeamMembers: Array.isArray(p.included_team_members) ? p.included_team_members : [],
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
            postingFeeCredits: found.posting_fee_credits || 50,
            applicantsCount: found.applicants_count || 0,
            milestones: Array.isArray(found.milestones) ? found.milestones : [],
            thumbnail: getImageUrl(found.thumbnail_path) || getDefaultJobBannerForJob(found.job_id),
            applicationDeadline: found.application_deadline,
            isUrgent: Boolean(found.is_urgent),
            freeExtensionCount: found.free_extension_count || 0,
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

  const [isExpireModalOpen, setIsExpireModalOpen] = useState(false);
  const [isExpiring, setIsExpiring] = useState(false);

  const handleExecuteExpireNow = async () => {
    if (!targetJob?.id || isExpiring) return;
    setIsExpiring(true);
    try {
      const res = await api.post(`/api/jobs/${targetJob.id}/expire-now`);
      if (res.data?.success) {
        const refund = targetJob.postingFeeCredits || 50;
        toast.success(res.data.message || `Job closed and ${refund} credits refunded to your wallet.`);
        setTargetJob((prev: any) => ({ ...prev, status: "Closed" }));
        setIsExpireModalOpen(false);

        // Sync user wallet balance in global state
        const curUser = useGlobalState.getState().user;
        if (curUser) {
          const currentBal = Number(curUser.wallet?.balance_credits || 0);
          useGlobalState.getState().setUser({
            ...curUser,
            wallet: {
              ...(curUser.wallet || {}),
              balance_credits: currentBal + Number(refund),
            },
          });
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Failed to expire job");
    } finally {
      setIsExpiring(false);
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

  const handleOpenShortlistConfirm = (proposal: any) => {
    setShortlistTargetProposal(proposal);
  };

  const handleConfirmShortlist = async () => {
    if (!shortlistTargetProposal) return;
    setIsUpdatingShortlist(true);
    const isShortlisted = shortlistTargetProposal.status === "Shortlisted";
    const nextStatus = isShortlisted ? "Pending" : "Shortlisted";
    try {
      await handleUpdateStatus(shortlistTargetProposal.id, nextStatus as ProposalStatus);
      toast.success(
        nextStatus === "Shortlisted"
          ? `${shortlistTargetProposal.partyName} added to shortlist!`
          : `${shortlistTargetProposal.partyName} moved back to pending review.`
      );
      setShortlistTargetProposal(null);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsUpdatingShortlist(false);
    }
  };

  const handleOpenHireModal = (proposal: any) => {
    setOfferTargetProposal(proposal);
    setCustomBidAmount(proposal.bidAmount || 0);
    const count = (proposal.milestones || []).length || 1;
    const initialMilestones = (proposal.milestones || []).map((m: any, idx: number) => ({
      id: m.id || m.proposal_milestone_id || `m-${idx}`,
      name: m.name || `Phase ${idx + 1}`,
      description: m.description || "",
      hours: parseFloat(m.hours) || 0,
      revisions: parseInt(m.revisions, 10) || 0,
      percentage: Number(m.percentage) || Math.round(100 / count),
      tasks: Array.isArray(m.tasks) ? m.tasks.filter(Boolean) : (m.description ? [m.description] : []),
    }));
    setCustomMilestones(initialMilestones);
    setIsCustomizingMilestones(false);
    setAgreedToTerms(false);
    setAgreedToEscrow(false);
    setContractStartsAt("");
    setIsAcceptConfirmOpen(true);
  };

  const handleConfirmSendOffer = async () => {
    if (!offerTargetProposal) return;
    const personalAccountId = user?.account_id;
    const usesPersonalWallet = String(offerTargetProposal.clientAccountId) === String(personalAccountId);
    const candidateBid = offerTargetProposal.bidAmount || 0;
    const numCustomBid = typeof customBidAmount === "number" ? customBidAmount : parseInt(String(customBidAmount), 10);
    const hasValidCustom = !isNaN(numCustomBid) && numCustomBid > 0;
    const effectiveBid = isCustomizingMilestones && hasValidCustom ? numCustomBid : candidateBid;

    if (effectiveBid <= 0) {
      toast.error("Please enter a valid offer amount (greater than 0 Credits).");
      return;
    }

    if (contractStartsAt) {
      const selectedTime = new Date(contractStartsAt).getTime();
      if (selectedTime < Date.now() - 60000) {
        toast.error("Contract start date cannot be in the past.");
        return;
      }
    }

    if (usesPersonalWallet && walletBalance < effectiveBid) {
      toast.error("Insufficient wallet balance to extend contract offer. Please top up your wallet credits.");
      return;
    }

    try {
      setIsSendingOffer(true);
      await sendJobOffer(
        offerTargetProposal.id,
        effectiveBid,
        contractStartsAt ? new Date(contractStartsAt).toISOString() : undefined,
        undefined
      );

      setProposals((prev) =>
        prev.map((p) =>
          p.id === offerTargetProposal.id
            ? { ...p, status: "Accepted", bidAmount: effectiveBid, acceptedAt: new Date().toISOString() }
            : p
        )
      );

      setIsAcceptConfirmOpen(false);
      setOfferTargetProposal(null);
      toast.success(`Formal contract offer extended to ${offerTargetProposal.partyName}!`);
    } catch (err: any) {
      console.error("Failed to send job offer", err);
      toast.error(err.response?.data?.message || err?.message || "Failed to extend contract offer.");
    } finally {
      setIsSendingOffer(false);
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

  const isClosed = targetJob?.status?.toLowerCase() === "closed" || targetJob?.status?.toLowerCase() === "expired";
  const hasZeroProposals = proposals.length === 0 && (targetJob?.applicantsCount || 0) === 0;

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

            {/* Force Close & Expire Post (ONLY visible if job is Open and has 0 proposals) */}
            {!isClosed && hasZeroProposals && (
              <button
                type="button"
                disabled={isExpiring}
                onClick={() => setIsExpireModalOpen(true)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-gray-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                title="Force close job post and refund posting fee"
              >
                <Power className="h-3.5 w-3.5 text-rose-500" />
                <span>Close Post</span>
              </button>
            )}

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

        {/* Application Window Status Bar */}
        {targetJob?.applicationDeadline && (
          <ApplicationWindowTimer
            deadline={targetJob.applicationDeadline}
            status={targetJob.status}
            variant="bar"
            actionButton={
              !isClosed && hasZeroProposals && (
                <button
                  type="button"
                  disabled={isExpiring}
                  onClick={() => setIsExpireModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-500/20 transition cursor-pointer"
                  title="Force close job post and refund posting fee"
                >
                  <Power className="h-3.5 w-3.5 text-rose-500" />
                  <span>Force Close & Expire (Refund {targetJob?.postingFeeCredits || 50} Cr)</span>
                </button>
              )
            }
          />
        )}
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

          <button
            type="button"
            onClick={toggleLifecycleGuide}
            title={showLifecycleGuide ? "Hide lifecycle guide" : "Show lifecycle guide"}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showLifecycleGuide
                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/60 shadow-2xs"
                : "bg-white dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[11px] font-medium">Guide</span>
            {showLifecycleGuide ? (
              <ChevronUp className="h-3 w-3 text-zinc-400" />
            ) : (
              <ChevronDown className="h-3 w-3 text-zinc-400" />
            )}
          </button>
        </div>
      </div>

      {/* Expectation & Status Tag Context Strip */}
      <AnimatePresence>
        {showLifecycleGuide && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-2.5 sm:px-4 sm:py-3 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
                  <Info className="h-3.5 w-3.5" />
                </div>
                <p className="text-zinc-600 dark:text-zinc-300 font-medium text-xs leading-relaxed">
                  {currentMeta.description}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {currentMeta.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {currentMeta.tags.map((tag) => (
                      <span
                        key={tag.label}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-2xs ${tag.className}`}
                      >
                        <Tag className="h-2.5 w-2.5 shrink-0 opacity-80" />
                        <span>{tag.label}</span>
                      </span>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={toggleLifecycleGuide}
                  className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Hide guide"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  const statusLower = (p.status || "").toLowerCase();
                  const isHired = statusLower === "hired";
                  const isShortlisted = statusLower === "shortlisted";
                  const isInactive = ["rejected", "archived", "withdrawn", "closed"].includes(statusLower);
                  const hasHired = proposals.some((item) => (item.status || "").toLowerCase() === "hired");
                  const isJobFilledOrClosed = hasHired || isClosed;
                  const isSubduedRow = (!isHired && isJobFilledOrClosed) || isInactive;
                  const canShortlist = !isJobFilledOrClosed && !isInactive && statusLower !== "accepted" && statusLower !== "approved" && !isHired;
                  const ansCount = Array.isArray(p.screening_answers) ? p.screening_answers.length : 0;
                  const attachCount = Array.isArray(p.attachments) ? p.attachments.length : 0;
                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        isHired
                          ? "bg-purple-500/5 dark:bg-purple-950/20 font-medium"
                          : isSubduedRow
                          ? "opacity-60 hover:opacity-95 bg-gray-50/40 dark:bg-dark-surface/40"
                          : "hover:bg-gray-50/50 dark:hover:bg-white/[0.02]"
                      }`}
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
                          {canShortlist && (
                            <button
                              type="button"
                              onClick={() => handleOpenShortlistConfirm(p)}
                              title={isShortlisted ? "Remove from Shortlist" : "Add to Shortlist"}
                              className={`p-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                                isShortlisted
                                  ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600/30 shadow-sm shadow-amber-500/25"
                                  : "bg-amber-50/80 dark:bg-amber-500/10 border-amber-300/80 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20 hover:border-amber-400 shadow-2xs"
                              }`}
                            >
                              <Star className={`w-3.5 h-3.5 ${isShortlisted ? "fill-white text-white" : "text-amber-600 dark:text-amber-400"}`} />
                            </button>
                          )}
                          {(isShortlisted || p.status === "Accepted" || p.status === "Hired") && (
                            <button
                              type="button"
                              disabled={loadingChatProposalId === p.id}
                              onClick={async () => {
                                try {
                                  setLoadingChatProposalId(p.id);
                                  await openMarketplaceConversation({
                                    contextType: "job_proposal",
                                    contextId: p.id,
                                    navigate,
                                    targetName: p.partyName,
                                    targetAvatar: p.partyAvatar,
                                    listingTitle: p.jobTitle || targetJob?.title,
                                  });
                                } finally {
                                  setLoadingChatProposalId(null);
                                }
                              }}
                              title="Message Freelancer"
                              className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-zinc-400 hover:text-blue-500 transition cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                              {loadingChatProposalId === p.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                              ) : (
                                <MessageSquare className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/jobs/proposals/received/${p.id}`, {
                                state: { returnTo: location.pathname + location.search },
                              })
                            }
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
          isJobClosed={isClosed}
          hasHiredCandidate={proposals.some((p) => (p.status || "").toLowerCase() === "hired")}
          onUpdateStatus={handleUpdateStatus}
          onShortlistCandidate={handleOpenShortlistConfirm}
          onHireCandidate={handleOpenHireModal}
        />
      )}

      {/* =========================================================================
          MODALS: SHORTLIST CONFIRMATION & EXTEND FORMAL CONTRACT OFFER
         ========================================================================= */}

      {/* 1. Shortlist Confirmation Modal */}
      <AnimatePresence>
        {shortlistTargetProposal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-2xl space-y-4 text-left"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-xl ${
                      shortlistTargetProposal.status === "Shortlisted"
                        ? "bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300"
                        : "bg-amber-500/10 text-amber-500"
                    }`}
                  >
                    {shortlistTargetProposal.status === "Shortlisted" ? (
                      <UserMinus className="h-5 w-5" />
                    ) : (
                      <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      {shortlistTargetProposal.status === "Shortlisted"
                        ? "Remove from Shortlist"
                        : "Shortlist Candidate"}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">
                      {targetJob?.title || "Job Post"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShortlistTargetProposal(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Candidate Info Strip */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                {shortlistTargetProposal.partyAvatar ? (
                  <img
                    src={shortlistTargetProposal.partyAvatar}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-white/10"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 font-bold flex items-center justify-center text-sm">
                    {shortlistTargetProposal.partyName?.charAt(0)?.toUpperCase() || "C"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-gray-900 dark:text-white block truncate text-xs sm:text-sm">
                    {shortlistTargetProposal.partyName}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-zinc-400">
                    <span>{shortlistTargetProposal.freelancerType}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-semibold text-amber-500">
                      <CreditIcon className="w-3 h-3" />
                      {shortlistTargetProposal.bidAmount.toLocaleString()} Cr
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                {shortlistTargetProposal.status === "Shortlisted" ? (
                  <>
                    Are you sure you want to remove{" "}
                    <strong className="text-gray-900 dark:text-white">
                      {shortlistTargetProposal.partyName}
                    </strong>{" "}
                    from your shortlist and move them back to regular pending review?
                  </>
                ) : (
                  <>
                    Are you sure you want to shortlist{" "}
                    <strong className="text-gray-900 dark:text-white">
                      {shortlistTargetProposal.partyName}
                    </strong>{" "}
                    for this job post? Shortlisting highlights this candidate and bookmarks them
                    for prioritized consideration and interview.
                  </>
                )}
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShortlistTargetProposal(null)}
                  disabled={isUpdatingShortlist}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmShortlist}
                  disabled={isUpdatingShortlist}
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition shadow-sm cursor-pointer disabled:opacity-50 ${
                    shortlistTargetProposal.status === "Shortlisted"
                      ? "bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                      : "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                  }`}
                >
                  {isUpdatingShortlist
                    ? "Updating..."
                    : shortlistTargetProposal.status === "Shortlisted"
                    ? "Remove from Shortlist"
                    : "Confirm Shortlist"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Extend Formal Contract Offer Modal */}
      <AnimatePresence>
{isAcceptConfirmOpen && offerTargetProposal && (() => {
          const isTargetTeam =
            offerTargetProposal.freelancerType === "Team" ||
            Boolean(offerTargetProposal.freelancerTeamId) ||
            Boolean(offerTargetProposal.actingTeamId);
          const candidateBid = offerTargetProposal.bidAmount || 0;
          const isCountering = isCustomizingMilestones;
          const numCustomBid = typeof customBidAmount === "number" ? customBidAmount : parseInt(String(customBidAmount), 10);
          const hasValidCustom = !isNaN(numCustomBid) && numCustomBid > 0;
          const effectiveBid = isCountering && hasValidCustom ? numCustomBid : candidateBid;
          const hasSufficient = walletBalance >= effectiveBid;
          const remainingBalance = walletBalance - effectiveBid;
          const isCounterActive = isCountering && hasValidCustom && effectiveBid !== candidateBid;
          const delta = effectiveBid - candidateBid;
          const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

          return (
            <div className="fixed inset-0 z-[300000] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isSendingOffer && (setIsAcceptConfirmOpen(false), setOfferTargetProposal(null))}
                className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs cursor-pointer"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="relative z-10 w-full max-w-3xl rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-2xl space-y-5 text-left my-6"
              >
                {/* Header */}
                <div className="flex items-start justify-between pb-3.5 border-b border-gray-100 dark:border-white/10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 text-gray-700 dark:text-zinc-200">
                        <FileText className="h-4 w-4" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                        Extend Formal Contract Offer
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 pl-8">
                      Form a binding milestone contract for{" "}
                      <span className="font-semibold text-gray-900 dark:text-zinc-200">
                        {offerTargetProposal.partyName}
                      </span>
                      {isTargetTeam && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          Creative Team
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isSendingOffer}
                    onClick={() => {
                      setIsAcceptConfirmOpen(false);
                      setOfferTargetProposal(null);
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Two-Column Grid: Left (Financials, Scope & Counter) / Right (Escrow Notice & Agreements) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                  {/* LEFT COLUMN: Financials, Scope & Milestones, Adjust Offer Amount */}
                  <div className="space-y-3.5">
                    {/* Financial Breakdown Card */}
                    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                              Contract Escrow
                            </span>
                            {isCounterActive && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                Counter
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 font-bold text-sm text-gray-900 dark:text-white">
                            <CreditIcon className="h-4 w-4 text-amber-500 flex-shrink-0" />
                            <span>{effectiveBid.toLocaleString()}</span>
                            <span className="text-xs font-normal text-gray-500 dark:text-zinc-400">Credits</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                            Available Balance
                          </span>
                          <div className="flex items-center gap-1.5 font-bold text-sm text-gray-900 dark:text-white">
                            <CreditIcon className="h-4 w-4 text-amber-500 flex-shrink-0" />
                            <span>{walletBalance.toLocaleString()}</span>
                            <span className="text-xs font-normal text-gray-500 dark:text-zinc-400">Credits</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-gray-200/60 dark:border-white/5 flex items-center justify-between text-[11px]">
                        <span className="text-gray-500 dark:text-zinc-400">
                          {hasSufficient ? "Remaining after acceptance:" : "Deposit shortfall:"}
                        </span>
                        <span className={`font-semibold ${hasSufficient ? "text-gray-700 dark:text-zinc-300" : "text-rose-600 dark:text-rose-400"}`}>
                          {hasSufficient
                            ? `${remainingBalance.toLocaleString()} Credits`
                            : `${Math.abs(remainingBalance).toLocaleString()} Credits needed`}
                        </span>
                      </div>
                    </div>

                    {/* Scope & Milestones (Deliverables preserved intact from candidate/team) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-gray-500 dark:text-zinc-400" />
                          <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                            Scope &amp; Milestones
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                          Preserved intact ({offerTargetProposal.milestones?.length || 1} {(offerTargetProposal.milestones?.length || 1) === 1 ? "phase" : "phases"})
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {(offerTargetProposal.milestones && offerTargetProposal.milestones.length > 0
                          ? offerTargetProposal.milestones
                          : [{ name: "Project Completion & Deliverables", hours: 0, revisions: 0 }]
                        ).map((m: any, idx: number) => (
                          <div
                            key={m.id || idx}
                            className="px-3 py-2 rounded-lg border border-gray-200/70 dark:border-white/5 bg-gray-50/60 dark:bg-white/[0.02] flex items-center justify-between text-xs"
                          >
                            <span className="font-medium text-gray-800 dark:text-zinc-200 truncate pr-2">
                              {m.name || `Phase ${idx + 1}`}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-zinc-400 shrink-0">
                              {Boolean(m.hours) && <span>{m.hours} hrs</span>}
                              {Boolean(m.hours && m.revisions !== undefined) && <span>•</span>}
                              {m.revisions !== undefined && (
                                <span>{m.revisions} {m.revisions === 1 ? "rev" : "revs"}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Adjust Offer Amount (Credits-Only Counter) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5 text-gray-500 dark:text-zinc-400" />
                          <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                            Adjust Offer Amount (Counter-Offer)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (isCountering) {
                              setIsCustomizingMilestones(false);
                              setCustomBidAmount(candidateBid);
                            } else {
                              setIsCustomizingMilestones(true);
                              if (!customBidAmount) setCustomBidAmount(candidateBid);
                            }
                          }}
                          className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          {isCountering ? `Reset to Proposed (${candidateBid.toLocaleString()} Cr)` : "Counter Proposed Rate"}
                        </button>
                      </div>

                      {isCountering ? (
                        <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 space-y-2.5">
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <label className="text-gray-600 dark:text-zinc-400 font-medium">
                              Counter Offer Amount (Credits):
                            </label>
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder={candidateBid ? candidateBid.toLocaleString() : "0"}
                                value={customBidAmount === "" ? "" : customBidAmount}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, "");
                                  if (val === "") {
                                    setCustomBidAmount("");
                                  } else {
                                    const parsed = parseInt(val, 10);
                                    setCustomBidAmount(isNaN(parsed) ? "" : parsed);
                                  }
                                }}
                                onBlur={() => {
                                  if (customBidAmount === "" || Number(customBidAmount) <= 0) {
                                    setCustomBidAmount(candidateBid || 10);
                                  }
                                }}
                                className="w-36 text-right rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 pr-7 pl-2.5 py-1.5 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              />
                              <span className="absolute right-2.5 text-[11px] font-semibold text-gray-400 dark:text-zinc-500 pointer-events-none">
                                Cr
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-gray-200/60 dark:border-white/5">
                            <span className="text-gray-500 dark:text-zinc-400">
                              {isTargetTeam ? "Team proposed:" : "Candidate proposed:"}{" "}
                              <strong className="text-gray-700 dark:text-zinc-300">{candidateBid.toLocaleString()} Credits</strong>
                            </span>
                            {isCounterActive ? (
                              <span className={`font-semibold ${delta < 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                {delta < 0
                                  ? `-${Math.abs(delta).toLocaleString()} Cr (${Math.round((Math.abs(delta) / (candidateBid || 1)) * 100)}% discount)`
                                  : `+${delta.toLocaleString()} Cr (+${Math.round((delta / (candidateBid || 1)) * 100)}% bonus)`}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-zinc-500 italic">Matches proposed rate</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="px-3 py-2.5 rounded-xl border border-gray-200/80 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400">
                          <span>
                            {isTargetTeam ? "Team proposed:" : "Candidate proposed:"}{" "}
                            <strong className="text-gray-800 dark:text-zinc-200">{candidateBid.toLocaleString()} Credits</strong>
                          </span>
                          <span className="text-[11px] text-gray-400 dark:text-zinc-500">Uncountered</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Only Firm Commitment & Escrow Hold Checkboxes */}
                  <div className="space-y-3.5">
                    {/* Upfront Escrow Commitment Notice */}
                    <div className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] flex items-start gap-3">
                      <Lock className="w-4 h-4 text-gray-700 dark:text-zinc-300 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 text-xs">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {isCounterActive ? "Counter-Offer & Upfront Escrow Lock" : "Firm Commitment & Upfront Escrow Lock"}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed">
                          {isCounterActive
                            ? `Extending this counter-offer locks your adjusted rate of ${effectiveBid.toLocaleString()} Credits into escrow immediately. ${isTargetTeam ? "The team leader" : "The candidate"} will be invited to review and sign your countered terms.`
                            : `Extending this offer is final and immediately locks ${effectiveBid.toLocaleString()} Credits from your wallet into platform escrow. Ensure scope, milestones, and rate are mutually aligned before sending.`}
                        </p>
                      </div>
                    </div>

                    {/* Dual Agreement Checkboxes */}
                    <div className="space-y-2.5">
                      <label className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 cursor-pointer text-xs text-gray-600 dark:text-zinc-300 transition hover:bg-gray-50/80 dark:hover:bg-white/[0.02]">
                        <input
                          type="checkbox"
                          checked={agreedToEscrow}
                          onChange={(e) => setAgreedToEscrow(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-white/20 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="leading-relaxed">
                          <strong className="font-semibold text-gray-900 dark:text-white block mb-0.5">
                            Acknowledge Upfront Escrow Hold
                          </strong>
                          I understand that {effectiveBid.toLocaleString()} Credits will be debited from my wallet and locked into platform escrow immediately upon sending this offer.
                        </span>
                      </label>

                      <label className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 cursor-pointer text-xs text-gray-600 dark:text-zinc-300 transition hover:bg-gray-50/80 dark:hover:bg-white/[0.02]">
                        <input
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-white/20 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="leading-relaxed">
                          <strong className="font-semibold text-gray-900 dark:text-white block mb-0.5">
                            {isCounterActive
                              ? isTargetTeam
                                ? "Agree to Team's Scope & Milestones at Countered Rate"
                                : "Agree to Scope & Milestones at Countered Rate"
                              : isTargetTeam
                                ? "I Agree to the Team's Proposed Proposal"
                                : "I Agree to the Freelancer's Proposed Terms"}
                          </strong>
                          {isCounterActive
                            ? isTargetTeam
                              ? `I accept the team's deliverable phases, revisions, and schedule, with my counter-offer of ${effectiveBid.toLocaleString()} Credits applied.`
                              : `I accept the candidate's deliverable phases, revisions, and schedule, with my counter-offer of ${effectiveBid.toLocaleString()} Credits applied.`
                            : isTargetTeam
                              ? `I agree to the team's proposed milestone deliverables, revision limits, and rate of ${effectiveBid.toLocaleString()} Credits.`
                              : `I agree to the candidate's proposed milestone deliverables, revision limits, and rate of ${effectiveBid.toLocaleString()} Credits.`}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Action Controls */}
                <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAcceptConfirmOpen(false);
                      setOfferTargetProposal(null);
                    }}
                    disabled={isSendingOffer}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer disabled:opacity-50 text-center"
                  >
                    Cancel
                  </button>
                  <SlideCommit
                    label={`Swipe to Pay ${effectiveBid.toLocaleString()} Credits`}
                    doneLabel={`Paid ${effectiveBid.toLocaleString()} Credits`}
                    errorLabel="Offer Failed"
                    onConfirm={handleConfirmSendOffer}
                    disabled={isSendingOffer || !agreedToEscrow || !agreedToTerms || !hasSufficient || (isCountering && (!hasValidCustom || numCustomBid <= 0))}
                    width={280}
                    height={46}
                    trackColor={isDark ? "#27272a" : "#e4e4e7"}
                    handleColor="#2563eb"
                    textColor={isDark ? "#f4f4f5" : "#18181b"}
                    successColor="#10b981"
                  />
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

        {/* Expire & Refund Confirmation Modal */}
      <AnimatePresence>
        {isExpireModalOpen && (
          <div className="fixed inset-0 z-[300000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isExpiring && setIsExpireModalOpen(false)}
              className="absolute inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-xs cursor-pointer"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-gray-100 dark:border-white/10 mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                    Force Close Job Post
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    Expire intake window immediately and refund posting fee
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isExpiring}
                  onClick={() => setIsExpireModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body Description */}
              <div className="space-y-3 mb-5">
                <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                  {`Are you sure you want to force close and expire this job post immediately? Since 0 proposals have been submitted, the intake window will be terminated immediately and your full posting fee (${targetJob?.postingFeeCredits || 50} Credits) will be refunded to your wallet.`}
                </p>

                <div className="p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] flex items-center justify-between text-xs font-semibold">
                  <span className="text-gray-500 dark:text-zinc-400">
                    Refund to Wallet:
                  </span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    {`${targetJob?.postingFeeCredits || 50} Credits`}
                  </span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isExpiring}
                  onClick={() => setIsExpireModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isExpiring}
                  onClick={handleExecuteExpireNow}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isExpiring ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Closing...</span>
                    </>
                  ) : (
                    <span>Force Close &amp; Refund</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProposalsIncomingPage;
