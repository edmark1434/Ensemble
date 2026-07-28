import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import UserHeader from "@/components/nav/user_header";
import ProposalsSearchbar from "./proposals_components/proposals_searchbar";
import ProposalsTabs from "./proposals_components/proposals_tabs";
import ProposalsCategories from "./proposals_components/proposals_categories";
import ProposalsFilters from "./proposals_components/proposals_filters";
import { proposalCategories } from "./proposals_datasets";

export interface ProposalsMainContext {
  searchQuery: string;
  activeCategory: string;
  minPrice: string;
  maxPrice: string;
  selectedStatus: string[];
}

export const ProposalsMain: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setActiveCategory("All");
    setMinPrice("");
    setMaxPrice("");
    setSelectedStatus([]);
  };

  return (
    <div className="w-full min-h-screen bg-[#080a12] relative">
      <div className="sticky top-0 z-50">
        <UserHeader pageTitle="Job Proposals" credits={1250} />
      </div>

      <div className="mx-auto max-w-7xl p-6 md:p-8 w-full">
        <ProposalsSearchbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

        <div className="mb-8">
          <ProposalsTabs />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          <div className="space-y-6 sticky top-24">
            <ProposalsCategories
              categories={proposalCategories}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
            <ProposalsFilters
              filters={{ minPrice, maxPrice, selectedStatus }}
              setters={{ setMinPrice, setMaxPrice, setSelectedStatus }}
              onClear={handleClearFilters}
            />
          </div>

          <div className="lg:col-span-3">
            <Outlet
              context={{
                searchQuery,
                activeCategory,
                minPrice,
                maxPrice,
                selectedStatus,
              } satisfies ProposalsMainContext}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProposalsMain;