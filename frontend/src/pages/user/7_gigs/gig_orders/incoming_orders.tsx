import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Loader2, ArrowLeft, Briefcase } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

export const IncomingOrders: React.FC = () => {
  const { gigId } = useParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetGig, setTargetGig] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch target gig info
    if (gigId) {
      api.get(`/api/gigs/${gigId}`).then((res) => {
        setTargetGig(res.data.data);
      }).catch(console.error);
    }

    api.get("/api/gigs/orders/incoming").then((res) => {
      let fetchedOrders = res.data.data || [];
      if (gigId) {
        fetchedOrders = fetchedOrders.filter((o: any) => o.gig_id === gigId);
      }
      setOrders(fetchedOrders);
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
                  type="button"
                  onClick={() => navigate(`/gigs/services/${gigId}/page`)}
                  className="text-sm font-bold text-gray-900 dark:text-white hover:text-blue-400 transition-colors flex items-center gap-2 truncate text-left"
                  title="View My Service Details"
                >
                  {targetGig?.title || "Loading..."}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
          <div className="w-16 h-16 bg-white dark:bg-white/5 shadow-sm dark:shadow-none rounded-full flex items-center justify-center mb-2">
            <Briefcase className="h-8 w-8 text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Orders Received Yet</h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm">
            You haven't received any orders for this service yet.
          </p>
        </div>
      </div>
    );
  }

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
                type="button"
                onClick={() => navigate(`/gigs/services/${gigId}/page`)}
                className="text-sm font-bold text-gray-900 dark:text-white hover:text-blue-400 transition-colors flex items-center gap-2 truncate text-left"
                title="View My Service Details"
              >
                {targetGig?.title || "Loading..."}
              </button>
            </div>
          </div>
        </div>
      </div>

      {orders.map((order) => (
        <div key={order.id} className="p-5 bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm cursor-pointer hover:border-blue-500 transition-colors" onClick={() => navigate(`/gigs/services/${order.gig_id}`)}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white">Order from {order.client_name || "Client"}</h3>
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {order.status || "Pending"}
            </span>
          </div>
          <div className="text-sm text-gray-600 dark:text-zinc-400 space-y-1">
            <p><span className="font-medium">Package:</span> {order.tier_name || "Basic"}</p>
            <p><span className="font-medium">Price:</span> {order.agreed_price} Credits</p>
            <p><span className="font-medium">Date:</span> {new Date(order.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default IncomingOrders;
