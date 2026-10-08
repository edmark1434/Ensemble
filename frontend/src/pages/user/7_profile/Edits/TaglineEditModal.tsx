import React, { useState, useEffect } from "react";
import { X, Check, Tag, RefreshCw } from "lucide-react";
import api from "@/lib/axios.ts";
import { toast } from "react-hot-toast";

interface TaglineEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTagline: string;
  subscriptionType?: string;
  onSave: (newTagline: string) => void;
}

const SUGGESTED_TAGLINES = [
  "Senior Video Editor",
  "Motion Graphics Artist",
  "Colorist & Finisher",
  "Sound Designer",
  "Music Producer",
  "VFX Specialist",
  "Creative Director",
  "Content Creator",
  "YouTube Editor",
  "Documentary Editor",
  "Audio Engineer",
  "3D Animator",
  "Podcast Editor",
  "Post-Production Pro",
  "Cinematographer",
  "Thumbnail Designer",
  "Narrative Editor",
  "Commercial Editor",
  "Short-Form Video Pro",
  "TikTok & Reels Editor",
  "Live Stream Producer",
  "Foley Artist",
  "Voiceover Actor",
  "Dialogue Editor",
  "Mixing & Mastering Eng",
  "Audio Restoration",
  "Subtitling Specialist",
  "Visual Storyteller",
  "Lead Animator",
  "Character Animator",
  "Compositing Artist",
  "Drone Videographer",
  "Production Assistant",
  "Lighting Technician",
  "Scriptwriter",
  "Trailer Editor",
  "Music Video Editor",
  "Corporate Video Editor",
  "Gaming Video Editor",
  "Broadcast Editor"
];

const shuffleArray = (array: string[]) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function TaglineEditModal({
  isOpen,
  onClose,
  currentTagline,
  subscriptionType = "Free",
  onSave,
}: TaglineEditModalProps) {
  const [tagline, setTagline] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const shuffleSuggestions = () => {
    setSuggestions(shuffleArray(SUGGESTED_TAGLINES).slice(0, 5));
  };

  useEffect(() => {
    if (isOpen) {
      setTagline(currentTagline || "");
      shuffleSuggestions();
    }
  }, [isOpen, currentTagline]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await api.put("/api/accounts/update-profile-details", {
        original: { tagline: currentTagline },
        updates: { tagline: tagline.trim() },
      });

      if (response.data.success) {
        toast.success("Tagline updated successfully");
        onSave(tagline.trim());
        onClose();
      } else {
        toast.error(response.data.message || "Failed to update tagline");
      }
    } catch (error: any) {
      console.error("Error updating tagline:", error);
      toast.error(error.response?.data?.message || "Failed to update tagline");
    } finally {
      setIsLoading(false);
    }
  };

  const getBadgeStyle = () => {
    if (subscriptionType === "Business") return "animate-rainbow";
    if (subscriptionType === "Premium") return "animate-gold-solid";
    return "silver-solid";
  };

  return (
    <div className="fixed inset-0 z-[200000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-['Plus Jakarta Sans',sans-serif]">
      <div className="relative w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base p-6 shadow-2xl text-gray-900 dark:text-white transition-all duration-300">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 transition disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-bold tracking-tight mb-2">Edit Tagline</h2>
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6 leading-relaxed">
          Your tagline is a short, punchy title that appears next to your name. It helps others quickly understand your expertise or role.
        </p>

        <div className="space-y-6">
          {/* Live Preview */}
          <div>
            <label className="block text-[11px] font-medium text-gray-600 dark:text-zinc-400 mb-2">Live Preview</label>
            <div className="flex justify-center p-4 rounded-xl border border-dashed border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-white/5">
              <span className={`flex items-center gap-1 text-sm font-bold px-2.5 py-0.5 rounded-lg ${getBadgeStyle()}`}>
                <Tag className="w-3.5 h-3.5" />
                {tagline.trim() || "Your Tagline"}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-600 dark:text-zinc-400 mb-1">Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              disabled={isLoading}
              maxLength={30}
              className={`w-full rounded-lg border bg-white dark:bg-white/5 px-3 py-2 text-[13px] outline-none transition disabled:opacity-50 border-gray-300 dark:border-white/10 focus:border-blue-500/50`}
              placeholder="e.g., Music Scientist"
              autoFocus
            />
            <div className={`text-right text-[10px] mt-1 ${tagline.length >= 30 ? 'text-red-500' : tagline.length >= 25 ? 'text-yellow-500' : 'text-gray-500 dark:text-zinc-500'}`}>
              {tagline.length}/30
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] font-medium text-gray-600 dark:text-zinc-400">
                Suggested Taglines
              </label>
              <button
                type="button"
                onClick={shuffleSuggestions}
                className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-600 transition"
              >
                <RefreshCw className="w-3 h-3" /> Shuffle
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setTagline(sug)}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/10 transition"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 border-t border-gray-200 dark:border-white/10 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-zinc-400 text-xs font-semibold rounded-lg hover:text-gray-900 dark:hover:text-white transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-blue-600 transition shadow-lg shadow-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                Saving...
              </>
            ) : (
              <>
                Save Changes <Check className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
