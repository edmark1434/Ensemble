import React, { useState } from 'react';
import { X, Star, LoaderCircle } from 'lucide-react';
import api from '@/lib/axios';
import { showSuccessToast, showErrorToast } from '@/components/utility/toast';

interface DevRateReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    ratingType: string;
}

export const DevRateReviewModal: React.FC<DevRateReviewModalProps> = ({ isOpen, onClose, ratingType }) => {
    const [rating, setRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [feedback, setFeedback] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const fakeTitle = ratingType.includes('Asset') ? "3D Modular Sci-Fi Kit" : 
                      ratingType.includes('Service') ? "I will create a NextJS Fullstack app" : 
                      "Need a React Native Developer for MVP";

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
            const response = await api.post(`/api/accounts/dev/add-rating`, {
                ratingType,
                rating,
                feedback,
                title: fakeTitle
            });

            if (response.data.success) {
                showSuccessToast(`${ratingType} added successfully!`);
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
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pointer-events-auto">
            <div className="bg-dark-base border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white">Review: {fakeTitle}</h2>
                    <button 
                        onClick={onClose}
                        className="text-zinc-500 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    <div className="text-center">
                        <p className="text-zinc-400 mb-4">{ratingType} - Dev Mode Simulation</p>
                        
                        <div className="flex justify-center gap-2 mb-6">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className="p-1 focus:outline-none transition-transform hover:scale-110"
                                >
                                    <Star 
                                        className={`w-10 h-10 transition-colors ${
                                            star <= (hoverRating || rating) 
                                                ? 'fill-amber-400 text-amber-400' 
                                                : 'text-zinc-700'
                                        }`} 
                                    />
                                </button>
                            ))}
                        </div>
                        
                        <div className="text-sm font-semibold text-amber-400 h-6">
                            {hoverRating || rating ? (
                                ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][(hoverRating || rating) - 1]
                            ) : 'Select a rating'}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-white block">
                            Share your feedback
                        </label>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Write your review here..."
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 resize-none h-32 transition-colors"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-white/[0.02]">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || rating === 0 || !feedback.trim()}
                        className="px-5 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <><LoaderCircle className="w-5 h-5 animate-spin" /> Submitting...</>
                        ) : 'Submit Review'}
                    </button>
                </div>
            </div>
        </div>
    );
};