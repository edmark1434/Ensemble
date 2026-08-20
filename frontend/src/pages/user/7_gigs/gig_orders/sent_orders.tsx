import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Loader2, Search, X, FileText, Clock, AlertCircle } from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ViewType } from "@/pages/user/6_job_market/job_proposals/proposals_components/proposals_list_viewtype";
import { CreditIcon } from "@/components/ui/credit-icon";

export const SentOrders: React.FC = () => {
  const context = useOutletContext<any>();
  const viewType = context?.viewType || "list";

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const navigate = useNavigate();

  const formatAvatarUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    if (url.startsWith("/public/")) return url.replace("/public/", "/");
    if (url.match(/^\/p\d+\.png$/) || url.match(/^p\d+\.png$/)) return url.startsWith('/') ? url : `/${url}`;
    return `${import.meta.env.VITE_CLOUDFRONT_URL}/${url.replace(/^\//, '')}`;
  };

  useEffect(() => {
    api.get("/api/gigs/orders/sent").then((res) => {
      const fetched = res.data.data || [];
      const mapped = fetched.map((o: any) => ({
        ...o,
        freelancer_avatar: formatAvatarUrl(o.freelancer_avatar)
      }));
      setOrders(mapped);
      setLoading(false);
    }).catch((err) => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>;
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center w-full">
        <div className="w-24 h-24 flex items-center justify-center mb-2 opacity-80 pointer-events-none">
          <DotLottieReact src="/icons/lottie/no-result.lottie" autoplay loop />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Orders Sent Yet</h3>
        <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm">
          You haven't ordered any services yet. Start exploring the gig market to find your next service!
        </p>
        <button
          onClick={() => navigate('/gigs')}
          className="mt-4 px-6 py-2.5 rounded-xl bg-blue-500 text-xs font-bold text-white hover:bg-blue-600 transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
        >
          <Search className="h-4 w-4" /> Look for Services
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      <div className={viewType === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
        {orders.map((order) => (
          <div
            key={order.id}
            onClick={() => navigate(`/gigs/orders/sent/${order.id}`)}
            className="relative p-5 bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm hover:border-gray-300 dark:hover:border-white/20 transition-all cursor-pointer flex flex-col group"
          >
            <div className="flex items-center justify-between mb-4">
              <span className={`px-3 py-1 text-[11px] font-bold rounded-full border ${
                  order.status === 'Accepted' || order.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' :
                  order.status === 'Rejected' || order.status === 'Cancelled' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' :
                  'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-500 dark:border-yellow-500/20'
                }`}>
                {order.status || "Pending"}
              </span>
              
              {order.status === 'Pending' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Edit logic or navigation
                  }}
                  className="p-1.5 rounded-full bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors border border-gray-200 dark:border-white/10"
                  title="Edit Order"
                >
                  <svg className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              {order.freelancer_avatar ? (
                  <img src={order.freelancer_avatar} alt={order.freelancer_name} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-white/10" />
              ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-sm border border-blue-500/20">
                      {order.freelancer_name ? order.freelancer_name[0] : "F"}
                  </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{order.freelancer_name}</p>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-yellow-500">
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    5.0
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500 dark:text-zinc-400 truncate">
                  <span>Gig: {order.gig_title}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-dark-base flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">ORDERED TIER</span>
              <div className="flex items-center gap-1.5 text-yellow-500 font-black text-lg">
                <CreditIcon className="w-5 h-5" />
                {order.price?.toLocaleString()}
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <div className="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center gap-1.5 text-[11px] font-bold text-gray-600 dark:text-zinc-300">
                <svg className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                Tier: {order.tier_title}
              </div>
              <div className="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center gap-1.5 text-[11px] font-bold text-gray-600 dark:text-zinc-300">
                <svg className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {order.delivery_days} Days
              </div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Sent {new Date(order.created_at).toLocaleDateString()}
              </div>
              <span className="text-[11px] font-bold text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Details &gt;
              </span>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedOrder(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl bg-white dark:bg-dark-surface rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Order Details</h2>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Sent on {new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                <div className="flex items-center justify-between bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-4 rounded-xl">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">Freelancer</span>
                    <div className="flex items-center gap-2">
                      {selectedOrder.freelancer_avatar ? (
                          <img src={selectedOrder.freelancer_avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                          <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs">
                              {selectedOrder.freelancer_name ? selectedOrder.freelancer_name[0] : "F"}
                          </div>
                      )}
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{selectedOrder.freelancer_name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
                      selectedOrder.status === 'Accepted' || selectedOrder.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' :
                      selectedOrder.status === 'Rejected' || selectedOrder.status === 'Cancelled' ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' :
                      'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20'
                    }`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-2">
                    <FileText className="h-4 w-4 text-gray-400" /> Package Ordered
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-100 dark:border-white/5">
                      <span className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1">Tier Selected</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedOrder.tier_title}</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-100 dark:border-white/5">
                      <span className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1">Total Price</span>
                      <span className="font-black text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <CreditIcon className="h-4 w-4 text-yellow-500 shrink-0" />
                        {selectedOrder.price?.toLocaleString()} Credits
                      </span>
                    </div>
                    <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-100 dark:border-white/5 col-span-2">
                      <span className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1">Estimated Delivery</span>
                      <span className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5"><Clock className="h-4 w-4 text-gray-400" /> {selectedOrder.delivery_days} Days</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-2">
                    <AlertCircle className="h-4 w-4 text-gray-400" /> Project Brief
                  </h3>
                  <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-100 dark:border-white/5 text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {selectedOrder.project_brief || "No brief was provided for this order."}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex justify-end gap-3">
                <button
                  onClick={() => navigate(`/gigs/services/${selectedOrder.gig_id}`)}
                  className="px-5 py-2.5 text-xs font-bold text-gray-700 dark:text-zinc-300 bg-gray-200/50 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-xl transition-colors"
                >
                  View Gig Page
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-lg shadow-blue-500/20"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SentOrders;
