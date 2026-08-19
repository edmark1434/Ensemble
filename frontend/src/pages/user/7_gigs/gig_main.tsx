import React, { useState, useMemo, useEffect } from "react";
import { Filter } from "lucide-react";
import { Outlet, useNavigate, useLocation, useParams } from "react-router-dom";
import UserHeader from "@/components/nav/user_header";
import api from "@/lib/axios";

// Modular Component Imports
import GigSearchBar from "./gig_components/gig_searchbar";
import GigTabs from "./gig_components/gig_tabs";
import GigCategories from "./gig_components/gig_categories";
import GigListViewType from "./gig_components/gig_list_viewtype";
import type { ViewType } from "./gig_components/gig_list_viewtype";

// Datasets & Types
import type { Gig } from "./gig_datasets";
import GigViewDetails from "./gig_components/GigViewDetails";

export interface GigMainContext {
  loading: boolean;
  gigsList: Gig[];
  filteredGigs: Gig[];
  viewType: ViewType;
  toggleSaveGig: (e: React.MouseEvent, gigId: string) => void;
}

const SidebarSkeleton = () => (
  <div className="space-y-6">
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm dark:shadow-none p-5 backdrop-blur-sm">
      <div className="mb-4 h-3 w-20 animate-pulse rounded bg-gray-100 dark:bg-white/10" />
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
        ))}
      </div>
    </div>
  </div>
);

const GigMain: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<ViewType>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("All");
  const [gigsList, setGigsList] = useState<Gig[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);

  useEffect(() => {
    const fetchGigs = async () => {
      setLoading(true);
      try {
        const response = await api.get("/api/gigs");
        if (response.data.success && response.data.data) {
          const mappedGigs = response.data.data.map((g: any) => {
            const cloudFrontUrl = import.meta.env.VITE_CLOUDFRONT_URL || '';
            const mapUrl = (path: string) => {
              if (!path) return undefined;
              if (!cloudFrontUrl && path.includes('public')) return undefined;
              if (path.startsWith('http') || path.startsWith('/')) return path;
              return `${cloudFrontUrl}${path.startsWith('/') ? '' : '/'}${path}`;
            };

            const creatorAccountId =
              g.client_account_id ||
              g.creator_account_id ||
              g.account_id ||
              g.accountId ||
              g.user_id ||
              g.userId ||
              g.account?.account_id ||
              g.creator?.account_id ||
              g.user?.account_id ||
              g.postedById;

            return {
              ...g,
              client_account_id: creatorAccountId,
              thumbnail: mapUrl(g.thumbnail) || "https://d2dl0agwn9kque.cloudfront.net/gig_thumbnails/ede6f8d1-cc62-4afd-be9f-11f044d86122/placeholder_1787040672764_8a5d64b3.png",
              clientAvatar: g.clientAvatar ? `${cloudFrontUrl}${g.clientAvatar.startsWith('/') ? '' : '/'}${g.clientAvatar}` : undefined,
              gallery: (g.gallery || []).map((p: string) => mapUrl(p))
            };
          });
          setGigsList(mappedGigs);
        } else {
          console.error("API returned unsuccessful data", response.data);
          setGigsList([]);
        }
      } catch (err) {
        console.error("Error fetching gigs:", err);
        setGigsList([]);
      } finally {
        setLoading(false);
      }
    };
    fetchGigs();
  }, []);

  useEffect(() => {
    if (id) {
      const found = gigsList.find((g) => g.id === id);
      if (found) setSelectedGig(found);
    } else {
      setSelectedGig(null);
    }
  }, [id, gigsList]);

  const toggleSaveGig = async (e: React.MouseEvent, gigId: string) => {
    e.stopPropagation();
    setGigsList((prev) => {
      return prev.map((gig) => {
        if (gig.id === gigId) {
          return { ...gig, isSaved: !gig.isSaved };
        }
        return gig;
      });
    });
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setActiveCategoryFilter("All");
  };

  const tabFilteredGigs = useMemo(() => {
    const isSavedTab = location.pathname.includes("/saved-services");
    const isMyServicesTab = location.pathname.includes("/my-services");

    return gigsList.filter((gig) => {
      if (isSavedTab) return gig.isSaved;
      if (isMyServicesTab) return gig.isOwnGig;

      const isOpen = gig.status?.toLowerCase() === "open" || !gig.status;
      return isOpen;
    });
  }, [gigsList, location.pathname]);

  const dynamicCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    tabFilteredGigs.forEach((gig) => {
      if (gig.category) {
        counts[gig.category] = (counts[gig.category] || 0) + 1;
      }
    });
    const catArray = Object.keys(counts).map((name) => ({
      label: name,
      count: counts[name],
    }));
    return [
      { label: "All", count: tabFilteredGigs.length },
      ...catArray.sort((a, b) => b.count - a.count),
    ];
  }, [tabFilteredGigs]);

  const filteredGigs = useMemo(() => {
    return tabFilteredGigs.filter((gig) => {
      const matchesSearch =
        gig.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gig.postedBy.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        activeCategoryFilter === "All" || gig.category === activeCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [tabFilteredGigs, searchQuery, activeCategoryFilter]);

  const contextValue: GigMainContext = {
    gigsList,
    filteredGigs,
    loading,
    viewType,
    toggleSaveGig,
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-dark-base relative">
      {/* Sticky User Header */}
      <div className="z-10 bg-white dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-white/10 sticky top-0 md:static">
        <UserHeader pageTitle="Gig Market" credits={1250} />
      </div>

      <div className="mx-auto max-w-7xl p-6 md:p-8 w-full">
        <GigSearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

        <div className="mb-8 flex flex-wrap items-center justify-between border-b border-gray-200 dark:border-white/10 gap-4">
          <GigTabs />
          <div className="py-2 flex items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center p-2 rounded-lg transition-colors border ${
                showFilters 
                  ? 'bg-gray-100 dark:bg-white/10 border-gray-300 dark:border-white/20 text-gray-900 dark:text-white' 
                  : 'bg-white dark:bg-white/5 shadow-sm dark:shadow-none border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:bg-white/10'
              }`}
              title="Toggle Filters"
            >
              <Filter className="h-5 w-5" />
            </button>
            <GigListViewType viewType={viewType} onViewTypeChange={setViewType} />
          </div>
        </div>

        <div className={`grid grid-cols-1 ${showFilters ? 'lg:grid-cols-4' : 'lg:grid-cols-1'} gap-8 items-start`}>
          {showFilters && (
            <div className="space-y-6 sticky top-24 lg:col-span-1">
              {loading ? (
                <SidebarSkeleton />
              ) : (
                <>
                  <GigCategories
                    categories={dynamicCategories}
                    activeCategory={activeCategoryFilter}
                    onCategoryChange={setActiveCategoryFilter}
                  />
                </>
              )}
            </div>
          )}

          <div className={showFilters ? "lg:col-span-3" : "lg:col-span-1"}>
            <Outlet context={contextValue} />
          </div>
        </div>
      </div>

      {/* Slide-out details drawer */}
      <GigViewDetails
        selectedGig={selectedGig}
        onClose={() => {
          if (location.pathname.includes("/saved-services")) {
            navigate("/gigs/saved-services");
          } else if (location.pathname.includes("/my-services")) {
            navigate("/gigs/my-services");
          } else {
            navigate("/gigs/services");
          }
        }}
        onToggleSave={(gigId) => {
           const e = { stopPropagation: () => {} } as React.MouseEvent;
           toggleSaveGig(e, gigId);
        }}
      />
    </div>
  );
};

export default GigMain;