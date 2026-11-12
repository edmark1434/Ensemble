import { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { MessageSquare, Loader2, Calendar, Tag, Star, Filter } from 'lucide-react';
import { peekStaffGet, staffGet } from '@/lib/staffCache';

interface Feedback {
  id: string;
  category: string;
  message: string;
  created_at: string;
  account_id: string | null;
  username: string | null;
  email: string | null;
  profile_picture_url: string | null;
}

interface Rating {
  rating: number;
  updated_at: string;
  account_id: string | null;
  username: string | null;
  email: string | null;
  profile_picture_url: string | null;
}

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

const getFallbackAvatar = (name?: string): string => {
  const cleanName = encodeURIComponent((name || 'User').trim());
  return `https://ui-avatars.com/api/?name=${cleanName}&background=71717a&color=fff&size=128`;
};

const CATEGORIES = ['All', 'General Insight', 'Feature Request', 'Bug Report', 'UI/UX Suggestion'];

const FEEDBACKS_URL = '/api/admin/feedbacks';

const cachedFeedbacks = (): { feedbacks: Feedback[]; ratings: Rating[] } | null => {
  const cached = peekStaffGet(FEEDBACKS_URL);
  if (!cached) return null;
  if (cached.data?.data?.feedbacks) {
    return { feedbacks: cached.data.data.feedbacks, ratings: cached.data.data.ratings || [] };
  }
  return { feedbacks: Array.isArray(cached.data?.data) ? cached.data.data : [], ratings: [] };
};

/** Platform feedback content for Analytics → Feedback. */
export function AdminFeedbacksPanel() {
  const [activeTab, setActiveTab] = useState<'feedbacks' | 'ratings'>('feedbacks');
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(() => cachedFeedbacks()?.feedbacks ?? []);
  const [ratings, setRatings] = useState<Rating[]>(() => cachedFeedbacks()?.ratings ?? []);
  const [isLoading, setIsLoading] = useState(() => !cachedFeedbacks());
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const res = await staffGet(FEEDBACKS_URL);
        if (res.data?.data?.feedbacks) {
          setFeedbacks(res.data.data.feedbacks);
          setRatings(res.data.data.ratings || []);
        } else {
          setFeedbacks(Array.isArray(res.data?.data) ? res.data.data : []);
        }
      } catch (error) {
        console.error('Error fetching feedbacks:', error);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchFeedbacks();
  }, []);

  const filteredFeedbacks = useMemo(() => {
    if (activeCategory === 'All') return feedbacks;
    return feedbacks.filter((f) => f.category === activeCategory);
  }, [feedbacks, activeCategory]);

  const totalRatings = ratings.length;
  const averageRating =
    totalRatings > 0
      ? (ratings.reduce((acc, curr) => acc + curr.rating, 0) / totalRatings).toFixed(1)
      : '0.0';

  const ratingCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratings.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) {
        counts[r.rating as keyof typeof counts]++;
      }
    });
    return counts;
  }, [ratings]);

  const renderStars = (rating: number) => (
    <div className="ml-1 flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3.5 w-3.5 ${
              star <= rating ? 'fill-amber-400 text-amber-400' : 'fill-white/5 text-white/10'
            }`}
          />
        ))}
      </div>
      <span className="text-xs font-bold text-amber-400">{rating.toFixed(1)}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Platform feedback</h2>
          <p className="mt-1 text-sm text-zinc-500">
            User suggestions and global platform ratings from the public feedback form.
          </p>
        </div>
        <div className="inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-white/[0.08] bg-[#14151c] p-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('feedbacks')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
              activeTab === 'feedbacks'
                ? 'bg-rose-500/15 text-white shadow-[inset_0_0_0_1px_rgba(244,63,94,0.35)]'
                : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            <MessageSquare className={`h-4 w-4 ${activeTab === 'feedbacks' ? 'text-rose-400' : ''}`} />
            Suggestions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ratings')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
              activeTab === 'ratings'
                ? 'bg-rose-500/15 text-white shadow-[inset_0_0_0_1px_rgba(244,63,94,0.35)]'
                : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            <Star className={`h-4 w-4 ${activeTab === 'ratings' ? 'text-rose-400' : ''}`} />
            Ratings
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      ) : activeTab === 'feedbacks' ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
                  activeCategory === cat
                    ? 'border-rose-400/40 bg-rose-500/10 text-rose-200'
                    : 'border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                }`}
              >
                {cat === 'All' ? `All Suggestions (${feedbacks.length})` : cat}
              </button>
            ))}
          </div>

          {filteredFeedbacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center">
              <div className="mb-4 rounded-full bg-white/5 p-4 text-zinc-400">
                <Filter className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-white">No Feedbacks Found</h3>
              <p className="mt-1 text-sm text-zinc-400">
                There are no feedbacks in the &quot;{activeCategory}&quot; category.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredFeedbacks.map((item) => {
                const displayName = item.account_id ? item.username || 'Registered User' : 'Anonymous';
                const avatar = constructAvatarUrl(item.profile_picture_url) || getFallbackAvatar(displayName);

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 rounded-xl border border-white/[0.04] bg-white/[0.01] p-5 transition-colors hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={avatar}
                          alt="Avatar"
                          className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.src.includes('ui-avatars.com')) {
                              target.src = getFallbackAvatar(displayName);
                            }
                          }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-zinc-200">{displayName}</h4>
                            {item.account_id && item.email && (
                              <span className="text-xs text-zinc-600">({item.email})</span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-zinc-500">
                            <Calendar className="h-3 w-3" />
                            {new Date(item.created_at).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-zinc-300">
                        <Tag className="h-3 w-3 text-rose-400" />
                        {item.category}
                      </div>
                    </div>
                    <div className="pl-12">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{item.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="col-span-1 flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-amber-500/5 p-6 text-center">
              <h3 className="mb-2 text-sm font-semibold text-zinc-400">Global Average</h3>
              <div className="mb-2 flex items-end gap-2">
                <span className="text-5xl font-bold text-amber-400">{averageRating}</span>
                <span className="mb-1 text-xl font-medium text-zinc-500">/ 5.0</span>
              </div>
              <div className="mb-3 flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${
                      star <= Math.round(parseFloat(averageRating))
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-white/5 text-white/10'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-zinc-500">
                Based on {totalRatings} user {totalRatings === 1 ? 'rating' : 'ratings'}
              </p>
            </div>

            <div className="col-span-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 md:col-span-2">
              <h3 className="mb-4 text-sm font-semibold text-zinc-400">Rating Distribution</h3>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingCounts[star as keyof typeof ratingCounts];
                  const percent = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <span className="w-3 text-xs font-medium text-zinc-400">{star}</span>
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all duration-1000"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs text-zinc-500">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-4">
            <h3 className="mb-4 text-sm font-semibold text-zinc-300">Recent Ratings</h3>
            {ratings.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center">
                <div className="mb-4 rounded-full bg-white/5 p-4 text-zinc-400">
                  <Star className="h-8 w-8" />
                </div>
                <p className="text-sm text-zinc-400">
                  When users rate the platform, their scores will appear here.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {ratings.map((item, idx) => {
                  const displayName = item.account_id ? item.username || 'Registered User' : 'Anonymous';
                  const avatar = constructAvatarUrl(item.profile_picture_url) || getFallbackAvatar(displayName);

                  return (
                    <div
                      key={item.account_id || idx}
                      className="flex flex-col gap-4 rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 transition-colors hover:bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={avatar}
                          alt="Avatar"
                          className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.src.includes('ui-avatars.com')) {
                              target.src = getFallbackAvatar(displayName);
                            }
                          }}
                        />
                        <div>
                          <h4 className="max-w-[150px] truncate text-sm font-semibold text-zinc-200">
                            {displayName}
                          </h4>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-zinc-500">
                            <Calendar className="h-3 w-3" />
                            {new Date(item.updated_at).toLocaleString(undefined, {
                              dateStyle: 'medium',
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-white/5 pt-3">
                        <span className="text-xs font-medium text-zinc-500">Rating</span>
                        {renderStars(item.rating)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Legacy route → Analytics Feedback. */
export default function AdminFeedbacksPage() {
  return <Navigate to="/admin/analytics?tab=feedback" replace />;
}
