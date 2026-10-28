import React, { useEffect, useState, useMemo } from "react";
import api from "@/lib/axios";
import {
  Loader2,
  Search,
  ChevronRight,
  Clock,
  Star,
  Info,
  Tag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditIcon } from "@/components/ui/credit-icon";
import type { OrdersMainContext } from "./orders_main";
import { stripMarkdown } from "@/lib/markdownPaste";

type OrderSubTab = "all" | "pending" | "inContract" | "inactive";

const SUB_TAB_META: Record<
  OrderSubTab,
  {
    description: string;
    tags: { label: string; className: string }[];
  }
> = {
  all: {
    description: "Overview of all your submitted gig orders across every lifecycle stage.",
    tags: [],
  },
  pending: {
    description: "Orders currently waiting for the freelancer/studio to review and accept.",
    tags: [
      {
        label: "PENDING",
        className: "bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-400/50",
      },
    ],
  },
  inContract: {
    description: "Orders accepted by the seller, transitioning to escrow or actively in production.",
    tags: [
      {
        label: "ACCEPTED",
        className: "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/50",
      },
      {
        label: "IN CONTRACT",
        className: "bg-purple-50 text-purple-900 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-400/50",
      },
      {
        label: "COMPLETED",
        className: "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/50",
      },
    ],
  },
  inactive: {
    description: "Orders that were declined by the seller, cancelled, or withdrawn.",
    tags: [
      {
        label: "REJECTED",
        className: "bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-400/50",
      },
      {
        label: "WITHDRAWN",
        className: "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-700/40 dark:text-zinc-200 dark:border-zinc-500/50",
      },
    ],
  },
};

const getStatusBadge = (status: string) => {
  const norm = (status || "").toLowerCase();
  if (norm === "in contract" || norm === "completed") {
    return {
      label: norm === "completed" ? "COMPLETED" : "IN CONTRACT",
      className:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    };
  }
  if (norm === "accepted" || norm === "approved") {
    return {
      label: "ACCEPTED",
      className:
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    };
  }
  if (norm === "shortlisted") {
    return {
      label: "SHORTLISTED",
      className:
        "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
    };
  }
  if (norm === "rejected") {
    return {
      label: "REJECTED",
      className:
        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
    };
  }
  if (norm === "cancelled" || norm === "withdrawn") {
    return {
      label: norm === "withdrawn" ? "WITHDRAWN" : "CANCELLED",
      className:
        "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-white/5 dark:text-zinc-300 dark:border-white/10",
    };
  }
  return {
    label: "PENDING",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  };
};

