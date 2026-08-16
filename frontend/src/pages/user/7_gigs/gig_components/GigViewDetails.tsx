import React, { useState } from "react";
import { Clock, Users, Star, Send, MousePointerClick, User, FileText, PlayCircle, MapPin, Tag, Box, Layers, Bookmark } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Gig } from "../gig_datasets";
import { AnimatePresence, motion } from "framer-motion";
import SuccessModal from "@/components/ui/SuccessModal";
import { CreditIcon } from "@/components/ui/credit-icon";

interface GigViewDetailsProps {
  selectedGig: Gig | null;
  onClose: () => void;
  onReportGig?: (gig: Gig) => void;
  onToggleSave?: (gigId: string) => void;
}

const GigViewDetails: React.FC<GigViewDetailsProps> = ({ selectedGig, onClose, onReportGig, onToggleSave }) => {
  const navigate = useNavigate();
  const [activeTierIdx, setActiveTierIdx] = useState(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const activeTier = selectedGig?.tiers[activeTierIdx];

  const handleCheckout = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsCheckoutOpen(false);
      setIsSuccessOpen(true);
    }, 1500);
  };

  const handleViewProfile = () => {
    if (!selectedGig) return;
    navigate(`/profile/${selectedGig.postedBy}`); // Placeholder logic
  };

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
        className={`fixed right-0 top-0 bottom-0 w-full md:w-[500px] lg:w-[560px] bg-white dark:bg-[#0d0f1a] border-l border-gray-200 dark:border-white/10 z-[101] shadow-2xl flex flex-col transition-transform duration-300 ${
          selectedGig ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedGig && activeTier && (
          <>
            <div className="relative h-48 shrink-0 bg-zinc-950 border-b border-gray-100 dark:border-white/5">
              <img
                src={selectedGig.thumbnail}
                alt=""
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#0d0f1a] via-transparent to-transparent" />
              
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
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        selectedGig.status?.toLowerCase() === "open" || !selectedGig.status
                          ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                          : "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20"
                      }`}
                    >
                      {selectedGig.status || "Open"}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300">
                      {selectedGig.category}
                    </span>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-snug mb-1">
                  {selectedGig.title}
                </h2>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-zinc-500 mt-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-gray-500 dark:text-zinc-500" />
                    <span>First Draft: {selectedGig.firstDraftDelivery}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3 w-3 text-gray-500 dark:text-zinc-500" />
                    <span>{selectedGig.slots} Slots Available</span>
                  </div>
                </div>
              </div>

              {/* Tiers Tabs */}
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400">
                  Pricing Packages
                </h4>
                <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden bg-white dark:bg-[#080a12] shadow-sm">
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
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">{activeTier.title}</h4>
                      <span className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-1.5"><CreditIcon className="h-4 w-4 shrink-0 text-yellow-500" />{activeTier.price.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-zinc-400 mb-4">{activeTier.description}</p>
                    
                    <div className="flex items-center gap-4 text-[11px] font-medium text-gray-700 dark:text-zinc-300">
                      <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-gray-400" /> {activeTier.daysOfDelivery} Days Delivery</span>
                      <span className="flex items-center gap-1.5"><PlayCircle className="h-3.5 w-3.5 text-gray-400" /> {activeTier.revisions} Revisions</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400">
                  About This Service
                </h4>
                <div className="bg-white/[0.01] border border-gray-100 dark:border-white/5 p-3.5 rounded-xl text-[13px] text-gray-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                  {selectedGig.description}
                </div>
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

              {/* Client Profile Card */}
              <div className="p-3.5 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {selectedGig.clientAvatar ? (
                    <img src={selectedGig.clientAvatar} alt="" className="h-8 w-8 rounded-full object-cover border border-gray-200 dark:border-white/10 shrink-0" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-zinc-800 flex items-center justify-center text-xs text-gray-700 dark:text-white font-bold border border-gray-200 dark:border-white/10 shrink-0">
                      {selectedGig.postedBy.charAt(0)}
                    </div>
                  )}
                  <div className="text-left min-w-0">
                    <p className="text-[9px] uppercase text-gray-500 dark:text-zinc-500 font-bold tracking-wider">
                      Service Creator
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight truncate">
                        {selectedGig.postedBy}
                      </p>
                      <div className="flex items-center gap-1 rounded-md bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-zinc-400 border border-gray-100 dark:border-white/5 shrink-0">
                        <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                        <span>{selectedGig.clientRating} ({selectedGig.ratingCount})</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleViewProfile}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:text-white transition shrink-0"
                >
                  <User className="h-3.5 w-3.5 text-blue-400" />
                  <span>View Profile</span>
                </button>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a] shrink-0 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] text-gray-500">Total</span>
                <span className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-1.5"><CreditIcon className="h-4 w-4 shrink-0 text-yellow-500" />{activeTier.price.toLocaleString()}</span>
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
                  onClick={() => setIsCheckoutOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 text-xs font-bold text-white hover:bg-blue-600 transition shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                >
                  Order {activeTier.tierName} Package
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        .thin-scrollbar::-webkit-scrollbar { width: 5px; }
        .thin-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 9999px; }
        .thin-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.25); }
        .thin-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      {/* Checkout Modal */}
      {selectedGig && activeTier && (
        <AnimatePresence>
          {isCheckoutOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm bg-white dark:bg-[#0d0f1a] rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-2xl"
              >
                <div className="p-5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Confirm Order</h2>
                </div>
                <div className="p-5 space-y-5">
                  <div className="flex gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                    <img src={selectedGig.thumbnail} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    <div>
                      <h3 className="font-bold text-xs text-gray-900 dark:text-white line-clamp-2">{selectedGig.title}</h3>
                      <p className="text-[10px] text-gray-500 mt-0.5">{activeTier.tierName} Package</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-zinc-400">Subtotal</span>
                      <span className="font-bold text-gray-900 dark:text-white">{activeTier.price.toLocaleString()} Credits</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-zinc-400">Platform Fee (5%)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{(activeTier.price * 0.05).toLocaleString()} Credits</span>
                    </div>
                    <div className="h-px w-full bg-gray-200 dark:bg-white/10 my-2" />
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-gray-900 dark:text-white">Total</span>
                      <span className="font-black text-blue-600 dark:text-blue-400">{(activeTier.price * 1.05).toLocaleString()} Credits</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setIsCheckoutOpen(false)} disabled={isProcessing} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300 font-bold text-xs hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleCheckout} disabled={isProcessing} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 flex justify-center items-center gap-2">
                      {isProcessing ? "Processing..." : "Pay with Credits"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <SuccessModal
        isOpen={isSuccessOpen}
        message="Your order has been placed! The seller will reach out to you shortly via messages."
        onConfirm={() => {
          setIsSuccessOpen(false);
          onClose(); // Close drawer on success
        }}
      />
    </>
  );
};

export default GigViewDetails;
