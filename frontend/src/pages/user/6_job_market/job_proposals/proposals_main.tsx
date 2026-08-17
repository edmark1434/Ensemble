import React, { useState, useEffect, useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Filter } from "lucide-react";
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
  loading: boolean;
  setChildProposalsCounts: React.Dispatch<React.SetStateAction<Record<string, number> | null>>;
}

const ProposalSidebarSkeleton = () => (
  <div className="space-y-6">
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm dark:shadow-none p-5 backdrop-blur-sm space-y-3">
      <div className="h-3 w-28 animate-pulse rounded bg-gray-100 dark:bg-white/10" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-full animate-pulse rounded-xl bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
        ))}
      </div>
    </div>
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm dark:shadow-none p-5 backdrop-blur-sm space-y-4">
      <div className="h-3 w-24 animate-pulse rounded bg-gray-100 dark:bg-white/10" />
      <div className="space-y-3">
        <div className="h-8 flex-1 animate-pulse rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
        <div className="h-8 flex-1 animate-pulse rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
      </div>
    </div>
  </div>
);

export const ProposalsMain: React.FC = () => {
  const location = useLocation();

  // Route check
  const isJobSelectionPage = location.pathname === "/jobs/proposals";
  const isSentPage = location.pathname.startsWith("/jobs/proposals/sent");

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState<"All" | ProposalStatus>("All");
  const [showFilters, setShowFilters] = useState(true);

  // Filters & Sorting States
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [priceSort, setPriceSort] = useState<"inc" | "dec" | null>(null);

  const [milestonesValue, setMilestonesValue] = useState("");
  const [milestonesSort, setMilestonesSort] = useState<"inc" | "dec" | null>(null);

  const [revisionRateSort, setRevisionRateSort] = useState<"inc" | "dec" | null>(null);
  const [dateSort, setDateSort] = useState<"inc" | "dec" | null>(null);

  const [viewType, setViewType] = useState<ViewType>("grid");
  
  const [childProposalsCounts, setChildProposalsCounts] = useState<Record<string, number> | null>(null);

  // Simulated initial loading timer
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Dynamically calculate status counts depending on active route context
  const statusCounts: StatusFilterItem[] = useMemo(() => {
    if (childProposalsCounts) {
      return [
        { label: "All", count: childProposalsCounts.All || 0 },
        { label: "Pending", count: childProposalsCounts.Pending || 0 },
        { label: "Shortlisted", count: childProposalsCounts.Shortlisted || 0 },
        { label: "Accepted", count: childProposalsCounts.Accepted || 0 },
        { label: "Rejected", count: childProposalsCounts.Rejected || 0 },
      ];
    }

    let activeDataset = isSentPage ? sampleSentProposals : sampleIncomingProposals;

    // Filter by jobId if we're viewing a specific job's proposals
    const pathParts = location.pathname.split("/");
    const possibleJobId = pathParts[4]; // e.g. /jobs/proposals/incoming/jobId
    if (possibleJobId && possibleJobId !== "") {
      activeDataset = activeDataset.filter(p => p.jobId === possibleJobId);
    }

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
  }, [isSentPage, location.pathname, childProposalsCounts]);

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
    <div className="w-full min-h-screen bg-gray-50 dark:bg-dark-base relative">
      {/* Sticky User Header */}
      <div className="sticky top-0 z-50">
        <UserHeader pageTitle="Job Proposals" credits={1250} />
      </div>

      <div className="mx-auto max-w-7xl p-6 md:p-8 w-full">
        {/* Search Bar */}
        <ProposalsSearchbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

        {/* Navigation Tabs & View Switcher */}
        <div className="mb-8 flex flex-wrap items-center justify-between border-b border-gray-200 dark:border-white/10 gap-4 pb-2">
          <ProposalsTabs />
          {!isJobSelectionPage && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center p-2 rounded-lg transition-colors border ${
                  showFilters
                    ? "bg-gray-100 dark:bg-white/10 border-gray-300 dark:border-white/20 text-gray-900 dark:text-white"
                    : "bg-white dark:bg-white/5 shadow-sm dark:shadow-none border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:bg-white/10"
                }`}
                title="Toggle Filters"
              >
                <Filter className="h-4 w-4" />
              </button>
              <ProposalsListViewType viewType={viewType} onViewTypeChange={setViewType} />
            </div>
          )}
        </div>

        {/* Sidebar & Content Layout */}
        <div className={isJobSelectionPage ? "w-full" : "flex flex-col lg:flex-row gap-6 lg:gap-8 items-start"}>
          {/* Sidebar */}
          {!isJobSelectionPage && (
            <div className={`transition-all duration-300 origin-left ease-in-out shrink-0 ${
              showFilters ? "opacity-100 w-full lg:w-72" : "opacity-0 w-0 h-0 lg:h-auto overflow-hidden hidden lg:block"
            }`}>
              <div className="space-y-6 sticky top-24 w-full">
                {loading ? (
                  <ProposalSidebarSkeleton />
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>
          )}

          {/* Sub-Pages Container */}
          <div className={`transition-all duration-300 ${isJobSelectionPage ? "w-full" : "flex-1 min-w-0"}`}>
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
                  loading,
                  setChildProposalsCounts,
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