export const SentOrders: React.FC = () => {
  const context = useOutletContext<OrdersMainContext>();
  const viewType = context?.viewType || "grid";
  const searchQuery = context?.searchQuery || "";
  const navigate = useNavigate();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<OrderSubTab>("all");
  const [showLifecycleGuide, setShowLifecycleGuide] = useState<boolean>(() => {
    const saved = localStorage.getItem("ensemble_gig_sent_show_guide");
    return saved !== null ? saved === "true" : true;
  });

  const toggleLifecycleGuide = () => {
    setShowLifecycleGuide((prev) => {
      const next = !prev;
      localStorage.setItem("ensemble_gig_sent_show_guide", String(next));
      return next;
    });
  };

  const formatAvatarUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${import.meta.env.VITE_CLOUDFRONT_URL}/${url.replace(/^\//, "")}`;
  };

  useEffect(() => {
    api
      .get("/api/gigs/orders/sent")
      .then((res) => {
        const fetched = res.data.data || [];
        const visibleOrders = fetched.filter((o: any) => o.status !== "Withdrawn");
        const mapped = visibleOrders.map((o: any) => ({
          ...o,
          freelancer_avatar: formatAvatarUrl(o.freelancer_avatar),
        }));

        setOrders(mapped);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load sent orders:", err);
        setLoading(false);
      });
  }, []);

  // Sub-tab counts calculation
  const subTabCounts = useMemo(() => {
    const counts = {
      all: orders.length,
      pending: 0,
      inContract: 0,
      inactive: 0,
    };

    orders.forEach((o) => {
      const status = (o.status || "Pending").toLowerCase();
      if (status === "pending") counts.pending++;
      else if (status === "accepted" || status === "in contract" || status === "completed") counts.inContract++;
      else if (status === "rejected" || status === "cancelled" || status === "withdrawn") counts.inactive++;
    });

    return counts;
  }, [orders]);

  // Filter orders by sub-tab and search query
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const status = (order.status || "Pending").toLowerCase();

      // Sub-tab filter
      if (activeSubTab === "pending" && status !== "pending") return false;
      if (
        activeSubTab === "inContract" &&
        !["accepted", "in contract", "completed"].includes(status)
      )
        return false;
      if (
        activeSubTab === "inactive" &&
        !["rejected", "cancelled", "withdrawn"].includes(status)
      )
        return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const freelancerNameMatch = (order.freelancer_name || "").toLowerCase().includes(q);
        const gigTitleMatch = (order.gig_title || "").toLowerCase().includes(q);
        const tierTitleMatch = (order.tier_title || "").toLowerCase().includes(q);
        if (!freelancerNameMatch && !gigTitleMatch && !tierTitleMatch) return false;
      }

      return true;
    });
  }, [orders, activeSubTab, searchQuery]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
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
          onClick={() => navigate("/gigs")}
          className="mt-4 px-6 py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Search className="h-4 w-4" /> Look for Services
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left w-full">
      {/* =========================================================================
          HORIZONTAL SUB-TABS: Parity with Proposals Sub-tabs
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-white/10 pb-2">
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          {(
            [
              { key: "all", label: "All", count: subTabCounts.all },
              { key: "pending", label: "Pending", count: subTabCounts.pending },
              { key: "inContract", label: "Accepted & In Contract", count: subTabCounts.inContract },
              { key: "inactive", label: "Inactive", count: subTabCounts.inactive },
            ] as const
          ).map((tab) => {
            const isActive = activeSubTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key)}
                className={`relative px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 shadow-xs"
                    : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-white/5"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-blue-600 text-white dark:bg-blue-400 dark:text-black"
                      : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-zinc-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Toggle Lifecycle Helper Guide */}
        <button
          type="button"
          onClick={toggleLifecycleGuide}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white self-start sm:self-auto cursor-pointer"
        >
          <Info className="h-3.5 w-3.5" />
          <span>Stage Info</span>
          {showLifecycleGuide ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* =========================================================================
          LIFECYCLE HELPER BANNER (Collapsible)
         ========================================================================= */}
      <AnimatePresence>
        {showLifecycleGuide && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-4 text-xs text-gray-600 dark:text-zinc-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p>{SUB_TAB_META[activeSubTab].description}</p>
              {SUB_TAB_META[activeSubTab].tags.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {SUB_TAB_META[activeSubTab].tags.map((t) => (
                    <span
                      key={t.label}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${t.className}`}
                    >
                      <Tag className="h-2.5 w-2.5" />
                      <span>{t.label}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          ORDERS LISTING: Grid or List view
         ========================================================================= */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-12 text-center space-y-3">
          <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium">
            No {activeSubTab} orders found matching your search.
          </p>
        </div>
      ) : viewType === "list" ? (
        /* List View */
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const badge = getStatusBadge(order.status);
            return (
              <motion.div
                key={order.id}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15 }}
                onClick={() => navigate(`/gigs/orders/sent/${order.id}`)}
                className="group rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-4 sm:p-5 overflow-hidden shadow-xs hover:shadow-lg hover:border-blue-500/40 dark:hover:border-blue-500/40 cursor-pointer transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left: Freelancer info and Gig title */}
                <div className="flex items-center gap-4 min-w-0">
                  {order.freelancer_avatar ? (
                    <img
                      src={order.freelancer_avatar}
                      alt={order.freelancer_name}
                      className="h-12 w-12 rounded-full object-cover border border-gray-200 dark:border-white/10 shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base border border-blue-500/20 shrink-0">
                      {order.freelancer_name ? order.freelancer_name[0] : "F"}
                    </div>
                  )}

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                        Ordered on {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {order.gig_title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
                      <span>Provider: <span className="font-semibold text-gray-700 dark:text-zinc-300">{order.freelancer_name}</span></span>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                        <Star className="w-3 h-3 fill-current" />
                        <span>5.0</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Ordered tier, pricing, timeline, action */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-6 self-stretch lg:self-auto justify-between lg:justify-end pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-100 dark:border-white/5 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-300">
                      Tier: {order.tier_title}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-300 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      {order.delivery_days} Days
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Amount
                    </span>
                    <span className="text-base font-black text-amber-600 dark:text-amber-400 flex items-center gap-1 justify-end">
                      <CreditIcon className="h-4 w-4 shrink-0" />
                      {order.price?.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                    <span>View Details</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
          {filteredOrders.map((order) => {
            const badge = getStatusBadge(order.status);
            return (
              <motion.div
                key={order.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                onClick={() => navigate(`/gigs/orders/sent/${order.id}`)}
                className="group rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 shadow-xs hover:shadow-xl hover:border-blue-500/40 dark:hover:border-blue-500/40 cursor-pointer transition-all duration-200 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top Status & Date */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Freelancer Info */}
                  <div className="flex items-center gap-3">
                    {order.freelancer_avatar ? (
                      <img
                        src={order.freelancer_avatar}
                        alt={order.freelancer_name}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/20 shrink-0">
                        {order.freelancer_name ? order.freelancer_name[0] : "F"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {order.freelancer_name}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                          <Star className="w-3 h-3 fill-current" />
                          <span>5.0</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate">
                        Service Provider
                      </p>
                    </div>
                  </div>

                  {/* Gig Title */}
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                    {order.gig_title}
                  </h3>

                  {/* Ordered Tier Box */}
                  <div className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
                        ORDERED TIER
                      </span>
                      <p className="text-xs font-bold text-gray-900 dark:text-white mt-0.5">
                        {order.tier_title}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
                        TOTAL
                      </span>
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-black text-sm mt-0.5 justify-end">
                        <CreditIcon className="h-4 w-4 shrink-0" />
                        {order.price?.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Delivery Timeline Pill */}
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[11px] font-semibold text-gray-700 dark:text-zinc-300">
                      <Clock className="h-3 w-3 text-gray-400" />
                      {order.delivery_days} Days Delivery Timeline
                    </span>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3.5 mt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
                    Order Details
                  </span>
                  <div className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Inspect</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SentOrders;
