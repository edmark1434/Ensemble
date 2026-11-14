import React, { useState, useEffect } from "react";
import { Star, Clock, Bookmark, Users, Flag, Edit2, Wrench, ShoppingCart, Heart, Send, CircleCheck, TrendingUp, Layers, Check, Sparkles } from "lucide-react";
import { computeGigRankingBreakdown } from "../gig_ranking";
import { useNavigate, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CreditIcon } from "@/components/ui/credit-icon";
import { SubscriptionIcon } from "@/components/ui/SubscriptionIcon";
import { formatDistanceToNow } from "date-fns";
import type { Gig } from "../gig_datasets";
import PopupReportGig from "./PopupReportGig";
import api from "@/lib/axios";
import useGlobalState from "@/lib/global_state";

export type ViewType = "grid" | "list";
export type GigBudgetStatus = "within" | "near" | null;

const BudgetBadge: React.FC<{ status: GigBudgetStatus; className?: string }> = ({ status, className = "" }) => {
  if (!status) return null;
  const within = status === "within";
  const Icon = within ? CircleCheck : TrendingUp;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-tight transition-colors ${
        within
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30"
          : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30"
      } ${className}`}
      title={within ? "Starting price is within your budget" : "Starting price is slightly above your budget"}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{within ? "Within budget" : "Slightly over"}</span>
    </span>
  );
};

interface GigListProps {
  gigs: Gig[];
  activeGigId?: string;
  viewType?: ViewType;
  showFilters?: boolean;
  loading?: boolean;
  onToggleSave: (e: React.MouseEvent, gigId: string) => void;
  baseRoute: string;
  getBudgetStatus?: (gig: Gig) => GigBudgetStatus;
}

export const GigCardSkeleton: React.FC<{ viewType?: ViewType }> = ({ viewType = "grid" }) => {
  if (viewType === "grid") {
    return (
      <div className="flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface overflow-hidden animate-pulse">
        <div className="h-44 sm:h-48 w-full bg-gray-100 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 shrink-0" />
        <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="h-4 w-12 rounded bg-gray-200 dark:bg-white/10" />
              <div className="h-4 w-16 rounded bg-gray-100 dark:bg-white/5" />
            </div>
            <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-white/10" />
            <div className="h-4 w-1/2 rounded bg-gray-100 dark:bg-white/5" />
          </div>
          <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
            <div className="h-4 w-20 rounded bg-gray-100 dark:bg-white/5" />
            <div className="h-4 w-16 rounded bg-gray-100 dark:bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface overflow-hidden animate-pulse">
      <div className="hidden md:block h-auto min-h-[160px] w-full md:w-56 lg:w-60 shrink-0 bg-gray-100 dark:bg-white/5 border-b md:border-b-0 md:border-r border-gray-100 dark:border-white/5 self-stretch" />
      <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="h-4 w-12 rounded bg-gray-200 dark:bg-white/10" />
            <div className="h-4 w-16 rounded bg-gray-200 dark:bg-white/10" />
            <div className="h-4 w-14 rounded bg-gray-100 dark:bg-white/5" />
          </div>
          <div className="h-6 w-3/4 rounded bg-gray-200 dark:bg-white/10" />
          <div className="space-y-1.5">
            <div className="h-4 w-full rounded bg-gray-100 dark:bg-white/5" />
            <div className="h-4 w-5/6 rounded bg-gray-100 dark:bg-white/5" />
          </div>
        </div>
        <div className="flex items-center gap-4 pt-3 border-t border-gray-100 dark:border-white/5 mt-3">
          <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-white/10" />
          <div className="h-4 w-24 rounded bg-gray-100 dark:bg-white/5" />
        </div>
      </div>
    </div>
  );
};

export const GigList: React.FC<GigListProps> = ({
  gigs,
  activeGigId,
  viewType = "grid",
  showFilters,
  loading,
  onToggleSave,
  baseRoute,
  getBudgetStatus,
}) => {
  const navigate = useNavigate();
  const outletCtx = useOutletContext<{ showFilters?: boolean } | null>();
  const isFiltersOpen = showFilters ?? outletCtx?.showFilters ?? false;
  const gridColsClass = isFiltersOpen
    ? "grid grid-cols-1 md:grid-cols-2 min-[1600px]:grid-cols-3 gap-4"
    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const isDevModeOpen = useGlobalState((state) => state.isDevModeOpen);
  const [reportingGig, setReportingGig] = useState<Gig | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9;

    useEffect(() => {
      setCurrentPage(1);
    }, [gigs.length]);

    const totalPages = Math.ceil(gigs.length / itemsPerPage);
    const paginatedGigs = gigs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatTimeAgo = (dateStr: string | undefined) => {
    if (!dateStr) return "Just now";
    try {
      let str = formatDistanceToNow(new Date(dateStr), { addSuffix: true });
      str = str.replace(/minutes?/, (m) => m === 'minutes' ? 'mins' : 'min')
               .replace(/hours?/, (m) => m === 'hours' ? 'hrs' : 'hr')
               .replace(/seconds?/, (m) => m === 'seconds' ? 'secs' : 'sec')
               .replace(/days?/, 'd')
               .replace(/months?/, 'm')
               .replace(/years?/, (m) => m === 'years' ? 'yrs' : 'yr')
               .replace('about ', '');
      return str;
    } catch {
      return "Just now";
    }
  };

  if (loading) {
    return (
      <div className={viewType === "grid" ? gridColsClass : "flex flex-col gap-4"}>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <GigCardSkeleton key={n} viewType={viewType} />
        ))}
      </div>
    );
  }

  if (gigs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="p-12 text-center rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/40 text-gray-500 dark:text-zinc-500"
      >
        No gigs found matching your parameters.
      </motion.div>
    );
  }

  return (
      <div className="flex flex-col flex-1 relative min-h-[calc(100vh-250px)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage + viewType}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex-1 ${
              viewType === "grid"
                ? `${gridColsClass} content-start`
                : "flex flex-col gap-4"
            }`}
          >
        <AnimatePresence mode="popLayout">
          {paginatedGigs.map((gig, index) => {
            const isActive = activeGigId === gig.id;
            const isClosed = gig.status?.toLowerCase() === "closed";
            const isPaused = gig.status?.toLowerCase() === "paused";
            const isOpen = !isClosed && !isPaused;
            const hasServiceRating = gig.ratingCount > 0;
            const rankInfo = computeGigRankingBreakdown(gig);

            if (viewType === "grid") {
              return (
                <motion.div
                  key={gig.id}
                  layout="position"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
                  data-tour={index === 0 ? "gig-card-first" : undefined}
                  onClick={() => navigate(`${baseRoute}/${gig.id}`)}
                  className={`group flex flex-col justify-between rounded-2xl border overflow-hidden transition-colors duration-200 cursor-pointer ${
                    isActive
                      ? "border-blue-500 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.1)]"
                      : "border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/40 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/[0.06] shadow-sm hover:shadow-md dark:shadow-none"
                  }`}
                >
                  <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-gray-200 dark:bg-dark-surface border-b border-gray-100 dark:border-white/5 shrink-0">
                      <img
                        src={gig.thumbnail}
                        alt={gig.title}
                        className="h-full w-full object-cover opacity-80 transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 dark:from-black/60 via-transparent to-transparent pointer-events-none" />
                      {isDevModeOpen && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] pointer-events-none select-none p-2 text-center">
                          <span className="text-[9px] uppercase tracking-widest font-black text-indigo-300">
                            Algo Score
                          </span>
                          <span className="text-2xl md:text-3xl font-black text-white font-mono drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] leading-none mt-0.5">
                            {rankInfo.totalScore.toFixed(1)}
                          </span>
                          <div className="flex flex-wrap items-center justify-center gap-1 mt-1">
                            {typeof gig.discoveryOrderKey === "number" && (
                              <span className="px-1.5 py-0.5 rounded bg-indigo-500/30 border border-indigo-400/40 text-[8.5px] font-mono font-bold text-indigo-100">
                                Roll: {gig.discoveryOrderKey.toFixed(1)}
                              </span>
                            )}
                            {rankInfo.subscriptionBoost > 0 ? (
                              <span
                                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold border shadow-xs ${
                                  rankInfo.subscriptionPlan === "Business"
                                    ? "bg-purple-500/30 border-purple-400/50 text-purple-200"
                                    : "bg-amber-500/30 border-amber-400/50 text-amber-200"
                                }`}
                              >
                                <Sparkles className="h-2.5 w-2.5 shrink-0" />
                                <span>{rankInfo.subscriptionPlan} (+{rankInfo.subscriptionBoost.toFixed(1)})</span>
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-[8.5px] font-mono text-zinc-300">
                                Free (+0.0)
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Top-left: Orders and Ordered status tag (matches Jobs Proposals & Applied tag) */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10 flex-wrap">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold border border-white/10">
                          <ShoppingCart className="h-3 w-3" />
                          <span>{gig.ordersCount || 0} Orders</span>
                        </div>
                        {gig.hasPendingOrder && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600/90 backdrop-blur-sm text-white text-[10px] font-bold border border-emerald-400/30 shadow-xs">
                            <Check className="h-3 w-3" />
                            <span>Ordered</span>
                          </div>
                        )}
                      </div>

                      {/* Bottom-left Tiers Count Tag (matches Jobs Team/Individual tag) */}
                      {gig.tiers && gig.tiers.length > 0 && (
                        <div className="absolute bottom-2 left-2 z-10">
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/95 dark:bg-black/80 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/15 backdrop-blur-md text-[9px] font-semibold shadow-xs">
                            <Layers className="h-2.5 w-2.5 text-gray-500 dark:text-zinc-400" />
                            <span>{gig.tiers.length} {gig.tiers.length === 1 ? "Tier" : "Tiers"}</span>
                          </span>
                        </div>
                      )}

                      {/* Bottom-right Service Rating Badge */}
                      <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5">
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold border border-white/15 shadow-xs">
                          <Star className={`h-3 w-3 ${hasServiceRating ? "fill-yellow-400 text-yellow-400" : "fill-gray-400 text-gray-400"}`} />
                          <span className={hasServiceRating ? "text-yellow-400 font-bold" : "text-gray-300 dark:text-zinc-400"}>
                            {hasServiceRating ? `${gig.clientRating} (${gig.ratingCount})` : rankInfo.isNewListing ? "New" : "N/A"}
                          </span>
                        </div>
                      </div>

                      <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                        {!gig.isOwnGig && !isGuestMode && (
                          <button
                            type="button"
                            title="Report Post"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReportingGig(gig);
                            }}
                            className="p-1.5 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm text-gray-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          >
                            <Flag className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {gig.canManageGig && (
                          <button
                            type="button"
                            title="Edit Service"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/gigs/edit/${gig.id}`);
                            }}
                            className="p-1.5 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm text-gray-500 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {!isGuestMode && (
                          <button
                            type="button"
                            onClick={(e) => onToggleSave(e, gig.id)}
                            className={`p-1.5 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm transition-colors flex items-center gap-1 ${
                              gig.isSaved ? "text-yellow-500" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            }`}
                          >
                            <Bookmark className={`h-4 w-4 ${gig.isSaved ? "fill-current" : ""}`} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Category & Status Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {(() => {
                        if (isClosed) {
                          return (
                            <span className="relative overflow-hidden px-2 py-0.5 rounded text-[10px] font-bold border bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                              Closed
                            </span>
                          );
                        }
                        if (isPaused) {
                          return (
                            <span className="relative overflow-hidden px-2 py-0.5 rounded text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                              Queue Full
                            </span>
                          );
                        }
                        return (
                          <span className="relative overflow-hidden px-2 py-0.5 rounded text-[10px] font-bold border bg-emerald-100 text-emerald-700 border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.25)] dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40">
                            <span className="relative z-10">Open</span>
                            <span className="absolute inset-0 -translate-x-full animate-badge-shine bg-gradient-to-r from-transparent via-emerald-400/40 dark:via-emerald-400/30 to-transparent" />
                          </span>
                        );
                      })()}
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-white/10 text-gray-800 dark:text-zinc-300">
                        {gig.category || "General"}
                        </span>
                      {rankInfo.isRisingCreator && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/gigs/info");
                          }}
                          title={`Rising Creator — Click to see how this badge works (Score: ${rankInfo.totalScore})`}
                          className="relative overflow-hidden inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100/90 text-emerald-800 border-2 border-emerald-400 hover:bg-emerald-200/90 dark:bg-emerald-500/25 dark:text-emerald-200 dark:border-emerald-400 dark:hover:bg-emerald-500/35 shadow-xs transition-colors cursor-pointer"
                        >
                          <TrendingUp className="relative z-10 h-2.5 w-2.5" />
                          <span className="relative z-10">Rising</span>
                          <span className="absolute inset-0 -translate-x-full animate-badge-shine bg-gradient-to-r from-transparent via-white/50 dark:via-white/30 to-transparent pointer-events-none" />

                        </button>
                      )}
                    </div>

                    {/* Price & Title */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="text-amber-500 dark:text-amber-400 text-base font-black flex items-center gap-1">
                        <CreditIcon className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0" />
                        <span>{Math.min(...(gig.tiers?.map(t => t.price) || [0])).toLocaleString()}</span>
                        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Starting at</span>
                      </div>
                      <BudgetBadge status={getBudgetStatus?.(gig) ?? null} />
                    </div>
                    <h3 className="text-sm font-bold leading-tight text-gray-900 dark:text-white mb-1.5 line-clamp-1 hover:text-blue-600 transition-colors">
                      {gig.title}
                    </h3>
                    <div
                      className="text-[12px] text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-3"
                      dangerouslySetInnerHTML={{ __html: gig.description.replace(/\n/g, "<br/>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>") }}
                    />
                  </div>

                  <div className="mt-2 pt-4 border-t border-gray-200 dark:border-white/5 flex flex-wrap items-center justify-between text-[10px] text-gray-500 dark:text-zinc-400 gap-3">
                    <div className="flex items-center gap-2 truncate">
                      <div className="relative h-6 w-6 shrink-0">
                        <img
                          src={gig.clientAvatar}
                          alt=""
                          className={`h-6 w-6 rounded-full object-cover border border-gray-200 dark:border-white/10 ${!gig.clientAvatar ? 'hidden' : ''}`}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling;
                            if (fallback) {
                              fallback.classList.remove('hidden');
                              fallback.classList.add('flex');
                            }
                          }}
                        />
                        <div className={`${gig.clientAvatar ? 'hidden' : 'flex'} absolute inset-0 items-center justify-center rounded-full bg-gray-200 dark:bg-zinc-800 text-[10px] text-gray-700 dark:text-white font-bold border border-gray-200 dark:border-white/10 overflow-hidden`}>
                          {gig.postedBy ? gig.postedBy.charAt(0) : "U"}
                        </div>
                      </div>
                      <div className="text-left leading-tight truncate">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-xs font-bold text-gray-700 dark:text-zinc-300 truncate">{gig.postedBy}</p>
                          <SubscriptionIcon plan={gig.freelancerSubscriptionPlan} />
                        </div>
                        {/* Freelancer Overall Rating */}
                        <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-zinc-400">
                          <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                          <span>{gig.ratingCount > 0 ? `${gig.clientRating} (${gig.ratingCount})` : "N/A"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500 dark:text-zinc-400 shrink-0">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-400 dark:text-zinc-500" /> {formatTimeAgo(gig.postedAt)}
                      </span>
                    </div>
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
                data-tour={index === 0 ? "gig-card-first" : undefined}
                onClick={() => navigate(`${baseRoute}/${gig.id}`)}
                className={`group flex flex-col md:flex-row rounded-2xl border overflow-hidden transition-colors duration-200 cursor-pointer ${
                  isActive
                    ? "border-blue-500 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.1)]"
                    : "border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/40 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/[0.06] shadow-sm hover:shadow-md dark:shadow-none"
                }`}
              >
                {/* Left: Image Thumbnail */}
                <div className="hidden md:block relative h-auto min-h-[180px] w-56 lg:w-60 shrink-0 overflow-hidden bg-gray-200 dark:bg-dark-surface border-r border-gray-100 dark:border-white/5 self-stretch">
                  <img
                    src={gig.thumbnail}
                    alt={gig.title}
                    className="h-full w-full object-cover opacity-80 transition-transform duration-300 group-hover:scale-105 absolute inset-0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 dark:from-black/60 via-transparent to-transparent pointer-events-none" />
                  {isDevModeOpen && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] pointer-events-none select-none p-2 text-center">
                      <span className="text-[9px] uppercase tracking-widest font-black text-indigo-300">
                        Algo Score
                      </span>
                      <span className="text-2xl md:text-3xl font-black text-white font-mono drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] leading-none mt-0.5">
                        {rankInfo.totalScore.toFixed(1)}
                      </span>
                      <div className="flex flex-wrap items-center justify-center gap-1 mt-1">
                        {typeof gig.discoveryOrderKey === "number" && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/30 border border-indigo-400/40 text-[8.5px] font-mono font-bold text-indigo-100">
                            Roll: {gig.discoveryOrderKey.toFixed(1)}
                          </span>
                        )}
                        {rankInfo.subscriptionBoost > 0 ? (
                          <span
                            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold border shadow-xs ${
                              rankInfo.subscriptionPlan === "Business"
                                ? "bg-purple-500/30 border-purple-400/50 text-purple-200"
                                : "bg-amber-500/30 border-amber-400/50 text-amber-200"
                            }`}
                          >
                            <Sparkles className="h-2.5 w-2.5 shrink-0" />
                            <span>{rankInfo.subscriptionPlan} (+{rankInfo.subscriptionBoost.toFixed(1)})</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-[8.5px] font-mono text-zinc-300">
                            Free (+0.0)
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Top-left: Orders and Ordered status tag (matches Jobs Proposals & Applied tag) */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10 flex-wrap">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold border border-white/10">
                      <ShoppingCart className="h-3 w-3" />
                      <span>{gig.ordersCount || 0} Orders</span>
                    </div>
                    {gig.hasPendingOrder && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600/90 backdrop-blur-sm text-white text-[10px] font-bold border border-emerald-400/30 shadow-xs">
                        <Check className="h-3 w-3" />
                        <span>Ordered</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom-left Tiers Count Tag on Thumbnail */}
                  {gig.tiers && gig.tiers.length > 0 && (
                    <div className="absolute bottom-2 left-2 z-10">
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/95 dark:bg-black/80 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/15 backdrop-blur-md text-[9px] font-semibold shadow-xs">
                        <Layers className="h-2.5 w-2.5 text-gray-500 dark:text-zinc-400" />
                        <span>{gig.tiers.length} {gig.tiers.length === 1 ? "Tier" : "Tiers"}</span>
                      </span>
                    </div>
                  )}

                  {/* Bottom-right Service Rating Badge */}
                  <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold border border-white/15 shadow-xs">
                      <Star className={`h-3 w-3 ${hasServiceRating ? "fill-yellow-400 text-yellow-400" : "fill-gray-400 text-gray-400"}`} />
                      <span className={hasServiceRating ? "text-yellow-400 font-bold" : "text-gray-300 dark:text-zinc-400"}>
                        {hasServiceRating ? `${gig.clientRating} (${gig.ratingCount})` : rankInfo.isNewListing ? "New" : "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                    {!gig.isOwnGig && !isGuestMode && (
                      <button
                        type="button"
                        title="Report Post"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReportingGig(gig);
                        }}
                        className="p-1.5 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm text-gray-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        <Flag className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {gig.canManageGig && (
                      <button
                        type="button"
                        title="Edit Service"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/gigs/edit/${gig.id}`);
                        }}
                        className="p-1.5 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm text-gray-500 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {!isGuestMode && (
                      <button
                        type="button"
                        onClick={(e) => onToggleSave(e, gig.id)}
                        className={`p-1.5 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm transition-colors flex items-center gap-1 ${
                          gig.isSaved ? "text-yellow-500" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                        }`}
                      >
                        <Bookmark className={`h-4 w-4 ${gig.isSaved ? "fill-current" : ""}`} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Right: Content details */}
                <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(() => {
                        if (isClosed) {
                          return (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                              Closed
                            </span>
                          );
                        }
                        if (isPaused) {
                          return (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                              Queue Full
                            </span>
                          );
                        }
                        return (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                            Open
                          </span>
                        );
                      })()}
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-white/10 text-gray-800 dark:text-zinc-300">
                        {gig.category || "General"}
                      </span>
                      {rankInfo.isRisingCreator && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/gigs/info");
                          }}
                          title={`Rising Creator — Click to see how this badge works (Score: ${rankInfo.totalScore})`}
                          className="relative overflow-hidden inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100/90 text-emerald-800 border-2 border-emerald-400 hover:bg-emerald-200/90 dark:bg-emerald-500/25 dark:text-emerald-200 dark:border-emerald-400 dark:hover:bg-emerald-500/35 shadow-xs transition-colors cursor-pointer"
                        >
                          <TrendingUp className="relative z-10 h-2.5 w-2.5" />
                          <span className="relative z-10">Rising</span>
                          <span className="absolute inset-0 -translate-x-full animate-badge-shine bg-gradient-to-r from-transparent via-white/50 dark:via-white/30 to-transparent pointer-events-none" />

                        </button>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="text-amber-500 dark:text-amber-400 text-lg font-black flex items-center gap-1.5">
                          <CreditIcon className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0" />
                          <span>{Math.min(...(gig.tiers?.map(t => t.price) || [0])).toLocaleString()}</span>
                          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Starting at</span>
                        </div>
                        <BudgetBadge status={getBudgetStatus?.(gig) ?? null} />
                      </div>
                      <h3 className="text-gray-900 dark:text-white text-xl font-bold mb-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {gig.title}
                      </h3>
                    </div>

                    <div
                      className="text-[13px] text-gray-600 dark:text-zinc-400 line-clamp-2 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: gig.description.replace(/\n/g, "<br/>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>") }}
                    />

                    {Array.isArray(gig.skills) && gig.skills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
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

                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-zinc-400 font-medium">
                      <Clock className="h-3 w-3" />
                      <span>Posted {formatTimeAgo(gig.postedAt)}</span>
                    </div>
                  </div>

                  <div className="mt-2 pt-4 border-t border-gray-200 dark:border-white/5 flex flex-wrap items-center justify-between text-[10px] text-gray-500 dark:text-zinc-400 gap-3">
                    <div className="flex items-center gap-2 truncate">
                      <div className="relative h-6 w-6 shrink-0">
                        <img
                          src={gig.clientAvatar}
                          alt=""
                          className={`h-6 w-6 rounded-full object-cover border border-gray-200 dark:border-white/10 ${!gig.clientAvatar ? 'hidden' : ''}`}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling;
                            if (fallback) {
                              fallback.classList.remove('hidden');
                              fallback.classList.add('flex');
                            }
                          }}
                        />
                        <div className={`${gig.clientAvatar ? 'hidden' : 'flex'} absolute inset-0 items-center justify-center rounded-full bg-gray-200 dark:bg-zinc-800 text-[10px] text-gray-700 dark:text-white font-bold border border-gray-200 dark:border-white/10 overflow-hidden`}>
                          {gig.postedBy ? gig.postedBy.charAt(0) : "U"}
                        </div>
                      </div>
                      <div className="text-left leading-tight truncate">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-xs font-bold text-gray-700 dark:text-zinc-300 truncate">{gig.postedBy}</p>
                          <SubscriptionIcon plan={gig.freelancerSubscriptionPlan} />
                        </div>
                        {/* Freelancer Overall Rating */}
                        <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-zinc-400">
                          <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                          <span>{gig.ratingCount > 0 ? `${gig.clientRating} (${gig.ratingCount})` : "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium text-gray-500 dark:text-zinc-400">
                      <span className="bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-md border border-gray-200 dark:border-white/10 flex items-center gap-1">
                        <Users className="h-3 w-3 text-gray-400 dark:text-zinc-500" /> {gig.slots} Slots
                      </span>
                      <span className="bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-md border border-gray-200 dark:border-white/10 flex items-center gap-1">
                        <ShoppingCart className="h-3 w-3 text-gray-400 dark:text-zinc-500" /> {gig.ordersCount || 0} Orders
                      </span>
                      <span className="bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-md border border-gray-200 dark:border-white/10 flex items-center gap-1">
                        <Heart className="h-3 w-3 text-gray-400 dark:text-zinc-500" /> {gig.savesCount || 0} Saves
                      </span>
                      <span className="bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-md border border-gray-200 dark:border-white/10 flex items-center gap-1">
                        <Send className="h-3 w-3 text-gray-400 dark:text-zinc-500" /> {gig.firstDraftDelivery || "Fast"} Delivery
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
          </motion.div>
        </AnimatePresence>
        
        {totalPages > 1 && (
          <div className="sticky bottom-0 mt-auto py-4 z-10 flex justify-center">
            <div className="flex items-center gap-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-gray-200 dark:border-white/10 shadow-lg">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 text-sm font-medium rounded-full text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`h-8 w-8 rounded-full text-sm font-bold flex items-center justify-center transition-colors ${
                      currentPage === i + 1
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/10"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1 text-sm font-medium rounded-full text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

      {/* Pop-up Report Modal in-place */}
      <PopupReportGig
        isOpen={Boolean(reportingGig)}
        gigTitle={reportingGig?.title}
        onClose={() => setReportingGig(null)}
        onSubmitReport={async (reason, details) => {
          if (!reportingGig?.id) throw new Error("Select a gig to report");
          await api.post(`/api/gigs/${reportingGig.id}/report`, { reason, description: details });
        }}
      />
    </div>
  );
};

export default GigList;