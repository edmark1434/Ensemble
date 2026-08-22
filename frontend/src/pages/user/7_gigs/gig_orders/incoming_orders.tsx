import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Loader2, ArrowLeft, Briefcase, FileText, PlayCircle } from "lucide-react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CreditIcon } from "@/components/ui/credit-icon";

export const IncomingOrders: React.FC = () => {
  const { gigId } = useParams();
  const context = useOutletContext<any>();
  const viewType = context?.viewType || "list";

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetGig, setTargetGig] = useState<any>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch target gig info
    if (gigId) {
      api.get(`/api/gigs/${gigId}`).then((res) => {
        const gigData = res.data.data;
        const cloudFrontUrl = import.meta.env.VITE_CLOUDFRONT_URL || '';
        if (gigData && gigData.thumbnail && !gigData.thumbnail.startsWith('http')) {
            gigData.thumbnail = `${cloudFrontUrl}${gigData.thumbnail.startsWith('/') ? '' : '/'}${gigData.thumbnail}`;
        }
        setTargetGig(gigData);
      }).catch(console.error);
    }

    api.get("/api/gigs/orders/incoming").then((res) => {
      const cloudFrontUrl = import.meta.env.VITE_CLOUDFRONT_URL || '';
      let fetchedOrders = res.data.data || [];
      if (gigId) {
        fetchedOrders = fetchedOrders.filter((o: any) => o.gig_id === gigId);
      }
      
      const formatAvatarUrl = (url: string) => {
        if (!url) return "";
        if (url.startsWith("http")) return url;
        return `${cloudFrontUrl}/${url.replace(/^\//, '')}`;
      };

      const mappedOrders = fetchedOrders.map((o: any) => ({
          ...o,
          client_avatar: formatAvatarUrl(o.client_avatar),
      }));
      
      const counts = { All: fetchedOrders.length, Pending: 0, Accepted: 0, Rejected: 0 };
      fetchedOrders.forEach((o: any) => {
        const s = o.status || 'Pending';
        if (counts[s as keyof typeof counts] !== undefined) {
          counts[s as keyof typeof counts]++;
        }
      });
      if (context?.setChildOrdersCounts) {
        context.setChildOrdersCounts(counts);
      }

      setOrders(mappedOrders);
      setLoading(false);
    }).catch((err) => {
      console.error(err);
      setLoading(false);
    });
  }, [gigId]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>;
  }

  if (orders.length === 0) {
    return (
      <div className="space-y-4 text-left w-full">
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate("/gigs/orders")}
              className="p-2 rounded-xl bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:text-white transition shrink-0"
              title="Return to Service Selection"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex items-center gap-3">
              {targetGig?.thumbnail && (
                <img 
                  src={targetGig.thumbnail} 
                  alt="" 
                  className="h-10 w-10 rounded-lg object-cover border border-gray-200 dark:border-white/10 shrink-0" 
                />
              )}
              <div>
                <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-0.5">
                  Viewing Orders
                </span>
                <button 
                  onClick={() => navigate(`/gigs/services/${targetGig?.id}`)}
                  className="font-bold text-sm text-gray-900 dark:text-white hover:text-blue-500 truncate transition-colors text-left"
                  title="View My Service Details"
                >
                  {targetGig?.title || "Loading..."}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
          <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center border border-gray-100 dark:border-white/10">
            <Briefcase className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Orders Yet</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-sm">
            When clients order this service, their requests will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate("/gigs/orders")}
            className="p-2 rounded-xl bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:text-white transition shrink-0"
            title="Return to Service Selection"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex items-center gap-3">
            {targetGig?.thumbnail && (
              <img 
                src={targetGig.thumbnail} 
                alt="" 
                className="h-10 w-10 rounded-lg object-cover border border-gray-200 dark:border-white/10 shrink-0" 
              />
            )}
            <div>
              <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-0.5">
                Viewing Orders
              </span>
              <button 
                onClick={() => navigate(`/gigs/services/${targetGig?.id}`)}
                className="font-bold text-sm text-gray-900 dark:text-white hover:text-blue-500 truncate transition-colors text-left"
                title="View My Service Details"
              >
                {targetGig?.title || "Loading..."}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={viewType === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
        {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => navigate(`/gigs/orders/incoming/${gigId}/order/${order.id}`)}
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
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                {order.client_avatar ? (
                    <img src={order.client_avatar} alt={order.client_name} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-white/10" />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-sm border border-blue-500/20">
                        {order.client_name ? order.client_name[0] : "C"}
                    </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{order.client_name}</p>
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
                  Received {new Date(order.created_at).toLocaleDateString()}
                </div>
                <span className="text-[11px] font-bold text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Details &gt;
                </span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default IncomingOrders;
