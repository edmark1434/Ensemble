import React, { useEffect, useState, useMemo } from "react";
import api from "@/lib/axios";
import {
  Loader2,
  ArrowLeft,
  Briefcase,
  ChevronRight,
  Clock,
  Star,
  ExternalLink,
  Pencil,
  Info,
  Tag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
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
    description: "All client orders received for this service across every lifecycle stage.",
    tags: [],
  },
  pending: {
    description: "Fresh client orders waiting for your initial review and acceptance.",
    tags: [
      {
        label: "PENDING",
        className: "bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-400/50",
      },
    ],
  },
  inContract: {
    description: "Accepted orders transitioning to escrow and active contract deliverables.",
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
    description: "Client orders that were rejected by you, cancelled, or withdrawn.",
    tags: [
      {
        label: "REJECTED",
        className: "bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-400/50",
      },
      {
        label: "CANCELLED",
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

export const IncomingOrders: React.FC = () => {
  const { gigId } = useParams<{ gigId: string }>();
  const navigate = useNavigate();
  const context = useOutletContext<OrdersMainContext>();
  const viewType = context?.viewType || "grid";
  const searchQuery = context?.searchQuery || "";

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetGig, setTargetGig] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<OrderSubTab>("all");
  const [showLifecycleGuide, setShowLifecycleGuide] = useState<boolean>(() => {
    const saved = localStorage.getItem("ensemble_gig_orders_show_guide");
    return saved !== null ? saved === "true" : true;
  });

  const toggleLifecycleGuide = () => {
    setShowLifecycleGuide((prev) => {
      const next = !prev;
      localStorage.setItem("ensemble_gig_orders_show_guide", String(next));
      return next;
    });
  };

  useEffect(() => {
    if (gigId) {
      api
        .get(`/api/gigs/${gigId}`)
        .then((res) => {
          const gigData = res.data.data;
          const cloudFrontUrl = import.meta.env.VITE_CLOUDFRONT_URL || "";
          if (gigData && gigData.thumbnail && !gigData.thumbnail.startsWith("http")) {
            gigData.thumbnail = `${cloudFrontUrl}${gigData.thumbnail.startsWith("/") ? "" : "/"}${gigData.thumbnail}`;
          }
          setTargetGig(gigData);
        })
        .catch(console.error);
    }

    api
      .get("/api/gigs/orders/incoming")
      .then((res) => {
        const cloudFrontUrl = import.meta.env.VITE_CLOUDFRONT_URL || "";
        let fetchedOrders = res.data.data || [];
        if (gigId) {
          fetchedOrders = fetchedOrders.filter((o: any) => o.gig_id === gigId);
        }

        const formatAvatarUrl = (url: string) => {
          if (!url) return "";
          if (url.startsWith("http")) return url;
          return `${cloudFrontUrl}/${url.replace(/^\//, "")}`;
        };

        const mappedOrders = fetchedOrders.map((o: any) => ({
          ...o,
          client_avatar: formatAvatarUrl(o.client_avatar),
        }));

        setOrders(mappedOrders);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load incoming orders:", err);
        setLoading(false);
      });
  }, [gigId]);

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
        const clientNameMatch = (order.client_name || "").toLowerCase().includes(q);
        const tierTitleMatch = (order.tier_title || "").toLowerCase().includes(q);
        const briefMatch = (order.project_brief || "").toLowerCase().includes(q);
        if (!clientNameMatch && !tierTitleMatch && !briefMatch) return false;
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

  return (
    <div className="space-y-6 text-left w-full">
      {/* =========================================================================
          HERO SUMMARY CARD: Parity with Job Proposals Incoming Hero
         ========================================================================= */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <button
            onClick={() => navigate("/gigs/orders")}
            className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/10 transition shrink-0 cursor-pointer"
            title="Return to Service Listings"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {targetGig?.thumbnail && (
            <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-zinc-900 shrink-0">
              <img
                src={targetGig.thumbnail}
                alt={targetGig.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg";
                }}
              />
            </div>
          )}

          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                Viewing Service Orders
              </span>
              {targetGig?.category && (
                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-[10px] font-bold text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/10">
                  {targetGig.category}
                </span>
              )}
              {targetGig?.slots && (
                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-[10px] font-bold text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/10">
                  {targetGig.slots} Slots
                </span>
              )}
            </div>

            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
              {targetGig?.title || "Service Orders"}
            </h1>

            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-zinc-400 pt-0.5">
              <span>{orders.length} Total Orders Received</span>
              {targetGig?.tiers && targetGig.tiers[0] && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                    Starting from <CreditIcon className="h-3 w-3 shrink-0" /> {targetGig.tiers[0].price?.toLocaleString()}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          {targetGig?.id && (
            <>
              <button
                onClick={() => navigate(`/gigs/services/${targetGig.id}/page`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-xs font-bold text-gray-700 dark:text-zinc-200 transition cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                <span>Service Page</span>
              </button>
              <button
                onClick={() => navigate(`/gigs/edit/${targetGig.id}`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-xs font-bold transition cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit Service</span>
              </button>
            </>
          )}
        </div>
      </div>

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
          ORDERS LISTING: Grid or List view matching proposals layout
         ========================================================================= */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto text-gray-400">
            <Briefcase className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {orders.length === 0 ? "No Orders Placed Yet" : `No ${activeSubTab} orders found`}
          </h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm mx-auto">
            {orders.length === 0
              ? "When clients choose a tier and order this service, their requests will appear here."
              : "There are currently no orders in this lifecycle stage matching your filters."}
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
                onClick={() => navigate(`/gigs/orders/incoming/${gigId}/order/${order.id}`)}
                className="group rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-4 sm:p-5 overflow-hidden shadow-xs hover:shadow-lg hover:border-blue-500/40 dark:hover:border-blue-500/40 cursor-pointer transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left: Client info and brief */}
                <div className="flex items-center gap-4 min-w-0">
                  {order.client_avatar ? (
                    <img
                      src={order.client_avatar}
                      alt={order.client_name}
                      className="h-12 w-12 rounded-full object-cover border border-gray-200 dark:border-white/10 shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base border border-blue-500/20 shrink-0">
                      {order.client_name ? order.client_name[0] : "C"}
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
                        Received {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {order.client_name}
                      </h3>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                        <Star className="w-3 h-3 fill-current" />
                        <span>5.0</span>
                      </div>
                    </div>

                    {order.project_brief && (
                      <p className="text-xs text-gray-600 dark:text-zinc-300 line-clamp-1 max-w-xl">
                        {stripMarkdown(order.project_brief)}
                      </p>
                    )}
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
                      Total Price
                    </span>
                    <span className="text-base font-black text-amber-600 dark:text-amber-400 flex items-center gap-1 justify-end">
                      <CreditIcon className="h-4 w-4 shrink-0" />
                      {order.price?.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                    <span>View Order Details</span>
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
                onClick={() => navigate(`/gigs/orders/incoming/${gigId}/order/${order.id}`)}
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

                  {/* Client Info Header */}
                  <div className="flex items-center gap-3">
                    {order.client_avatar ? (
                      <img
                        src={order.client_avatar}
                        alt={order.client_name}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/20 shrink-0">
                        {order.client_name ? order.client_name[0] : "C"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {order.client_name}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                          <Star className="w-3 h-3 fill-current" />
                          <span>5.0</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate">
                        Client Account
                      </p>
                    </div>
                  </div>

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

                  {/* Brief Preview */}
                  {order.project_brief && (
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-xs text-gray-600 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                      {stripMarkdown(order.project_brief)}
                    </div>
                  )}

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
                    View Details
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

export default IncomingOrders;
