import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Star,
  ArrowRight,
  Wrench,
  Bookmark,
  ShoppingCart,
  Clock,
  Layers,
  TrendingUp,
} from "lucide-react";
import { CreditIcon } from "@/components/ui/credit-icon";
import api from "@/lib/axios";
import { formatDistanceToNow } from "date-fns";
import { computeGigRankingBreakdown } from "../gig_ranking";
import useGlobalState from "@/lib/global_state";

interface GigsOtherServicesProps {
  currentGigId?: string;
}

export const GigsOtherServices: React.FC<GigsOtherServicesProps> = ({ currentGigId }) => {
  const navigate = useNavigate();
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const [gigs, setGigs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const formatTimeAgo = (dateStr: string | undefined) => {
    if (!dateStr) return "Just now";
    try {
      let str = formatDistanceToNow(new Date(dateStr), { addSuffix: true });
      str = str
        .replace(/minutes?/, (m) => (m === "minutes" ? "mins" : "min"))
        .replace(/hours?/, (m) => (m === "hours" ? "hrs" : "hr"))
        .replace(/seconds?/, (m) => (m === "seconds" ? "secs" : "sec"))
        .replace(/days?/, "d")
        .replace(/months?/, "m")
        .replace(/years?/, (m) => (m === "years" ? "yrs" : "yr"))
        .replace("about ", "");
      return str;
    } catch {
      return "Just now";
    }
  };

  useEffect(() => {
    const fetchGigs = async () => {
      setIsLoading(true);
      try {
        const response = await api.get("/api/gigs");
        if (response.data && response.data.success) {
          const cloudFrontUrl = import.meta.env.VITE_CLOUDFRONT_URL || "";
          const mapUrl = (path?: string) => {
            if (!path) return "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80";
            if (path.startsWith("http") || path.startsWith("/")) return path;
            return `${cloudFrontUrl}/${path}`;
          };

          const mappedGigs = response.data.data
            .filter((g: any) => {
              const isNotCurrent = g.id !== currentGigId && g.gig_id !== currentGigId;
              const isOpen =
                (g.status || "").toLowerCase() === "open" ||
                (g.status || "").toLowerCase() === "active" ||
                !g.status;
              return isNotCurrent && isOpen;
            })
            .sort(
              (a: any, b: any) =>
                computeGigRankingBreakdown(b).totalScore -
                computeGigRankingBreakdown(a).totalScore
            )
            .slice(0, 3)
            .map((g: any) => {
              const rawAvatar = g.client_avatar_path || g.clientAvatar || g.creator_avatar_path;
              const isValidAvatar = rawAvatar && !rawAvatar.includes("pravatar.cc");

              return {
                ...g,
                thumbnail: mapUrl(g.thumbnail_path || g.thumbnail),
                clientAvatar: isValidAvatar ? mapUrl(rawAvatar) : undefined,
              };
            });
          setGigs(mappedGigs);
        }
      } catch (error) {
        console.error("Error fetching other gigs:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGigs();
  }, [currentGigId]);

  const handleToggleSave = async (e: React.MouseEvent, gigId: string) => {
    e.stopPropagation();
    if (isGuestMode) return;
    try {
      setGigs((prev) =>
        prev.map((gig) => (gig.id === gigId ? { ...gig, isSaved: !gig.isSaved } : gig))
      );
      await api.post(`/api/gigs/${gigId}/save`);
    } catch {
      setGigs((prev) =>
        prev.map((gig) => (gig.id === gigId ? { ...gig, isSaved: !gig.isSaved } : gig))
      );
    }
  };

  if (!isLoading && gigs.length === 0) return null;

  return (
    <section className="mt-16 pt-8 border-t border-gray-200 dark:border-white/10 w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold tracking-tight text-gray-900 dark:text-white"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Other Services You May Like
          </h2>
          <p
            className="text-xs text-gray-500 dark:text-zinc-400"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Explore more creative offerings and talent across the marketplace
          </p>
        </div>
        <button
          onClick={() => navigate("/gigs/services")}
          className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-zinc-400 transition-colors hover:text-blue-500 dark:hover:text-blue-400 cursor-pointer"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          View More Services <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/40 p-4 animate-pulse"
              >
                <div>
                  {/* Thumbnail Skeleton */}
                  <div className="mb-3 h-40 w-full rounded-xl bg-gray-200 dark:bg-zinc-800" />

                  {/* Badges Skeleton */}
                  <div className="mb-2 flex items-center gap-1.5">
                    <div className="h-4 w-12 rounded bg-gray-200 dark:bg-zinc-800" />
                    <div className="h-4 w-16 rounded bg-gray-200 dark:bg-zinc-800" />
                  </div>

                  {/* Price Skeleton */}
                  <div className="mb-2 h-5 w-24 rounded bg-gray-200 dark:bg-zinc-800" />

                  {/* Title Skeleton */}
                  <div className="mb-1.5 h-4 w-3/4 rounded bg-gray-200 dark:bg-zinc-800" />

                  {/* Description Skeleton */}
                  <div className="mb-1 h-3 w-full rounded bg-gray-200 dark:bg-zinc-800" />
                  <div className="mb-3 h-3 w-2/3 rounded bg-gray-200 dark:bg-zinc-800" />

                  {/* Skills Skeleton */}
                  <div className="flex gap-1.5 mb-1">
                    <div className="h-4 w-14 rounded-md bg-gray-200 dark:bg-zinc-800" />
                    <div className="h-4 w-14 rounded-md bg-gray-200 dark:bg-zinc-800" />
                  </div>
                </div>

                {/* Footer Skeleton */}
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-zinc-800" />
                    <div className="h-3 w-20 rounded bg-gray-200 dark:bg-zinc-800" />
                  </div>
                  <div className="h-4 w-14 rounded-md bg-gray-200 dark:bg-zinc-800" />
                </div>
              </div>
            ))
          : gigs.map((gig) => {
              const startingPrice =
                gig.tiers && gig.tiers.length > 0
                  ? Math.min(...gig.tiers.map((t: any) => Number(t.price) || 0))
                  : 0;

              const hasValidAvatar = gig.clientAvatar && !gig.clientAvatar.includes("pravatar.cc");
              const hasServiceRating = (gig.ratingCount || 0) > 0;
              const isOpen = !(
                gig.status?.toLowerCase() === "closed" || gig.status?.toLowerCase() === "close"
              );
              const rankInfo = computeGigRankingBreakdown(gig);

              return (
                <div
                  key={gig.id}
                  onClick={() => {
                    navigate(`/gigs/services/${gig.id}/page`);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="group flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/40 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-gray-300 dark:hover:border-white/30 hover:bg-gray-50 dark:hover:bg-white/[0.06] cursor-pointer shadow-sm dark:shadow-none"
                >
                  <div>
                    {/* Thumbnail Image */}
                    <div className="relative mb-3 h-40 w-full overflow-hidden rounded-xl border border-gray-100 dark:border-white/5 bg-gray-200 dark:bg-zinc-900">
                      <img
                        src={gig.thumbnail}
                        alt={gig.title}
                        className="h-full w-full object-cover opacity-80 transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 dark:from-black/60 via-transparent to-transparent pointer-events-none" />

                      {/* Orders and Service Rating grouped together at top-left */}
                      <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1.5 z-10">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold border border-white/10">
                          <ShoppingCart className="h-3 w-3" />
                          <span>{gig.ordersCount || 0} Orders</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-[10px] font-semibold border border-white/10 text-white">
                          <Star
                            className={`h-3 w-3 ${
                              hasServiceRating
                                ? "fill-yellow-400 text-yellow-400"
                                : "fill-gray-400 text-gray-400"
                            }`}
                          />
                          <span
                            className={
                              hasServiceRating
                                ? "text-yellow-400"
                                : "text-gray-300 dark:text-zinc-400"
                            }
                          >
                            {hasServiceRating
                              ? `${gig.clientRating} (${gig.ratingCount})`
                              : rankInfo.isNewListing
                              ? "New"
                              : "N/A"}
                          </span>
                        </div>
                      </div>

                      {/* Bottom-left Tiers Count Tag on Thumbnail */}
                      {gig.tiers && gig.tiers.length > 0 && (
                        <div className="absolute bottom-2 left-2 z-10">
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/95 dark:bg-black/80 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/15 backdrop-blur-md text-[9px] font-semibold shadow-xs">
                            <Layers className="h-2.5 w-2.5 text-gray-500 dark:text-zinc-400" />
                            <span>
                              {gig.tiers.length} {gig.tiers.length === 1 ? "Tier" : "Tiers"}
                            </span>
                          </span>
                        </div>
                      )}

                      {!isGuestMode && (
                        <button
                          onClick={(e) => handleToggleSave(e, gig.id)}
                          className={`absolute top-2 right-2 rounded-full bg-white/80 dark:bg-black/50 p-1.5 backdrop-blur-sm transition ${
                            gig.isSaved
                              ? "text-amber-500 dark:text-amber-400"
                              : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          }`}
                        >
                          <Bookmark
                            className={`h-3.5 w-3.5 ${gig.isSaved ? "fill-current" : ""}`}
                          />
                        </button>
                      )}
                    </div>

                    {/* Badges & Slots on Same Row */}
                    <div className="mb-2 flex items-center justify-between gap-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`relative overflow-hidden rounded border px-2 py-0.5 text-[10px] font-bold ${
                            !isOpen
                              ? "border-red-300 bg-red-100 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                              : "border-emerald-300 bg-emerald-100 text-emerald-700 shadow-[0_0_8px_rgba(16,185,129,0.25)] dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300"
                          }`}
                        >
                          <span className="relative z-10">{isOpen ? "Open" : "Closed"}</span>
                          {isOpen && (
                            <span className="absolute inset-0 -translate-x-full animate-badge-shine bg-gradient-to-r from-transparent via-emerald-400/40 dark:via-emerald-400/30 to-transparent" />
                          )}
                        </span>
                        <span className="rounded border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-gray-800 dark:text-zinc-300">
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
                            className="relative overflow-hidden inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 dark:hover:bg-emerald-500/25 transition-colors cursor-pointer"
                          >
                            <TrendingUp className="relative z-10 h-2.5 w-2.5" />
                            <span className="relative z-10">Rising</span>
                            <span className="absolute inset-0 -translate-x-full animate-badge-shine bg-gradient-to-r from-transparent via-emerald-400/35 dark:via-emerald-300/25 to-transparent pointer-events-none" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-[10px] font-semibold text-gray-600 dark:text-zinc-300 border border-gray-300 dark:border-white/10 shrink-0">
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        {gig.slots} Slots
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-1 flex items-center gap-1 text-amber-500 dark:text-amber-400">
                      <CreditIcon className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0" />
                      <span className="text-base font-black text-amber-500 dark:text-amber-400">
                        {startingPrice.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                        Starting at
                      </span>
                    </div>

                    {/* Title */}
                    <h3
                      className="mb-1 text-[15px] font-bold leading-snug text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {gig.title}
                    </h3>

                    {/* Rich-Formatted Description */}
                    <div
                      className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2 mb-3 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: (gig.description || "")
                          .replace(/\n/g, "<br/>")
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\*(.*?)\*/g, "<em>$1</em>"),
                      }}
                    />

                    {/* Skills */}
                    {Array.isArray(gig.skills) && gig.skills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <Wrench className="h-3 w-3 text-gray-400 dark:text-zinc-400 shrink-0 mr-0.5" />
                        {gig.skills.slice(0, 3).map((skill: string) => (
                          <span
                            key={skill}
                            className="rounded-md border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:text-zinc-300"
                          >
                            {skill}
                          </span>
                        ))}
                        {gig.skills.length > 3 && (
                          <span className="rounded-md border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-zinc-400">
                            +{gig.skills.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-auto pt-3 border-t border-gray-200 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <div className="relative h-5 w-5 shrink-0">
                        <img
                          src={hasValidAvatar ? gig.clientAvatar : undefined}
                          alt={gig.postedBy}
                          className={`h-5 w-5 rounded-full object-cover border border-gray-300 dark:border-zinc-700 ${
                            !hasValidAvatar ? "hidden" : ""
                          }`}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fallback = e.currentTarget.nextElementSibling;
                            if (fallback) {
                              fallback.classList.remove("hidden");
                              fallback.classList.add("flex");
                            }
                          }}
                        />
                        <div
                          className={`${
                            hasValidAvatar ? "hidden" : "flex"
                          } absolute inset-0 items-center justify-center rounded-full border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-zinc-800 text-[9px] font-bold text-gray-700 dark:text-white`}
                        >
                          {gig.postedBy ? gig.postedBy.charAt(0) : "U"}
                        </div>
                      </div>

                      <div className="flex flex-col truncate">
                        <span className="text-[11px] font-semibold text-gray-700 dark:text-zinc-300 truncate">
                          {gig.postedBy}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-medium text-gray-500">
                          <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                          <span>
                            {gig.ratingCount > 0
                              ? `${gig.clientRating} (${gig.ratingCount})`
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] font-medium text-gray-400 dark:text-zinc-500 shrink-0 ml-2">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimeAgo(gig.postedAt).replace(/^about\s+/i, "")}</span>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
    </section>
  );
};

export default GigsOtherServices;
