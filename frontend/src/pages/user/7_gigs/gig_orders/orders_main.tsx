import useGlobalState from "@/lib/global_state";
import { UnverifiedOverlay } from "@/components/ui/UnverifiedOverlay";
import React, { useState, useEffect, useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import UserHeader from "@/components/nav/user_header";
import { Filter } from "lucide-react";
import OrdersSearchbar from "./orders_components/orders_searchbar";
import OrdersTabs from "./orders_components/orders_tabs";
import OrdersStatuses from "./orders_components/orders_statuses";
import OrdersFilters from "./orders_components/orders_filters";
import OrdersListViewType from "./orders_components/orders_list_viewtype";

const ProposalSidebarSkeleton = () => (
  <div className="space-y-6 lg:w-72">
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm dark:shadow-none p-5 backdrop-blur-sm space-y-4">
      <div className="h-3 w-24 animate-pulse rounded bg-gray-100 dark:bg-white/10" />
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

export type ViewType = "grid" | "list";

export interface OrdersMainContext {
  searchQuery: string;
  activeStatus: string;
  minPrice: string;
  maxPrice: string;
  priceSort: "inc" | "dec" | null;
  milestonesValue: string;
  milestonesSort: "inc" | "dec" | null;
  revisionRateSort: "inc" | "dec" | null;
  dateSort: "inc" | "dec" | null;
  viewType: ViewType;
  loading: boolean;
  setChildOrdersCounts: (counts: Record<string, number> | null) => void;
}

export const OrdersMain: React.FC = () => {
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const isVerified = useGlobalState((state) => state.isVerified);
  const location = useLocation();

  // Route check
  const isGigSelectionPage = location.pathname === "/gigs/orders" || location.pathname === "/gigs/orders/";
  const isSentPage = location.pathname.startsWith("/gigs/orders/sent");

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState<string>("All");
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
  
  const [childOrdersCounts, setChildOrdersCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const statusCounts = useMemo(() => {
    if (childOrdersCounts) {
      return [
        { label: "All", count: childOrdersCounts.All || 0 },
        { label: "Pending", count: childOrdersCounts.Pending || 0 },
        { label: "Accepted", count: childOrdersCounts.Accepted || 0 },
        { label: "Rejected", count: childOrdersCounts.Rejected || 0 },
      ];
    }

    return [
      { label: "All", count: 0 },
      { label: "Pending", count: 0 },
      { label: "Accepted", count: 0 },
      { label: "Rejected", count: 0 },
    ];
  }, [childOrdersCounts]);

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
      <div className="sticky top-0 z-50">
        <UserHeader pageTitle="Gig Orders" credits={1250} />
      </div>

      {!isGuestMode && !isVerified && <UnverifiedOverlay featureName="gig orders" />}

      <div className={`mx-auto max-w-7xl p-6 md:p-8 w-full`}>
        <OrdersSearchbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

        <div className="mb-8 flex flex-wrap items-center justify-between border-b border-gray-200 dark:border-white/10 gap-4 pb-2">
          <OrdersTabs />
          {!isGigSelectionPage && (
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
              <OrdersListViewType viewType={viewType} onViewTypeChange={setViewType} />
            </div>
          )}
        </div>

        <div className={isGigSelectionPage ? "w-full" : "flex flex-col lg:flex-row gap-6 lg:gap-8 items-start"}>
          {!isGigSelectionPage && (
            <div className={`transition-all duration-300 origin-left ease-in-out shrink-0 ${
              showFilters ? "opacity-100 w-full lg:w-72" : "opacity-0 w-0 h-0 lg:h-auto overflow-hidden hidden lg:block"
            }`}>
              <div className="space-y-6 sticky top-24 w-full">
                {loading ? (
                  <ProposalSidebarSkeleton />
                ) : (
                  <>
                    <OrdersStatuses
                      statuses={statusCounts as any}
                      activeStatus={activeStatus as any}
                      onStatusChange={setActiveStatus as any}
                    />

                    <OrdersFilters
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

          <div className={`transition-all duration-300 ${isGigSelectionPage ? "w-full" : "flex-1 min-w-0"}`}>
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
                  setChildOrdersCounts,
                } satisfies OrdersMainContext
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersMain;
