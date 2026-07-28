import React, { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import ProposalsList from "../proposals_components/proposals_list";
import { sampleSentProposals } from "../proposals_datasets";
import type { ProposalsMainContext } from "../proposals_main";

export const ProposalsSentPage: React.FC = () => {
  const { searchQuery, minPrice, maxPrice, selectedStatus } =
    useOutletContext<ProposalsMainContext>();
  const navigate = useNavigate();

  const [proposals, setProposals] = useState(sampleSentProposals);

  const handleWithdraw = (id: string) => {
    if (confirm("Are you sure you want to withdraw this proposal?")) {
      setProposals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "Withdrawn" } : p))
      );
    }
  };

  const filtered = proposals.filter((p) => {
    const matchesSearch =
      p.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.partyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMin = minPrice === "" || p.bidAmount >= parseInt(minPrice);
    const matchesMax = maxPrice === "" || p.bidAmount <= parseInt(maxPrice);
    const matchesStatus =
      selectedStatus.length === 0 || selectedStatus.includes(p.status);

    return matchesSearch && matchesMin && matchesMax && matchesStatus;
  });

  return (
    <ProposalsList
      proposals={filtered}
      onWithdraw={handleWithdraw}
      onViewPost={(jobId) => navigate(`/jobs/postings/${jobId}`)}
    />
  );
};

export default ProposalsSentPage;