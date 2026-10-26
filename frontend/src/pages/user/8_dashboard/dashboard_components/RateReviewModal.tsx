import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Star, LoaderCircle, Clock, AlertTriangle } from 'lucide-react';
import api from '@/lib/axios';
import { showSuccessToast, showErrorToast } from '@/components/utility/toast';
import { constructAvatarUrl, getFallbackAvatarUrl } from '@/lib/accountAvatars';

interface RateReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    contractId: string;
    reviewTargetName: string;
    reviewTargetHandle?: string;
    reviewTargetAvatar?: string;
    reviewTargetRole?: 'client' | 'freelancer';
    isFreelancerRole?: boolean;
    contractValue?: string | number;
    completedAt?: string | Date;
    counterpartyHasReviewed?: boolean;
    onSuccess: () => void;
}

const MAX_REVIEW_CHARS = 500;

interface RatingTier {
    label: string;
    pillClass: string;
    fill: string;
    stroke: string;
    hasShine?: boolean;
}

const RATING_TIERS: Record<number, RatingTier> = {
    1: {
        label: "Poor",
        pillClass: "text-rose-800 dark:text-rose-300 bg-rose-100/90 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/30 shadow-2xs",
        fill: "#f43f5e",
        stroke: "#e11d48",
    },
    2: {
        label: "Fair",
        pillClass: "text-orange-800 dark:text-orange-300 bg-orange-100/90 dark:bg-orange-500/15 border-orange-300 dark:border-orange-500/30 shadow-2xs",
        fill: "#f97316",
        stroke: "#ea580c",
    },
    3: {
        label: "Good",
        pillClass: "text-amber-800 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/30 shadow-2xs",
        fill: "#fbbf24",
        stroke: "#f59e0b",
    },
    4: {
        label: "Very Good",
        pillClass: "text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-500/15 border-emerald-400 dark:border-emerald-500/40 shadow-2xs",
        fill: "#10b981",
        stroke: "#059669",
        hasShine: true,
    },
    5: {
        label: "Outstanding",
        pillClass: "text-indigo-950 dark:text-purple-200 bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 dark:from-blue-500/20 dark:via-indigo-500/20 dark:to-purple-500/25 border-indigo-400 dark:border-purple-400/50 shadow-2xs font-bold",
        fill: "url(#bluePurpleStarGrad)",
        stroke: "url(#bluePurpleStarStroke)",
        hasShine: true,
    },
};

