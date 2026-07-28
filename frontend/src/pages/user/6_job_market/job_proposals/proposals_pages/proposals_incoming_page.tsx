import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import ProposalsList from "../proposals_components/proposals_list";
import { sampleIncomingProposals } from "../proposals_datasets";
import type { ProposalsMainContext } from "../proposals_main";

export const ProposalsIncomingPage: React.FC = () => {
  const { searchQuery, activeCategory, minPrice, maxPrice, selectedStatus } =
    useOutletContext<ProposalsMainContext>();

  const [proposals, setProposals] = useState(sampleIncomingProposals);

  const handleUpdateStatus = (id: string, newStatus: "Accepted" | "Declined") => {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );
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

  return <ProposalsList proposals={filtered} onUpdateStatus={handleUpdateStatus} />;
};

export default ProposalsIncomingPage;