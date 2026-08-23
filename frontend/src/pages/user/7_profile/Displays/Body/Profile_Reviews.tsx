import React, { useEffect, useState } from "react";
import { Star, MessageSquare, Loader2 } from "lucide-react";
import api from "@/lib/axios";

interface ProfileReviewsProps {
  isOwner?: boolean;
  accountId?: string;
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
                {review.reviewer_name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-zinc-100 text-sm">
              {review.reviewer_name || "Unknown"}
            </div>
            <div className="text-xs text-gray-500 dark:text-zinc-500">
              {new Date(review.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">
          <Star className="h-3.5 w-3.5 fill-current" />
          <span className="font-bold text-sm">{review.stars_out_of_five.toFixed(1)}</span>
        </div>
      </div>
      {review.feedback && (
        <p className="text-sm text-gray-700 dark:text-zinc-300 leading-relaxed italic">
          "{review.feedback}"
        </p>
      )}
    </div>
  );
};

export const Profile_Reviews: React.FC<ProfileReviewsProps> = ({ isOwner, accountId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

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

  const freelancerReviews = reviews.filter(r => r.role_type === 'freelancer');
  const clientReviews = reviews.filter(r => r.role_type === 'client');
  const assetReviews = reviews.filter(r => r.role_type === 'unknown'); // or 'asset' if implemented

  const renderSection = (title: string, data: Review[], emptyMsg: string) => (
    <div className="space-y-4">
      <div className="border-b border-gray-200 dark:border-white/10 pb-2">
        <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 uppercase tracking-wider">{title}</h3>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
        </div>
      ) : data.length > 0 ? (
        <div className="grid gap-4">
          {data.map(r => (
            <ReviewItem key={r.rating_id} review={r} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-gray-50 dark:bg-dark-elevated rounded-2xl border border-dashed border-gray-300 dark:border-white/10">
          <MessageSquare className="h-8 w-8 text-gray-400 mb-3 opacity-50" />
          <p className="text-sm text-gray-600 dark:text-zinc-400 font-medium">{emptyMsg}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 font-['Plus Jakarta Sans',sans-serif]">
      {renderSection("As a Freelancer", freelancerReviews, "No reviews received as a freelancer yet.")}
      {renderSection("As a Client", clientReviews, "No reviews received as a client yet.")}
      {renderSection("As an Asset Creator", assetReviews, "No reviews received as an asset creator yet.")}
    </div>
  );
};
