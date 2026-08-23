import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Star, ArrowRight, Wrench, Bookmark, ShoppingCart } from "lucide-react";
import api from "@/lib/axios";

interface GigsOtherServicesProps {
  currentGigId?: string;
}

export const GigsOtherServices: React.FC<GigsOtherServicesProps> = ({ currentGigId }) => {
  const navigate = useNavigate();
  const [gigs, setGigs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
              const isOpen = (g.status || "").toLowerCase() === "open" || (g.status || "").toLowerCase() === "active";
              return isNotCurrent && isOpen;
            })
            .slice(0, 3)
            .map((g: any) => {
              const rawAvatar = g.client_avatar_path || g.clientAvatar;
              const isValidAvatar = rawAvatar && !rawAvatar.includes('pravatar.cc');

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
          className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-zinc-400 transition-colors hover:text-blue-500 dark:hover:text-blue-400"
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
                  <div className="mb-3 h-36 w-full rounded-xl bg-gray-200 dark:bg-zinc-800" />

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

              const hasValidAvatar = gig.clientAvatar && !gig.clientAvatar.includes('pravatar.cc');
              const hasServiceRating = (gig.ratingCount || 0) > 0;

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
                    <div className="relative mb-3 h-36 w-full overflow-hidden rounded-xl border border-gray-100 dark:border-white/5 bg-gray-200 dark:bg-zinc-900">
                      <img
                        src={gig.thumbnail}
                        alt={gig.title}
                        className="h-full w-full object-cover opacity-80 transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 dark:from-black/80 via-transparent to-transparent pointer-events-none" />

                      {/* Orders and Service Rating grouped together at top-left */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold border border-white/10">
                          <ShoppingCart className="h-3 w-3" />
                          <span>{gig.ordersCount || 0} Orders</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-[10px] font-semibold border border-white/10 text-white">
                          <Star className={`h-3 w-3 ${hasServiceRating ? "fill-yellow-400 text-yellow-400" : "fill-gray-400 text-gray-400"}`} />
                          <span className={hasServiceRating ? "text-yellow-400" : "text-gray-300 dark:text-zinc-400"}>
                            {hasServiceRating ? `${gig.clientRating} (${gig.ratingCount})` : "N/A"}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className={`absolute top-2 right-2 rounded-full bg-white/80 dark:bg-black/50 p-1.5 backdrop-blur-sm transition ${
                          gig.isSaved
                            ? "text-yellow-500"
                            : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                        }`}
                      >
                        <Bookmark
                          className={`h-3.5 w-3.5 ${gig.isSaved ? "fill-current" : ""}`}
                        />
                      </button>
                    </div>

                    {/* Badges: Open Status + Category */}
                    <div className="mb-2 flex items-center gap-1.5">
                      <span className="rounded border border-emerald-300 dark:border-emerald-500/20 bg-emerald-100 dark:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                        Open
                      </span>
                      <span className="rounded border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-gray-800 dark:text-zinc-300">
                        {gig.category}
                      </span>
                    </div>

                    {/* Price */}
                    <div className="mb-1 flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-yellow-400" />
                      <span className="text-base font-black text-yellow-500">
                        {startingPrice.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                        Starting at
                      </span>
                    </div>

                    {/* Title */}
                    <h3
                      className="mb-1 text-[15px] font-bold leading-snug text-gray-900 dark:text-white line-clamp-1"
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
                      <div className="relative h-6 w-6 shrink-0">
                        <img
                          src={hasValidAvatar ? gig.clientAvatar : undefined}
                          alt={gig.postedBy}
                          className={`h-6 w-6 rounded-full object-cover border border-gray-300 dark:border-zinc-700 ${!hasValidAvatar ? 'hidden' : ''}`}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling;
                            if (fallback) {
                              fallback.classList.remove('hidden');
                              fallback.classList.add('flex');
                            }
                          }}
                        />
                        <div className={`${hasValidAvatar ? 'hidden' : 'flex'} absolute inset-0 items-center justify-center rounded-full border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-zinc-800 text-[10px] font-bold text-gray-700 dark:text-white`}>
                          {gig.postedBy ? gig.postedBy.charAt(0) : "U"}
                        </div>
                      </div>

                      <div className="flex flex-col truncate">
                        <span className="text-[11px] font-semibold text-gray-700 dark:text-zinc-300 truncate">
                          {gig.postedBy}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-medium text-gray-500">
                          <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-gray-700 dark:text-zinc-300">
                            {gig.clientRating || "5.0"}
                          </span>
                          <span>({gig.ratingCount || 0})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 dark:bg-zinc-800 text-[10px] font-semibold text-gray-600 dark:text-zinc-300 border border-gray-300 dark:border-white/10 shrink-0">
                      <svg
                        width="12"
                        height="12"
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
                </div>
              );
            })}
      </div>
    </section>
  );
};

export default GigsOtherServices;