import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, MessageSquare, Loader2, Sparkles, Briefcase, ExternalLink } from "lucide-react";
import api from "@/lib/axios";

export type ReviewFilter = "All" | "Gig Services" | "Job Posts" | "As Freelancer" | "As a Client" | "As a Team" | "Asset Creation";

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
  is_team?: boolean;
  reviewer_role?: 'Freelancer' | 'Client' | 'Team Leader' | string;
  contract_type?: "gig" | "job" | "contract";
  project_title?: string;
  gig_id?: string;
  job_id?: string;
  tier_name?: string;
  reviewer_account_id?: string;
  reviewer_handle?: string;
  reviewer_name: string;
  reviewer_avatar: string;
}

interface RatingTierStyle {
  label: string;
  badgeClass: string;
  starColor: string;
}

const RATING_TIER_STYLES: Record<number, RatingTierStyle> = {
  1: {
    label: "Poor",
    badgeClass: "text-rose-800 dark:text-rose-300 bg-rose-100/90 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/30",
    starColor: "text-rose-500 fill-rose-500",
  },
  2: {
    label: "Fair",
    badgeClass: "text-orange-800 dark:text-orange-300 bg-orange-100/90 dark:bg-orange-500/15 border-orange-300 dark:border-orange-500/30",
    starColor: "text-orange-500 fill-orange-500",
  },
  3: {
    label: "Good",
    badgeClass: "text-amber-800 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/30",
    starColor: "text-amber-500 fill-amber-500",
  },
  4: {
    label: "Very Good",
    badgeClass: "text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-500/15 border-emerald-400 dark:border-emerald-500/40",
    starColor: "text-emerald-500 fill-emerald-500",
  },
  5: {
    label: "Exceptional",
    badgeClass: "text-indigo-950 dark:text-purple-200 bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 dark:from-blue-500/20 dark:via-indigo-500/20 dark:to-purple-500/25 border-indigo-400 dark:border-purple-400/50 font-bold",
    starColor: "text-amber-500 fill-amber-500",
  },
};

const constructAvatarUrl = (path?: string | null): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const presetMatch = path.match(/p\d+\.png$/i);
  if (presetMatch) {
    return `/profile_presets/${presetMatch[0]}`;
  }
  const cloudfrontUrl = (import.meta.env.VITE_CLOUDFRONT_URL || '').replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  if (cloudfrontUrl) {
    return `${cloudfrontUrl}/${cleanPath}`;
  }
  return `/${cleanPath}`;
};

