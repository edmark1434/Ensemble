import React, { useState, useEffect } from 'react';
import { X, Star, LoaderCircle, Clock, AlertTriangle } from 'lucide-react';
import api from '@/lib/axios';
import { showSuccessToast, showErrorToast } from '@/components/utility/toast';

interface RateReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    contractId: string;
    reviewTargetName: string;
    reviewTargetAvatar?: string;
    reviewTargetRole?: 'client' | 'freelancer';
    isFreelancerRole?: boolean;
    contractValue?: string | number;
    completedAt?: string | Date;
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
    reviewTargetAvatar,
    reviewTargetRole,
    isFreelancerRole, 
    contractValue, 
    completedAt,
    onSuccess 
}) => {
    const [rating, setRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [feedback, setFeedback] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-dark-base border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/50">
                    <div className="flex items-center gap-2.5 min-w-0">
                        {reviewTargetAvatar ? (
                            <img 
                                src={`${import.meta.env.VITE_CLOUDFRONT_URL}${reviewTargetAvatar.startsWith('/') ? '' : '/'}${reviewTargetAvatar}`}
                                alt={reviewTargetName}
                                className="w-8 h-8 rounded-full object-cover border border-gray-300 dark:border-zinc-700 shrink-0"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center border border-blue-300 dark:border-blue-500/30 shrink-0">
                                {reviewTargetName.slice(0, 1).toUpperCase()}
                            </div>
                        )}
                        <div className="flex items-center gap-2 min-w-0">
                            <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">
                                Review {reviewTargetName}
                            </h2>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border bg-gray-100 text-gray-800 border-gray-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 shrink-0">
                                {targetRoleLabel}
                            </span>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shrink-0"
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

                    {/* High-Contrast 24-Hour Warning Strip */}
                    <div className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-amber-100/70 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0 text-amber-950 dark:text-amber-200">
                            <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                            <span className="text-[11px] font-semibold truncate">
                                24h deadline to avoid Merit deduction <span className="text-[10px] font-normal opacity-80">(grace period)</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-1 font-mono font-bold text-[11px] text-amber-950 dark:text-amber-200 bg-amber-200/80 dark:bg-amber-500/25 px-2 py-0.5 rounded border border-amber-300/80 dark:border-amber-500/40 shrink-0 shadow-2xs">
                            <Clock className="w-3 h-3 text-amber-800 dark:text-amber-400" />
                            <span>{formatCountdown(timeLeftMs)}</span>
                        </div>
                    </div>

                    {/* High-Contrast Payout Info Strip (Freelancer only) */}
                    {isFreelancerRole && Boolean(numericValue) && (
                        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/[0.05] border border-gray-300 dark:border-white/10 text-xs">
                            <span className="text-[11px] font-semibold text-gray-700 dark:text-zinc-300">
                                Net Earnings ({numericValue.toLocaleString()} - 10% fee):
                            </span>
                            <span className="flex items-center gap-1.5 font-mono font-bold text-gray-900 dark:text-white text-xs">
                                <img src="/icons/lottie/credit.png" alt="credits" className="w-3.5 h-3.5 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                {net.toLocaleString()} Credits
                            </span>
                        </div>
                    )}

                    {/* Rate Your Experience with Dynamic Tiers */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between h-7">
                            <label className="text-xs font-bold text-gray-900 dark:text-white">
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
                                    <span className="h-6 inline-flex items-center px-2.5 text-xs font-medium text-gray-500 dark:text-zinc-400 bg-gray-100/80 dark:bg-white/5 rounded-full border border-gray-200 dark:border-white/10 transition-all duration-150">
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
                                    isFilled ? "" : "text-gray-300 dark:text-zinc-600 hover:text-gray-400"
                                }`;

                                return (
                                    <button
                                        key={star}
                                        type="button"
                                        className="p-1 rounded-xl transition-transform duration-150 transform hover:scale-115 active:scale-95 focus:outline-none"
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
                            <label className="text-xs font-bold text-gray-900 dark:text-white">
                                Write a review
                            </label>
                            <span className={`text-[11px] font-mono font-semibold ${
                                feedback.length >= MAX_REVIEW_CHARS
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : feedback.length >= MAX_REVIEW_CHARS - 50
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-gray-500 dark:text-zinc-400'
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
                            className="w-full px-3.5 py-2.5 bg-gray-50/80 dark:bg-white/[0.04] border border-gray-300 dark:border-white/15 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-zinc-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 resize-none text-xs leading-relaxed transition-all shadow-2xs"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 border-t border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-dark-surface/50 flex items-center justify-between gap-3">
                    <span className="h-5 flex items-center text-[11px] font-medium">
                        {rating === 0 ? (
                            <span className="text-amber-700 dark:text-amber-400 font-semibold">★ Rating required</span>
                        ) : !feedback.trim() ? (
                            <span className="text-gray-600 dark:text-zinc-400">Please write a review</span>
                        ) : (
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold">✓ Ready to submit</span>
                        )}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-gray-700 dark:text-zinc-300 hover:text-gray-950 dark:hover:text-white border border-gray-300 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || rating === 0 || !feedback.trim()}
                            className="flex items-center justify-center px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95"
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
        </div>
    );
};
