import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Users, Star, MousePointerClick, User, PlayCircle, Bookmark, Edit2, ShoppingCart, Flag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Gig } from "../gig_datasets";
import { CreditIcon } from "@/components/ui/credit-icon";
import PopupReportGig from "./PopupReportGig";

interface GigViewDetailsProps {
  selectedGig: Gig | null;
  onClose: () => void;
  onReportGig?: (gig: Gig) => void;
  onToggleSave?: (gigId: string) => void;
}

const GigViewDetails: React.FC<GigViewDetailsProps> = ({ selectedGig, onClose, onReportGig, onToggleSave }) => {
  const navigate = useNavigate();
  const [activeTierIdx, setActiveTierIdx] = useState(0);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const activeTier = selectedGig?.tiers[activeTierIdx];

  const handleOpenCheckout = () => {
    if (selectedGig?.hasPendingOrder && selectedGig?.pendingOrderId) {
      navigate(`/gigs/orders/sent/${selectedGig.pendingOrderId}`);
    } else {
      navigate(`/gigs/services/${selectedGig?.id}/order`, { state: { tierIndex: activeTierIdx } });
    }
  };

  const handleViewProfile = () => {
    if (!selectedGig) return;

    if (selectedGig.isOwnGig) {
      navigate("/profile");
      return;
    }

    const creatorId =
      selectedGig.client_account_id ||
      selectedGig.creator_account_id ||
      selectedGig.freelancerAccountId ||
      (selectedGig as any).account_id ||
      (selectedGig as any).accountId ||
      (selectedGig as any).user_id ||
      (selectedGig as any).userId ||
      (selectedGig as any).account?.account_id ||
      (selectedGig as any).creator?.account_id ||
      (selectedGig as any).user?.account_id;

    if (creatorId) {
      navigate(`/profile/${creatorId}`);
    } else {
      console.warn("Could not find creator account ID on gig object:", selectedGig);
    }
  };

  const handleTriggerReport = () => {
    if (onReportGig && selectedGig) {
      onReportGig(selectedGig);
    } else {
      setIsReportModalOpen(true);
    }
  };

  const hasValidAvatar = selectedGig?.clientAvatar && !selectedGig.clientAvatar.includes('pravatar.cc');

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] transition-opacity flex items-center justify-start pl-8 ${
          selectedGig ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      >
        {selectedGig && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 text-xs font-medium animate-pulse backdrop-blur-md">
            <MousePointerClick className="h-3.5 w-3.5 text-gray-500 dark:text-zinc-400" />
            <span>Click anywhere outside to close</span>
          </div>
        )}
      </div>

      <div
        className={`fixed right-0 top-0 bottom-0 w-full md:w-[500px] lg:w-[560px] bg-white dark:bg-dark-surface border-l border-gray-200 dark:border-white/10 z-[101] shadow-2xl flex flex-col transition-transform duration-300 ${
          selectedGig ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedGig && (
          <>
            <div className="relative h-48 shrink-0 bg-dark-base border-b border-gray-100 dark:border-white/5">
              <img
                src={selectedGig.thumbnail}
                alt=""
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-dark-surface via-transparent to-transparent" />

              {onToggleSave && (
                <button
                  title="Save Gig"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSave(selectedGig.id);
                  }}
                  className={`absolute top-4 right-4 rounded-full p-2 backdrop-blur-sm transition z-10 ${
                    selectedGig.isSaved
                      ? "bg-black/50 text-yellow-500 hover:bg-black/70"
                      : "bg-black/50 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white hover:bg-black/70"
                  }`}
                >
                  <Bookmark className={`h-4 w-4 ${selectedGig.isSaved ? "fill-current" : ""}`} />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5 thin-scrollbar">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`relative overflow-hidden px-2 py-0.5 rounded text-[10px] font-bold border ${
                        selectedGig.status?.toLowerCase() === "open" || !selectedGig.status
                          ? "bg-emerald-100 text-emerald-700 border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.25)] dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40"
                          : "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                      }`}
                    >
                      <span className="relative z-10">{selectedGig.status || "Open"}</span>
                      {(selectedGig.status?.toLowerCase() === "open" || !selectedGig.status) && (
                        <span className="absolute inset-0 -translate-x-full animate-badge-shine bg-gradient-to-r from-transparent via-emerald-400/40 dark:via-emerald-400/30 to-transparent" />
                      )}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300">
                      {selectedGig.category}
                    </span>
                    {selectedGig.tiers && selectedGig.tiers.length > 0 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-zinc-300">
                        {selectedGig.tiers.length} Tiers
                      </span>
                    )}
                  </div>

                  {!selectedGig.isOwnGig && (
                    <button
                      type="button"
                      title="Report Gig"
                      onClick={handleTriggerReport}
                      className="p-1.5 rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 hover:text-red-400 transition border border-gray-200 dark:border-white/10 flex items-center gap-1 text-xs"
                    >
                      <Flag className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-medium">Report</span>
                    </button>
                  )}
                </div>

                <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-snug mb-1">
                  {selectedGig.title}
                </h2>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-zinc-500 mt-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-gray-500 dark:text-zinc-500" />
                    <span>First Draft: {selectedGig.firstDraftDelivery}</span>
                  </div>
                </div>
              </div>

              {/* Tiers Tabs */}
              {selectedGig.tiers && selectedGig.tiers.length > 0 && activeTier && (
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400">
                    Pricing Packages
                  </h4>
                  <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden bg-white dark:bg-dark-base shadow-sm">
                    <div className="flex border-b border-gray-200 dark:border-white/10">
                      {selectedGig.tiers.map((tier, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveTierIdx(idx)}
                          className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                            activeTierIdx === idx 
                              ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500" 
                              : "text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-white/5"
                          }`}
                        >
                          {tier.tierName}
                        </button>
                      ))}
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.div 
                        key={activeTierIdx}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                        className="p-4"
                      >
                        <div className="mb-2">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                            {activeTier.title}
                          </h4>
                          <div className="mt-1 flex items-center gap-1.5 text-base font-black text-yellow-500">
                            <CreditIcon className="h-4 w-4 shrink-0 text-yellow-500" />
                            <span>{activeTier.price?.toLocaleString()}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-zinc-400 mb-4">{activeTier.description}</p>

                        <div className="flex items-center gap-4 text-[11px] font-medium text-gray-700 dark:text-zinc-300">
                          <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-gray-400" /> {activeTier.daysOfDelivery} Days Delivery</span>
                          <span className="flex items-center gap-1.5"><PlayCircle className="h-3.5 w-3.5 text-gray-400" /> {activeTier.revisions} Revisions</span>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400">
                  About This Service
                </h4>
                <div
                  className="bg-white/[0.01] border border-gray-100 dark:border-white/5 p-3.5 rounded-xl text-[13px] text-gray-600 dark:text-zinc-300 leading-relaxed max-w-none prose prose-sm dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: selectedGig.description.replace(/\n/g, "<br/>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>") }}
                />
              </div>

              {/* Skills Applied */}
              {selectedGig.skills && selectedGig.skills.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400">
                    Skills Applied
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedGig.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded-md bg-gray-100 dark:bg-zinc-800/80 border border-gray-200 dark:border-white/10 text-[11px] font-semibold text-gray-700 dark:text-zinc-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Terms of Service */}
              {selectedGig.termsOfService && (
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400">
                    Terms of Service
                  </h4>
                  <div className="bg-white/[0.01] border border-gray-100 dark:border-white/5 p-3.5 rounded-xl text-[13px] text-gray-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                    {selectedGig.termsOfService}
                  </div>
                </div>
              )}

              {/* Milestones */}
              {selectedGig.milestones && selectedGig.milestones.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400">
                    Project Milestones
                  </h4>
                  <div className="space-y-3 bg-white/[0.01] border border-gray-100 dark:border-white/5 p-3.5 rounded-xl">
                    {selectedGig.milestones.map((m, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex flex-col items-center mt-0.5">
                          <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[10px]">
                            {idx + 1}
                          </div>
                          {idx < selectedGig.milestones.length - 1 && <div className="w-[1.5px] h-full bg-gray-200 dark:bg-white/10 mt-1" />}
                        </div>
                        <div className="pb-2">
                          <h4 className="font-bold text-gray-900 dark:text-white text-[13px]">{m.name}</h4>
                          <p className="text-[11px] text-gray-600 dark:text-zinc-400 mt-0.5">{m.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Questionnaire */}
              {selectedGig.questionnaires && selectedGig.questionnaires.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400">
                    Requirements / Questionnaire
                  </h4>
                  <div className="space-y-3 bg-white/[0.01] border border-gray-100 dark:border-white/5 p-3.5 rounded-xl">
                    {selectedGig.questionnaires.map((q, idx) => (
                      <div key={idx} className="pb-3 border-b border-gray-100 dark:border-white/5 last:border-0 last:pb-0">
                        <div className="flex items-start gap-2">
                          <span className="text-blue-500 font-bold text-[13px]">{idx + 1}.</span>
                          <div>
                            <h4 className="font-bold text-gray-900 dark:text-white text-[13px]">{q.question}</h4>
                            <div className="flex gap-2 mt-1.5">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-500 font-medium">
                                {(q.type === 'attachment' || q.type === 'file' || q.type === 'file-upload') ? 'File Upload' : (q.type === 'multiple_choice' || q.type === 'choice' || q.type === 'multiple-choice') ? 'Multiple Choice' : 'Text Answer'}
                              </span>
                              {(q.required || q.isRequired) && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-medium">
                                  Required
                                </span>
                              )}
                            </div>
                            {(q.type === 'multiple_choice' || q.type === 'choice' || q.type === 'multiple-choice') && q.options && (
                              <ul className="mt-2.5 space-y-1.5 ml-1">
                                {q.options.map((opt, i) => (
                                  <li key={i} className="text-[12px] text-gray-600 dark:text-zinc-400 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-zinc-600 shrink-0" />
                                    {opt}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Action Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shrink-0 space-y-3">
              {/* Creator Profile Card */}
              <div className="p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative h-9 w-9 shrink-0">
                    <img
                      src={hasValidAvatar ? selectedGig.clientAvatar : undefined}
                      alt=""
                      className={`h-9 w-9 rounded-full object-cover border border-gray-200 dark:border-white/10 ${!hasValidAvatar ? 'hidden' : ''}`}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback) {
                          fallback.classList.remove('hidden');
                          fallback.classList.add('flex');
                        }
                      }}
                    />
                    <div className={`${hasValidAvatar ? 'hidden' : 'flex'} absolute inset-0 items-center justify-center rounded-full bg-gray-200 dark:bg-zinc-800 text-xs text-gray-700 dark:text-white font-bold border border-gray-200 dark:border-white/10 overflow-hidden`}>
                      {selectedGig.postedBy ? selectedGig.postedBy.charAt(0) : "U"}
                    </div>
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight truncate mb-1">
                      {selectedGig.postedBy}
                    </p>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-zinc-400">
                        <span>Freelancer Rating:</span>
                        <div className="flex items-center gap-0.5 font-medium text-gray-700 dark:text-zinc-200">
                          <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                          <span>{selectedGig.clientRating} ({selectedGig.ratingCount})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-zinc-400">
                        <span>Service Rating:</span>
                        <div className="flex items-center gap-0.5 font-medium text-gray-700 dark:text-zinc-200">
                          <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                          <span>{selectedGig.ratingCount > 0 ? `${selectedGig.clientRating} (${selectedGig.ratingCount})` : "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleViewProfile}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:text-white transition shrink-0"
                >
                  <User className="h-3.5 w-3.5 text-blue-400" />
                  <span>View Profile</span>
                </button>
              </div>

              {selectedGig.isOwnGig ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigate(`/gigs/services/${selectedGig.id}/page`);
                    }}
                    className="px-4 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-white/5 py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-white/10 transition active:scale-[0.98] shrink-0 border border-gray-200 dark:border-white/10"
                  >
                    View Full
                  </button>
                  <button
                    onClick={() => navigate(`/gigs/edit/${selectedGig.id}`)}
                    className="p-3 aspect-square flex items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition shrink-0"
                    title="Edit Service"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate('/gigs/orders')}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-white/10 py-3 text-xs font-bold text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-zinc-700 transition"
                  >
                    <ShoppingCart className="h-4 w-4 text-blue-400" /> Manage Orders
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                        <ShoppingCart className="h-3.5 w-3.5 text-gray-400" />
                        <span>{selectedGig.ordersCount || 0} Orders</span>
                      </div>
                      <span className="text-gray-300 dark:text-zinc-700">•</span>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                        <Users className="h-3.5 w-3.5 text-gray-400" />
                        <span>{selectedGig.slots} Slots Available</span>
                      </div>
                    </div>
                    <span className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-1.5"><CreditIcon className="h-4 w-4 shrink-0 text-yellow-500" />{activeTier?.price?.toLocaleString() || "0"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigate(`/gigs/services/${selectedGig.id}/page`);
                      }}
                      className="px-4 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-white/5 py-3 text-xs font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-white/10 transition active:scale-[0.98] shrink-0 border border-gray-200 dark:border-white/10"
                    >
                      View Full
                    </button>
                    <button
                      onClick={handleOpenCheckout}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 text-xs font-bold text-white hover:bg-blue-600 transition shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                    >
                      {selectedGig.hasPendingOrder ? "View My Order" : `Order ${activeTier?.tierName || "Package"}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Popup Report Modal */}
      <PopupReportGig
        isOpen={isReportModalOpen}
        gigTitle={selectedGig?.title}
        onClose={() => setIsReportModalOpen(false)}
        onSubmitReport={(reason, details) => {
          console.log("Report submitted for gig:", selectedGig?.id, reason, details);
        }}
      />

      <style>{`
        .thin-scrollbar::-webkit-scrollbar { width: 5px; }
        .thin-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 9999px; }
        .thin-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.25); }
        .thin-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </>
  );
};

export default GigViewDetails;