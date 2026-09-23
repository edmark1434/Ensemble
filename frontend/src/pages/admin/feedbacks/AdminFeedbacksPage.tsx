import { useState, useEffect, useMemo } from 'react';
import { MessageSquare, User, Loader2, Calendar, Tag, Star, LayoutDashboard, Filter } from 'lucide-react';
import api from '@/lib/axios';

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
  return `https://ui-avatars.com/api/?name=${cleanName}&background=0D8ABC&color=fff&size=128`;
};

const CATEGORIES = ["All", "General Insight", "Feature Request", "Bug Report", "UI/UX Suggestion"];

const AdminFeedbacksPage = () => {
  const [activeTab, setActiveTab] = useState<'feedbacks' | 'ratings'>('feedbacks');
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const res = await api.get('/api/admin/feedbacks');
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
    fetchFeedbacks();
  }, []);

  const filteredFeedbacks = useMemo(() => {
    if (activeCategory === "All") return feedbacks;
    return feedbacks.filter(f => f.category === activeCategory);
  }, [feedbacks, activeCategory]);

  const totalRatings = ratings.length;
  const averageRating = totalRatings > 0 
    ? (ratings.reduce((acc, curr) => acc + curr.rating, 0) / totalRatings).toFixed(1)
    : "0.0";

  const ratingCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratings.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) {
        counts[r.rating as keyof typeof counts]++;
      }
    });
    return counts;
  }, [ratings]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1.5">
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
        <span className="text-xs font-bold text-amber-400 ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="flex h-screen flex-col pl-[260px] bg-[#06070c]">
      <header className="sticky top-0 z-20 flex h-[72px] shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#06070c]/80 px-8 backdrop-blur-xl">
        <div>
          <h1 className="text-lg font-bold text-white">Platform Feedback</h1>
          <p className="text-xs text-zinc-400">View user suggestions and global platform ratings.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setActiveTab('feedbacks')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'feedbacks' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Suggestions
            </button>
            <button
              onClick={() => setActiveTab('ratings')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'ratings' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <Star className="h-3.5 w-3.5" /> Ratings
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-6xl">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </div>
          ) : activeTab === 'feedbacks' ? (
            <div className="space-y-6">
              {/* Filters for Feedbacks */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`whitespace-nowrap px-4 py-2 text-xs font-semibold rounded-full border transition-all ${
                      activeCategory === cat 
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]' 
                        : 'bg-white/[0.02] border-white/5 text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                    }`}
                  >
                    {cat === "All" ? `All Suggestions (${feedbacks.length})` : cat}
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
                    There are no feedbacks in the "{activeCategory}" category.
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
                        className="rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] transition-colors p-5 flex flex-col gap-4"
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
                                <h4 className="text-sm font-semibold text-zinc-200">
                                  {displayName}
                                </h4>
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
                          <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-medium text-zinc-300 border border-white/10">
                            <Tag className="h-3 w-3 text-blue-400" />
                            {item.category}
                          </div>
                        </div>
                        <div className="pl-12">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                            {item.message}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Ratings Dashboard Overview */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="col-span-1 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-amber-500/10 to-transparent p-6 flex flex-col items-center justify-center text-center">
                  <h3 className="text-sm font-semibold text-zinc-400 mb-2">Global Average</h3>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-5xl font-bold text-amber-400">{averageRating}</span>
                    <span className="text-xl text-zinc-500 font-medium mb-1">/ 5.0</span>
                  </div>
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= Math.round(parseFloat(averageRating)) ? 'fill-amber-400 text-amber-400' : 'fill-white/5 text-white/10'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-zinc-500">Based on {totalRatings} user {totalRatings === 1 ? 'rating' : 'ratings'}</p>
                </div>

                <div className="col-span-1 md:col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                  <h3 className="text-sm font-semibold text-zinc-400 mb-4">Rating Distribution</h3>
                  <div className="space-y-3">
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = ratingCounts[star as keyof typeof ratingCounts];
                      const percent = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <span className="text-xs font-medium text-zinc-400 w-3">{star}</span>
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full transition-all duration-1000" style={{ width: `${percent}%` }} />
                          </div>
                          <span className="text-xs text-zinc-500 w-10 text-right">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Individual Ratings Grid */}
              <div className="pt-4 border-t border-white/[0.06]">
                <h3 className="text-sm font-semibold text-zinc-300 mb-4">Recent Ratings</h3>
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
                          className="rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] transition-colors p-4 flex flex-col gap-4"
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
                              <h4 className="text-sm font-semibold text-zinc-200 truncate max-w-[150px]">
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
                          <div className="pt-3 border-t border-white/5 flex justify-between items-center">
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
      </main>
    </div>
  );
};

export default AdminFeedbacksPage;
