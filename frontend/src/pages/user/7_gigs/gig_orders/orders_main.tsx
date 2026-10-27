import useGlobalState from "@/lib/global_state";
import { UnverifiedOverlay } from "@/components/ui/UnverifiedOverlay";
import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import UserHeader from "@/components/nav/user_header";

// Modular Order Components
import OrdersSearchbar from "./orders_components/orders_searchbar";
import OrdersTabs from "./orders_components/orders_tabs";
import OrdersListViewType, {
  type ViewType,
} from "./orders_components/orders_list_viewtype";

export type { ViewType };

export interface OrdersMainContext {
  searchQuery: string;
  setSearchQuery?: React.Dispatch<React.SetStateAction<string>>;
  activeStatus?: string;
  setActiveStatus?: React.Dispatch<React.SetStateAction<string>>;
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
  setChildOrdersCounts?: (counts: Record<string, number> | null) => void;
}

export const OrdersMain: React.FC = () => {
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const isVerified = useGlobalState((state) => state.isVerified);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewType, setViewType] = useState<ViewType>(() => {
    return (localStorage.getItem("ensemble_gig_orders_view_type") as ViewType) || "grid";
  });
  const [activeStatus, setActiveStatus] = useState<string>("All");
  const [childOrdersCounts, setChildOrdersCounts] = useState<Record<string, number> | null>(null);

  const handleViewTypeChange = (newType: ViewType) => {
    setViewType(newType);
    localStorage.setItem("ensemble_gig_orders_view_type", newType);
  };

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-dark-base relative">
      {/* Sticky User Header */}
      <div className="sticky top-0 z-50">
        <UserHeader pageTitle="Gig Orders" />
      </div>

      {!isGuestMode && !isVerified && <UnverifiedOverlay featureName="gig orders" />}

      <div className="mx-auto max-w-7xl p-6 md:p-8 w-full space-y-6">
        {/* Search Bar */}
        <OrdersSearchbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

        {/* Navigation Tabs & View Switcher */}
        <div className="flex flex-wrap items-center justify-between border-b border-gray-200 dark:border-white/10 gap-4 pb-2">
          <OrdersTabs />
          <div className="flex items-center gap-3">
            <OrdersListViewType viewType={viewType} onViewTypeChange={handleViewTypeChange} />
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
                setChildOrdersCounts,
              } satisfies OrdersMainContext
            }
          />
        </div>
      </div>
    </div>
  );
};

export default OrdersMain;
