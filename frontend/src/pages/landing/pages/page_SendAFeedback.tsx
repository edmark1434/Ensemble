import useGlobalState from "@/lib/global_state";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, Send, CheckCircle2, MessageSquareHeart, Star, MessageSquarePlus, Tag } from "lucide-react";
import api from "@/lib/axios";
import { showSuccessToast, showErrorToast } from "@/components/utility/toast";

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

const getSubscriptionIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "premium":
      return "/icons/subscription/premium.png";
    case "business":
      return "/icons/subscription/studio.png";
    default:
      return "/icons/subscription/freemium.png";
  }
};

const CATEGORIES = ["General Insight", "Feature Request", "Bug Report", "UI/UX Suggestion"];

const PageSendAFeedback: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);
  const user = useGlobalState((state) => state.user);
  const isAuthenticated = useGlobalState((state) => state.isAuthenticated);
  const isVerified = useGlobalState((state) => state.isVerified) || user?.is_verified || false;

  const navigate = useNavigate();
  
  // UI State
  const [activeTab, setActiveTab] = useState<'rating' | 'suggestion'>('rating');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rating State
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [initialRating, setInitialRating] = useState<number | null>(null);
  
  // Suggestion State
  const [feedback, setFeedback] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);

  const name = user?.display_name || user?.displayName || user?.username || "Ensemble User";
  const email = user?.email || "";
  const userSubscriptionPlan = user?.subscription_plan || "Free";
  
  const rawAvatar = user?.avatar_preset_url || user?.avatar_url || user?.avatar || user?.photoURL || user?.profile_picture || user?.profilePicture;
  const avatar = constructAvatarUrl(rawAvatar) || getFallbackAvatar(name);

  // Fetch initial rating on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchRating = async () => {
      try {
        const res = await api.get('/api/feedbacks/rating');
        if (res.data?.rating) {
          setRating(res.data.rating);
          setInitialRating(res.data.rating);
        }
      } catch (err) {
        console.error("Failed to fetch rating:", err);
      }
    };
    fetchRating();
  }, [isAuthenticated]);

  const handleSubmitRating = async () => {
    if (!rating) return;
    setIsSubmitting(true);
    try {
      await api.put('/api/feedbacks/rating', { rating });
      setInitialRating(rating);
      showSuccessToast("Your global rating has been updated!");
    } catch (error) {
      console.error('Error submitting rating:', error);
      showErrorToast("Failed to update rating.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post('/api/feedbacks', {
        category,
        message: feedback.trim()
      });
      setFeedback(""); // Reset
      showSuccessToast("Feedback received! Thank you.");
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showErrorToast("Failed to submit feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[#080a12] text-gray-900 dark:text-gray-100 p-6 md:p-12 font-sans relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-[-20%] left-[50%] w-[600px] h-[400px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10 animate-fade-in">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={16} /> Back to Ensemble
        </button>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
              <MessageSquareHeart size={20} />
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Feedback Center</h1>
          </div>
          <p className="text-gray-600 dark:text-zinc-400 text-lg max-w-xl">
            Help us shape the future of Ensemble. Update your global rating or submit actionable suggestions to our engineering team.
          </p>
        </div>

        <div className="bg-white dark:bg-[#11131e] border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
          
          {/* User Info Bar */}
          {isAuthenticated ? (
            <div className="px-6 py-4 bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 flex items-center gap-4">
              {avatar ? (
                <img src={avatar} alt="Profile" className="h-10 w-10 rounded-full object-cover ring-2 ring-gray-200 dark:ring-white/10" onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('ui-avatars.com')) {
                    target.src = getFallbackAvatar(name);
                  }
                }} />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center">
                  <User size={18} className="text-gray-500 dark:text-zinc-400" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{name}</p>
                <p className="text-xs text-gray-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                  <Mail size={10} /> {email || "No email linked"}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2 bg-gray-100 dark:bg-white/5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/10">
                <img src={isVerified ? "/icons/verification/lvl2_verified.png" : "/icons/verification/lvl1_verified.png"} alt={isVerified ? "Verified User" : "Unverified User"} className="w-4 h-4 object-contain" title={isVerified ? "Verified" : "Unverified"} />
                <img src={getSubscriptionIcon(userSubscriptionPlan)} alt={`${userSubscriptionPlan} Tier`} className="h-4 w-4 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]" />
              </div>
            </div>
          ) : (
            <div className="px-6 py-4 bg-red-50 dark:bg-red-500/10 border-b border-red-200 dark:border-red-500/20 flex items-center gap-3 text-sm text-red-600 dark:text-red-400">
              <User size={16} /> You must be logged in to submit feedback or rate the platform. <button onClick={() => navigate("/login")} className="font-bold underline hover:text-red-700 dark:hover:text-red-300">Log in here</button>.
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-white/10">
            <button 
              onClick={() => setActiveTab('rating')}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors ${activeTab === 'rating' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-500/5' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-50 dark:hover:bg-white/[0.02]'}`}
            >
              <Star size={16} />
              Rate Platform
            </button>
            <button 
              onClick={() => setActiveTab('suggestion')}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors ${activeTab === 'suggestion' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-500/5' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-50 dark:hover:bg-white/[0.02]'}`}
            >
              <MessageSquarePlus size={16} />
              Submit Feedback
            </button>
          </div>

          <div className="p-6 md:p-8">
            {activeTab === 'rating' ? (
              <div className="space-y-8 animate-fade-in">
                <div className="text-center py-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {initialRating ? "Update your global rating" : "How would you rate Ensemble?"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 mb-8 max-w-sm mx-auto">
                    Your rating helps us gauge overall platform satisfaction. You can update this at any time!
                  </p>
                  <div className="flex justify-center items-center gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button 
                        key={num} 
                        onClick={() => setRating(num)} 
                        onMouseEnter={() => setHoverRating(num)}
                        onMouseLeave={() => setHoverRating(0)}
                        disabled={!isAuthenticated || isSubmitting}
                        className="p-2 transition-transform duration-200 focus:outline-none hover:scale-110 disabled:hover:scale-100 disabled:opacity-50"
                      >
                        <Star 
                          size={48} 
                          className={(hoverRating ? num <= hoverRating : num <= rating) ? "fill-yellow-500 text-yellow-500 drop-shadow-[0_0_12px_rgba(234,179,8,0.4)]" : "text-gray-300 dark:text-zinc-700 hover:text-yellow-500/50 transition-colors"} 
                        />
                      </button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <span className="text-base font-bold text-gray-900 dark:text-white animate-fade-in">
                      {rating}.0 out of 5
                    </span>
                  )}
                </div>
                <div className="pt-2">
                  <button 
                    onClick={handleSubmitRating} 
                    disabled={!isAuthenticated || rating === 0 || isSubmitting || rating === initialRating}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-xl font-bold text-base transition-all hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-gray-900/10 dark:shadow-white/5"
                  >
                    {isSubmitting ? (
                      <><div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Updating...</>
                    ) : rating === initialRating ? (
                      <><CheckCircle2 size={18} /> Rating is Up to Date</>
                    ) : (
                      <><Star size={18} /> {initialRating ? "Update Rating" : "Submit Rating"}</>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                {/* Category Dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Tag size={16} className="text-gray-500 dark:text-zinc-400" />
                    Feedback Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={!isAuthenticated || isSubmitting}
                    className="w-full bg-white dark:bg-[#0c0d13] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow disabled:opacity-50"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Textarea */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center justify-between">
                    <span>What could we do better?</span>
                    <span className={`font-normal text-xs ${feedback.length >= 1500 ? "text-red-500" : "text-gray-400 dark:text-zinc-500"}`}>
                      {feedback.length} / 1500
                    </span>
                  </label>
                  <textarea 
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value.substring(0, 1500))}
                    maxLength={1500}
                    rows={5} 
                    disabled={!isAuthenticated || isSubmitting}
                    placeholder="Share your workflows, feature requests, or any bugs you've encountered..." 
                    className="w-full bg-white dark:bg-[#0c0d13] border border-gray-200 dark:border-white/10 rounded-xl p-4 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none disabled:opacity-50" 
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button 
                    onClick={handleSubmitFeedback} 
                    disabled={!isAuthenticated || !feedback.trim() || isSubmitting}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-xl font-bold text-base transition-all hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-gray-900/10 dark:shadow-white/5"
                  >
                    {isSubmitting ? (
                      <><div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Sending...</>
                    ) : (
                      <><Send size={18} /> Submit Feedback</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </main>
  );
};

export default PageSendAFeedback;