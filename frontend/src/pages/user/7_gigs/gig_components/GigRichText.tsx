import React, { useState } from "react";
import { 
  X, Star, Clock, Users, ArrowRight, CheckCircle2, Bookmark, Share2, 
  ChevronRight, MapPin, Tag, Box, Layers, PlayCircle, Plus, FileText, Maximize2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { Gig, GigTier } from "../gig_datasets";
import SuccessModal from "@/components/ui/SuccessModal";
import { CreditIcon } from "@/components/ui/credit-icon";

interface GigRichTextProps {
  gig: Gig;
  onClose: () => void;
  layout?: "drawer" | "page";
}

export const GigRichText: React.FC<GigRichTextProps> = ({ gig, onClose, layout = "drawer" }) => {
  const isPage = layout === "page";
  console.log("GigRichText layout mode:", layout, "isPage:", isPage);
  const navigate = useNavigate();
  const [activeTierIdx, setActiveTierIdx] = useState(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const activeTier = gig.tiers[activeTierIdx];

  const handleCheckout = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsCheckoutOpen(false);
      setIsSuccessOpen(true);
    }, 1500);
  };

  const allImages = [gig.thumbnail, ...(gig.gallery || [])].filter(Boolean);

  return (
    <div className={`w-full flex-col relative ${isPage ? "" : "flex h-[calc(100vh-120px)] overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm sticky top-[100px]"}`}>
      
      {/* HEADER */}
      {!isPage && (
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 px-6 py-4 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors lg:hidden"
          >
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 dark:text-white">Service Details</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate(`/gigs/services/${gig.id}/full`)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-500 dark:text-gray-400 group relative"
            title="View Full Page"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-500 dark:text-gray-400">
            <Share2 className="h-4 w-4" />
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-500 dark:text-gray-400">
            <Bookmark className={`h-4 w-4 ${gig.isSaved ? "fill-blue-500 text-blue-500" : ""}`} />
          </button>
          <button onClick={onClose} className="hidden lg:block p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-500 dark:text-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      )}

      {/* SCROLLABLE CONTENT */}
      <div className={`${isPage ? "w-full" : "flex-1 overflow-y-auto custom-scrollbar p-6"}`}>
        <div className={`${isPage ? "flex flex-col lg:flex-row gap-8 items-start" : ""}`}>
          <div className={`${isPage ? "flex-1 min-w-0" : ""}`}>
        
        {/* THUMBNAIL (FIRST ON TOP) */}
        <div className="w-full h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden mb-6 bg-gray-100 dark:bg-white/5 relative border border-gray-200 dark:border-white/10">
          <img src={gig.thumbnail} alt={gig.title} className="w-full h-full object-cover" />
        </div>

        {/* BADGES */}
        <div className="mt-4 flex flex-wrap items-center gap-2 mb-6">
          <span className={`px-2.5 py-1 rounded text-[11px] font-bold border ${gig.status?.toLowerCase() === "closed" ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"}`}>
            {gig.status || "Open"}
          </span>
          <span className="px-2.5 py-1 rounded bg-gray-100 dark:bg-white/5 text-[11px] font-bold text-gray-600 dark:text-zinc-300 border border-gray-200 dark:border-white/10">
            {gig.category}
          </span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-100 dark:bg-white/5 text-[11px] font-medium text-gray-700 dark:text-zinc-300">
            <Clock className="h-3.5 w-3.5 text-gray-500" />
            First Draft: {gig.firstDraftDelivery}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-100 dark:bg-white/5 text-[11px] font-medium text-gray-700 dark:text-zinc-300">
            <Users className="h-3.5 w-3.5 text-gray-500" />
            {gig.slots} Slots
          </div>
        </div>

        {/* TITLE */}
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-6 leading-tight">
          {gig.title}
        </h1>

        {/* AUTHOR & META */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <img src={gig.clientAvatar} alt={gig.postedBy} className="h-12 w-12 rounded-full object-cover border border-gray-200 dark:border-white/10" />
            <div>
              <div className="font-bold text-sm text-gray-900 dark:text-white">{gig.postedBy}</div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                <span className="font-bold text-gray-700 dark:text-zinc-300">{gig.clientRating}</span>
                <span>({gig.ratingCount} reviews)</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:items-end gap-2">
            <div className="text-xs text-gray-500 font-medium">{gig.timeAgo ? `Posted ${gig.timeAgo}` : gig.postedAt ? `Posted ${gig.postedAt}` : "Posted Recently"}</div>
            <button 
              onClick={() => navigate(`/profile/${gig.postedBy}`)} 
              className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              View Profile
            </button>
          </div>
        </div>

        <div className="space-y-10">
          {/* DESCRIPTION */}
          <section>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">About This Service</h3>
            <div className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
              {gig.description}
            </div>
          </section>

          {/* SKILLS */}
          {gig.skills && gig.skills.length > 0 && (
            <section>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Skills Applied</h3>
              <div className="flex flex-wrap gap-2">
                {gig.skills.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-700 dark:text-zinc-300">
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* TERMS OF SERVICE */}
          {gig.termsOfService && (
            <section>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Terms of Service</h3>
              <div className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10">
                {gig.termsOfService}
              </div>
            </section>
          )}

          {/* QUESTIONNAIRES */}
          {gig.questionnaires && gig.questionnaires.length > 0 && (
            <section>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Requirements / Questionnaire</h3>
              <div className="space-y-4 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10">
                {gig.questionnaires.map((q, idx) => (
                  <div key={idx} className="pb-4 border-b border-gray-200 dark:border-white/10 last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <span className="text-blue-500 font-bold text-sm mt-0.5">{idx + 1}.</span>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">{q.question}</h4>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs px-2 py-1 rounded bg-white dark:bg-dark-base border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 font-medium">
                            {q.type === 'file-upload' ? 'File Upload' : q.type === 'multiple-choice' ? 'Multiple Choice' : 'Text Answer'}
                          </span>
                          {q.required && (
                            <span className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-medium">
                              Required
                            </span>
                          )}
                        </div>
                        {q.type === 'multiple-choice' && q.options && (
                          <ul className="mt-3 space-y-2 ml-1">
                            {q.options.map((opt, i) => (
                              <li key={i} className="text-sm text-gray-600 dark:text-zinc-400 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-zinc-500 shrink-0" />
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
            </section>
          )}

          {/* TIERS TABS (DRAWER ONLY) */}
          {!isPage && (
          <section>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Pricing Packages</h3>
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden bg-white dark:bg-dark-base">
              <div className="flex border-b border-gray-200 dark:border-white/10">
                {gig.tiers.map((tier, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveTierIdx(idx)}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                      activeTierIdx === idx 
                        ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500" 
                        : "text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                  >
                    {tier.tierName}
                  </button>
                ))}
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">{activeTier.title}</h4>
                  <span className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-1.5"><CreditIcon className="h-5 w-5 shrink-0 text-yellow-500" />{activeTier.price.toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">{activeTier.description}</p>
                
                <div className="flex items-center gap-4 text-xs font-medium text-gray-700 dark:text-zinc-300 mb-6">
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-gray-400" /> {activeTier.daysOfDelivery} Days Delivery</span>
                  <span className="flex items-center gap-1.5"><PlayCircle className="h-4 w-4 text-gray-400" /> {activeTier.revisions} Revisions</span>
                </div>
                
                <button 
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors shadow-lg shadow-blue-500/20"
                >
                  Continue ({activeTier.price.toLocaleString()} Credits)
                </button>
              </div>
            </div>
            {gig.additionalWorkRate > 0 && (
              <p className="text-[10px] text-gray-500 mt-2 text-center">
                * Additional work outside of scope will be billed with a {gig.additionalWorkRate}% markup.
              </p>
            )}
          </section>
          )}

          {/* SUPPORTING IMAGES */}
          {gig.gallery && gig.gallery.length > 0 && (
            <section>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Supporting Images</h3>
              <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-4 snap-x">
                {gig.gallery.map((img, idx) => (
                  <div key={idx} className="h-40 sm:h-56 min-w-[70%] sm:min-w-[45%] shrink-0 rounded-xl overflow-hidden snap-center relative bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                    <img src={img} alt={`Gallery ${idx}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </section>
          )}



          {/* MILESTONES */}
          {gig.milestones && gig.milestones.length > 0 && (
            <section>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Project Milestones</h3>
              <div className="space-y-4">
                {gig.milestones.map((m, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </div>
                      {idx < gig.milestones.length - 1 && <div className="w-[2px] h-full bg-gray-200 dark:bg-white/10 mt-1" />}
                    </div>
                    <div className="pb-4">
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1">{m.name}</h4>
                      <p className="text-xs text-gray-600 dark:text-zinc-400">{m.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* REQUIREMENTS */}
          {gig.questionnaires && gig.questionnaires.length > 0 && (
            <section>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Requirements</h3>
              <div className="space-y-2">
                {gig.questionnaires.map((q, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                    <p className="text-xs font-medium text-gray-800 dark:text-zinc-200"><span className="text-gray-400 mr-2">{idx + 1}.</span> {q.question}</p>
                    <div className="mt-2 text-[10px] font-bold text-gray-500 uppercase flex gap-2">
                      <span className="bg-gray-200 dark:bg-white/10 px-1.5 py-0.5 rounded">{q.type}</span>
                      {q.required && <span className="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">Required</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        </div>

        {/* TIERS TABS (PAGE SIDEBAR) */}
        {isPage && (
        <div className="w-full lg:w-[400px] shrink-0 sticky top-32 space-y-6">
          <section>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Pricing Packages</h3>
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden bg-white dark:bg-dark-base shadow-sm">
              <div className="flex border-b border-gray-200 dark:border-white/10">
                {gig.tiers.map((tier, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveTierIdx(idx)}
                    className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-colors ${
                      activeTierIdx === idx 
                        ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500" 
                        : "text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                  >
                    {tier.tierName}
                  </button>
                ))}
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">{activeTier.title}</h4>
                  <span className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-1.5"><CreditIcon className="h-5 w-5 shrink-0 text-yellow-500" />{activeTier.price.toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">{activeTier.description}</p>
                
                <div className="flex flex-col gap-3 text-xs font-medium text-gray-700 dark:text-zinc-300 mb-6">
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-gray-400" /> {activeTier.daysOfDelivery} Days Delivery</span>
                  <span className="flex items-center gap-1.5"><PlayCircle className="h-4 w-4 text-gray-400" /> {activeTier.revisions} Revisions</span>
                </div>
                
                <button 
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors shadow-lg shadow-blue-500/20"
                >
                  Continue ({activeTier.price.toLocaleString()} Credits)
                </button>
              </div>
            </div>
            {gig.additionalWorkRate > 0 && (
              <p className="text-[11px] text-gray-500 mt-3 text-center">
                * Additional work outside of scope will be billed with a {gig.additionalWorkRate}% markup.
              </p>
            )}
          </section>
        </div>
        )}
      </div>

      {/* Padding for action bar */}
      {!isPage && <div className="h-24"></div>}
    </div>

      {/* ACTION BAR (MOBILE ONLY) */}
      {!isPage && (
      <div className="lg:hidden absolute bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-t border-gray-200 dark:border-white/10 flex justify-between items-center gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Selected: {activeTier.tierName}</span>
          <span className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-1.5"><CreditIcon className="h-4 w-4 shrink-0 text-yellow-500" />{activeTier.price.toLocaleString()}</span>
        </div>
        <button 
          onClick={() => setIsCheckoutOpen(true)}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors shadow-lg shadow-blue-500/20"
        >
          Order Now
        </button>
      </div>
      )}

      {/* CHECKOUT MODAL */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-white dark:bg-dark-surface rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-start shrink-0">
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">Order Request</h2>
                  <p className="text-xs font-medium text-gray-500 mt-1">You don't have to pay right away. This simply calculates the estimated price.</p>
                </div>
                <button onClick={() => setIsCheckoutOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white bg-gray-100 dark:bg-white/5 p-2 rounded-full transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                
                {/* 1. Project Brief */}
                <section>
                  <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">1. Project Brief <span className="text-red-500">*</span></label>
                  <textarea 
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] resize-none"
                    placeholder="Describe what you need done in detail..."
                  />
                </section>

                {/* 2. Questionnaires */}
                {gig.questionnaires && gig.questionnaires.length > 0 && (
                  <section className="space-y-4">
                    <label className="block text-sm font-bold text-gray-900 dark:text-white mb-1">2. Requirements</label>
                    {gig.questionnaires.map((q, idx) => (
                      <div key={idx} className="space-y-3 p-5 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-dark-base shadow-sm">
                        <p className="text-sm font-bold text-gray-800 dark:text-zinc-200"><span className="text-red-500 mr-1">{q.required ? "*" : ""}</span>{idx + 1}. {q.question}</p>
                        {q.type === "multiple-choice" ? (
                           <select className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                             <option value="">Select an option</option>
                             {q.options?.map((opt, oIdx) => <option key={oIdx} value={opt}>{opt}</option>)}
                           </select>
                        ) : q.type === "file-upload" ? (
                           <div className="flex items-center gap-2 mt-2">
                             <input type="file" className="text-xs file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 dark:file:bg-blue-500/10 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 cursor-pointer" />
                           </div>
                        ) : (
                           <textarea className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Your answer..." rows={2}></textarea>
                        )}
                      </div>
                    ))}
                  </section>
                )}

                {/* 3. Tier Summary */}
                <section>
                  <label className="block text-sm font-bold text-gray-900 dark:text-white mb-3">Order Summary</label>
                  <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl p-5">
                    <div className="flex gap-4 items-center pb-4 border-b border-gray-200 dark:border-white/10 mb-4">
                      <img src={gig.thumbnail} alt="" className="h-12 w-12 rounded-lg object-cover" />
                      <div>
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">{gig.title}</h3>
                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">{activeTier.tierName} Package</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-600 dark:text-zinc-400">Delivery Time</span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">{activeTier.daysOfDelivery} Days</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-600 dark:text-zinc-400">Revisions</span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">{activeTier.revisions}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-600 dark:text-zinc-400">Base Price</span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">{activeTier.price.toLocaleString()} Credits</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-600 dark:text-zinc-400">Platform Fee (5%)</span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">{(activeTier.price * 0.05).toLocaleString()} Credits</span>
                      </div>
                      
                      <div className="h-px w-full bg-gray-200 dark:bg-white/10 my-3" />
                      
                      <div className="flex justify-between items-center">
                        <span className="text-base font-black text-gray-900 dark:text-white">Estimated Total</span>
                        <span className="text-lg font-black text-blue-600 dark:text-blue-400 flex items-center gap-1.5"><CreditIcon className="h-5 w-5 shrink-0 text-yellow-500" />{(activeTier.price * 1.05).toLocaleString()} Credits</span>
                      </div>
                    </div>
                  </div>
                </section>

              </div>

              <div className="p-6 border-t border-gray-100 dark:border-white/5 shrink-0 bg-white dark:bg-dark-base">
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                      Processing...
                    </>
                  ) : (
                    "Submit Order Request"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SuccessModal
        isOpen={isSuccessOpen}
        message="Order Successfully Sent"
        onConfirm={() => setIsSuccessOpen(false)}
      />
    </div>
  );
};
