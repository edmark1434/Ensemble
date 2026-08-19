import React from "react";
import { useOutletContext, useNavigate, useParams } from "react-router-dom";
import { Search } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

import type { GigMainContext } from "../gig_main";
import { GigList } from "../gig_components/gig_lists";

const GigServicesPage: React.FC = () => {
  const { filteredGigs, viewType, loading, toggleSaveGig } = useOutletContext<GigMainContext>();
  const { id } = useParams();
  const navigate = useNavigate();

  if (!loading && filteredGigs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="mb-6 h-36 w-36 grayscale opacity-80">
          <DotLottieReact src="/icons/lottie/no-result.lottie" autoplay loop />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          No Services Found
        </h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-8 max-w-md">
          We couldn't find any services matching your search or filter parameters. Try adjusting your search criteria.
        </p>
        <button
          onClick={() => navigate("/gigs/services")}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-lg shadow-blue-500/20"
        >
          <Search className="h-4 w-4" />
          Reset Filters
        </button>
      </div>
    );
  }

  return (
    <GigList
      gigs={filteredGigs}
      activeGigId={id}
      viewType={viewType}
      onToggleSave={toggleSaveGig}
      baseRoute="/gigs/services"
      loading={loading}
    />
  );
};

export default GigServicesPage;