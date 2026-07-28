import React, { useState, useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import UserHeader from "@/components/nav/user_header";

// Modular Proposal Components
import ProposalsSearchbar from "./proposals_components/proposals_searchbar";
import ProposalsTabs from "./proposals_components/proposals_tabs";
import ProposalsStatuses, { type StatusFilterItem } from "./proposals_components/proposals_statuses";
import ProposalsFilters from "./proposals_components/proposals_filters";
import ProposalsListViewType, {
  type ViewType,
} from "./proposals_components/proposals_list_viewtype";

// Datasets & Types
import { sampleIncomingProposals, sampleSentProposals } from "./proposals_datasets";
import type { ProposalStatus } from "./proposals_components/proposals_list";

export interface ProposalsMainContext {
  searchQuery: string;
  activeStatus: "All" | ProposalStatus;
  minPrice: string;
  maxPrice: string;
  priceSort: "inc" | "dec" | null;
  milestonesValue: string;
  milestonesSort: "inc" | "dec" | null;
  revisionRateSort: "inc" | "dec" | null;
  dateSort: "inc" | "dec" | null;
  viewType: ViewType;
}

export const ProposalsMain: React.FC = () => {
  const location = useLocation();

  // Route check
  const isJobSelectionPage = location.pathname === "/jobs/proposals";
  const isSentPage = location.pathname.startsWith("/jobs/proposals/sent");

  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState<"All" | ProposalStatus>("All");

  // Filters & Sorting States
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [priceSort, setPriceSort] = useState<"inc" | "dec" | null>(null);

  const [milestonesValue, setMilestonesValue] = useState("");
  const [milestonesSort, setMilestonesSort] = useState<"inc" | "dec" | null>(null);

  const [revisionRateSort, setRevisionRateSort] = useState<"inc" | "dec" | null>(null);
  const [dateSort, setDateSort] = useState<"inc" | "dec" | null>(null);

  const [viewType, setViewType] = useState<ViewType>("list");

  // Dynamically calculate status counts depending on active route context
  const statusCounts: StatusFilterItem[] = useMemo(() => {
    const activeDataset = isSentPage ? sampleSentProposals : sampleIncomingProposals;

    const counts = {
      All: activeDataset.length,
      Pending: 0,
      Shortlisted: 0,
      Accepted: 0,
      Rejected: 0,
    };

    activeDataset.forEach((p) => {
      if (p.status in counts) {
        counts[p.status as keyof typeof counts]++;
      }
    });

    return [
      { label: "All", count: counts.All },
      { label: "Pending", count: counts.Pending },
      { label: "Shortlisted", count: counts.Shortlisted },
      { label: "Accepted", count: counts.Accepted },
      { label: "Rejected", count: counts.Rejected },
    ];
  }, [isSentPage]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setActiveStatus("All");
    setMinPrice("");
    setMaxPrice("");
    setPriceSort(null);
    setMilestonesValue("");
    setMilestonesSort(null);
    setRevisionRateSort(null);
    setDateSort(null);
  };

  return (
    <div className="w-full min-h-screen bg-[#080a12] relative">
      {/* Sticky User Header */}
      <div className="sticky top-0 z-50">
        <UserHeader pageTitle="Job Proposals" credits={1250} />
      </div>

      <div className="mx-auto max-w-7xl p-6 md:p-8 w-full">
        {/* Search Bar */}
        <ProposalsSearchbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

        {/* Navigation Tabs & View Switcher */}
        <div className="mb-8 flex flex-wrap items-center justify-between border-b border-white/10 gap-4">
          <ProposalsTabs />
          {!isJobSelectionPage && (
            <div className="py-2">
              <ProposalsListViewType viewType={viewType} onViewTypeChange={setViewType} />
            </div>
          )}
        </div>

        {/* Sidebar & Content Layout */}
        <div className={isJobSelectionPage ? "w-full" : "grid grid-cols-1 lg:grid-cols-4 gap-8 items-start"}>
          {/* Sidebar */}
          {!isJobSelectionPage && (
            <div className="space-y-6 sticky top-24">
              <ProposalsStatuses
                statuses={statusCounts}
                activeStatus={activeStatus}
                onStatusChange={setActiveStatus}
              />

              <ProposalsFilters
                filters={{
                  minPrice,
                  maxPrice,
                  priceSort,
                  milestonesValue,
                  milestonesSort,
                  revisionRateSort,
                  dateSort,
                }}
                setters={{
                  setMinPrice,
                  setMaxPrice,
                  setPriceSort,
                  setMilestonesValue,
                  setMilestonesSort,
                  setRevisionRateSort,
                  setDateSort,
                }}
                onClear={handleClearFilters}
              />
            </div>
          )}

          {/* Sub-Pages Container */}
          <div className={isJobSelectionPage ? "w-full" : "lg:col-span-3"}>
            <Outlet
              context={
                {
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
                } satisfies ProposalsMainContext
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProposalsMain;