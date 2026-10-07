import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, XCircle, Star, User, ExternalLink, Send, Calendar, Clock, Image as ImageIcon, Video, FileText, PlayCircle, MessageSquare, CheckCircle, CheckCircle2 } from "lucide-react";
import api from "@/lib/axios";
import { CreditIcon } from "@/components/ui/credit-icon";
import ShapeGrid from "@/components/ui/ShapeGrid";
import useGlobalState from "@/lib/global_state";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
import { openMarketplaceConversation } from "@/components/ui/inbox/marketplace_conversation";

export const SentOrderDetail = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const theme = useGlobalState((state) => state.theme);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [bannerError, setBannerError] = useState(false);
    
    const bannerUrl = order?.gig_banner 
        ? (order.gig_banner.startsWith('http') 
            ? order.gig_banner 
            : `${import.meta.env.VITE_CLOUDFRONT_URL}${order.gig_banner.startsWith('/') ? '' : '/'}${order.gig_banner}`)
        : null;
    const [expandedMedia, setExpandedMedia] = useState<{ url: string, type: 'image' | 'video' | 'doc' } | null>(null);

  // Final contract confirmation states
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isConfirmingContract, setIsConfirmingContract] = useState(false);
  const [agreedToContractTerms, setAgreedToContractTerms] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    api.get("/api/accounts/wallet", { params: { type: "account_wallets" } })
      .then(res => {
        setWalletBalance(res.data?.wallet?.balance_credits ?? 0);
      })
      .catch(err => {
        console.error("Failed to fetch wallet:", err);
      });
  }, []);

  const handleConfirmContract = async () => {
    if (!agreedToContractTerms) {
      return showErrorToast("You must agree to the platform terms and authorize the escrow deposit.");
    }
    if (walletBalance !== null && walletBalance < (order?.price || 0)) {
      return showErrorToast("Insufficient wallet credits. Please top up your wallet.");
    }
    setIsConfirmingContract(true);
    try {
      const res = await api.post(`/api/gigs/orders/${order.id}/confirm-contract`);
      showSuccessToast("Contract confirmed and funded successfully! Starting contract...");
      setShowConfirmModal(false);
      if (res.data?.contractId) {
        navigate(`/contracts/${res.data.contractId}`);
      } else {
        navigate('/contracts');
      }
    } catch (err: any) {
      console.error("Failed to confirm contract:", err);
      showErrorToast(err?.response?.data?.message || "Failed to confirm contract.");
      setIsConfirmingContract(false);
    }
  };

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    try {
        await api.put(`/api/gigs/orders/${orderId}/withdraw`);
        navigate('/gigs/orders/sent');
    } catch (err) {
        console.error("Failed to withdraw:", err);
        showErrorToast("Failed to cancel order.");
        setIsWithdrawing(false);
    }
  };

  const formatAvatarUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return String(import.meta.env.VITE_CLOUDFRONT_URL) + "/" + url.replace(/^\//, '');
  };

  useEffect(() => {
    api.get(`/api/gigs/orders/${orderId}`)
      .then(res => {
        const fetched = res.data.data;
        if (fetched) {
            fetched.freelancer_avatar = formatAvatarUrl(fetched.freelancer_avatar);
            fetched.client_avatar = formatAvatarUrl(fetched.client_avatar);
        }
        setOrder(fetched);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [orderId]);

  if (loading) {
    return (
      <div className="relative w-full min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white overflow-x-hidden pt-6 pb-16">
        <div className="max-w-6xl mx-auto p-4 md:p-8 animate-pulse w-full">
            <div className="h-8 w-32 bg-gray-200 dark:bg-dark-surface rounded-xl mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-8 gap-6">
                <div className="lg:col-span-3 space-y-4">
                    <div className="h-40 bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-3xl"></div>
                    <div className="h-32 bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-3xl"></div>
                    <div className="h-48 bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-3xl"></div>
                </div>
                <div className="lg:col-span-5 space-y-4">
                    <div className="h-96 bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-3xl"></div>
                    <div className="h-64 bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-3xl"></div>
                </div>
            </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
        <div className="flex flex-col items-center justify-center py-20">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Order Not Found</h2>
            <button onClick={() => navigate(-1)} className="text-blue-500 hover:underline">Go Back</button>
        </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white overflow-x-hidden pt-6 pb-16">
      <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
        <ShapeGrid
          shape="square"
          squareSize={48}
          direction="diagonal"
          speed={0.4}
          borderColor={theme === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)"}
          hoverFillColor={theme === 'dark' ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)"}
          hoverTrailAmount={3}
        />
      </div>
      <div className="relative z-10 max-w-6xl mx-auto px-4 xl:px-0 space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors text-sm font-bold text-gray-700 dark:text-zinc-300">
            <ArrowLeft className="h-4 w-4" /> Return
          </button>
          <span className="text-xs text-gray-500 font-mono">Order ID: {order.id || order.gig_request_id}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
              
            {/* PROFILE - YOUR PROFILE (CLIENT) */}
            <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 backdrop-blur-xl shadow-2xl space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {order.client_avatar ? (
                      <img src={order.client_avatar} alt="client" className="h-12 w-12 rounded-full border border-gray-200 dark:border-white/10 object-cover" />
                  ) : (
                      <div className="h-12 w-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xl border border-blue-500/20">
                          {order.client_name ? order.client_name[0] : 'C'}
                      </div>
                  )}
                  <div>
                      <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{order.client_name}</h2>
                          <span className="text-[10px] font-bold text-blue-600 border-blue-300 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10 border dark:border-blue-500/20 px-2 py-0.5 rounded-full">Client (You)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                          <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                          <span className="text-amber-500 dark:text-amber-400 font-bold">5.0</span>
                          <span>•</span>
                          <span>Client Rating</span>
                      </div>
                  </div>
                </div>
                <button onClick={() => navigate(`/profile`)} className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300">
                  <User className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" /> View Your Profile
                </button>
              </div>
            </div>

            {/* TARGET GIG */}
              <div className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] space-y-4">
                  <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Target Gig Post</span>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                          order.status === 'In Contract' || order.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' :
                          order.status === 'Accepted' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' :
                          order.status === 'Rejected' || order.status === 'Cancelled' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' :
                          order.status === 'Shortlisted' ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20' :
                          'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-500/10 dark:text-amber-500 dark:text-amber-400 dark:border-yellow-500/20'
                      }`}>
                          {order.status || 'Pending'}
                      </span>
                  </div>
                                    {bannerUrl && !bannerError && (
                    <div className="relative w-full h-28 rounded-xl overflow-hidden shadow-sm mt-3 border border-gray-100 dark:border-white/5">
                      <img src={bannerUrl} className="w-full h-full object-cover" alt="Gig Cover" onError={() => setBannerError(true)} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-between p-3">
                        <h3 className="text-sm font-bold text-white truncate flex items-center gap-2 drop-shadow-md">
                          <ExternalLink className="h-4 w-4 text-blue-300 shrink-0" />
                          {order.gig_title}
                        </h3>
                        <button
                          onClick={() => navigate(`/gigs/services/${order.gig_id}/page`)}
                          className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white/90 hover:text-white backdrop-blur-sm transition shrink-0"
                          title="View Target Gig Post"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                  {(!bannerUrl || bannerError) && (
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-white"><ExternalLink className="w-4 h-4 text-blue-500 dark:text-blue-400" /> {order.gig_title}</h3>
                        <button className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition" onClick={() => navigate(`/gigs/services/${order.gig_id}/page`)}><ExternalLink className="w-4 h-4 text-gray-500 dark:text-gray-400" /></button>
                    </div>
                  )}

                  {/* GIG AUTHOR SUB-CARD */}
                  <div className="p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3">
                      {order.freelancer_avatar ? (
                          <img src={order.freelancer_avatar} alt="freelancer" className="h-8 w-8 rounded-full border border-gray-200 dark:border-white/10 object-cover" />
                      ) : (
                          <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs border border-emerald-500/20">
                              {order.freelancer_name ? order.freelancer_name[0] : 'F'}
                          </div>
                      )}
                      <div>
                          <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">Gig Author</span>
                          <p className="text-xs font-bold text-gray-900 dark:text-white">{order.freelancer_name}</p>
                      </div>
                    </div>
                    <button onClick={() => navigate(`/inbox?user=${encodeURIComponent(order.freelancer_name)}`)} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition flex items-center gap-1.5 text-[11px] font-bold text-gray-600 dark:text-gray-300">
                      <User className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> View Author Profile
                    </button>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-200 dark:border-white/5 flex flex-col gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300 text-sm"><Calendar className="w-4 h-4" /> Ordered Tier:</span>
                            <span className="text-gray-900 dark:text-white font-bold text-sm flex items-center gap-2">
                                {order.tier_title}
                                <span className="text-amber-500 dark:text-amber-400 font-bold flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-full text-[11px]">
                                    <CreditIcon className="w-4 h-4" /> {order.price?.toLocaleString()}
                                </span>
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1"><Send className="w-3 h-3 text-blue-500 dark:text-blue-400" /> Order Sent Date:</span>
                            <span className="text-gray-900 dark:text-white font-mono">{new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                  </div>
              </div>

              {/* STATS */}
              <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-white dark:bg-white/5 flex flex-col border border-gray-100 dark:border-white/5">
                      <span className="text-[10px] font-bold text-gray-500 uppercase mb-1">TIER PRICE</span>
                      <span className="text-amber-500 dark:text-amber-400 font-black text-lg flex items-center gap-1"><CreditIcon className="w-5 h-5" /> {order.price?.toLocaleString()}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-white/5 flex flex-col border border-gray-100 dark:border-white/5">
                      <span className="text-[10px] font-bold text-gray-500 uppercase mb-1">ADDITIONAL RATE</span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">% +{order.additional_work_rate || 20}% / Revision</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-white/5 flex flex-col border border-gray-100 dark:border-white/5">
                      <span className="text-[10px] font-bold text-gray-500 uppercase mb-1">DELIVERY</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center gap-1"><Clock className="w-4 h-4" /> {order.delivery_days} Days</span>
                  </div>
              </div>
              
              {/* PROJECT BRIEF */}
              <div className="p-5 rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm">
                  <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4">PROJECT BRIEF</h3>
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                      {order.project_brief || "No project brief provided."}
                  </div>
              </div>
              
              

              {order.status === 'Shortlisted' && (
                <div className="p-5 rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm flex items-center justify-between mt-6">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-400">Current Status: <span className="text-blue-500 dark:text-blue-400 font-bold">Shortlisted</span></span>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => void openMarketplaceConversation({
                        contextType: 'gig_order',
                        contextId: order.id,
                        navigate,
                      })}
                      className="px-5 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition flex items-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" /> Open Discussion Chat
                    </button>
                    <button 
                      disabled={isWithdrawing}
                      onClick={() => setShowWithdrawConfirm(true)}
                      className="px-5 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" /> Cancel Order
                    </button>
                  </div>
                </div>
              )}

              {/* FINAL CONFIRMATION & ESCROW FUNDING CARD */}
              {order.status === 'Accepted' && !order.contract_id && (
                <div className="p-6 rounded-3xl border border-emerald-200 dark:border-emerald-500/20 bg-white dark:bg-dark-surface shadow-sm mt-6 space-y-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Freelancer Accepted Your Order!</h3>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">Review terms, verify your wallet balance, and authorize escrow funding to start the contract.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start md:self-auto">
                      <button 
                        onClick={() => void openMarketplaceConversation({
                          contextType: 'gig_order',
                          contextId: order.id,
                          navigate,
                        })}
                        className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-zinc-200 text-xs font-bold transition flex items-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4 text-blue-400" /> Chat with Freelancer
                      </button>
                      <button 
                        disabled={isWithdrawing}
                        onClick={() => setShowWithdrawConfirm(true)}
                        className="px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" /> Cancel
                      </button>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Required Escrow Funding</span>
                      <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400">
                        <CreditIcon className="w-5 h-5 text-amber-500" />
                        <span className="text-xl font-black">{order.price?.toLocaleString()}</span>
                        <span className="text-xs font-medium text-gray-500">Credits</span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400">Credits are safely held in platform escrow and only released upon milestone delivery approvals.</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Your Available Balance</span>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditIcon className="w-5 h-5 text-amber-500" />
                          <span className={`text-xl font-black ${walletBalance !== null && walletBalance >= (order.price || 0) ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                            {walletBalance !== null ? walletBalance.toLocaleString() : '...'}
                          </span>
                          <span className="text-xs font-medium text-gray-500">Credits</span>
                        </div>
                        {walletBalance !== null && walletBalance < (order.price || 0) && (
                          <button 
                            onClick={() => navigate('/wallet')} 
                            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition shadow-sm"
                          >
                            Top Up Wallet
                          </button>
                        )}
                      </div>
                      {walletBalance !== null && walletBalance < (order.price || 0) ? (
                        <p className="text-[11px] text-red-500 dark:text-red-400 font-semibold">Insufficient credits. You need {((order.price || 0) - walletBalance).toLocaleString()} more credits.</p>
                      ) : (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Sufficient balance available for contract escrow.</p>
                      )}
                    </div>
                  </div>

                  {/* Terms of Service Checkbox */}
                  <label className="flex items-start gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input 
                        type="checkbox" 
                        className="peer sr-only" 
                        checked={agreedToContractTerms} 
                        onChange={(e) => setAgreedToContractTerms(e.target.checked)} 
                      />
                      <div className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-colors"></div>
                      <CheckCircle className="w-3 h-3 text-white absolute inset-0 m-auto opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={4} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                        I agree to the platform Terms of Service and authorize escrow deduction
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                        By confirming, {order.price?.toLocaleString()} credits will be held in platform escrow and the contract will begin immediately with the agreed milestones.
                      </p>
                    </div>
                  </label>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      disabled={!agreedToContractTerms || (walletBalance !== null && walletBalance < (order.price || 0)) || isConfirmingContract}
                      onClick={() => setShowConfirmModal(true)}
                      className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isConfirmingContract ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Confirm & Start Contract
                    </button>
                  </div>
                </div>
              )}

              {/* ACTIVE CONTRACT CARD */}
              {(order.status === 'In Contract' || order.contract_id) && (
                <div className="p-5 rounded-3xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 shadow-sm flex items-center justify-between mt-6">
                  <div>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Status: <span className="text-emerald-600 dark:text-emerald-400 font-bold">Contract Active</span></span>
                    <p className="text-xs text-gray-500 mt-1">This gig order has been confirmed and the contract is currently active.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => void openMarketplaceConversation({
                        contextType: 'gig_order',
                        contextId: order.id,
                        navigate,
                      })}
                      className="px-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-zinc-200 text-xs font-bold transition flex items-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4 text-blue-400" /> Chat
                    </button>
                    {order.contract_id && (
                      <button 
                        onClick={() => navigate(`/contracts/${order.contract_id}`)}
                        className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
                      >
                        <CheckCircle className="w-4 h-4" /> View Active Contract
                      </button>
                    )}
                  </div>
                </div>
              )}
          </div>

          <div className="lg:col-span-5 space-y-4">
              {/* QUESTIONNAIRE ANSWERS */}
                              {/* Terms splitting logic */}
                {(() => {
                  const platformResponses = (order.responses || []).filter((r: any) => r.question && (r.question.includes('confidentiality (NDA)') || r.question.includes('Freelancer Portfolio')));
                  const customResponses = (order.responses || []).filter((r: any) => !r.question || !(r.question.includes('confidentiality (NDA)') || r.question.includes('Freelancer Portfolio')));
                  return (
                    <>
                      {/* Platform Terms */}
                      <div className="p-5 rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm mb-4">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4">PLATFORM TERMS</h3>
                        <div className="space-y-4">
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Project Initiator</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {order.initiator_role || 'The Freelancer'}
                            </span>
                          </div>
                          {order.linked_project_name && (
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-500 dark:text-gray-400">Linked Project</span>
                              <span className="text-sm font-medium text-blue-500">
                                {order.linked_project_name}
                              </span>
                            </div>
                          )}
                          {platformResponses.map((resp: any, idx: number) => (
                            <div key={'plat-'+idx} className="flex flex-col">
                              <span className="text-xs text-gray-500 dark:text-gray-400">{resp.question}</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{resp.response}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-5 rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4">QUESTIONNAIRE REQUIREMENTS</h3>
                        {customResponses.length > 0 && customResponses[0]?.question_id ? (
                            <div className="space-y-4">
                                {customResponses.map((resp: any, idx: number) => {
                            const isFile = resp.type?.toLowerCase() === 'file' || resp.type?.toLowerCase() === 'image' || resp.type?.toLowerCase() === 'video';
                            return (
                                <div key={idx} className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-200 mb-2">{idx + 1}. {resp.question}</h4>
                                    <div className="text-xs text-gray-700 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                                        {isFile ? (
                                          <div className="flex flex-wrap gap-2 mt-2">
                                            {resp.response?.split(',').map((key: string, j: number) => {
                                              if (!key) return null;
                                              const isImg = key.match(new RegExp("\\.(jpeg|jpg|gif|png|webp|avif)$", "i"));
                                              const isVid = key.match(new RegExp("\\.(mp4|mov)$", "i"));
                                              const url = key.startsWith('http') ? key : String(import.meta.env.VITE_CLOUDFRONT_URL) + "/" + key;
                                              return (
                                                <div key={j} onClick={(e) => {
                                                  e.stopPropagation();
                                                  setExpandedMedia({ url, type: isImg ? 'image' : isVid ? 'video' : 'doc' });
                                                }} className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base group cursor-pointer hover:border-blue-500 transition-colors">
                                                    {isImg ? (
                                                      <img src={url} alt="upload" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                                    ) : isVid ? (
                                                      <div className="flex items-center justify-center w-full h-full bg-blue-50 text-blue-500 dark:bg-blue-900/20"><PlayCircle className="w-5 h-5" /></div>
                                                    ) : (
                                                      <div className="flex items-center justify-center w-full h-full bg-red-50 text-red-500 dark:bg-red-900/20"><FileText className="w-5 h-5" /></div>
                                                    )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                            <span className="break-words">{
                                                (() => {
                                                    const val = resp.response;
                                                    if (!val) return "No response.";
                                                    try {
                                                        const parsed = JSON.parse(val);
                                                        return Array.isArray(parsed) ? parsed.join(', ') : val;
                                                    } catch {
                                                        if (typeof val === 'string' && val.startsWith('{') && val.endsWith('}')) {
                                                            const stripped = val.slice(1, -1);
                                                            if (stripped) {
                                                                return stripped.split(',').map(s => s.replace(/^"\\?"?|\\?"?"$/g, '').replace(/\\"/g, '"')).join(', ');
                                                            }
                                                        }
                                                        return val;
                                                    }
                                                })()
                                            }</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-sm text-gray-500">No questionnaire responses provided.</div>
                        )}
                      </div>
                    </>
                  );
                })()}
              
              {/* TOS */}
              <div className="p-5 rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-400">
                      <FileText className="w-5 h-5" />
                      <div>
                          <h3 className="font-bold text-sm text-gray-900 dark:text-white">Standard Platform TOS</h3>
                          <p className="text-[10px] text-gray-500 uppercase">Gig Agreement</p>
                      </div>
                  </div>
                  <div className="p-4 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 text-xs text-gray-700 dark:text-gray-400 font-mono whitespace-pre-wrap leading-relaxed">
                      {order.terms_of_service || "1. All deliverables remain property of the creator until final milestone payout. 2. Source files delivered upon project completion. 3. Communication conducted via platform inbox. 4. Additional revisions outside milestone quotas billed at agreed additional work rate."}
                  </div>
              </div>
          </div>
        </div>
      </div>

      

          {/* ================= SECTION 5: EXPANDABLE HOVER DECISION CONTROLS (BOTTOM) ================= */}
          <div className="sticky bottom-6 z-40 w-full px-6 mt-8 transition-all">
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-dark-surface/90 p-4 md:px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h3 className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider hidden sm:flex items-center gap-1.5">
                  Decision & Action Controls
                </h3>
                <span className="text-[11px] text-gray-500 dark:text-zinc-500 font-mono bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md">Current Status: {order.status}</span>
              </div>
              
              <div className="flex flex-wrap items-center justify-end gap-2">
                {order.status === 'Pending' && (
                  <>
                    <button onClick={() => navigate(`/gigs/services/${order.gig_id}/order?edit=${order.id}`)} className="group relative flex items-center gap-2 overflow-hidden rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-100 dark:bg-blue-500/10 px-4 py-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 transition-all duration-300 hover:bg-blue-200 dark:hover:bg-blue-500/20 hover:shadow-lg hover:shadow-blue-500/10">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                      <span className="whitespace-nowrap max-w-[65px] transition-all duration-300 group-hover:max-w-[150px]">
                        <span className="inline group-hover:hidden">Edit</span>
                        <span className="hidden group-hover:inline">Edit Order</span>
                      </span>
                    </button>
                    <button onClick={() => setShowWithdrawConfirm(true)} className="group relative flex items-center gap-2 overflow-hidden rounded-xl border border-red-200 dark:border-red-500/30 bg-red-100 dark:bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-600 dark:text-red-400 transition-all duration-300 hover:bg-red-200 dark:hover:bg-red-500/20 hover:shadow-lg hover:shadow-red-500/10">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <span className="whitespace-nowrap max-w-[65px] transition-all duration-300 group-hover:max-w-[150px]">
                        <span className="inline group-hover:hidden">Withdraw</span>
                        <span className="hidden group-hover:inline">Withdraw Order</span>
                      </span>
                    </button>
                  </>
                )}

                {order.status === 'Accepted' && (
                  <button onClick={() => setShowConfirmModal(true)} className="group relative flex items-center gap-2 overflow-hidden rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-100 dark:bg-emerald-500/10 px-6 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-all duration-300 hover:bg-emerald-200 dark:hover:bg-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/10">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Fund & Confirm Contract
                  </button>
                )}
              </div>
            </div>
          </div>

      {/* Expanded Media Modal */}
      {expandedMedia && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setExpandedMedia(null)}>
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col items-center justify-center bg-transparent" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setExpandedMedia(null)} className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300 transition-colors">
              <XCircle className="w-8 h-8" />
            </button>
            {expandedMedia.type === 'image' && (
              <img src={expandedMedia.url} alt="Expanded" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
            )}
            {expandedMedia.type === 'video' && (
              <video src={expandedMedia.url} controls autoPlay className="max-w-full max-h-[85vh] rounded-xl outline-none bg-black" />
            )}
            {expandedMedia.type === 'doc' && (
              <div className="bg-white dark:bg-dark-surface p-8 rounded-2xl flex flex-col items-center gap-4 text-center max-w-md w-full">
                <FileText className="w-16 h-16 text-blue-500" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Document File</h3>
                <p className="text-sm text-gray-500">This file type cannot be previewed directly in the browser.</p>
                <a href={expandedMedia.url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition-colors flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" /> Open / Download File
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm p-6 rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Cancel Order</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              Are you sure you want to withdraw this pending order? This action cannot be undone.
            </p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setShowWithdrawConfirm(false)}
                disabled={isWithdrawing}
                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleWithdraw}
                disabled={isWithdrawing}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isWithdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Contract Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center gap-3 text-emerald-500">
              <CheckCircle2 className="w-6 h-6" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm & Start Contract</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              You are about to start an active contract for <strong className="text-gray-900 dark:text-white">{order.gig_title}</strong> with <strong className="text-gray-900 dark:text-white">{order.freelancer_name}</strong>.
            </p>
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Contract Tier:</span>
                <span className="font-bold text-gray-900 dark:text-white">{order.tier_title}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Escrow Hold Amount:</span>
                <span className="font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1">
                  <CreditIcon className="w-4 h-4" /> {order.price?.toLocaleString()} credits
                </span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Remaining Balance After:</span>
                <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                  <CreditIcon className="w-4 h-4 text-amber-500" /> {((walletBalance ?? 0) - (order.price || 0)).toLocaleString()} credits
                </span>
              </div>
            </div>
                          {/* Terms of Service Checkbox */}
              <label className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 cursor-pointer group mt-4">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input 
                    type="checkbox" 
                    className="peer sr-only" 
                    checked={agreedToContractTerms} 
                    onChange={(e) => setAgreedToContractTerms(e.target.checked)} 
                  />
                  <div className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-colors"></div>
                  <svg className="w-3 h-3 text-white absolute inset-0 m-auto opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                    I agree to the platform Terms of Service and authorize escrow deduction.
                  </p>
                </div>
              </label>
              <div className="flex gap-3 w-full pt-2">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                disabled={isConfirmingContract}
                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Go Back
              </button>
              <button 
                  onClick={handleConfirmContract}
                  disabled={isConfirmingContract || !agreedToContractTerms}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
              >
                {isConfirmingContract ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {isConfirmingContract ? 'Processing...' : 'Authorize & Start'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default SentOrderDetail;
