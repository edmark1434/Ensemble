import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, XCircle, CheckCircle, Star, User, ExternalLink, Send, Calendar, Clock, Image as ImageIcon, Video, FileText, PlayCircle } from "lucide-react";
import api from "@/lib/axios";
import { CreditIcon } from "@/components/ui/credit-icon";
import ShapeGrid from "@/components/ui/ShapeGrid";
import useGlobalState from "@/lib/global_state";

export const IncomingOrderDetail = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const theme = useGlobalState((state) => state.theme);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMedia, setExpandedMedia] = useState<{ url: string, type: 'image' | 'video' | 'doc' } | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleReject = async () => {
    if (!rejectReason.trim()) return alert("Please provide a reason");
    setIsProcessing(true);
    try {
        await api.post(`/api/gigs/orders/${order.id}/reject`, { reason: rejectReason });
        navigate(-1);
    } catch(e) {
        alert("Failed to reject order");
        setIsProcessing(false);
    }
  };

  const handleAccept = async () => {
    if (!agreedToTerms) return alert("You must agree to the terms");
    setIsProcessing(true);
    try {
        await api.post(`/api/gigs/orders/${order.id}/accept`);
        navigate('/contracts');
    } catch(e) {
        alert("Failed to accept order");
        setIsProcessing(false);
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
              
            {/* PROFILE - YOUR PROFILE (FREELANCER) */}
            <div className="p-5 rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm flex flex-col gap-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {order.freelancer_avatar ? (
                      <img src={order.freelancer_avatar} alt="freelancer" className="h-12 w-12 rounded-full border border-gray-200 dark:border-white/10 object-cover" />
                  ) : (
                      <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xl border border-emerald-500/20">
                          {order.freelancer_name ? order.freelancer_name[0] : 'F'}
                      </div>
                  )}
                  <div>
                      <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{order.freelancer_name}</h2>
                          <span className="text-[10px] font-bold text-emerald-600 border-emerald-300 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 border dark:border-emerald-500/20 px-2 py-0.5 rounded-full">Freelancer (You)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                          <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                          <span className="text-yellow-500 font-bold">5.0</span>
                          <span>•</span>
                          <span>Freelancer Rating</span>
                      </div>
                  </div>
                </div>
                <button onClick={() => navigate(`/profile`)} className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300">
                  <User className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> View Your Profile
                </button>
              </div>
            </div>

            {/* TARGET GIG */}
              <div className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] space-y-4">
                  <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Target Gig Post</span>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                          order.status === 'Accepted' || order.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' :
                          order.status === 'Rejected' || order.status === 'Cancelled' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' :
                          'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-500 dark:border-yellow-500/20'
                      }`}>
                          {order.status || 'Pending'}
                      </span>
                  </div>
                  <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-white"><ExternalLink className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> {order.gig_title}</h3>
                      <button className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition" onClick={() => navigate(`/gigs/services/${order.gig_id}/page`)}><ExternalLink className="w-4 h-4 text-gray-500 dark:text-gray-400" /></button>
                  </div>

                  {/* CLIENT SENDER SUB-CARD */}
                  <div className="p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3">
                      {order.client_avatar ? (
                          <img src={order.client_avatar} alt="client" className="h-8 w-8 rounded-full border border-gray-200 dark:border-white/10 object-cover" />
                      ) : (
                          <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center font-bold text-xs">
                              {order.client_name ? order.client_name[0] : 'C'}
                          </div>
                      )}
                      <div>
                          <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">Order Sender</span>
                          <p className="text-xs font-bold text-gray-900 dark:text-white">{order.client_name}</p>
                      </div>
                    </div>
                    <button onClick={() => navigate(`/inbox?user=${encodeURIComponent(order.client_name)}`)} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition flex items-center gap-1.5 text-[11px] font-bold text-gray-600 dark:text-gray-300">
                      <User className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" /> View Client Profile
                    </button>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-200 dark:border-white/5 flex flex-col gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300 text-sm"><Calendar className="w-4 h-4" /> Ordered Tier:</span>
                            <span className="text-gray-900 dark:text-white font-bold text-sm flex items-center gap-2">
                                {order.tier_title}
                                <span className="text-yellow-500 font-bold flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-full text-[11px]">
                                    <CreditIcon className="w-4 h-4" /> {order.price?.toLocaleString()}
                                </span>
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1"><Send className="w-3 h-3 text-emerald-500 dark:text-emerald-400" /> Order Received Date:</span>
                            <span className="text-gray-900 dark:text-white font-mono">{new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                  </div>
              </div>

              {/* STATS */}
              <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-white dark:bg-white/5 flex flex-col border border-gray-100 dark:border-white/5">
                      <span className="text-[10px] font-bold text-gray-500 uppercase mb-1">TIER PRICE</span>
                      <span className="text-yellow-500 font-black text-lg flex items-center gap-1"><CreditIcon className="w-5 h-5" /> {order.price?.toLocaleString()}</span>
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
              
              <div className="p-5 rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm">
                  <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4">PROJECT BRIEF</h3>
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                      {order.project_brief || "No project brief provided."}
                  </div>
              </div>
              
              {order.status === 'Pending' && (
                  <div className="p-5 rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm flex items-center justify-between mt-6">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-400">Status: <span className="text-yellow-500 font-bold">Pending Approval</span></span>
                    <div className="flex gap-3">
                      <button onClick={() => setIsRejectModalOpen(true)} className="px-5 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition flex items-center gap-2">
                          <XCircle className="w-4 h-4" /> Reject Order
                      </button>
                      <button onClick={() => setIsAcceptModalOpen(true)} className="px-5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" /> Review & Accept
                      </button>
                    </div>
                  </div>
              )}
          </div>

          <div className="lg:col-span-5 space-y-4">
              <div className="p-5 rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4">QUESTIONNAIRE REQUIREMENTS</h3>
                {order.responses && order.responses.length > 0 && order.responses[0]?.question_id ? (
                    <div className="space-y-4">
                        {order.responses.map((resp: any, idx: number) => {
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

    {/* Reject Modal */}
    {isRejectModalOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-md shadow-xl">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Reject Gig Order</h3>
          <p className="text-xs text-gray-500 mb-4">Please provide a reason for rejecting this order. The client will be notified.</p>
          <textarea
            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-sm text-gray-900 dark:text-white resize-none outline-none focus:border-red-500 transition-colors"
            rows={4}
            placeholder="e.g., I don't have enough bandwidth right now..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex items-center justify-end gap-3 mt-6">
            <button onClick={() => setIsRejectModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">Cancel</button>
            <button disabled={isProcessing} onClick={handleReject} className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Confirm Reject
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Accept Modal */}
    {isAcceptModalOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-md shadow-xl">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Accept Gig Order</h3>
          <p className="text-xs text-gray-500 mb-4">By accepting this order, a contract will be automatically generated with the milestones specified in this tier.</p>
          
          <label className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 cursor-pointer group">
            <div className="relative flex items-center justify-center mt-0.5">
              <input type="checkbox" className="peer sr-only" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} />
              <div className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-colors"></div>
              <CheckCircle className="w-3 h-3 text-white absolute inset-0 m-auto opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={4} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors">I agree to the platform terms</p>
              <p className="text-[10px] text-gray-500 mt-1">I commit to delivering the requested work according to the milestones and deadlines.</p>
            </div>
          </label>

          <div className="flex items-center justify-end gap-3 mt-6">
            <button onClick={() => setIsAcceptModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">Cancel</button>
            <button disabled={!agreedToTerms || isProcessing} onClick={handleAccept} className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Accept & Start
            </button>
          </div>
        </div>
      </div>
    )}

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

    </div>
  );
};
export default IncomingOrderDetail;
