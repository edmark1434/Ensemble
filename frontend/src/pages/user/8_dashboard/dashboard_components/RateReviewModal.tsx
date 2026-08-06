import React, { useState } from 'react';
import { X, Star, LoaderCircle } from 'lucide-react';
import api from '@/lib/axios';
import { showSuccessToast, showErrorToast } from '@/components/utility/toast';

import { CreditIcon } from '@/components/ui/credit-icon';

interface RateReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    contractId: string;
    reviewTargetName: string;
    isFreelancerRole?: boolean;
    contractValue?: string;
    onSuccess: () => void;
}

export const RateReviewModal: React.FC<RateReviewModalProps> = ({ isOpen, onClose, contractId, reviewTargetName, isFreelancerRole, contractValue, onSuccess }) => {
    const [rating, setRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [feedback, setFeedback] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (rating < 1 || rating > 5) {
            showErrorToast("Please provide a star rating.");
            return;
        }
        if (!feedback.trim()) {
            showErrorToast("Please provide some feedback.");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await api.post(`/api/dashboard/contract/${contractId}/review`, {
                rating,
                feedback
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

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#0a0c10] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white">Review {reviewTargetName}</h2>
                    <button 
                        onClick={onClose}
                        className="text-zinc-500 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {isFreelancerRole && contractValue && (
                        <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4">
                            <h3 className="text-sm font-semibold text-blue-400 mb-3">Expected Payout Summary</h3>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between text-zinc-400">
                                    <span>Gross Contract Value:</span>
                                    <span className="flex items-center gap-1 font-mono text-zinc-300">
                                        <CreditIcon className="w-3 h-3 text-yellow-500" /> {contractValue}
                                    </span>
                                </div>
                                <div className="flex justify-between text-red-400">
                                    <span>Platform Fee (10%):</span>
                                    <span className="flex items-center gap-1 font-mono">
                                        - <CreditIcon className="w-3 h-3 text-yellow-500" /> {Math.floor((typeof contractValue === 'number' ? contractValue : parseInt(String(contractValue).replace(/,/g, ''))) * 0.10).toLocaleString()}
                                    </span>
                                </div>
                                <div className="pt-2 border-t border-white/5 flex justify-between font-bold text-white text-sm">
                                    <span>Net Earnings:</span>
                                    <span className="flex items-center gap-1 font-mono text-yellow-400">
                                        <CreditIcon className="w-4 h-4" /> {Math.floor((typeof contractValue === 'number' ? contractValue : parseInt(String(contractValue).replace(/,/g, ''))) * 0.90).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-3">
                            Rate your experience
                        </label>
                        <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    className={`transition-all ${
                                        (hoverRating || rating) >= star 
                                            ? 'text-yellow-400 scale-110 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' 
                                            : 'text-zinc-700 hover:text-zinc-500'
                                    }`}
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                >
                                    <Star className="w-8 h-8 fill-current" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                            Write a review
                        </label>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder={`How was it working with ${reviewTargetName}?`}
                            className="w-full h-32 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none transition-all"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-zinc-950/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || rating === 0 || !feedback.trim()}
                        className="flex items-center justify-center min-w-[140px] px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)]"
                    >
                        {isSubmitting ? (
                            <LoaderCircle className="w-5 h-5 animate-spin" />
                        ) : (
                            "Submit Review"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
