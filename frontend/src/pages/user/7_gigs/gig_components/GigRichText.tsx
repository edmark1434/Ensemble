import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Star, Clock, Users, Bookmark, Share2,
  ChevronRight, ChevronLeft, ChevronDown, PlayCircle, Edit2, Flag, Maximize2, User, FileText, CheckCircle2, HelpCircle, Wrench, MessageSquare, ZoomIn, ShoppingCart
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { Gig } from "../gig_datasets";
import { CreditIcon } from "@/components/ui/credit-icon";
import PopupReportGig from "./PopupReportGig";
import { GigsOtherServices } from "./gigs_other_services";
import useGlobalState from "@/lib/global_state";

interface GigRichTextProps {
  gig?: Gig | null;
  isLoading?: boolean;
  onClose: () => void;
  layout?: "drawer" | "page";
  onReportGig?: (gig: Gig) => void;
}

export const GigRichText: React.FC<GigRichTextProps> = ({
  gig,
  isLoading = false,
  onClose,
  layout = "drawer",
  onReportGig
}) => {
  const isPage = layout === "page";
  const navigate = useNavigate();
  const user = useGlobalState(state => state.user);
  const [activeTierIdx, setActiveTierIdx] = useState(0);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const isOwner = gig?.isOwnGig;

  // Lightbox Modal state
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);

  // Default: Only Terms of Service is expanded
  const [isMilestonesOpen, setIsMilestonesOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(true);
  const [isQuestionnairesOpen, setIsQuestionnairesOpen] = useState(false);

  // Compile all images for next/prev lightbox switching
  const allImages = React.useMemo(() => {
    if (!gig) return [];
    const list: string[] = [];
    if (gig.thumbnail) list.push(gig.thumbnail);
    if (gig.gallery && Array.isArray(gig.gallery)) {
      gig.gallery.forEach((img) => {
        if (img && !list.includes(img)) list.push(img);
      });
    }
    return list;
  }, [gig]);

  const handlePrevLightbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeLightboxImg) return;
    const currentIndex = allImages.indexOf(activeLightboxImg);
    const prevIndex = (currentIndex - 1 + allImages.length) % allImages.length;
    setActiveLightboxImg(allImages[prevIndex]);
  };

  const handleNextLightbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeLightboxImg) return;
    const currentIndex = allImages.indexOf(activeLightboxImg);
    const nextIndex = (currentIndex + 1) % allImages.length;
    setActiveLightboxImg(allImages[nextIndex]);
  };

  // Keyboard navigation for lightbox
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeLightboxImg) return;
      if (e.key === "Escape") setActiveLightboxImg(null);
      if (e.key === "ArrowLeft") {
        const currentIndex = allImages.indexOf(activeLightboxImg);
        const prevIndex = (currentIndex - 1 + allImages.length) % allImages.length;
        setActiveLightboxImg(allImages[prevIndex]);
      }
      if (e.key === "ArrowRight") {
        const currentIndex = allImages.indexOf(activeLightboxImg);
        const nextIndex = (currentIndex + 1) % allImages.length;
        setActiveLightboxImg(allImages[nextIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeLightboxImg, allImages]);

  // SKELETON PLACEHOLDER VIEW
  if (isLoading || !gig) {
    return (
      <div className={`w-full flex-col relative ${isPage ? "" : "flex h-[calc(100vh-120px)] overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm sticky top-[100px]"}`}>
        {!isPage && (
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 px-6 py-4">
            <div className="h-4 w-28 rounded-md bg-gray-200 dark:bg-zinc-800 animate-pulse" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-zinc-800 animate-pulse" />
              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-zinc-800 animate-pulse" />
            </div>
          </div>
        )}

        <div className={`${isPage ? "w-full" : "flex-1 overflow-y-auto custom-scrollbar p-6"}`}>
          <div className={`${isPage ? "flex flex-col lg:flex-row gap-8 items-start" : ""}`}>
            {/* Left Column Skeleton */}
            <div className={`${isPage ? "flex-1 min-w-0" : ""} space-y-6`}>
              {/* Badges Skeleton */}
              <div className="flex items-center gap-2 pt-2">
                <div className="h-6 w-14 rounded bg-gray-200 dark:bg-zinc-800 animate-pulse" />
                <div className="h-6 w-20 rounded bg-gray-200 dark:bg-zinc-800 animate-pulse" />
                <div className="h-6 w-28 rounded bg-gray-200 dark:bg-zinc-800 animate-pulse" />
                <div className="h-6 w-16 rounded bg-gray-200 dark:bg-zinc-800 animate-pulse" />
              </div>

              {/* Title Skeleton */}
              <div className="space-y-2">
                <div className="h-8 w-3/4 rounded-xl bg-gray-200 dark:bg-zinc-800 animate-pulse" />
                <div className="h-8 w-1/2 rounded-xl bg-gray-200 dark:bg-zinc-800 animate-pulse" />
              </div>

              {/* Thumbnail Skeleton */}
              <div className="w-full h-64 sm:h-80 md:h-96 rounded-2xl bg-gray-200 dark:bg-zinc-800/80 animate-pulse" />

              {/* Supporting Images Skeleton */}
              <div className="space-y-2">
                <div className="h-4 w-32 rounded bg-gray-200 dark:bg-zinc-800 animate-pulse" />
                <div className="flex gap-2.5">
                  <div className="h-24 sm:h-32 w-[30%] rounded-xl bg-gray-200 dark:bg-zinc-800 animate-pulse shrink-0" />
                  <div className="h-24 sm:h-32 w-[30%] rounded-xl bg-gray-200 dark:bg-zinc-800 animate-pulse shrink-0" />
                  <div className="h-24 sm:h-32 w-[30%] rounded-xl bg-gray-200 dark:bg-zinc-800 animate-pulse shrink-0" />
                </div>
              </div>

              {/* Description Skeleton */}
              <div className="space-y-2.5 pt-2">
                <div className="h-5 w-36 rounded bg-gray-200 dark:bg-zinc-800 animate-pulse" />
                <div className="h-4 w-full rounded bg-gray-200 dark:bg-zinc-800/70 animate-pulse" />
                <div className="h-4 w-full rounded bg-gray-200 dark:bg-zinc-800/70 animate-pulse" />
                <div className="h-4 w-4/5 rounded bg-gray-200 dark:bg-zinc-800/70 animate-pulse" />
                <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-zinc-800/70 animate-pulse" />
              </div>
            </div>

            {/* Right Column Skeleton (Page Layout) */}
            {isPage && (
              <div className="w-full lg:w-[400px] shrink-0 space-y-4 pt-2">
                {/* Profile Card Skeleton */}
                <div className="p-3.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-zinc-800 animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="h-2.5 w-16 rounded bg-gray-200 dark:bg-zinc-800 animate-pulse" />
                      <div className="h-3.5 w-24 rounded bg-gray-200 dark:bg-zinc-800 animate-pulse" />
                    </div>
                  </div>
                  <div className="h-7 w-20 rounded-lg bg-gray-200 dark:bg-zinc-800 animate-pulse" />
                </div>

                {/* Package Card Skeleton */}
                <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base p-6 space-y-4">
                  <div className="flex gap-2 border-b border-gray-200 dark:border-white/10 pb-4">
                    <div className="h-8 flex-1 rounded bg-gray-200 dark:bg-zinc-800 animate-pulse" />
                    <div className="h-8 flex-1 rounded bg-gray-200 dark:bg-zinc-800 animate-pulse" />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="h-5 w-28 rounded bg-gray-200 dark:bg-zinc-800 animate-pulse" />
                    <div className="h-6 w-20 rounded bg-gray-200 dark:bg-zinc-800 animate-pulse" />
                  </div>
                  <div className="h-12 w-full rounded bg-gray-200 dark:bg-zinc-800/60 animate-pulse" />
                  <div className="h-11 w-full rounded-xl bg-blue-600/50 animate-pulse" />
                </div>

                {/* Accordion Skeletons */}
                <div className="h-12 w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-dark-surface/80 animate-pulse" />
                <div className="h-12 w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-dark-surface/80 animate-pulse" />
              </div>
            )}
          </div>

          {isPage && (
            <div className="mt-16 pt-8 border-t border-gray-200 dark:border-white/10">
              <GigsOtherServices currentGigId="" />
            </div>
          )}
        </div>
      </div>
    );
  }

  const activeTier = gig?.tiers?.[activeTierIdx];

  const termsContent =
    gig?.termsOfService ||
    (gig as any)?.terms_of_service ||
    (gig as any)?.terms ||
    (gig as any)?.tos ||
    (gig as any)?.service_terms ||
    "";

  const handleOpenReport = () => {
    if (onReportGig) {
      onReportGig(gig);
    } else {
      setIsReportModalOpen(true);
    }
  };

  const handleViewProfile = () => {
    if (!gig) return;

    if (gig.isOwnGig) {
      navigate("/profile");
      return;
    }

    const creatorId =
      gig.client_account_id ||
      gig.creator_account_id ||
      gig.freelancerAccountId ||
      (gig as any).account_id ||
      (gig as any).accountId ||
      (gig as any).user_id ||
      (gig as any).userId ||
      (gig as any).account?.account_id ||
      (gig as any).creator?.account_id ||
      (gig as any).user?.account_id;

    if (creatorId) {
      navigate(`/profile/${creatorId}`);
    } else {
      console.warn("Could not find creator account ID on gig object:", gig);
    }
  };

  const hasValidAvatar = gig?.clientAvatar && !gig.clientAvatar.includes('pravatar.cc');

  const renderProfileCard = () => (
    <div className="p-3.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/80 shadow-sm dark:shadow-xl backdrop-blur-xl flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative h-10 w-10 shrink-0">
          <img
            src={hasValidAvatar ? gig.clientAvatar : undefined}
            alt=""
            className={`h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-white/10 ${!hasValidAvatar ? 'hidden' : ''}`}
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
            {gig.postedBy ? gig.postedBy.charAt(0) : "U"}
          </div>
        </div>

        <div className="text-left min-w-0">
          <p className="text-[9px] uppercase text-gray-500 dark:text-zinc-500 font-bold tracking-wider">
            Service Creator
          </p>
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight truncate">
              {gig.postedBy}
            </p>
            <div className="flex items-center gap-1 rounded-md bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-zinc-400 border border-gray-100 dark:border-white/5 shrink-0">
              <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
              <span>{gig.clientRating || 0} ({gig.ratingCount || 0})</span>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleViewProfile}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition shrink-0"
      >
        <User className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
        <span>View Profile</span>
      </button>
    </div>
  );

  const renderMilestones = () => {
    if (!gig.milestones || gig.milestones.length === 0) return null;
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/80 shadow-sm overflow-hidden backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setIsMilestonesOpen((prev) => !prev)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              Project Milestones ({gig.milestones.length})
            </h3>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-gray-400 dark:text-zinc-400 transition-transform duration-200 ${
              isMilestonesOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        <AnimatePresence initial={false}>
          {isMilestonesOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-gray-100 dark:border-white/5"
            >
              <div className="p-4 space-y-4">
                {gig.milestones.map((m, idx) => (
                  <div key={idx} className="flex gap-3.5">
                    <div className="flex flex-col items-center">
                      <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </div>
                      {idx < gig.milestones.length - 1 && (
                        <div className="w-[2px] h-full bg-gray-200 dark:bg-white/10 mt-1" />
                      )}
                    </div>
                    <div className="pb-2 min-w-0 flex-1">
                      <h4 className="font-bold text-gray-900 dark:text-white text-xs mb-0.5">{m.name}</h4>
                      <p className="text-[11px] text-gray-600 dark:text-zinc-400 leading-relaxed">{m.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderTermsOfService = () => {
    if (!termsContent) return null;
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/80 shadow-sm overflow-hidden backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setIsTermsOpen((prev) => !prev)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              Terms of Service
            </h3>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-gray-400 dark:text-zinc-400 transition-transform duration-200 ${
              isTermsOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        <AnimatePresence initial={false}>
          {isTermsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-gray-100 dark:border-white/5"
            >
              <div className="p-4 text-xs text-gray-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line font-mono bg-gray-50/50 dark:bg-white/[0.01]">
                {termsContent}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderQuestionnaires = () => {
    if (!gig.questionnaires || gig.questionnaires.length === 0) return null;
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/80 shadow-sm overflow-hidden backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setIsQuestionnairesOpen((prev) => !prev)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              Requirements / Questionnaire ({gig.questionnaires.length})
            </h3>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-gray-400 dark:text-zinc-400 transition-transform duration-200 ${
              isQuestionnairesOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        <AnimatePresence initial={false}>
          {isQuestionnairesOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-gray-100 dark:border-white/5"
            >
              <div className="p-4 space-y-4">
                {gig.questionnaires.map((q, idx) => (
                  <div key={idx} className="pb-3 border-b border-gray-100 dark:border-white/5 last:border-0 last:pb-0">
                    <div className="flex items-start gap-2.5">
                      <span className="text-blue-500 font-bold text-xs mt-0.5 shrink-0">{idx + 1}.</span>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-gray-900 dark:text-white text-xs leading-snug">{q.question}</h4>
                        <div className="flex gap-2 mt-2">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-dark-base border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 font-medium">
                            {(q.type === 'attachment' || q.type === 'file' || q.type === 'file-upload') ? 'File Upload' : (q.type === 'multiple_choice' || q.type === 'choice' || q.type === 'multiple-choice') ? 'Multiple Choice' : 'Text Answer'}
                          </span>
                          {(q.required || q.isRequired) && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-medium">
                              Required
                            </span>
                          )}
                        </div>
                        {(q.type === 'multiple_choice' || q.type === 'choice' || q.type === 'multiple-choice') && q.options && (
                          <ul className="mt-2.5 space-y-1.5 ml-1">
                            {q.options.map((opt, i) => (
                              <li key={i} className="text-xs text-gray-600 dark:text-zinc-400 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-zinc-500 shrink-0" />
                                <span>{opt}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

    const renderReviews = () => {
    const reviews = gig.reviews || [];
    
    return (
      <section className="pt-4 border-t border-gray-200 dark:border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Rates & Reviews</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Feedback from clients on completed orders</p>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            {gig.ratingCount > 0 ? (
              <>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{gig.clientRating}</span>
                <span className="text-xs text-gray-400 dark:text-zinc-500">({gig.ratingCount} reviews)</span>
              </>
            ) : (
              <span className="text-sm font-bold text-gray-900 dark:text-white">N/A</span>
            )}
          </div>
        </div>
  
        {reviews.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.01] flex flex-col items-center justify-center text-center space-y-2">
            <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 dark:text-zinc-500">
                <MessageSquare className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-gray-700 dark:text-zinc-300">No public reviews yet</p>
            <p className="text-[11px] text-gray-500 dark:text-zinc-500 max-w-sm">
                Reviews and verified client ratings will appear here once orders for this service are completed.
            </p>
            </div>
        ) : (
            <div className="space-y-4">
                {reviews.map((rev, i) => (
                    <div key={rev.ratingId || i} className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                {rev.reviewerAvatar ? (
                                    <img src={rev.reviewerAvatar.startsWith('http') ? rev.reviewerAvatar : (import.meta.env.VITE_CLOUDFRONT_URL || '') + (rev.reviewerAvatar.startsWith('/') ? '' : '/') + rev.reviewerAvatar} alt={rev.reviewerName} className="h-8 w-8 rounded-full object-cover bg-gray-100 dark:bg-white/10" />
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                                        {rev.reviewerName.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{rev.reviewerName}</p>
                                    <p className="text-[10px] text-gray-500 dark:text-zinc-400">{new Date(rev.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`h-3.5 w-3.5 ${i < rev.stars ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 dark:text-zinc-600'}`} />
                                ))}
                            </div>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-wrap">{rev.feedback}</p>
                    </div>
                ))}
            </div>
        )}
      </section>
    );
  };

  return (
    <>
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

              {/* 1. TITLE & ACTIONS */}
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
                      type="button"
                      onClick={handleOpenReport}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-600 dark:text-zinc-400 font-bold text-xs hover:bg-gray-50 dark:hover:bg-white/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Report Service"
                    >
                      <Flag className="h-3.5 w-3.5" />
                      Report Gig
                    </button>
                  )}
                </div>
              </div>

              {/* AUTHOR & META (DRAWER ONLY) */}
              {!isPage && <div className="mb-8">{renderProfileCard()}</div>}

              <div className="space-y-6">
                {/* 2. THUMBNAIL */}
                <section>
                  <div
                    onClick={() => {
                      if (gig.thumbnail) setActiveLightboxImg(gig.thumbnail);
                    }}
                    className="w-full h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden bg-gray-100 dark:bg-white/5 relative border border-gray-200 dark:border-white/10 group cursor-pointer"
                  >
                    <img src={gig.thumbnail} alt={gig.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />

                    {/* Bottom Gradient Scrim */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                    <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs font-semibold z-10 border border-white/10">
                      <ShoppingCart className="h-4 w-4" />
                      <span>{gig.ordersCount || 0} Orders</span>
                    </div>

                    <div className="absolute bottom-4 left-4 flex items-center gap-1 text-white text-[13px] font-semibold drop-shadow-md z-10">
                      <Star className="h-4 w-4 fill-white text-white" />
                      <span>{gig.ratingCount > 0 ? `${gig.clientRating} (${gig.ratingCount})` : "N/A"}</span>
                    </div>

                    {/* Expand Badge Overlay */}
                    <div className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-black/50 backdrop-blur-md text-white/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] font-bold">
                      <ZoomIn className="h-4 w-4" />
                      <span>Expand</span>
                    </div>

                    {/* Skills Overlay with single Wrench Icon */}
                    {gig.skills && gig.skills.length > 0 && (
                      <div className="absolute bottom-12 left-4 right-4 z-10" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap gap-2 items-center">
                          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-black/60 backdrop-blur-md border border-white/15 text-zinc-300 shadow-sm shrink-0">
                            <Wrench className="h-3.5 w-3.5" />
                          </div>
                          {gig.skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/15 text-xs font-semibold text-white shadow-sm"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* 3. SUPPORTING IMAGES */}
                {gig.gallery && gig.gallery.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                        Supporting Images ({gig.gallery.length})
                      </h3>
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 hidden sm:inline">
                        Click to expand
                      </span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto thin-gallery-scrollbar pb-3 snap-x">
                      {gig.gallery.map((img, idx) => (
                        <div
                          key={idx}
                          onClick={() => setActiveLightboxImg(img)}
                          className="group relative h-28 sm:h-36 min-w-[40%] sm:min-w-[30%] shrink-0 rounded-2xl overflow-hidden snap-center bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 cursor-pointer shadow-sm hover:shadow-lg transition-all"
                        >
                          <img
                            src={img}
                            alt={`Gallery ${idx}`}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-[1px]">
                            <ZoomIn className="h-5 w-5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* 4. ABOUT THIS SERVICE */}
                <section className="pt-2">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">About This Service</h3>
                  <div
                    className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed max-w-none prose prose-sm dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: gig.description.replace(/\n/g, "<br/>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>") }}
                  />
                </section>

                {/* 5. RATES & REVIEWS */}
                {renderReviews()}

                {/* DRAWER-ONLY SECTIONS (STACKED TOGETHER) */}
                {!isPage && (
                  <>
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
                            onClick={() => !isOwner && navigate(`/gigs/services/${gig.id}/order`, { state: { tierIndex: activeTierIdx } })}
                            disabled={isOwner}
                            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors shadow-lg shadow-blue-500/20 disabled:shadow-none"
                          >
                            {isOwner ? "You own this service" : `Continue (${activeTier?.price?.toLocaleString()} Credits)`}
                          </button>
                        </div>
                      </div>
                      {gig.additionalWorkRate > 0 && (
                        <p className="text-[10px] text-gray-500 mt-2 text-center">
                          * Additional work outside of scope will be billed with a {gig.additionalWorkRate}% markup.
                        </p>
                      )}
                    </section>

                    {renderMilestones()}
                    {renderTermsOfService()}
                    {renderQuestionnaires()}
                  </>
                )}

              </div>
            </div>

            {/* PAGE RIGHT SIDEBAR */}
            {isPage && (
              <div className="w-full lg:w-[400px] shrink-0 sticky top-[148px] space-y-4">
                {renderProfileCard()}

                {/* Pricing Packages Box */}
                <section>
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
                        onClick={() => {
                          if (isOwner) return;
                          if (gig.hasPendingOrder && gig.pendingOrderId) {
                            navigate(`/gigs/orders/sent/${gig.pendingOrderId}`);
                          } else {
                            navigate(`/gigs/services/${gig.id}/order`, { state: { tierIndex: activeTierIdx } });
                          }
                        }}
                        disabled={isOwner}
                        className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors shadow-lg shadow-blue-500/20 disabled:shadow-none"
                      >
                        {isOwner ? "You own this service" : gig.hasPendingOrder ? "View My Order" : `Continue (${activeTier?.price?.toLocaleString()} Credits)`}
                      </button>
                    </div>
                  </div>
                  {gig.additionalWorkRate > 0 && (
                    <p className="text-[11px] text-gray-500 mt-3 text-center">
                      * Additional work outside of scope will be billed with a {gig.additionalWorkRate}% markup.
                    </p>
                  )}
                </section>

                {/* Collapsible Project Milestones */}
                {renderMilestones()}

                {/* Collapsible Terms of Service */}
                {renderTermsOfService()}

                {/* Collapsible Requirements / Questionnaire */}
                {renderQuestionnaires()}
              </div>
            )}
          </div>

          {/* 6. OTHER SERVICES YOU MAY LIKE (STANDALONE COMPONENT) */}
          {isPage && <GigsOtherServices currentGigId={gig.id} />}

          {!isPage && <div className="h-24"></div>}
        </div>

        {/* ACTION BAR (MOBILE ONLY) */}
        {!isPage && (
          <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/80 dark:bg-dark-base/80 backdrop-blur-md border-t border-gray-200 dark:border-white/10 flex items-center justify-between lg:hidden shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] dark:shadow-none">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 font-bold tracking-wider uppercase">Total Price</span>
              <span className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-1.5"><CreditIcon className="h-4 w-4 shrink-0 text-yellow-500" />{activeTier?.price?.toLocaleString()}</span>
            </div>
            <button
              onClick={() => {
                if (isOwner) return;
                if (gig.hasPendingOrder && gig.pendingOrderId) {
                  navigate(`/gigs/orders/sent/${gig.pendingOrderId}`);
                } else {
                  navigate(`/gigs/services/${gig.id}/order`, { state: { tierIndex: activeTierIdx } });
                }
              }}
              disabled={isOwner}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors shadow-lg shadow-blue-500/20 disabled:shadow-none"
            >
              {isOwner ? "You own this service" : gig.hasPendingOrder ? "View My Order" : "Order Now"}
            </button>
          </div>
        )}

      </div>

      {/* ==================== EXPANDED LIGHTBOX PREVIEW MODAL ==================== */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {activeLightboxImg && (
            <div className="fixed inset-0 z-[300000] flex items-center justify-center p-4 md:p-8">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveLightboxImg(null)}
                className="absolute inset-0 bg-black/90 backdrop-blur-md cursor-pointer"
                aria-label="Close modal backdrop"
              />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setActiveLightboxImg(null)}
                className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="h-6 w-6" />
              </button>

              {/* Navigation Arrows */}
              {allImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevLightbox}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title="Previous Image"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextLightbox}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title="Next Image"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              {/* Image Presentation */}
              <motion.div
                key={activeLightboxImg}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative max-w-5xl max-h-[85vh] w-full flex items-center justify-center z-10 pointer-events-none"
              >
                <img
                  src={activeLightboxImg}
                  alt="Enlarged gallery preview"
                  className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/10 pointer-events-auto"
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Embedded Thin Scrollbar Styling with Smooth Expand-on-Hover */}
      <style>{`
        .thin-gallery-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.25) rgba(255, 255, 255, 0.03);
        }
        .thin-gallery-scrollbar::-webkit-scrollbar {
          height: 6px;
          transition: height 0.2s ease-in-out;
        }
        .thin-gallery-scrollbar:hover::-webkit-scrollbar {
          height: 12px;
        }
        .thin-gallery-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 9999px;
        }
        .thin-gallery-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.25);
          border-radius: 9999px;
          transition: background 0.2s ease-in-out;
        }
        .thin-gallery-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.45);
        }
      `}</style>

      {/* Popup Report Modal */}
      <PopupReportGig
        isOpen={isReportModalOpen}
        gigTitle={gig.title}
        onClose={() => setIsReportModalOpen(false)}
        onSubmitReport={(reason, details) => {
          console.log("Report submitted for gig:", gig.id, reason, details);
        }}
      />
    </>
  );
};

export default GigRichText;