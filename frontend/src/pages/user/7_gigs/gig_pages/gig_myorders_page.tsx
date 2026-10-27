import React from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

import type { GigMainContext } from "../gig_main";
import { GigList } from "../gig_components/gig_lists";

const GigMyOrdersPage: React.FC = () => {
  const { filteredGigs, loading, viewType, toggleSaveGig } = useOutletContext<GigMainContext>();
  const { id } = useParams();
  const navigate = useNavigate();

  const orderedGigs = filteredGigs;

  if (!loading && orderedGigs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="mb-6 h-36 w-36 grayscale opacity-80">
          <DotLottieReact src="/icons/lottie/no-result.lottie" autoplay loop />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          No Orders Placed Yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-8 max-w-md">
          You haven't ordered any services yet. Explore creative gigs in the marketplace and place your first order!
        </p>
        <button
          onClick={() => navigate("/gigs/services")}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-lg shadow-blue-500/20 cursor-pointer"
        >
          <Search className="h-4 w-4" />
          Browse Services
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          Services you have actively ordered ({orderedGigs.length})
        </span>
      </div>

      <GigList
        gigs={orderedGigs}
        activeGigId={id}
        viewType={viewType}
        onToggleSave={toggleSaveGig}
        baseRoute="/gigs/my-orders"
        loading={loading}
      />
    </div>
  );
};

export default GigMyOrdersPage;
