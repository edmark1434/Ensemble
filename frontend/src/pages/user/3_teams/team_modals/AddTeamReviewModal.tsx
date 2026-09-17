import React, { useState, useEffect } from "react";
import { X, Star, LoaderCircle } from "lucide-react";

interface AddTeamReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  onSubmit: (rating: number, comment: string) => Promise<void> | void;
}

const ratingLabels: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

const AddTeamReviewModal: React.FC<AddTeamReviewModalProps> = ({
  isOpen,
  onClose,
  teamName,
  onSubmit,
}) => {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setHoverRating(0);
      setComment("");
      setErrorMessage("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setErrorMessage("Please select a rating between 1 and 5 stars.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);
    try {
      await onSubmit(rating, comment.trim());
    } catch {
      // Error handled by parent toast, stop submitting state
      setIsSubmitting(false);
    }
  };

  const activeRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-dark-surface p-6 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
            <h3
              className="text-xl font-semibold text-white"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Write a Review
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-zinc-400 mb-5">
          Reviewing: <span className="font-medium text-white">{teamName}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Star Rating Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Rating <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none"
                  onClick={() => {
                    setRating(star);
                    setErrorMessage("");
                  }}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  disabled={isSubmitting}
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      activeRating >= star
                        ? "text-amber-400 fill-amber-400"
                        : "text-zinc-600 hover:text-zinc-500"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm font-medium text-zinc-300">
                {activeRating > 0 ? ratingLabels[activeRating] : "(Select rating)"}
              </span>
            </div>
          </div>

          {/* Comment */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-300">
                Feedback Comment
              </label>
              <span className="text-xs text-zinc-500">
                {comment.length}/500
              </span>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              placeholder={`Share your experience working with ${teamName}...`}
              rows={4}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none disabled:opacity-50"
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <p className="text-xs text-red-400 font-medium">{errorMessage}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || rating === 0}
              className="flex-1 inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTeamReviewModal;
