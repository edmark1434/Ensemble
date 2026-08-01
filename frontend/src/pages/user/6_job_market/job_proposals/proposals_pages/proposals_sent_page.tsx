import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
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
  } = useOutletContext<ProposalsMainContext>();

  const [proposals, setProposals] = useState<any[]>([]);
  const { fetchSentProposals } = useJobs();

  useEffect(() => {
    const loadData = async () => {
      try {
        const fetched = await fetchSentProposals();
        const mapped = fetched.map((p: any) => ({
          id: p.proposal_id,
          jobId: p.job_id,
          jobTitle: p.job_title || "Unknown Job",
          jobCategory: p.job_category || "Uncategorized",
          partyName: p.client_name || p.client_handle || "Unknown",
          partyAvatar: p.client_avatar_path ? `${import.meta.env.VITE_CLOUDFRONT_URL}/${p.client_avatar_path}` : undefined,
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
      }
    };
    loadData();
  }, [fetchSentProposals]);

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

  return (
    <div className="space-y-4 text-left">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Submitted Proposal Applications ({filtered.length})
        </h2>
        <span className="text-xs text-zinc-400 font-mono">My Proposals</span>
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