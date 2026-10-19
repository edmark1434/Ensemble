import React, { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import api from "@/lib/axios";
import { Loader2, Users, Clock, Briefcase, ChevronRight, Plus } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { motion } from "framer-motion";
import { CreditIcon } from "@/components/ui/credit-icon";
import type { OrdersMainContext } from "./orders_main";
import { SelectJobCardSkeleton } from "../../6_job_market/job_proposals/proposals_pages/proposals_select_job_page";
import { continueIfAccountVerified } from "@/lib/accountVerification";
import { stripMarkdown } from "@/lib/markdownPaste";

export const OrdersSelectGigPage: React.FC = () => {
  const navigate = useNavigate();
  const { searchQuery } = useOutletContext<OrdersMainContext>();
  const [gigs, setGigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/gigs").then((res) => {
      if (res.data && res.data.data) {
        const cloudFrontUrl = import.meta.env.VITE_CLOUDFRONT_URL || '';
        const rawGigs = res.data.data.filter((g: any) => g.canManageGig);
        const mappedGigs = rawGigs.map((g: any) => ({
          ...g,
          thumbnail: g.thumbnail && !g.thumbnail.startsWith('http') 
            ? `${cloudFrontUrl}${g.thumbnail.startsWith('/') ? '' : '/'}${g.thumbnail}` 
            : g.thumbnail,
          clientAvatar: g.clientAvatar && !g.clientAvatar.startsWith('http')
            ? `${cloudFrontUrl}${g.clientAvatar.startsWith('/') ? '' : '/'}${g.clientAvatar}`
            : g.clientAvatar,
        }));
        setGigs(mappedGigs);
      }
      setLoading(false);
    }).catch((err) => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const filteredGigs = gigs.filter(
    (g) =>
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5 text-left w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-white/5 pb-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Select a Service Listing</h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            Choose one of your published services to view its incoming orders.
          </p>
        </div>
        <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3 py-1.5 rounded-xl border border-gray-100 dark:border-white/5 self-start sm:self-auto">
          {loading ? "Loading..." : `${filteredGigs.length} Active Listings`}
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <SelectJobCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredGigs.length === 0 ? (
        gigs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
            <div className="w-24 h-24 flex items-center justify-center mb-2 opacity-80 pointer-events-none">
              <DotLottieReact src="/icons/lottie/no-result.lottie" autoplay loop />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Service Postings Found</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm">
              You haven't posted any services yet. Post a service to start receiving orders!
            </p>
            <button
              onClick={() => continueIfAccountVerified(() => navigate('/gigs/create'))}
              className="mt-4 px-6 py-2.5 rounded-xl bg-blue-500 text-xs font-bold text-white hover:bg-blue-600 transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" /> Post a Service
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm dark:shadow-none p-12 text-center">
            <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium">No service postings found matching your search.</p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredGigs.map((gig) => (
            <motion.div
              key={gig.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              onClick={() => navigate(`/gigs/orders/incoming/${gig.id}`)}
              className="group rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface overflow-hidden shadow-xs hover:shadow-xl hover:border-blue-500/40 dark:hover:border-blue-500/40 cursor-pointer transition-all duration-200 flex flex-col justify-between"
            >
              {/* Thumbnail Image Header */}
              <div className="relative h-44 w-full bg-gray-100 dark:bg-zinc-900 border-b border-gray-100 dark:border-white/5 overflow-hidden shrink-0">
                <img
                  src={gig.thumbnail}
                  alt={gig.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                />
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <div className="px-2.5 py-1 rounded-full bg-white/90 dark:bg-black/75 backdrop-blur-md border border-gray-200/80 dark:border-white/20 text-gray-900 dark:text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                    <Briefcase className="h-3 w-3 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>{gig.tiers ? gig.tiers.length : 0} Tiers</span>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-white/90 dark:bg-black/75 backdrop-blur-md border border-gray-200/80 dark:border-white/20 text-gray-900 dark:text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                    <Users className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>{gig.ordersCount || 0} Total</span>
                  </div>
                </div>
              </div>

              {/* Gig Info Body */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                    <span className={`px-2.5 py-1 rounded-full border ${
                      gig.status === "Open" || !gig.status
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                        : "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                    }`}>
                      {gig.status || "Open"}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-gray-50 dark:bg-dark-base border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300">{gig.category}</span>
                    <span className="px-2.5 py-1 rounded-full bg-gray-50 dark:bg-dark-base border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300">{gig.slots} Slots</span>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 leading-snug">
                    {gig.title}
                  </h3>
                  
                  <p className="text-xs text-gray-600 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                    {stripMarkdown(gig.description)}
                  </p>
                </div>

                {/* Financial Stats */}
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200/90 dark:border-amber-500/20">
                    <span className="text-[10px] font-bold text-amber-900/80 dark:text-amber-400/80 uppercase tracking-wider block truncate">Starting</span>
                    <span className="font-black text-amber-700 dark:text-amber-400 flex items-center gap-1 text-sm mt-0.5">
                      <CreditIcon className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" /> {gig.tiers && gig.tiers[0] ? gig.tiers[0].price : 0}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                    <span className="text-[10px] font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider block truncate">Pending</span>
                    <span className="font-black text-gray-900 dark:text-white flex items-center gap-1 text-sm mt-0.5">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-zinc-400" /> {gig.pendingOrdersCount || 0}
                    </span>
                  </div>
                </div>

                {/* Action Link Footer */}
                <div className="pt-3.5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
                    {gig.postedAt ? new Date(gig.postedAt).toLocaleDateString() : gig.timeAgo}
                  </span>
                  <div className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform font-semibold">
                    View Orders <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersSelectGigPage;
