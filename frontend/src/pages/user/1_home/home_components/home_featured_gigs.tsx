// src/pages/user/1_home/home_components/home_featured_gigs.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Star, ArrowRight } from "lucide-react";
import { sampleGigs } from "../../7_gigs/gig_datasets";

export const HomeFeaturedGigs: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold tracking-tight text-gray-900 dark:text-white"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Top Services
          </h2>
          <p
            className="text-xs text-gray-500 dark:text-zinc-400"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Top-rated freelance services offered by elite creators
          </p>
        </div>
        <button
          onClick={() => navigate("/gigs/services")}
          className="flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-white transition hover:text-gray-900 dark:hover:text-zinc-300"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Explore Services <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
        {sampleGigs.slice(0, 3).map((gig) => {
          const startingPrice = gig.tiers && gig.tiers.length > 0 
            ? Math.min(...gig.tiers.map(t => t.price)) 
            : 0;

          return (
            <div
              key={gig.id}
              onClick={() => navigate(`/gigs/services/${gig.id}/page`)}
              className="group flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a]/40 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-gray-300 dark:hover:border-white/30 hover:bg-gray-50 dark:hover:bg-white/[0.06] cursor-pointer shadow-sm dark:shadow-none"
            >
              <div>
                <div className="relative mb-3 h-36 w-full overflow-hidden rounded-xl border border-gray-100 dark:border-white/5 bg-gray-200 dark:bg-zinc-900">
                  <img
                    src={gig.thumbnail}
                    alt={gig.title}
                    className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 dark:from-black/60 via-transparent to-transparent" />
                  <button className="absolute top-2 right-2 rounded-full bg-white/80 dark:bg-black/50 p-1.5 backdrop-blur-sm transition text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                  </button>
                </div>

                {/* Badges */}
                <div className="mb-2 flex items-center gap-1.5">
                  <span className={`rounded border px-2 py-0.5 text-[10px] font-medium ${gig.status?.toLowerCase() === "closed" ? "border-red-300 bg-red-100 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400" : "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"}`}>
                    {gig.status || "Open"}
                  </span>
                  <span className="rounded border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-gray-800 dark:text-zinc-300">
                    {gig.category}
                  </span>
                </div>

                {/* Price */}
                <div className="mb-1 flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <span className="text-base font-black text-yellow-500">{startingPrice.toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Starting at</span>
                </div>

                {/* Title */}
                <h3 className="mb-1 text-[15px] font-bold leading-snug text-gray-900 dark:text-white line-clamp-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {gig.title}
                </h3>
                
                {/* Description */}
                <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
                  {gig.description}
                </p>
              </div>

              <div className="mt-auto pt-3 border-t border-gray-200 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <img src={gig.clientAvatar} alt={gig.postedBy} className="h-6 w-6 shrink-0 rounded-full object-cover border border-gray-300 dark:border-zinc-700" />
                  <div className="flex flex-col truncate">
                    <span className="text-[11px] font-semibold text-gray-700 dark:text-zinc-300 truncate">{gig.postedBy}</span>
                    <div className="flex items-center gap-1 text-[10px] font-medium text-gray-500">
                      <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-gray-700 dark:text-zinc-300">{gig.clientRating}</span>
                      <span>({gig.ratingCount})</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 dark:bg-zinc-800 text-[10px] font-semibold text-gray-600 dark:text-zinc-300 border border-gray-300 dark:border-white/10 shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
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