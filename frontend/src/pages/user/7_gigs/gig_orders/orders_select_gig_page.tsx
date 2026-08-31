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
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              onClick={() => navigate(`/gigs/orders/incoming/${gig.id}`)}
              className="group rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface overflow-hidden backdrop-blur-sm shadow-xl hover:border-white/20 cursor-pointer transition flex flex-col justify-between"
            >
              {/* Thumbnail Image Header */}
              <div className="relative h-36 w-full bg-zinc-950 overflow-hidden border-b border-gray-100 dark:border-white/5 shrink-0">
                <img
                  src={gig.thumbnail}
                  alt={gig.title}
                  className="w-full h-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-dark-surface via-transparent to-transparent" />

                <div className="absolute top-3 right-3 flex items-center justify-end">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border backdrop-blur-md ${
                    gig.status === "Open" || !gig.status
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                  }`}>
                    {gig.status || "Open"}
                  </span>
                </div>
              </div>

              {/* Gig Info Body */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-gray-500 dark:text-zinc-400">
                    <span className="px-2 py-0.5 rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none border border-gray-200 dark:border-white/10">{gig.category}</span>
                    <span className="px-2 py-0.5 rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none border border-gray-200 dark:border-white/10">{gig.slots} Slots</span>
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-400 transition-colors line-clamp-1 leading-snug">
                    {gig.title}
                  </h3>
                  
                  <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {gig.description}
                  </p>
                </div>

                {/* Financial Stats */}
                <div className="flex flex-wrap items-center gap-2 text-xs pt-2">
                  <div className="flex-1 min-w-0 p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                    <span className="text-[9px] font-bold text-gray-500 dark:text-zinc-500 uppercase block">Starting at</span>
                    <span className="font-extrabold text-yellow-500 flex items-center gap-1 text-xs mt-0.5">
                      <CreditIcon className="h-3.5 w-3.5 shrink-0" /> {gig.tiers && gig.tiers[0] ? gig.tiers[0].price : 0}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                    <span className="text-[9px] font-bold text-gray-500 dark:text-zinc-500 uppercase block">Orders</span>
                    <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1 text-xs mt-0.5">
                      <Briefcase className="h-3.5 w-3.5 text-blue-400 shrink-0" /> 0
                    </span>
                  </div>
                </div>

                {/* Action Link Footer */}
                <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-blue-400">
                  <span className="text-[11px] text-gray-500 dark:text-zinc-500 font-medium text-left">
                    {gig.postedAt ? new Date(gig.postedAt).toLocaleDateString() : gig.timeAgo}
                  </span>
                  <div className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    View Orders <ChevronRight className="h-3.5 w-3.5" />
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
