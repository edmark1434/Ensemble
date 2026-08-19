import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Search } from "lucide-react";

export const SentOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/api/gigs/orders/sent").then((res) => {
      setOrders(res.data.data || []);
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
      {orders.map((order) => (
        <div key={order.id} className="p-5 bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm cursor-pointer hover:border-blue-500 transition-colors" onClick={() => navigate(`/gigs/services/${order.gig_id}`)}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white">{order.gig_title}</h3>
            <span className="px-2.5 py-1 text-xs font-bold rounded bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              {order.status}
            </span>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <img src={order.freelancer_avatar || 'https://i.pravatar.cc/150'} alt={order.freelancer_name} className="w-10 h-10 rounded-full" />
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{order.freelancer_name}</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Sent on {new Date(order.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 dark:bg-white/5 p-4 rounded-xl">
            <div>
              <span className="text-gray-500 dark:text-zinc-400 block text-xs">Tier</span>
              <span className="font-medium text-gray-900 dark:text-white">{order.tier_title}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-zinc-400 block text-xs">Price</span>
              <span className="font-medium text-gray-900 dark:text-white">{order.price} Credits</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SentOrders;
