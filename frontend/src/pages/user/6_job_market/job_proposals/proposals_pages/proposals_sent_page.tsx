import React, { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Search } from "lucide-react";
import ProposalsList, {
  type ProposalStatus,
} from "../proposals_components/proposals_list";
import { sampleSentProposals } from "../proposals_datasets";
import type { ProposalsMainContext } from "../proposals_main";
import { useJobs } from "@/hooks/useJobs";

export const ProposalsSentPage: React.FC = () => {
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
    setChildProposalsCounts,
  } = useOutletContext<ProposalsMainContext>();

  const [proposals, setProposals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { fetchSentProposals } = useJobs();
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const fetched = await fetchSentProposals();
        const mapped = fetched.map((p: any) => ({
          id: p.proposal_id,
          jobId: p.job_id,
          jobTitle: p.job_title || "Unknown Job",
          jobCategory: p.job_category || "Uncategorized",
          partyName: p.client_name || p.client_handle || "Unknown",
          partyAvatar: p.client_avatar_path
            ? `${import.meta.env.VITE_CLOUDFRONT_URL}${p.client_avatar_path.startsWith('/') ? '' : '/'}${p.client_avatar_path}`
            : undefined,
          bidAmount: parseFloat(p.rate_credits) || 0,
          additionalWorkRate: parseFloat(p.revision_price_credits) || 0,
          status: p.status,
          submittedAt: new Date(p.created_at).toLocaleDateString(),
          coverLetter: p.letter || "",
          rejectionReason: p.reject_reason,
          milestones: p.milestones || [],
          type: "sent"
        }));
        setProposals(mapped);
      } catch (err) {
        console.error("Failed to load sent proposals", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => {
    if (setChildProposalsCounts) {
      const counts = {
        All: proposals.length,
        Pending: 0,
        Shortlisted: 0,
        Accepted: 0,
        Rejected: 0,
      };
      proposals.forEach((p) => {
        if (p.status in counts) {
          counts[p.status as keyof typeof counts]++;
        }
      });
      setChildProposalsCounts(counts);
    }
  }, [proposals, setChildProposalsCounts]);

  // Full Filter & Sort Engine for Sent Proposals
  const filtered = proposals
    .filter((p) => {
      // 1. Status Filter
      const matchesStatus = activeStatus === "All" || p.status === activeStatus;

      // 2. Search Query Match
      const matchesSearch =
        p.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.partyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.coverLetter.toLowerCase().includes(searchQuery.toLowerCase());

      // 3. Price Filter Range
      const matchesMinPrice = minPrice === "" || p.bidAmount >= parseInt(minPrice);
      const matchesMaxPrice = maxPrice === "" || p.bidAmount <= parseInt(maxPrice);

      // 4. Exact Milestones Count
      const matchesMilestones =
        milestonesValue === "" ||
        (p.milestones && p.milestones.length === parseInt(milestonesValue));

      return (
        matchesStatus &&
        matchesSearch &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesMilestones
      );
    })
    .sort((a, b) => {
      // Sorting Logic
      if (priceSort === "inc") return a.bidAmount - b.bidAmount;
      if (priceSort === "dec") return b.bidAmount - a.bidAmount;
      if (milestonesSort === "inc")
        return (a.milestones?.length || 0) - (b.milestones?.length || 0);
      if (milestonesSort === "dec")
        return (b.milestones?.length || 0) - (a.milestones?.length || 0);
      if (revisionRateSort === "inc")
        return a.additionalWorkRate - b.additionalWorkRate;
      if (revisionRateSort === "dec")
        return b.additionalWorkRate - a.additionalWorkRate;
      if (dateSort === "inc")
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      if (dateSort === "dec")
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      return 0;
    });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 dark:text-zinc-400 text-sm animate-pulse">Loading sent proposals...</p>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <div className="w-24 h-24 flex items-center justify-center mb-2 opacity-80 pointer-events-none">
          <DotLottieReact src="/icons/lottie/no-result.lottie" autoplay loop />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Proposals Sent Yet</h3>
        <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm">You haven't applied to any jobs yet. Start exploring the job market to find your next gig!</p>
        <button
          onClick={() => navigate('/jobs/postings')}
          className="mt-4 px-6 py-2.5 rounded-xl bg-blue-500 text-xs font-bold text-white hover:bg-blue-600 transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
        >
          <Search className="h-4 w-4" /> Look for Jobs
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-left">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
          Submitted Proposal Applications ({filtered.length})
        </h2>
        <span className="text-xs text-gray-500 dark:text-zinc-400 font-mono">My Proposals</span>
      </div>

      <ProposalsList
        proposals={filtered}
        viewType={viewType}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
};

export default ProposalsSentPage;