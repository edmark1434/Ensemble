import React, { useEffect, useState } from "react";

import { useParams, useNavigate } from "react-router-dom";

import {

  Loader2,

  ArrowLeft,

  XCircle,

  CheckCircle,

  Star,

  User,

  ExternalLink,

  Calendar,

  Clock,

  FileText,

  PlayCircle,

  MessageSquare,

  Tag,

  Maximize2,

  Minimize2,

  ChevronDown,

  Layers,

  Percent,

} from "lucide-react";

import api from "@/lib/axios";

import { CreditIcon } from "@/components/ui/credit-icon";

import ShapeGrid from "@/components/ui/ShapeGrid";

import useGlobalState from "@/lib/global_state";

import { showErrorToast, showSuccessToast } from "@/components/utility/toast";

import { openMarketplaceConversation } from "@/components/ui/inbox/marketplace_conversation";

import OrderLifecycleTracker from "./orders_components/OrderLifecycleTracker";

import { motion, AnimatePresence } from "framer-motion";

import { resolveBannerPreset, bannerPresetUrl } from "@/lib/profileBanners";

import { getFallbackAvatarUrl } from "@/lib/accountAvatars";

import { format } from "date-fns";



export const IncomingOrderDetail = () => {

  const { orderId } = useParams<{ orderId: string }>();

  const navigate = useNavigate();

  const theme = useGlobalState((state) => state.theme);

  const isSidebarCollapsed = useGlobalState((state) => state.isSidebarCollapsed);



  const [order, setOrder] = useState<any>(null);

  const [loading, setLoading] = useState(true);

  const [expandedMedia, setExpandedMedia] = useState<{ url: string; type: "image" | "video" | "doc" } | null>(null);



  // Decision Modals

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const [rejectReason, setRejectReason] = useState("");

  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);

  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);



  // Section Collapse States (Section 1 permanently visible)

  const [isSection2Collapsed, setIsSection2Collapsed] = useState(false); // Project Brief

  const [isSection3Collapsed, setIsSection3Collapsed] = useState(false); // Questionnaire & Policies

  const [isSection4Collapsed, setIsSection4Collapsed] = useState(false); // Terms of Service



  const areAllSectionsCollapsed =

    isSection2Collapsed && isSection3Collapsed && isSection4Collapsed;



  const toggleAllSections = () => {

    const next = !areAllSectionsCollapsed;

    setIsSection2Collapsed(next);

    setIsSection3Collapsed(next);

    setIsSection4Collapsed(next);

  };



  const formatAvatarUrl = (url: string) => {

    if (!url) return "";

    if (url.startsWith("http")) return url;

    return `${import.meta.env.VITE_CLOUDFRONT_URL}/${url.replace(/^\//, "")}`;

  };



  useEffect(() => {

    api

      .get(`/api/gigs/orders/${orderId}`)

      .then((res) => {

        const fetched = res.data.data;

        if (fetched) {

          fetched.freelancer_avatar = formatAvatarUrl(fetched.freelancer_avatar);

          fetched.client_avatar = formatAvatarUrl(fetched.client_avatar);

        }

        setOrder(fetched);

        setLoading(false);

      })

      .catch((err) => {

        console.error("Failed to load order details:", err);

        setLoading(false);

      });

  }, [orderId]);



  const handleReject = async () => {

    if (!rejectReason.trim()) return showErrorToast("Please provide a reason for declining.");

    setIsProcessing(true);

    try {

      await api.post(`/api/gigs/orders/${order.id}/reject`, { reason: rejectReason });

      showSuccessToast("Order declined.");

      setIsRejectModalOpen(false);

      setOrder((prev: any) => (prev ? { ...prev, status: "Rejected" } : null));

    } catch (e) {

      showErrorToast("Failed to reject order.");

    } finally {

      setIsProcessing(false);

    }

  };



  const handleAccept = async () => {

    if (!agreedToTerms) return showErrorToast("You must agree to the platform terms.");

    setIsProcessing(true);

    try {

      await api.post(`/api/gigs/orders/${order.id}/accept`);

      showSuccessToast("Gig order accepted! The client has been notified to fund escrow.");

      setIsAcceptModalOpen(false);

      setOrder((prev: any) => (prev ? { ...prev, status: "Accepted" } : null));

    } catch (e: any) {

      showErrorToast(e?.response?.data?.message || "Failed to accept order.");

    } finally {

      setIsProcessing(false);

    }

  };



  const getStatusBadge = (status: string) => {

    const norm = (status || "").toLowerCase();

    if (norm === "in contract" || norm === "completed") {

      return {

        label: norm === "completed" ? "COMPLETED" : "IN CONTRACT",

        className:

          "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/50",

      };

    }

    if (norm === "accepted" || norm === "approved") {

      return {

        label: "ACCEPTED",

        className:

          "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/50",

      };

    }

    if (norm === "shortlisted") {

      return {

        label: "SHORTLISTED",

        className:

          "bg-purple-50 text-purple-900 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-400/50",

      };

    }

    if (norm === "rejected") {

      return {

        label: "REJECTED",

        className:

          "bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-400/50",

      };

    }

    if (norm === "cancelled" || norm === "withdrawn") {

      return {

        label: norm === "withdrawn" ? "WITHDRAWN" : "CANCELLED",

        className:

          "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-700/40 dark:text-zinc-200 dark:border-zinc-500/50",

      };

    }

    return {

      label: "PENDING REVIEW",

      className:

        "bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-400/50",

    };

  };



  if (loading) {

    return (

      <div className="relative w-full min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white flex items-center justify-center p-6">

        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />

      </div>

    );

  }



  if (!order) {

    return (

      <div className="min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white flex items-center justify-center p-6">

        <div className="text-center space-y-4 max-w-sm">

          <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center mx-auto text-gray-400">

            <FileText className="h-6 w-6" />

          </div>

          <div className="space-y-1">

            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Order Not Found</h3>

            <p className="text-xs text-gray-500 dark:text-zinc-400">This incoming order could not be retrieved.</p>

          </div>

          <button

            onClick={() => navigate("/gigs/orders")}

            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"

          >

            Return to Orders

          </button>

        </div>

      </div>

    );

  }



  const statusBadge = getStatusBadge(order.status);

  const clientBannerPreset = resolveBannerPreset(order.client_banner_preset, order.client_name || "client");

  const bannerUrl = bannerPresetUrl(clientBannerPreset) || "/profile_banner_presets/Ensemble%20Blue.png";



  const platformResponses = (order.responses || []).filter(

    (r: any) =>

      r.question &&

      (r.question.includes("confidentiality (NDA)") || r.question.includes("Freelancer Portfolio") || r.question.includes("portfolio"))

  );

  const customResponses = (order.responses || []).filter(

    (r: any) =>

      !r.question ||

      !(r.question.includes("confidentiality (NDA)") || r.question.includes("Freelancer Portfolio") || r.question.includes("portfolio"))

  );



  return (

    <div className="relative min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white font-['Plus_Jakarta_Sans'] pb-28">

      {/* Background Grid */}

      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">

        <ShapeGrid

          shape="square"

          squareSize={48}

          direction="diagonal"

          speed={0.4}

          borderColor={theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.07)"}

          hoverFillColor={theme === "dark" ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)"}

          hoverTrailAmount={3}

        />

      </div>



      <motion.div

        initial={{ opacity: 0, y: 8 }}

        animate={{ opacity: 1, y: 0 }}

        transition={{ duration: 0.2 }}

        className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6"

      >

        {/* =========================================================================

            TOP ACTION BAR: Return Link, Status Tag, and Master Collapse/Expand

           ========================================================================= */}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">

          <div className="flex items-center gap-3">

            <button

              onClick={() => {

                if (order.gig_id) navigate(`/gigs/orders/incoming/${order.gig_id}`);

                else navigate("/gigs/orders");

              }}

              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition cursor-pointer shadow-2xs"

            >

              <ArrowLeft className="h-3.5 w-3.5" />

              <span>Return to Service Orders</span>

            </button>



            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">

              #ORDER-{(order.id || "").slice(0, 8).toUpperCase()}

            </span>



            {/* Status Tag */}

            <span

              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider border shadow-xs ${statusBadge.className}`}

            >

              <Tag className="h-3 w-3 shrink-0 opacity-90" />

              <span>{statusBadge.label}</span>

            </span>

          </div>



          {/* Master Expand All / Collapse All Toggle Button */}

          <div className="flex items-center gap-2 self-start sm:self-auto">

            <button

              type="button"

              onClick={toggleAllSections}

              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-200 shadow-2xs transition cursor-pointer"

            >

              {areAllSectionsCollapsed ? (

                <>

                  <Maximize2 className="h-3.5 w-3.5 text-blue-500" />

                  <span>Expand All Sections</span>

                </>

              ) : (

                <>

                  <Minimize2 className="h-3.5 w-3.5 text-zinc-400" />

                  <span>Collapse All Sections</span>

                </>

              )}

            </button>

          </div>

        </div>



        {/* =========================================================================

            STANDARDIZED LIFECYCLE TRACKER

           ========================================================================= */}

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-4 sm:p-5 shadow-2xs">

          <OrderLifecycleTracker currentStatus={order.status || "Pending"} />

        </div>



        {/* =========================================================================

            SECTION 1: ORDER PARTICIPANTS & TARGET SERVICE (PERMANENTLY VISIBLE)

           ========================================================================= */}

        <div className="space-y-4">

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">

            {/* Header Strip */}

            <div className="p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-left">

              <div className="flex items-center gap-2.5 min-w-0">

                <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">

                  Order Participants & Target Service

                </span>

                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">

                  Client & Service Provider

                </span>

              </div>

              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">

                {order.created_at ? `Placed ${format(new Date(order.created_at), "MMM d, yyyy • h:mm a")}` : ""}

              </span>

            </div>



            {/* 2-Column Grid */}

            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* LEFT: The one who ordered (Client / Buyer) */}

              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 overflow-hidden shadow-2xs flex flex-col justify-between text-left">

                {/* Banner Preview */}

                <div className="h-20 sm:h-24 w-full relative overflow-hidden bg-zinc-800">

                  <img

                    src={bannerUrl}

                    alt="Client Banner"

                    className="w-full h-full object-cover opacity-90"

                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/40 backdrop-blur-md text-white border border-white/20 flex items-center gap-1">

                    <User className="h-3 w-3" />

                    <span>Client Order</span>

                  </div>

                </div>



                {/* Card Content with Overlapping Avatar */}

                <div className="p-5 pt-0 space-y-3.5 flex-1 flex flex-col justify-between">

                  <div>

                    {/* Overlapping Avatar */}

                    <div className="relative z-10 -mt-7 mb-2.5 flex items-end justify-between">

                      <div className="h-14 w-14 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-4 ring-white dark:ring-zinc-900 shadow-sm shrink-0">

                        {order.client_avatar ? (

                          <img

                            src={order.client_avatar}

                            alt={order.client_name}

                            onError={(e) => {

                              e.currentTarget.onerror = null;

                              e.currentTarget.src = getFallbackAvatarUrl(order.client_name || "Client");

                            }}

                            className="h-full w-full object-cover"

                          />

                        ) : (

                          <div className="h-full w-full bg-blue-600 text-white font-bold text-xl flex items-center justify-center">

                            {order.client_name ? order.client_name[0] : "C"}

                          </div>

                        )}

                      </div>



                      {/* Rating pill */}

                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-xs font-bold text-gray-700 dark:text-zinc-200">

                        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />

                        <span>5.0</span>

                      </div>

                    </div>



                    {/* Name & Handle */}

                    <div className="space-y-0.5">

                      <div className="flex items-center gap-1.5 flex-wrap">

                        <h3 className="font-bold text-sm text-zinc-900 dark:text-white truncate">

                          {order.client_name}

                        </h3>

                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 shrink-0">

                          Buyer

                        </span>

                      </div>

                      <span className="text-xs text-zinc-400 dark:text-zinc-500 block truncate font-mono">

                        @{order.client_handle || "client"}

                      </span>

                    </div>



                    {/* Description */}

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed">

                      Order placed on {order.created_at ? format(new Date(order.created_at), "MMM d, yyyy") : "recent"}. Verified buyer account on Ensemble.

                    </p>

                  </div>



                  <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">

                    {/* Rate Strip */}

                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">

                      <div>

                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">

                          Additional Work Rate

                        </span>

                        <span className="font-bold text-zinc-900 dark:text-white">

                          +{order.additional_work_rate || 25}% per additional pass

                        </span>

                      </div>

                      <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">

                        {order.delivery_days} Days Timeline

                      </span>

                    </div>



                    <div className="flex items-center justify-between text-xs text-zinc-400">

                      <span>Order Requester:</span>

                      {order.client_account_id ? (

                        <button

                          type="button"

                          onClick={() => navigate(`/profile/${order.client_account_id}`)}

                          className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"

                        >

                          <span>View Client Profile</span>

                          <ExternalLink className="h-3 w-3" />

                        </button>

                      ) : (

                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">

                          Client Profile

                        </span>

                      )}

                    </div>

                  </div>

                </div>

              </div>



              {/* RIGHT: Service Provider (solo or team) & Target Service Listing */}

              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 flex flex-col justify-between space-y-4 shadow-2xs text-left">

                <div className="space-y-3">

                  {/* Target Service Title & External Link */}

                  <div>

                    <div className="flex items-center justify-between gap-2">

                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">

                        Target Service Listing

                      </span>

                      {order.gig_id && (

                        <button

                          type="button"

                          onClick={() => navigate(`/gigs/services/${order.gig_id}/page`)}

                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"

                        >

                          <span>View Service Page</span>

                          <ExternalLink className="h-3 w-3" />

                        </button>

                      )}

                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white mt-0.5 line-clamp-1">

                      {order.gig_title}

                    </h3>



                    {/* Service Provider Strip (Solo or Team) */}

                    <div className="flex items-center justify-between gap-3 mt-2.5 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/70">

                      <div className="flex items-center gap-2.5 min-w-0">

                        <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700 shrink-0 bg-white dark:bg-zinc-800 shadow-2xs flex items-center justify-center">

                          {order.freelancer_avatar ? (

                            <img

                              src={order.freelancer_avatar}

                              alt={order.freelancer_name}

                              onError={(e) => {

                                e.currentTarget.onerror = null;

                                e.currentTarget.src = getFallbackAvatarUrl(order.freelancer_name || "Provider");

                              }}

                              className="w-full h-full object-cover"

                            />

                          ) : (

                            <span className="font-bold text-xs text-zinc-500">

                              {order.freelancer_name ? order.freelancer_name[0] : "P"}

                            </span>

                          )}

                        </div>

                        <div className="min-w-0">

                          <div className="flex items-center gap-1.5 flex-wrap">

                            <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">

                              {order.freelancer_name || "Provider"}

                            </span>

                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300 shrink-0">

                              Provider

                            </span>

                          </div>

                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block truncate">

                            @{order.freelancer_handle || "provider"} • <strong className="font-semibold text-zinc-600 dark:text-zinc-300">{order.isTeam ? "Team" : "Solo / Studio"}</strong>

                          </span>

                        </div>

                      </div>



                      {order.freelancer_account_id && (

                        <button

                          type="button"

                          onClick={() => navigate(`/profile/${order.freelancer_account_id}`)}

                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0 cursor-pointer"

                        >

                          <span>Profile</span>

                          <ExternalLink className="h-3 w-3" />

                        </button>

                      )}

                    </div>

                  </div>



                  {/* Ordered Tier Snippet */}

                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 overflow-hidden space-y-1">

                    <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">

                      Package Details

                    </span>

                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-relaxed">

                      {order.tier_title} • {order.delivery_days} Days Delivery Guarantee

                    </p>

                  </div>



                  {/* Financial Grid */}

                  <div className="grid grid-cols-2 gap-3 pt-1">

                    {/* Selected Tier Box */}

                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 space-y-0.5">

                      <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">

                        Selected Tier

                      </span>

                      <span className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200 block truncate">

                        {order.tier_title}

                      </span>

                      <span className="text-[10px] text-zinc-400 block">{order.delivery_days} Days Delivery</span>

                    </div>



                    {/* Order Amount Box */}

                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 space-y-0.5">

                      <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">

                        Order Amount

                      </span>

                      <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1 truncate">

                        <CreditIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />

                        <span>{order.price?.toLocaleString()} Credits</span>

                      </span>

                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium block truncate">

                        Full Milestone Escrow

                      </span>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>



        {/* =========================================================================

            PROJECT BRIEF & REQUIREMENTS (Collapsible)

           ========================================================================= */}

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">

          <div

            onClick={() => setIsSection2Collapsed(!isSection2Collapsed)}

            className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left select-none border-b border-zinc-200 dark:border-zinc-800/80"

          >

            <div className="flex items-center gap-2.5 min-w-0">

              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">

                Project Brief & Requirements

              </span>

              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">

                Brief

              </span>

            </div>



            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs">

              <span>{isSection2Collapsed ? "Expand" : "Collapse"}</span>

              <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 ${!isSection2Collapsed ? "rotate-180" : ""}`} />

            </span>

          </div>



          <AnimatePresence initial={false}>

            {!isSection2Collapsed && (

              <motion.div

                initial={{ height: 0, opacity: 0 }}

                animate={{ height: "auto", opacity: 1 }}

                exit={{ height: 0, opacity: 0 }}

                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}

                className="overflow-hidden p-5 sm:p-6"

              >

                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed shadow-2xs">

                  {order.project_brief || "No project brief provided by the client."}

                </div>

              </motion.div>

            )}

          </AnimatePresence>

        </div>



        {/* =========================================================================

            WORKFLOW POLICIES & SCREENING QUESTIONS (Collapsible)

           ========================================================================= */}

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">

          <div

            onClick={() => setIsSection3Collapsed(!isSection3Collapsed)}

            className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left select-none border-b border-zinc-200 dark:border-zinc-800/80"

          >

            <div className="flex items-center gap-2.5 min-w-0">

              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">

                Workflow Policies & Screening Questions

              </span>

              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">

                {(order.responses || []).length} Q&A

              </span>

            </div>



            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs">

              <span>{isSection3Collapsed ? "Expand" : "Collapse"}</span>

              <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 ${!isSection3Collapsed ? "rotate-180" : ""}`} />

            </span>

          </div>



          <AnimatePresence initial={false}>

            {!isSection3Collapsed && (

              <motion.div

                initial={{ height: 0, opacity: 0 }}

                animate={{ height: "auto", opacity: 1 }}

                exit={{ height: 0, opacity: 0 }}

                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}

                className="overflow-hidden p-5 sm:p-6 space-y-5"

              >

                {/* Platform Workflow Policies */}

                <div className="space-y-3">

                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">

                    Workflow Agreement Policies

                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    {platformResponses.length > 0 ? (

                      platformResponses.map((resp: any, idx: number) => (

                        <div

                          key={"plat-" + idx}

                          className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 space-y-1"

                        >

                          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block">

                            {resp.question}

                          </span>

                          <span className="text-xs font-bold text-zinc-900 dark:text-white">

                            {resp.response}

                          </span>

                        </div>

                      ))

                    ) : (

                      <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 col-span-full text-xs text-zinc-500">

                        Standard workflow terms accepted.

                      </div>

                    )}

                  </div>

                </div>



                {/* Freelancer Custom Questionnaire */}

                <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">

                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">

                    Freelancer Questionnaire Responses

                  </span>

                  {customResponses.length > 0 ? (

                    <div className="space-y-3">

                      {customResponses.map((resp: any, idx: number) => {

                        const isFile =

                          resp.type?.toLowerCase() === "file" ||

                          resp.type?.toLowerCase() === "image" ||

                          resp.type?.toLowerCase() === "video";

                        return (

                          <div

                            key={idx}

                            className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 space-y-2 text-left"

                          >

                            <h5 className="text-xs font-bold text-zinc-900 dark:text-white">

                              <span className="text-zinc-400 mr-1.5 font-semibold">Q{idx + 1}:</span>

                              {resp.question}

                            </h5>

                            <div className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">

                              {isFile ? (

                                <div className="flex flex-wrap gap-2 pt-1">

                                  {resp.response?.split(",").map((key: string, j: number) => {

                                    if (!key) return null;

                                    const isImg = key.match(/\.(jpeg|jpg|gif|png|webp|avif)$/i);

                                    const isVid = key.match(/\.(mp4|mov)$/i);

                                    const url = key.startsWith("http")

                                      ? key

                                      : `${import.meta.env.VITE_CLOUDFRONT_URL}/${key.replace(/^\//, "")}`;

                                    return (

                                      <div

                                        key={j}

                                        onClick={(e) => {

                                          e.stopPropagation();

                                          setExpandedMedia({

                                            url,

                                            type: isImg ? "image" : isVid ? "video" : "doc",

                                          });

                                        }}

                                        className="relative w-16 h-16 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 group cursor-pointer hover:border-blue-500 transition-colors"

                                      >

                                        {isImg ? (

                                          <img

                                            src={url}

                                            alt="upload"

                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"

                                          />

                                        ) : isVid ? (

                                          <div className="flex items-center justify-center w-full h-full bg-blue-50 text-blue-500 dark:bg-blue-900/20">

                                            <PlayCircle className="w-5 h-5" />

                                          </div>

                                        ) : (

                                          <div className="flex items-center justify-center w-full h-full bg-red-50 text-red-500 dark:bg-red-900/20">

                                            <FileText className="w-5 h-5" />

                                          </div>

                                        )}

                                      </div>

                                    );

                                  })}

                                </div>

                              ) : (

                                <p className="font-medium text-zinc-900 dark:text-white">

                                  {resp.response || "No response provided."}

                                </p>

                              )}

                            </div>

                          </div>

                        );

                      })}

                    </div>

                  ) : (

                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">

                      No custom questionnaire was configured on this service.

                    </div>

                  )}

                </div>

              </motion.div>

            )}

          </AnimatePresence>

        </div>



        {/* =========================================================================

            SERVICE TERMS OF SERVICE (Collapsible)

           ========================================================================= */}

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">

          <div

            onClick={() => setIsSection4Collapsed(!isSection4Collapsed)}

            className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left select-none border-b border-zinc-200 dark:border-zinc-800/80"

          >

            <div className="flex items-center gap-2.5 min-w-0">

              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">

                Service Terms of Service

              </span>

              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">

                TOS

              </span>

            </div>



            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs">

              <span>{isSection4Collapsed ? "Expand" : "Collapse"}</span>

              <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 ${!isSection4Collapsed ? "rotate-180" : ""}`} />

            </span>

          </div>



          <AnimatePresence initial={false}>

            {!isSection4Collapsed && (

              <motion.div

                initial={{ height: 0, opacity: 0 }}

                animate={{ height: "auto", opacity: 1 }}

                exit={{ height: 0, opacity: 0 }}

                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}

                className="overflow-hidden p-5 sm:p-6"

              >

                <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 text-xs text-zinc-700 dark:text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed shadow-2xs">

                  {order.terms_of_service ||

                    "1. All deliverables remain property of the creator until final milestone payout.\n2. Source files delivered upon project completion.\n3. Communication conducted via platform inbox.\n4. Additional revisions outside milestone quotas billed at agreed additional work rate."}

                </div>

              </motion.div>

            )}

          </AnimatePresence>

        </div>

      </motion.div>



      {/* =========================================================================

          FIXED STICKY BOTTOM ACTION CONTROLS: Parity with Proposal Bottom Bar

         ========================================================================= */}

      <div

        className="fixed bottom-0 right-0 z-40 transition-[left] duration-300 bg-white/95 dark:bg-dark-base/95 backdrop-blur-md border-t border-gray-200 dark:border-white/10 px-4 sm:px-6 py-3.5 shadow-lg"

        style={{ left: isSidebarCollapsed ? "5rem" : "16rem" }}

      >

        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">

          <div className="flex items-center gap-3">

            <span className="text-xs font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-2">

              <span>Status:</span>

              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.className}`}>

                {statusBadge.label}

              </span>

            </span>

          </div>



          <div className="flex flex-wrap items-center justify-end gap-2.5">

            <button

              onClick={() =>

                void openMarketplaceConversation({

                  contextType: "gig_order",

                  contextId: order.id,

                  navigate,

                  targetName: order.client_name || order.client_handle || "Client",

                  targetAvatar: order.client_avatar,

                  listingTitle: order.gig_title,

                })

              }

              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-800 dark:text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer"

            >

              <MessageSquare className="w-4 h-4 text-blue-500" />

              <span>Chat with Client</span>

            </button>



            {order.status === "Pending" && (

              <>

                <button

                  onClick={() => setIsRejectModalOpen(true)}

                  className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"

                >

                  <XCircle className="w-4 h-4" />

                  <span>Decline Order</span>

                </button>

                <button

                  onClick={() => setIsAcceptModalOpen(true)}

                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-lg shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"

                >

                  <CheckCircle className="w-4 h-4" />

                  <span>Review & Accept</span>

                </button>

              </>

            )}



            {order.status === "Accepted" && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                  Awaiting Client Escrow Confirmation
                </span>
                {order.contract_id && (
                  <button
                    onClick={() => navigate(`/contracts/${order.contract_id}`)}
                    className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-blue-200 dark:border-blue-500/30"
                  >
                    <span>View Contract</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {(order.status === "In Contract" || order.status === "Completed") && (order.workspace_team_id || order.contract_id) && (
              <button
                onClick={() => navigate(order.workspace_team_id ? `/team-project/${order.workspace_team_id}` : `/contracts/${order.contract_id}`)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-500/20"
              >
                <span>Delivery Workspace</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

          </div>

        </div>

      </div>



      {/* Reject Modal */}

      {isRejectModalOpen && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">

          <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl">

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Decline Gig Order</h3>

            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">

              Please provide a reason for declining this order. The client will be notified.

            </p>

            <textarea

              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-xs text-gray-900 dark:text-white resize-none outline-none focus:border-red-500 transition-colors"

              rows={4}

              placeholder="e.g., We are fully booked for this timeframe..."

              value={rejectReason}

              onChange={(e) => setRejectReason(e.target.value)}

            />

            <div className="flex items-center justify-end gap-3 mt-6">

              <button

                onClick={() => setIsRejectModalOpen(false)}

                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"

              >

                Cancel

              </button>

              <button

                disabled={isProcessing}

                onClick={handleReject}

                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"

              >

                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}

                <span>Confirm Decline</span>

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Accept Modal */}

      {isAcceptModalOpen && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">

          <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl">

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Accept Gig Order</h3>

            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4 leading-relaxed">

              By accepting this order, the client will be notified to confirm and authorize the escrow deposit. Once funded, the contract will officially begin.

            </p>



            <label className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 cursor-pointer group">

              <div className="relative flex items-center justify-center mt-0.5">

                <input

                  type="checkbox"

                  className="peer sr-only"

                  checked={agreedToTerms}

                  onChange={(e) => setAgreedToTerms(e.target.checked)}

                />

                <div className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors" />

                <CheckCircle

                  className="w-3 h-3 text-white absolute inset-0 m-auto opacity-0 peer-checked:opacity-100 transition-opacity"

                  strokeWidth={4}

                />

              </div>

              <div>

                <p className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">

                  I agree to the service scope and timeline

                </p>

                <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-1">

                  I commit to delivering the work within the {order.delivery_days}-day delivery timeline once escrow is locked.

                </p>

              </div>

            </label>



            <div className="flex items-center justify-end gap-3 mt-6">

              <button

                onClick={() => setIsAcceptModalOpen(false)}

                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"

              >

                Cancel

              </button>

              <button

                disabled={!agreedToTerms || isProcessing}

                onClick={handleAccept}

                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"

              >

                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}

                <span>Accept Order</span>

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Expanded Media Modal */}

      {expandedMedia && (

        <div

          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"

          onClick={() => setExpandedMedia(null)}

        >

          <div

            className="relative w-full max-w-4xl max-h-[90vh] flex flex-col items-center justify-center"

            onClick={(e) => e.stopPropagation()}

          >

            <button

              onClick={() => setExpandedMedia(null)}

              className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300 transition-colors cursor-pointer"

            >

              <XCircle className="w-8 h-8" />

            </button>

            {expandedMedia.type === "image" && (

              <img

                src={expandedMedia.url}

                alt="Expanded"

                className="max-w-full max-h-[85vh] object-contain rounded-xl"

              />

            )}

            {expandedMedia.type === "video" && (

              <video

                src={expandedMedia.url}

                controls

                autoPlay

                className="max-w-full max-h-[85vh] rounded-xl outline-none bg-black"

              />

            )}

            {expandedMedia.type === "doc" && (

              <div className="bg-white dark:bg-dark-surface p-8 rounded-2xl flex flex-col items-center gap-4 text-center max-w-md w-full">

                <FileText className="w-16 h-16 text-blue-500" />

                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Document File</h3>

                <p className="text-xs text-gray-500">Preview not directly available in browser.</p>

                <a

                  href={expandedMedia.url}

                  target="_blank"

                  rel="noopener noreferrer"

                  className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"

                >

                  <ExternalLink className="w-4 h-4" /> Open / Download File

                </a>

              </div>

            )}

          </div>

        </div>

      )}

    </div>

  );

};



export default IncomingOrderDetail;

