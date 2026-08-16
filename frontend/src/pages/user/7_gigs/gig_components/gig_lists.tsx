import React from "react";
import { Star, Clock, Bookmark, Users, Flag, Edit2, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CreditIcon } from "@/components/ui/credit-icon";
import type { Gig } from "../gig_datasets";

export type ViewType = "grid" | "list";

interface GigListProps {
  gigs: Gig[];
  activeGigId?: string;
  viewType?: ViewType;
  onToggleSave: (e: React.MouseEvent, gigId: string) => void;
  baseRoute: string;
}

export const GigList: React.FC<GigListProps> = ({
  gigs,
  activeGigId,
  viewType = "grid",
  onToggleSave,
  baseRoute,
}) => {
  const navigate = useNavigate();

  if (gigs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="p-12 text-center rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a]/40 text-gray-500 dark:text-zinc-500"
      >
        No gigs found matching your parameters.
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
      className={
        viewType === "grid"
          ? "grid grid-cols-2 xl:grid-cols-3 gap-4"
          : "space-y-4"
      }
    >
      <AnimatePresence mode="popLayout">
        {gigs.map((gig) => {
          const isActive = activeGigId === gig.id;

          if (viewType === "grid") {
            return (
              <motion.div
                key={gig.id}
                layout="position"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
                onClick={() => navigate(`${baseRoute}/${gig.id}`)}
                className={`group flex flex-col justify-between rounded-2xl border p-4 transition-colors duration-200 cursor-pointer ${
                  isActive
                    ? "border-blue-500 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.1)]"
                    : "border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a]/40 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/[0.06] shadow-sm hover:shadow-md dark:shadow-none"
                }`}
              >
                <div>
                  <div className="h-40 w-full overflow-hidden rounded-xl bg-gray-200 dark:bg-zinc-900 border border-gray-100 dark:border-white/5 relative mb-3">
                    <img
                      src={gig.thumbnail}
                      alt={gig.title}
                      className="h-full w-full object-cover opacity-80 transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 dark:from-black/60 via-transparent to-transparent" />

                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      <button
                        onClick={(e) => onToggleSave(e, gig.id)}
                        className={`p-1.5 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm transition-colors flex items-center gap-1 ${
                          gig.isSaved ? "text-yellow-500" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                        }`}
                      >
                        <Bookmark className={`h-4 w-4 ${gig.isSaved ? "fill-current" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* Category Pill Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        gig.status?.toLowerCase() === "open" || !gig.status
                          ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                          : "bg-red-100 text-red-700 border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                      }`}
                    >
                      {gig.status || "Open"}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-white/10 text-gray-800 dark:text-zinc-300">
                      {gig.category}
                    </span>
                  </div>

                  {/* Price & Title */}
                  <div className="text-yellow-500 text-base font-black mb-1 flex items-center gap-1">
                    <CreditIcon className="h-4 w-4 text-yellow-500 shrink-0" />
                    <span>{Math.min(...(gig.tiers?.map(t => t.price) || [0])).toLocaleString()}</span>
                    <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Starting at</span>
                  </div>
                  <h3 className="text-gray-900 dark:text-white text-base font-bold mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                    {gig.title}
                  </h3>
                  <p className="text-[12px] text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {gig.description}
                  </p>
                </div>

                <div className="mt-2 pt-4 border-t border-gray-200 dark:border-white/5 flex flex-wrap items-center justify-between text-[10px] text-gray-500 dark:text-zinc-400 gap-3">
                  <div className="flex items-center gap-2">
                    {gig.clientAvatar ? (
                      <img src={gig.clientAvatar} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover border border-gray-200 dark:border-white/10" />
                    ) : (
                      <div className="h-6 w-6 shrink-0 rounded-full bg-gray-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] text-gray-700 dark:text-white font-bold border border-gray-200 dark:border-white/10 overflow-hidden">
                        {gig.postedBy.charAt(0)}
                      </div>
                    )}
                    <div className="text-left leading-tight">
                      <p className="text-xs font-bold text-gray-700 dark:text-zinc-300">{gig.postedBy}</p>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-zinc-400">
                        <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                        <span>{gig.clientRating} ({gig.ratingCount})</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500 dark:text-zinc-400">
                    <span className="bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-md border border-gray-200 dark:border-white/5 flex items-center gap-1">
                      <Users className="h-3 w-3 text-gray-400 dark:text-zinc-500" /> {gig.slots} Slots
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          }

          // LIST VIEW
          return (
            <motion.div
              key={gig.id}
              layout="position"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
              onClick={() => navigate(`${baseRoute}/${gig.id}`)}
              className={`group flex flex-col md:flex-row gap-6 rounded-2xl border p-5 transition-colors duration-200 cursor-pointer ${
                isActive
                  ? "border-blue-500 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.1)]"
                  : "border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a]/40 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/[0.06] shadow-sm hover:shadow-md dark:shadow-none"
              }`}
            >
              {/* Left: Image Thumbnail */}
              <div className="hidden md:block relative h-auto min-h-[160px] w-full md:w-56 shrink-0 overflow-hidden rounded-xl bg-gray-200 dark:bg-zinc-900 border border-gray-100 dark:border-white/5">
                <img
                  src={gig.thumbnail}
                  alt={gig.title}
                  className="h-full w-full object-cover opacity-80 transition-transform duration-300 group-hover:scale-105 absolute inset-0"
                />
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  <button
                    onClick={(e) => onToggleSave(e, gig.id)}
                    className={`p-1.5 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm transition-colors flex items-center gap-1 ${
                      gig.isSaved ? "text-yellow-500" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <Bookmark className={`h-4 w-4 ${gig.isSaved ? "fill-current" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Right: Content details */}
              <div className="flex-1 flex flex-col justify-between py-1">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        gig.status?.toLowerCase() === "open" || !gig.status
                          ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                          : "bg-red-100 text-red-700 border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                      }`}
                    >
                      {gig.status || "Open"}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-white/10 text-gray-800 dark:text-zinc-300">
                      {gig.category}
                    </span>
                  </div>

                  <div>
                    <div className="text-yellow-500 text-lg font-black mb-1 flex items-center gap-1.5">
                      <CreditIcon className="h-5 w-5 text-yellow-500 shrink-0" />
                      <span>{Math.min(...(gig.tiers?.map(t => t.price) || [0])).toLocaleString()}</span>
                      <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Starting at</span>
                    </div>
                    <h3 className="text-gray-900 dark:text-white text-xl font-bold mb-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {gig.title}
                    </h3>
                  </div>

                  <p className="text-[13px] text-gray-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {gig.description}
                  </p>
                  
                  {Array.isArray(gig.skills) && gig.skills.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      <Wrench className="h-3 w-3 text-gray-400 dark:text-zinc-400 shrink-0 mr-0.5" />
                      {gig.skills.slice(0, 4).map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800/80 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 text-[10px] font-semibold"
                        >
                          {skill}
                        </span>
                      ))}
                      {gig.skills.length > 4 && (
                        <span className="px-2 py-0.5 rounded-md bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 text-[10px] font-medium">
                          +{gig.skills.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-4 border-t border-gray-200 dark:border-white/5 flex flex-wrap items-center justify-between text-[10px] text-gray-500 dark:text-zinc-400 gap-3">
                  <div className="flex items-center gap-2">
                    {gig.clientAvatar ? (
                      <img src={gig.clientAvatar} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover border border-gray-200 dark:border-white/10" />
                    ) : (
                      <div className="h-6 w-6 shrink-0 rounded-full bg-gray-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] text-gray-700 dark:text-white font-bold border border-gray-200 dark:border-white/10 overflow-hidden">
                        {gig.postedBy.charAt(0)}
                      </div>
                    )}
                    <div className="text-left leading-tight">
                      <p className="text-xs font-bold text-gray-700 dark:text-zinc-300">{gig.postedBy}</p>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-zinc-400">
                        <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                        <span>{gig.clientRating} ({gig.ratingCount})</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500 dark:text-zinc-400">
                    <span className="bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-md border border-gray-200 dark:border-white/5 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-gray-400 dark:text-zinc-500" /> {gig.firstDraftDelivery} Delivery
                    </span>
                    <span className="bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-md border border-gray-200 dark:border-white/5 flex items-center gap-1">
                      <Users className="h-3 w-3 text-gray-400 dark:text-zinc-500" /> {gig.tiers?.length || 1} Tiers
                    </span>
                    <span className="bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-md border border-gray-200 dark:border-white/5 flex items-center gap-1">
                      <Users className="h-3 w-3 text-gray-400 dark:text-zinc-500" /> {gig.slots} Slots
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
};

export default GigList;
