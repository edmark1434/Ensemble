import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext, useNavigate, useLocation } from "react-router-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Search, Info, Tag, HelpCircle, ChevronDown, ChevronUp, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ProposalsList, {
  type ProposalStatus,
} from "../proposals_components/proposals_list";
import type { ProposalsMainContext } from "../proposals_main";
import { useJobs } from "@/hooks/useJobs";
import { constructAvatarUrl } from "@/lib/accountAvatars";

type ProposalSubTab = "all" | "pending" | "shortlisted" | "offersAndHired" | "inactive";

const SUB_TAB_META: Record<
  ProposalSubTab,
  {
    description: string;
    tags: { label: string; className: string }[];
  }
> = {
  all: {
    description: "Overview of all submitted proposals across every lifecycle stage.",
    tags: [],
  },
  pending: {
    description: "Submitted proposals awaiting client review or screening.",
    tags: [
      {
        label: "PENDING",
        className: "bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-400/50",
      },
    ],
  },
  shortlisted: {
    description: "Proposals starred by the client for prioritized evaluation and interview.",
    tags: [
      {
        label: "SHORTLISTED",
        className: "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/50",
      },
    ],
  },
  offersAndHired: {
    description: "Proposals with formal contract offers extended or active hired contracts.",
    tags: [
      {
        label: "ACCEPTED",
        className: "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/50",
      },
      {
        label: "HIRED",
        className: "bg-purple-50 text-purple-900 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-400/50",
      },
    ],
  },
  inactive: {
    description: "Proposals that were declined by the client, withdrawn, or archived.",
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

export const ProposalsSentPage: React.FC = () => {
  const { searchQuery, viewType } = useOutletContext<ProposalsMainContext>();

  const [proposals, setProposals] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<ProposalSubTab>("all");
  const [isLoading, setIsLoading] = useState(true);
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

  const { fetchSentProposals } = useJobs();
  const navigate = useNavigate();
  const location = useLocation();
  const proposalScope = location.pathname.startsWith("/jobs/proposals/team-sent") ? "teams" : "all";
  const isTeamProposals = proposalScope === "teams";

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const fetched = await fetchSentProposals(proposalScope);
        const mapped = fetched.map((p: any) => ({
          id: p.proposal_id,
          jobId: p.job_id,
          jobTitle: p.job_title || "Unknown Job",
          jobCategory: p.job_category || "Uncategorized",
          clientAccountId: p.client_account_id,
          clientTeamId: p.client_team_id || undefined,
          freelancerTeamId: p.freelancer_team_id || undefined,
          actingTeamId: p.acting_team_id || p.freelancer_team_id || undefined,
          includedTeamMembers: Array.isArray(p.included_team_members) ? p.included_team_members : [],
          freelancerType: p.freelancer_type || (p.freelancer_team_id || p.acting_team_id ? "Team" : "User"),
          freelancerAccountId: p.freelancer_account_id,
          partyName: p.freelancer_name || p.freelancer_handle || p.client_name || p.client_handle || "Unknown",
          partyAvatar: constructAvatarUrl(p.freelancer_avatar_path, p.freelancer_name || p.freelancer_handle),
          clientName: p.client_name || p.client_handle,
          clientHandle: p.client_handle,
          clientAvatar: constructAvatarUrl(p.client_avatar_path, p.client_name || p.client_handle),
          rating: p.freelancer_rating != null ? Number(p.freelancer_rating) : 5.0,
          freelancerRating: p.freelancer_rating != null ? Number(p.freelancer_rating) : 5.0,
          bidAmount: parseFloat(p.rate_credits) || 0,
          additionalWorkRate: parseFloat(p.revision_price_credits) || 0,
          status: p.status,
          submittedAt: new Date(p.created_at).toLocaleDateString(),
          coverLetter: p.letter || "",
          rejectionReason: p.reject_reason,
          milestones: p.milestones || [],
          viewedAt: p.viewed_at,
          shortlistedAt: p.shortlisted_at,
          type: "sent",
        }));
        setProposals(mapped);
      } catch (err) {
        console.error("Failed to load sent proposals", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [proposalScope]);

  const handleUpdateStatus = (
    id: string,
    newStatus: ProposalStatus,
    reason?: string
  ) => {
    setProposals((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: newStatus, rejectionReason: reason || p.rejectionReason }
          : p
      )
    );
  };

  // 5 Sub-Tab Counts
  const counts = useMemo(() => {
    return {
      all: proposals.length,
      pending: proposals.filter((p) => p.status === "Pending").length,
      shortlisted: proposals.filter((p) => p.status === "Shortlisted").length,
      offersAndHired: proposals.filter((p) =>
        ["Approved", "Accepted", "Hired"].includes(p.status)
      ).length,
      inactive: proposals.filter((p) =>
        ["Rejected", "Withdrawn", "Archived"].includes(p.status)
      ).length,
    };
  }, [proposals]);

  // Filter & Search Engine
  const filtered = useMemo(() => {
    return proposals.filter((p) => {
      // 1. Search Query Match
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          p.jobTitle?.toLowerCase().includes(q) ||
          p.partyName?.toLowerCase().includes(q) ||
          p.coverLetter?.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // 2. Sub-Tab Match
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
  }, [proposals, searchQuery, activeSubTab]);

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

  if (proposals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center w-full">
        <div className="w-24 h-24 flex items-center justify-center mb-2 opacity-80 pointer-events-none">
          <DotLottieReact src="/icons/lottie/no-result.lottie" autoplay loop />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          {isTeamProposals ? "No Team Proposals Yet" : "No Personal Proposals Yet"}
        </h3>
        <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm">
          {isTeamProposals
            ? "Your Teams have not submitted any job proposals yet."
            : "You have not submitted any personal job proposals yet."}
        </p>
        <button
          onClick={() => navigate("/jobs/postings")}
          className="mt-4 px-6 py-2.5 rounded-xl bg-blue-500 text-xs font-bold text-white hover:bg-blue-600 transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Search className="h-4 w-4" /> Look for Jobs
        </button>
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

  return (
    <div className="space-y-4 text-left w-full">
      {/* 5 Horizontal Proposal Status Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-zinc-400 font-medium hidden sm:inline">
            {filtered.length} {filtered.length === 1 ? "proposal" : "proposals"}
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

      {/* Proposals List (Full-Width Grid or List) */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/20 p-12 text-center space-y-2">
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            No proposals match "{activeSubTab}" filter
          </p>
          <p className="text-xs text-zinc-400">
            {searchQuery
              ? `No proposals matching "${searchQuery}" found in this category.`
              : `You have no applications under ${activeSubTab} review currently.`}
          </p>
          {activeSubTab !== "all" && (
            <button
              onClick={() => setActiveSubTab("all")}
              className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              View All Proposals ({counts.all})
            </button>
          )}
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

export default ProposalsSentPage;
