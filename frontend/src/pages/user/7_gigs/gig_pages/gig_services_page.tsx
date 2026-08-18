import React from "react";
import { useOutletContext, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Star, Users, MapPin, SearchX, Bookmark } from "lucide-react";

import type { GigMainContext } from "../gig_main";
import { GigList } from "../gig_components/gig_lists";

const GigServicesPage: React.FC = () => {
  const { filteredGigs, viewType, loading, toggleSaveGig } = useOutletContext<GigMainContext>();
  const { id } = useParams();

  if (!loading && filteredGigs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="rounded-full bg-gray-100 dark:bg-white/5 p-6 mb-6 ring-1 ring-gray-200 dark:ring-white/10">
          <SearchX className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No gigs found</h3>
        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
          We couldn't find any services matching your current filters. Try adjusting your search criteria.
        </p>
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
