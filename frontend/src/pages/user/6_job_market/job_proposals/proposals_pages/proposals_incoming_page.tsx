import React, { useState, useEffect } from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Briefcase, ExternalLink, CheckCircle2, Users, Table, LayoutGrid, Star, MessageSquare, CheckSquare, Paperclip, Clock, Eye, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { CreditIcon } from "@/components/ui/credit-icon";
import { openMarketplaceConversation } from "@/components/ui/inbox/marketplace_conversation";
import ProposalsList, { type ProposalStatus } from "../proposals_components/proposals_list";
import { useJobs } from "@/hooks/useJobs";
import api from "@/lib/axios";
import type { ProposalsMainContext } from "../proposals_main";
import { continueIfAccountVerified } from "@/lib/accountVerification";
import toast from "react-hot-toast";

export const ProposalsIncomingPage: React.FC = () => {
  const { jobPostId } = useParams<{ jobPostId: string }>();
  const navigate = useNavigate();

  const {
    searchQuery,
    activeStatus,
    minPrice,
    maxPrice,
    priceSort,
    milestonesValue,
    milestonesSort,
    revisionRateSort,
    dateSort,
    viewType,
    showFilters,
    setShowFilters,
    setActiveStatus,
    setChildProposalsCounts,
  } = useOutletContext<ProposalsMainContext>();

  const [proposals, setProposals] = useState<any[]>([]);
  const [targetJob, setTargetJob] = useState<any>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"cards" | "matrix">("cards");
  const { fetchProposalsByJob, fetchJobs, updateProposalStatus } = useJobs();

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
          partyAvatar: p.freelancer_avatar_path
            ? `${import.meta.env.VITE_CLOUDFRONT_URL}${p.freelancer_avatar_path.startsWith('/') ? '' : '/'}${p.freelancer_avatar_path}`
            : undefined,
          freelancerAccountId: p.freelancer_account_id,
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
          type: "incoming"
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
          // fallback to list fetch
        }

        if (!found) {
          const jobs = await fetchJobs();
          found = jobs.find((j: any) => j.job_id === jobPostId);
        }

        if (found) {
          setTargetJob({ 
            title: found.title,
            hiring_type: found.hiring_type || "single",
            budget_credits: found.budget_credits,
            milestones: Array.isArray(found.milestones) ? found.milestones : [],
            thumbnail: getImageUrl(found.thumbnail_path) || "/placeholder.svg"
          });
        }

        // Calculate and report status counts to parent
        const counts = { All: mapped.length, Pending: 0, Shortlisted: 0, Accepted: 0, Rejected: 0, Withdrawn: 0, Archived: 0, Hired: 0 };
        mapped.forEach((p: any) => {
          if (p.status in counts) {
            counts[p.status as keyof typeof counts]++;
          } else if (p.status === "Approved") {
            counts.Accepted++;
          }
        });
        setChildProposalsCounts(counts);
      } catch (err) {
        console.error("Failed to load incoming proposals", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobPostId]);

  const handleUpdateStatus = async (
    id: string,
    newStatus: ProposalStatus,
    reason?: string
  ) => {
    try {
      await updateProposalStatus(id, {
        status: newStatus,
        rejectReason: reason,
      });
      setProposals((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: newStatus, rejectionReason: reason || p.rejectionReason }
            : p
        )
      );
      setChildProposalsCounts((prevCounts: any) => {
        if (!prevCounts) return prevCounts;
        return {
          ...prevCounts,
          [newStatus]: (prevCounts[newStatus] || 0) + 1,
        };
      });
    } catch (err: any) {
      console.error("Failed to persist proposal status:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to update proposal status");
    }
  };

  const milestones = targetJob?.milestones || [];
  const hasMilestones = milestones.length > 0;

  // Applicant counts per milestone
  const milestoneApplicantCounts = milestones.reduce((acc: any, m: any) => {
    acc[m.job_milestone_id] = proposals.filter(
      (p) => p.job_milestone_id === m.job_milestone_id || p.target_milestone_title === m.title
    ).length;
    return acc;
  }, {});

  // Hired counts per milestone
  const milestoneHiredCounts = milestones.reduce((acc: any, m: any) => {
    acc[m.job_milestone_id] = proposals.filter(
      (p) =>
        (p.job_milestone_id === m.job_milestone_id || p.target_milestone_title === m.title) &&
        (p.status === "Hired" || p.status === "Accepted")
    ).length;
    return acc;
  }, {});

  const totalJobSlots = milestones.reduce((sum: number, m: any) => sum + Math.max(1, m.slots_count || 1), 0);
  const totalHiredSlots = proposals.filter((p) => p.status === "Hired" || p.status === "Accepted").length;

  const activeMilestone = milestones.find((m: any) => m.job_milestone_id === selectedMilestoneId);

  const filtered = proposals
    .filter((p) => {
      // 1. Must match the route parameter jobPostId
      const matchesJob = jobPostId ? p.jobId === jobPostId : true;

      // 2. Status Match
      const matchesStatus = activeStatus === "All" || p.status === activeStatus;

      // 3. Search Match
      const matchesSearch =
        p.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.partyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.coverLetter.toLowerCase().includes(searchQuery.toLowerCase());

      // 4. Price Filter
      const matchesMinPrice = minPrice === "" || p.bidAmount >= parseInt(minPrice);
      const matchesMaxPrice = maxPrice === "" || p.bidAmount <= parseInt(maxPrice);

      // 5. Milestones Exact Count Filter
      const matchesMilestones =
        milestonesValue === "" ||
        (p.milestones && p.milestones.length === parseInt(milestonesValue));

      // 6. Milestone Sub-Tabs Filter
      const matchesMilestoneTab =
        selectedMilestoneId === "all" ||
        p.job_milestone_id === selectedMilestoneId ||
        p.target_milestone_title === activeMilestone?.title;

      return (
        matchesJob &&
        matchesStatus &&
        matchesSearch &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesMilestones &&
        matchesMilestoneTab
      );
    })
    .sort((a, b) => {
      if (priceSort === "inc") return a.bidAmount - b.bidAmount;
      if (priceSort === "dec") return b.bidAmount - a.bidAmount;
      if (milestonesSort === "inc") return (a.milestones?.length || 0) - (b.milestones?.length || 0);
      if (milestonesSort === "dec") return (b.milestones?.length || 0) - (a.milestones?.length || 0);
      if (revisionRateSort === "inc") return a.additionalWorkRate - b.additionalWorkRate;
      if (revisionRateSort === "dec") return b.additionalWorkRate - a.additionalWorkRate;
      if (dateSort === "inc") return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      if (dateSort === "dec") return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      return 0;
    });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 dark:text-zinc-400 text-sm animate-pulse">Loading incoming proposals...</p>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <div className="w-16 h-16 bg-white dark:bg-white/5 shadow-sm dark:shadow-none rounded-full flex items-center justify-center mb-2">
          <Briefcase className="h-8 w-8 text-blue-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Proposals Received Yet</h3>
        <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm">You haven't received any proposals for this job post yet, or you haven't created a job post.</p>
        <button
          onClick={() => continueIfAccountVerified(() => navigate('/jobs/create'))}
          className="mt-4 px-6 py-2.5 rounded-xl bg-blue-500 text-xs font-bold text-gray-900 dark:text-white hover:bg-blue-600 transition shadow-lg shadow-blue-500/20 cursor-pointer"
        >
          Create a Job Post
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-left">
      {/* Target Job Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate("/jobs/proposals")}
            className="p-2 rounded-xl bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition shrink-0 cursor-pointer"
            title="Return to Job Posts Selection"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex items-center gap-3">
            {targetJob?.thumbnail && (
              <img 
                src={targetJob.thumbnail} 
                alt="" 
                className="h-10 w-10 rounded-lg object-cover border border-gray-200 dark:border-white/10 shrink-0" 
              />
            )}
            <div>
              <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-0.5">
                Viewing Proposals
              </span>
              <button
                type="button"
                onClick={() => navigate(`/jobs/my-job-post/${jobPostId}`)}
                className="text-sm font-bold text-gray-900 dark:text-white hover:text-blue-400 transition-colors flex items-center gap-2 truncate text-left cursor-pointer"
                title="View My Job Post Details"
              >
                <span className="truncate">{targetJob?.title || "Job Post"}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {hasMilestones && (
            <span className="text-xs font-medium px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100/60 dark:bg-white/5 text-gray-700 dark:text-zinc-300 shrink-0 whitespace-nowrap">
              <strong className="font-bold text-gray-900 dark:text-white">{totalHiredSlots}</strong> of {totalJobSlots} Slots Filled
            </span>
          )}

          <span className="text-xs font-medium px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100/60 dark:bg-white/5 text-gray-700 dark:text-zinc-300 shrink-0 whitespace-nowrap">
            <strong className="font-bold text-gray-900 dark:text-white">{filtered.length}</strong> Applicant{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Milestone Sub-Tabs for Team Jobs */}
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
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                selectedMilestoneId === "all"
                  ? "bg-white/20 text-white"
                  : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-zinc-300"
              }`}>
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
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-blue-500/10 text-blue-500 dark:text-blue-400"
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="truncate max-w-[260px] md:max-w-none">{m.title}</span>
                  {isFilled ? (
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✓ Filled
                    </span>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isSelected ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-zinc-300"
                    }`}>
                      {mCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Milestone Context Strip */}
          {activeMilestone && (
            <div className="p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.03] space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-zinc-300 flex items-center justify-center text-xs font-bold">
                    {milestones.findIndex((m: any) => m.job_milestone_id === selectedMilestoneId) + 1}
                  </span>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    {activeMilestone.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Slot Status Badge */}
                  {(milestoneHiredCounts[activeMilestone.job_milestone_id] || 0) >= Math.max(1, activeMilestone.slots_count || 1) ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      All Role Openings Filled ({milestoneHiredCounts[activeMilestone.job_milestone_id] || 0}/{Math.max(1, activeMilestone.slots_count || 1)})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300">
                      <Users className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-500" />
                      {Math.max(1, activeMilestone.slots_count || 1) - (milestoneHiredCounts[activeMilestone.job_milestone_id] || 0)} of {Math.max(1, activeMilestone.slots_count || 1)} Openings Available
                    </span>
                  )}

                  {/* Budget Allocation */}
                  {(activeMilestone.budget_allocation_percentage || activeMilestone.percentage) && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300">
                      {activeMilestone.budget_allocation_percentage || activeMilestone.percentage}% Budget Allocation
                    </span>
                  )}
                </div>
              </div>

              {activeMilestone.description && (
                <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed pl-8">
                  {activeMilestone.description}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Proposals Section Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2 mt-4">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
          {hasMilestones && selectedMilestoneId !== "all"
            ? `${activeMilestone?.title || "Milestone"} Applicants (${filtered.length})`
            : `Received Proposal Applications (${filtered.length})`}
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs">
            <button
              type="button"
              onClick={() => {
                setViewMode("cards");
                setShowFilters(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                viewMode === "cards"
                  ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Cards
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("matrix");
                setShowFilters(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                viewMode === "matrix"
                  ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              <Table className="h-3.5 w-3.5" /> Comparison Matrix
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              showFilters
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
                : "bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
            }`}
            title={showFilters ? "Collapse Proposal Statuses & Filters sidebar" : "Expand Proposal Statuses & Filters sidebar"}
          >
            {showFilters ? (
              <>
                <PanelLeftClose className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Hide Sidebar</span>
              </>
            ) : (
              <>
                <PanelLeftOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Filters & Statuses</span>
              </>
            )}
          </button>

          <span className="text-xs text-gray-500 dark:text-zinc-400 font-mono hidden sm:inline">Incoming</span>
        </div>
      </div>

      {/* Proposal Cards List / Grid or Comparison Matrix */}
      {viewMode === "matrix" ? (
        <div className="space-y-3">
          {/* Quick status bar for Comparison Matrix */}
          <div className="flex items-center justify-between flex-wrap gap-2 px-1">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {(["All", "Pending", "Shortlisted", "Accepted", "Hired", "Rejected"] as const).map((st) => {
                const count = st === "All" ? proposals.length : proposals.filter((p) => p.status === st).length;
                const isActive = activeStatus === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setActiveStatus && setActiveStatus(st as any)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/10"
                    }`}
                  >
                    <span>{st}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-zinc-300"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-gray-500 dark:text-zinc-400">
              Showing <span className="font-bold text-gray-900 dark:text-white">{filtered.length}</span> of {proposals.length} applications
            </div>
          </div>

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
        </div>
      ) : (
        <ProposalsList
          proposals={filtered}
          viewType={viewType}
          showFilters={showFilters}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  );
};

export default ProposalsIncomingPage;