export const RateReviewModal: React.FC<RateReviewModalProps> = ({ 
    isOpen, 
    onClose, 
    contractId, 
    reviewTargetName, 
    reviewTargetHandle,
    reviewTargetAvatar,
    reviewTargetRole,
    isFreelancerRole, 
    contractValue, 
    completedAt,
    counterpartyHasReviewed,
    onSuccess 
}) => {
    const [rating, setRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [feedback, setFeedback] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isOpen]);

    // 24-hour countdown deadline
    const [timeLeftMs, setTimeLeftMs] = useState<number>(() => {
        if (!contractId) return 24 * 3600 * 1000;
        const storageKey = `ensemble_review_deadline_${contractId}`;
        let deadline = 0;
        if (completedAt) {
            deadline = new Date(completedAt).getTime() + 24 * 60 * 60 * 1000;
        } else {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                deadline = parseInt(stored, 10);
            }
            if (!deadline || isNaN(deadline)) {
                deadline = Date.now() + 24 * 60 * 60 * 1000;
                localStorage.setItem(storageKey, String(deadline));
            }
        }
        return Math.max(0, deadline - Date.now());
    });

    useEffect(() => {
        if (!isOpen || !contractId) return;

        const updateTimer = () => {
            const storageKey = `ensemble_review_deadline_${contractId}`;
            let deadline = 0;
            if (completedAt) {
                deadline = new Date(completedAt).getTime() + 24 * 60 * 60 * 1000;
            } else {
                const stored = localStorage.getItem(storageKey);
                deadline = stored ? parseInt(stored, 10) : Date.now() + 24 * 60 * 60 * 1000;
            }
            setTimeLeftMs(Math.max(0, deadline - Date.now()));
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [isOpen, contractId, completedAt]);

    const formatCountdown = (ms: number) => {
        if (ms <= 0) return "00:00:00 (Expired)";
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    if (!isOpen) return null;

    const numericValue = typeof contractValue === 'number' 
        ? contractValue 
        : parseInt(String(contractValue || '0').replace(/,/g, ''), 10) || 0;
    const fee = Math.floor(numericValue * 0.10);
    const net = numericValue - fee;

    const activeTierLevel = hoverRating || rating;
    const activeTier = activeTierLevel ? RATING_TIERS[activeTierLevel] : null;

    const handleSubmit = async () => {
        if (rating < 1 || rating > 5) {
            showErrorToast("Please select a star rating.");
            return;
        }
        if (!feedback.trim()) {
            showErrorToast("Please write a short review.");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await api.post(`/api/dashboard/contract/${contractId}/review`, {
                rating,
                feedback: feedback.trim()
            });

            if (response.data.success) {
                showSuccessToast("Review submitted successfully!");
                onSuccess();
                onClose();
            } else {
                showErrorToast(response.data.message || "Failed to submit review");
            }
        } catch (error: any) {
            console.error("Error submitting review:", error);
            showErrorToast(error.response?.data?.message || "An error occurred while submitting review.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const targetRoleLabel = reviewTargetRole === 'client' 
        ? 'Client' 
        : reviewTargetRole === 'freelancer' 
        ? 'Freelancer' 
        : (isFreelancerRole ? 'Client' : 'Freelancer');

    return createPortal(
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="flex items-center gap-3 min-w-0">
                        <img 
                            src={constructAvatarUrl(reviewTargetAvatar, reviewTargetName)}
                            alt={reviewTargetName}
                            className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shadow-2xs shrink-0"
                            onError={(e) => { 
                                (e.currentTarget as HTMLImageElement).src = getFallbackAvatarUrl(reviewTargetName); 
                            }}
                        />
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                                    {reviewTargetName}
                                </h2>
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md border bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 shrink-0">
                                    {targetRoleLabel}
                                </span>
                            </div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                                {reviewTargetHandle ? `@${reviewTargetHandle} • ` : ''}Rate your experience
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
                        title="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-3.5">
                    {/* SVG Gradients for Blue-Purple Star */}
                    <svg width="0" height="0" className="absolute pointer-events-none opacity-0" aria-hidden="true" focusable="false">
                        <defs>
                            <linearGradient id="bluePurpleStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#38bdf8" />
                                <stop offset="45%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#c084fc" />
                            </linearGradient>
                            <linearGradient id="bluePurpleStarStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#0284c7" />
                                <stop offset="100%" stopColor="#9333ea" />
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* Scoped Badge Shimmer Keyframe */}
                    <style>{`
                        @keyframes badgeShimmer {
                            0% { transform: translateX(-100%); }
                            100% { transform: translateX(200%); }
                        }
                    `}</style>

                    {/* Crisp Neutral 24-Hour Review Deadline Strip */}
                    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-100/90 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-xs">
                        <div className="flex items-center gap-2 min-w-0 text-zinc-700 dark:text-zinc-300">
                            <AlertTriangle className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                            <div className="min-w-0">
                                <div className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
                                    {counterpartyHasReviewed ? (
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                            @{reviewTargetName} has submitted their review!
                                        </span>
                                    ) : (
                                        "Review Window: 24h Grace Period"
                                    )}
                                </div>
                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                                    {counterpartyHasReviewed
                                        ? "Submit yours to reveal mutual ratings and complete closeout"
                                        : "Submit review before deadline to maintain Merit standing"}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-zinc-800 dark:text-zinc-100 bg-white dark:bg-zinc-700/90 px-2.5 py-1 rounded-lg border border-zinc-300/80 dark:border-zinc-600 shadow-2xs shrink-0">
                            <Clock className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                            <span>{formatCountdown(timeLeftMs)}</span>
                        </div>
                    </div>

                    {/* High-Contrast Payout Info Strip (Freelancer only) */}
                    {isFreelancerRole && Boolean(numericValue) && (
                        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs">
                            <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                                Net Earnings ({numericValue.toLocaleString()} - 10% fee):
                            </span>
                            <span className="flex items-center gap-1.5 font-mono font-bold text-zinc-900 dark:text-white text-xs">
                                <img src="/icons/lottie/credit.png" alt="credits" className="w-3.5 h-3.5 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                {net.toLocaleString()} Credits
                            </span>
                        </div>
                    )}

                    {/* Rate Your Experience with Dynamic Tiers */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between h-7">
                            <label className="text-xs font-bold text-zinc-900 dark:text-white">
                                Rate your experience
                            </label>
                            <div className="h-6 flex items-center justify-end">
                                {activeTier ? (
                                    <span className={`h-6 inline-flex items-center px-2.5 text-xs font-bold rounded-full border relative overflow-hidden transition-all duration-150 ${activeTier.pillClass}`}>
                                        <span className="relative z-10">{activeTier.label}</span>
                                        {activeTier.hasShine && (
                                            <span 
                                                className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
                                                style={{ animation: activeTierLevel === 5 ? "badgeShimmer 1.8s infinite linear" : "badgeShimmer 2.4s infinite linear" }}
                                            />
                                        )}
                                    </span>
                                ) : (
                                    <span className="h-6 inline-flex items-center px-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700 transition-all duration-150">
                                        Click a star (1 - 5)
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Crisp Stars with Dynamic Color Tiers (No Glow, Extra Large) */}
                        <div className="flex items-center justify-center gap-2.5 sm:gap-4 h-16 py-1">
                            {[1, 2, 3, 4, 5].map((star) => {
                                const isFilled = activeTierLevel >= star;
                                const tier = activeTier;

                                const starFill = (isFilled && tier) ? tier.fill : "none";
                                const starStroke = (isFilled && tier) ? tier.stroke : "currentColor";
                                const starClassName = `w-11 h-11 sm:w-12 sm:h-12 transition-transform duration-150 ${
                                    isFilled ? "" : "text-zinc-300 dark:text-zinc-600 hover:text-zinc-400 dark:hover:text-zinc-500"
                                }`;

                                return (
                                    <button
                                        key={star}
                                        type="button"
                                        className="p-1 rounded-xl transition-transform duration-150 transform hover:scale-115 active:scale-95 focus:outline-none cursor-pointer"
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        aria-label={`Rate ${star} star - ${RATING_TIERS[star].label}`}
                                    >
                                        <Star 
                                            className={starClassName}
                                            fill={starFill}
                                            stroke={starStroke}
                                            strokeWidth={1.8}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Written Feedback with Character Limit */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-zinc-900 dark:text-white">
                                Write a review
                            </label>
                            <span className={`text-[11px] font-mono font-medium ${
                                feedback.length >= MAX_REVIEW_CHARS
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : feedback.length >= MAX_REVIEW_CHARS - 50
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-zinc-400 dark:text-zinc-500'
                            }`}>
                                {feedback.length} / {MAX_REVIEW_CHARS}
                            </span>
                        </div>
                        <textarea
                            value={feedback}
                            maxLength={MAX_REVIEW_CHARS}
                            onChange={(e) => setFeedback(e.target.value.slice(0, MAX_REVIEW_CHARS))}
                            placeholder={`How was working with ${reviewTargetName}?`}
                            rows={3}
                            className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900/10 dark:focus:ring-white/10 resize-none text-xs leading-relaxed transition-all shadow-2xs"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 flex items-center justify-between gap-3">
                    <span className="h-5 flex items-center text-[11px] font-medium">
                        {rating === 0 ? (
                            <span className="text-zinc-500 dark:text-zinc-400">★ Rating required</span>
                        ) : !feedback.trim() ? (
                            <span className="text-zinc-500 dark:text-zinc-400">Please write a review</span>
                        ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Ready to submit</span>
                        )}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all disabled:opacity-50 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || rating === 0 || !feedback.trim()}
                            className="flex items-center justify-center px-4 py-1.5 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95 cursor-pointer"
                        >
                            {isSubmitting ? (
                                <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                "Submit Review"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
