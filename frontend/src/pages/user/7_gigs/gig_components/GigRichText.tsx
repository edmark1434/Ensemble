import React, { useState } from "react";
import { 
  X, Star, Clock, Users, ArrowRight, CheckCircle2, Bookmark, Share2, 
  ChevronRight, MapPin, Tag, Box, Layers, PlayCircle, Plus, FileText, Maximize2, Edit2, Flag
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { Gig, GigTier } from "../gig_datasets";
import SuccessModal from "@/components/ui/SuccessModal";
import { CreditIcon } from "@/components/ui/credit-icon";
import api from "@/lib/axios";

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
            First Draft: {gig.firstDraftDelivery || (gig.tiers && gig.tiers.length > 0 ? `${gig.tiers[0].daysOfDelivery} Days` : 'N/A')}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-100 dark:bg-white/5 text-[11px] font-medium text-gray-700 dark:text-zinc-300">
            <Users className="h-3.5 w-3.5 text-gray-500" />
            {gig.slots} Slots
          </div>
        </div>

        {/* TITLE & ACTIONS */}
        <div className="flex justify-between items-start gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight">
            {gig.title}
          </h1>
          <div className="flex shrink-0">
            {gig.isOwnGig ? (
              <button
                onClick={() => navigate(`/gigs/edit/${gig.id}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs hover:bg-blue-500/20 transition-colors"
                title="Edit Service"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit Service
              </button>
            ) : (
              <button
                onClick={() => navigate(`/support/report?type=gig&id=${gig.id}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-600 dark:text-zinc-400 font-bold text-xs hover:bg-gray-50 dark:hover:bg-white/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title="Report Service"
              >
                <Flag className="h-3.5 w-3.5" />
                Report Gig
              </button>
            )}
          </div>
        </div>

        {/* THUMBNAIL (FIRST ON TOP) */}
        <div className="w-full h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden mb-6 bg-gray-100 dark:bg-white/5 relative border border-gray-200 dark:border-white/10">
          <img src={gig.thumbnail} alt={gig.title} className="w-full h-full object-cover" />
        </div>

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
            <div
              className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed max-w-none prose prose-sm dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: gig.description.replace(/\n/g, "<br/>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>") }}
            />
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
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">{activeTier?.title}</h4>
                  <span className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-1.5"><CreditIcon className="h-5 w-5 shrink-0 text-yellow-500" />{activeTier?.price?.toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">{activeTier?.description}</p>

                <div className="flex items-center gap-4 text-xs font-medium text-gray-700 dark:text-zinc-300 mb-6">
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-gray-400" /> {activeTier?.daysOfDelivery} Days Delivery</span>
                  <span className="flex items-center gap-1.5"><PlayCircle className="h-4 w-4 text-gray-400" /> {activeTier?.revisions} Revisions</span>
                </div>

                <button
                  onClick={() => navigate(`/gigs/services/${gig.id}/order`, { state: { tierIndex: activeTierIdx } })}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors shadow-lg shadow-blue-500/20"
                >
                  Continue ({activeTier?.price?.toLocaleString()} Credits)
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

          {/* QUESTIONNAIRES (MOVED TO LAST) */}
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
                            {(q.type === 'attachment' || q.type === 'file' || q.type === 'file-upload') ? 'File Upload' : (q.type === 'multiple_choice' || q.type === 'choice' || q.type === 'multiple-choice') ? 'Multiple Choice' : 'Text Answer'}
                          </span>
                          {(q.required || q.isRequired) && (
                            <span className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-medium">
                              Required
                            </span>
                          )}
                        </div>
                        {(q.type === 'multiple_choice' || q.type === 'choice' || q.type === 'multiple-choice') && q.options && (
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
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">{activeTier?.title}</h4>
                  <span className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-1.5"><CreditIcon className="h-5 w-5 shrink-0 text-yellow-500" />{activeTier?.price?.toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">{activeTier?.description}</p>

                <div className="flex flex-col gap-3 text-xs font-medium text-gray-700 dark:text-zinc-300 mb-6">
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-gray-400" /> {activeTier?.daysOfDelivery} Days Delivery</span>
                  <span className="flex items-center gap-1.5"><PlayCircle className="h-4 w-4 text-gray-400" /> {activeTier?.revisions} Revisions</span>
                </div>

                <button
                  onClick={() => navigate(`/gigs/services/${gig.id}/order`, { state: { tierIndex: activeTierIdx } })}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors shadow-lg shadow-blue-500/20"
                >
                  Continue ({activeTier?.price?.toLocaleString()} Credits)
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
          <span className="text-xs text-gray-500">Selected: {activeTier?.tierName}</span>
          <span className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-1.5"><CreditIcon className="h-4 w-4 shrink-0 text-yellow-500" />{activeTier?.price?.toLocaleString()}</span>
        </div>
        <button
          onClick={() => navigate(`/gigs/services/${gig.id}/order`, { state: { tierIndex: activeTierIdx } })}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors shadow-lg shadow-blue-500/20"
        >
          Order Now
        </button>
      </div>
      )}

    </div>
  );
};

export default GigRichText;