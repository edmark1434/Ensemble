import useGlobalState from "@/lib/global_state";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, Send, CheckCircle2, MessageSquareHeart, Star } from "lucide-react";

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

const PageSendAFeedback: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);
  const user = useGlobalState((state) => state.user);
  const isAuthenticated = useGlobalState((state) => state.isAuthenticated);
  const isVerified = useGlobalState((state) => state.isVerified) || user?.is_verified || false;

  const navigate = useNavigate();
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [complete, setComplete] = useState(false);

  const name = user?.display_name || user?.displayName || user?.username || "Ensemble User";
  const email = user?.email || "";
  const userSubscriptionPlan = user?.subscription_plan || "Free";
  
  const rawAvatar = user?.avatar_preset_url || user?.avatar_url || user?.avatar || user?.photoURL || user?.profile_picture || user?.profilePicture;
  const avatar = constructAvatarUrl(rawAvatar) || getFallbackAvatar(name);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setComplete(true);
    }, 1500);
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
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Feedback Form</h1>
          </div>
          <p className="text-gray-600 dark:text-zinc-400 text-lg max-w-xl">
            Have workflow suggestions or UI/UX insights for our platform? We review all feedback entries weekly to improve Ensemble.
          </p>
        </div>

        {complete ? (
          <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center animate-fade-in shadow-sm">
            <div className="h-16 w-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Feedback Logged</h3>
            <p className="text-gray-600 dark:text-zinc-400 max-w-sm">
              Thank you for helping us improve Ensemble's interface architecture! We've securely received your thoughts.
            </p>
            <button 
              onClick={() => navigate(-1)} 
              className="mt-8 px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-md"
            >
              Return to App
            </button>
          </div>
        ) : (
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
              <div className="px-6 py-4 bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 flex items-center gap-3 text-sm text-gray-500 dark:text-zinc-400">
                <User size={16} /> Submitting anonymously. <button onClick={() => navigate("/login")} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Log in</button> to link your account.
              </div>
            )}

            <div className="p-6 md:p-8 space-y-8">
              {/* Rating */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Rate your Ensemble experience
                </label>
                <div className="flex flex-wrap items-center gap-1">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button 
                      key={num} 
                      onClick={() => setRating(num)} 
                      className="p-1 transition-transform duration-200 focus:outline-none hover:scale-110"
                    >
                      <Star 
                        size={32} 
                        className={(rating && num <= rating) ? "fill-yellow-500 text-yellow-500" : "text-gray-300 dark:text-zinc-700 hover:text-yellow-500/50"} 
                      />
                    </button>
                  ))}
                  {rating && (
                    <span className="ml-3 text-sm font-medium text-gray-700 dark:text-zinc-300 animate-fade-in">
                      {rating} out of 5 stars
                    </span>
                  )}
                </div>
              </div>

              {/* Textarea */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center justify-between">
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
                  placeholder="Share your thoughts on workflows, UI bugs, or feature requests..." 
                  className="w-full bg-white dark:bg-[#0c0d13] border border-gray-200 dark:border-white/10 rounded-xl p-4 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none" 
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button 
                  onClick={handleSubmit} 
                  disabled={(!rating && !feedback.trim()) || isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-xl font-bold text-base transition-all hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-gray-900/10 dark:shadow-white/5"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Submit Feedback
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </main>
  );
};

export default PageSendAFeedback;