const ReviewItem: React.FC<{ review: Review }> = ({ review }) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const avatarUrl = constructAvatarUrl(review.reviewer_avatar);

  const handleNavigateToReviewer = () => {
    if (review.reviewer_account_id) {
      navigate(`/profile/${review.reviewer_account_id}`);
    }
  };

  const isClickable = Boolean(review.reviewer_account_id);

  const handleNavigateToSource = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (review.contract_type === 'gig' && review.gig_id) {
      navigate(`/gigs/services/${review.gig_id}/page`);
    } else if (review.contract_type === 'job' && review.job_id) {
      navigate(`/jobs/${review.job_id}/page`);
    }
  };

  const ratingNum = Math.max(1, Math.min(5, Math.round(Number(review.stars_out_of_five || 5))));
  const tier = RATING_TIER_STYLES[ratingNum] || RATING_TIER_STYLES[5];

  // Resolve reviewer role (defaulting intelligently based on role_type if not returned)
  const resolvedRole = review.reviewer_role || (review.role_type === 'client' ? 'Freelancer' : 'Client');

  return (
    <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-2xs hover:border-gray-300 dark:hover:border-white/20 transition-all flex flex-col gap-3 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header: Reviewer info + Stars rating */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div
          onClick={handleNavigateToReviewer}
          className={`flex items-center gap-3 transition-opacity ${
            isClickable ? "cursor-pointer group/reviewer select-none hover:opacity-90" : ""
          }`}
          role={isClickable ? "button" : undefined}
          tabIndex={isClickable ? 0 : undefined}
          onKeyDown={(e) => {
            if (isClickable && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              handleNavigateToReviewer();
            }
          }}
          title={isClickable ? `View ${review.reviewer_name || "user"}'s profile` : undefined}
        >
          <div className={`w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-dark-elevated shrink-0 transition-transform ${isClickable ? "group-hover/reviewer:scale-105" : ""}`}>
            {avatarUrl && !imgError ? (
              <img
                src={avatarUrl}
                alt={review.reviewer_name}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                {review.reviewer_name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-gray-500 dark:text-zinc-400 font-normal">
                Rating By:
              </span>
              <h4 className={`text-sm font-bold text-gray-900 dark:text-white transition-colors ${isClickable ? "group-hover/reviewer:text-blue-500 group-hover/reviewer:underline" : ""}`}>
                {review.reviewer_name || "Unknown User"}
              </h4>
              
              {/* Tag: Freelancer / Client / Team Leader */}
              {resolvedRole === 'Team Leader' ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                  Team Leader
                </span>
              ) : resolvedRole === 'Client' ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  Client
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Freelancer
                </span>
              )}
            </div>
            
            <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium uppercase tracking-wider block mt-0.5">
              {review.created_at ? new Date(review.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "Recently"}
            </span>
          </div>
        </div>

        {/* Rating Stars + Tier Tag (e.g. ★★★★★ Exceptional) */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 shrink-0 self-start sm:self-auto shadow-2xs">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-3.5 h-3.5 ${
                  s <= ratingNum ? tier.starColor : "text-gray-300 dark:text-zinc-600"
                }`}
              />
            ))}
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${tier.badgeClass}`}>
            {tier.label}
          </span>
        </div>
      </div>

      {/* Engagement Reference Indicators (Neutral Gray) */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100 dark:border-white/5">
        {/* Source Project / Gig / Job Indicator (Styled in Gray) */}
        {review.contract_type === 'gig' ? (
          <button
            type="button"
            onClick={handleNavigateToSource}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 transition cursor-pointer text-left"
            title="View Gig Service Details"
          >
            <Sparkles className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400 shrink-0" />
            <span className="line-clamp-1 max-w-[280px]">
              Gig: {review.project_title || "Gig Service"}
            </span>
            <ExternalLink className="w-3 h-3 text-gray-400 shrink-0 opacity-60" />
          </button>
        ) : review.contract_type === 'job' ? (
          <button
            type="button"
            onClick={handleNavigateToSource}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 transition cursor-pointer text-left"
            title="View Job Post"
          >
            <Briefcase className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400 shrink-0" />
            <span className="line-clamp-1 max-w-[280px]">
              Job: {review.project_title || "Job Contract"}
            </span>
            <ExternalLink className="w-3 h-3 text-gray-400 shrink-0 opacity-60" />
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/10">
            <Briefcase className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <span>{review.project_title || "Direct Contract"}</span>
          </span>
        )}

        {/* Tier sub-indicator if gig */}
        {review.tier_name && (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-white/10">
            {review.tier_name}
          </span>
        )}
      </div>
      
      {/* Feedback Body */}
      {review.feedback ? (
        <p className="text-xs sm:text-sm text-gray-700 dark:text-zinc-300 leading-relaxed bg-gray-50 dark:bg-dark-elevated p-3.5 rounded-xl border border-gray-200 dark:border-white/5 italic whitespace-pre-wrap break-words">
          "{review.feedback}"
        </p>
      ) : (
        <p className="text-xs text-gray-400 dark:text-zinc-500 italic">
          No written feedback provided.
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

  const gigCount = reviews.filter(r => r.contract_type === 'gig').length;
  const jobCount = reviews.filter(r => r.contract_type === 'job').length;
  const freelancerCount = reviews.filter(r => r.role_type === 'freelancer').length;
  const clientCount = reviews.filter(r => r.role_type === 'client').length;
  const teamCount = reviews.filter(r => Boolean(r.is_team)).length;

  const filteredReviews = reviews.filter(r => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Gig Services") return r.contract_type === 'gig';
    if (activeFilter === "Job Posts") return r.contract_type === 'job';
    if (activeFilter === "As Freelancer") return r.role_type === 'freelancer';
    if (activeFilter === "As a Client") return r.role_type === 'client';
    if (activeFilter === "As a Team") return Boolean(r.is_team);
    if (activeFilter === "Asset Creation") return r.role_type === 'asset' || r.role_type === 'unknown';
    return true;
  });

  const getEmptyMsg = () => {
    if (activeFilter === "Gig Services") return "No gig service reviews received yet.";
    if (activeFilter === "Job Posts") return "No job contract reviews received yet.";
    if (activeFilter === "As Freelancer") return "No reviews received as a freelancer yet.";
    if (activeFilter === "As a Client") return "No reviews received as a client yet.";
    if (activeFilter === "As a Team") return "No reviews received as a team yet.";
    if (activeFilter === "Asset Creation") return "No reviews received as an asset creator yet.";
    return "No verified reviews recorded for this account yet.";
  };

  const filterTabs: { key: ReviewFilter; label: string; count: number }[] = [
    { key: "All", label: "All Reviews", count: reviews.length },
    { key: "Gig Services", label: "Gigs", count: gigCount },
    { key: "Job Posts", label: "Job Posts", count: jobCount },
    { key: "As Freelancer", label: "As Freelancer", count: freelancerCount },
    { key: "As a Client", label: "As Client", count: clientCount },
    { key: "As a Team", label: "As Team", count: teamCount },
  ];

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header and Filter Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 dark:border-white/10 gap-3">
        <div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            Verified Feedback & Reviews
            <span className="text-xs font-normal text-gray-400 dark:text-zinc-500">
              ({reviews.length})
            </span>
          </h4>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            Real performance feedback received from completed contracts, jobs, and gig services.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFilter === tab.key
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xs"
                  : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`ml-1.5 font-mono text-[10px] ${activeFilter === tab.key ? "opacity-80" : "text-gray-400 dark:text-zinc-500"}`}>
                ({tab.count})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Reviews Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
          <span className="text-xs text-gray-500 dark:text-zinc-400">Loading reviews...</span>
        </div>
      ) : filteredReviews.length > 0 ? (
        <div className="grid gap-3.5">
          {filteredReviews.map((r) => (
            <ReviewItem key={r.rating_id} review={r} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-gray-50 dark:bg-white/[0.02] rounded-2xl border border-dashed border-gray-300 dark:border-white/10">
          <MessageSquare className="h-8 w-8 text-gray-400 dark:text-zinc-600 mb-2 opacity-50" />
          <p className="text-xs font-semibold text-gray-700 dark:text-zinc-300">{getEmptyMsg()}</p>
          <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1 max-w-sm">
            Reviews automatically appear here after an escrow milestone or contract closes.
          </p>
        </div>
      )}
    </div>
  );
};
