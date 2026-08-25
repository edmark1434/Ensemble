import React, { useEffect, useState } from "react";
import { Star, MessageSquare, Loader2 } from "lucide-react";
import api from "@/lib/axios";

export type ReviewFilter = "All" | "As Freelancer" | "As a Client" | "Asset Creation";

interface ProfileReviewsProps {
  isOwner?: boolean;
  accountId?: string;
  initialFilter?: ReviewFilter;
}

interface Review {
  rating_id: string;
  stars_out_of_five: number;
  feedback: string;
  created_at: string;
  contract_id: string;
  role_type: string;
  reviewer_name: string;
  reviewer_avatar: string;
}

const ReviewItem: React.FC<{ review: Review }> = ({ review }) => {
  return (
    <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-dark-elevated flex-shrink-0">
            {review.reviewer_avatar ? (
              <img src={`http://localhost:4000/api/files/${review.reviewer_avatar}`} alt={review.reviewer_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                {review.reviewer_name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{review.reviewer_name || "Unknown User"}</h4>
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider block mt-0.5">
              {new Date(review.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-500/20">
          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
          <span className="text-xs font-bold text-amber-700 dark:text-amber-500">{Number(review.stars_out_of_five).toFixed(1)}</span>
        </div>
      </div>
      
      {review.feedback && (
        <p className="text-sm text-gray-600 dark:text-zinc-300 leading-relaxed bg-gray-50 dark:bg-dark-elevated p-3 rounded-lg border border-gray-100 dark:border-white/5 italic">
          "{review.feedback}"
        </p>
      )}
    </div>
  );
};

export const Profile_Reviews: React.FC<ProfileReviewsProps> = ({ isOwner, accountId, initialFilter = "All" }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ReviewFilter>(initialFilter);

  useEffect(() => {
    setActiveFilter(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    if (!accountId) return;
    
    const fetchReviews = async () => {
      try {
        const response = await api.get(`/api/accounts/profile/${accountId}/reviews`);
        if (response.data.success) {
          setReviews(response.data.data || []);
        }
      } catch (err) {
        console.error("Failed to load reviews:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReviews();
  }, [accountId]);

  const filteredReviews = reviews.filter(r => {
    if (activeFilter === "All") return true;
    if (activeFilter === "As Freelancer") return r.role_type === 'freelancer';
    if (activeFilter === "As a Client") return r.role_type === 'client';
    if (activeFilter === "Asset Creation") return r.role_type === 'asset' || r.role_type === 'unknown';
    return true;
  });

  const getEmptyMsg = () => {
    if (activeFilter === "As Freelancer") return "No reviews received as a freelancer yet.";
    if (activeFilter === "As a Client") return "No reviews received as a client yet.";
    if (activeFilter === "Asset Creation") return "No reviews received as an asset creator yet.";
    return "No reviews received yet.";
  };

  return (
    <div className="space-y-6 font-['Plus Jakarta Sans',sans-serif]">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {(["All", "As Freelancer", "As a Client", "Asset Creation"] as ReviewFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              activeFilter === f 
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" 
                : "bg-gray-100 dark:bg-dark-elevated text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-white/5 border border-transparent dark:border-white/10"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
        </div>
      ) : filteredReviews.length > 0 ? (
        <div className="grid gap-4">
          {filteredReviews.map(r => (
            <ReviewItem key={r.rating_id} review={r} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-gray-50 dark:bg-dark-elevated rounded-2xl border border-dashed border-gray-300 dark:border-white/10">
          <MessageSquare className="h-8 w-8 text-gray-400 mb-3 opacity-50" />
          <p className="text-sm text-gray-600 dark:text-zinc-400 font-medium">{getEmptyMsg()}</p>
        </div>
      )}
    </div>
  );
};
