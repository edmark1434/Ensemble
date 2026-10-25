import useGlobalState from "@/lib/global_state";
import { UnverifiedOverlay } from "@/components/ui/UnverifiedOverlay";
import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import UserHeader from "@/components/nav/user_header";

// Modular Proposal Components
import ProposalsSearchbar from "./proposals_components/proposals_searchbar";
import ProposalsTabs from "./proposals_components/proposals_tabs";
import ProposalsListViewType, {
  type ViewType,
} from "./proposals_components/proposals_list_viewtype";

import type { ProposalStatus } from "./proposals_components/proposals_list";

export interface ProposalsMainContext {
  searchQuery: string;
  setSearchQuery?: React.Dispatch<React.SetStateAction<string>>;
  activeStatus?: "All" | ProposalStatus;
  setActiveStatus?: React.Dispatch<React.SetStateAction<"All" | ProposalStatus>>;
  minPrice?: string;
  maxPrice?: string;
  priceSort?: "inc" | "dec" | null;
  milestonesValue?: string;
  milestonesSort?: "inc" | "dec" | null;
  revisionRateSort?: "inc" | "dec" | null;
  dateSort?: "inc" | "dec" | null;
  viewType: ViewType;
  loading: boolean;
  showFilters: boolean;
  setShowFilters?: React.Dispatch<React.SetStateAction<boolean>>;
  setChildProposalsCounts?: React.Dispatch<React.SetStateAction<Record<string, number> | null>>;
}

export const ProposalsMain: React.FC = () => {
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const isVerified = useGlobalState((state) => state.isVerified);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewType, setViewType] = useState<ViewType>(() => {
    return (localStorage.getItem("ensemble_proposals_view_type") as ViewType) || "list";
  });
  const [activeStatus, setActiveStatus] = useState<"All" | ProposalStatus>("All");
  const [childProposalsCounts, setChildProposalsCounts] = useState<Record<string, number> | null>(null);

  const handleViewTypeChange = (newType: ViewType) => {
    setViewType(newType);
    localStorage.setItem("ensemble_proposals_view_type", newType);
  };

  // Simulated initial loading timer
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-dark-base relative">
      {/* Sticky User Header */}
      <div className="sticky top-0 z-50">
        <UserHeader pageTitle="Job Proposals" />
      </div>

      {!isGuestMode && !isVerified && <UnverifiedOverlay featureName="job proposals" />}

      <div className="mx-auto max-w-7xl p-6 md:p-8 w-full space-y-6">
        {/* Search Bar */}
        <ProposalsSearchbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

        {/* Navigation Tabs & View Switcher */}
        <div className="flex flex-wrap items-center justify-between border-b border-gray-200 dark:border-white/10 gap-4 pb-2">
          <ProposalsTabs />
          <div className="flex items-center gap-3">
            <ProposalsListViewType viewType={viewType} onViewTypeChange={handleViewTypeChange} />
          </div>
        </div>

        {/* Full Width Outlet Content */}
        <div className="w-full">
          <Outlet
            context={
              {
                searchQuery,
                setSearchQuery,
                activeStatus,
                setActiveStatus,
                viewType,
                loading,
                showFilters: false,
                setShowFilters: () => {},
                setChildProposalsCounts,
              } satisfies ProposalsMainContext
            }
          />
        </div>
      </div>
    </div>
  );
};

export default ProposalsMain;
