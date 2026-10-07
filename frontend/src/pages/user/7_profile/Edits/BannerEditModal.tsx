import { useEffect, useState } from "react";
import { X, Check, AlertTriangle, Trash2 } from "lucide-react";
import { PROFILE_BANNER_GROUPS, bannerPresetLabel, bannerPresetUrl } from "@/lib/profileBanners";

interface BannerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bannerPreset: string | null) => Promise<void>;
  currentBanner?: string | null;
}

export default function BannerEditModal({ isOpen, onClose, onSave, currentBanner = null }: BannerEditModalProps) {
  const [selected, setSelected] = useState<string | null>(currentBanner);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setSelected(currentBanner);
    setIsSaved(false);
    setError("");
  }, [isOpen, currentBanner]);

  if (!isOpen) return null;

  const previewUrl = bannerPresetUrl(selected);
  const isUnchanged = selected === currentBanner;

  const handleSave = async () => {
    if (isSaving || isSaved) return;
    setIsSaving(true);
    setError("");
    try {
      await onSave(selected);
      setIsSaved(true);
      setTimeout(onClose, 300);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save banner. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-gray-200 dark:border-white/10 bg-white/95 dark:bg-dark-base/95 backdrop-blur-md p-6 shadow-2xl font-['Plus Jakarta Sans',sans-serif] max-h-[90vh] flex flex-col overflow-hidden">
        <button
          onClick={handleClose}
          disabled={isSaving}
          className="absolute right-4 top-4 rounded-full bg-gray-100 dark:bg-white/10 p-1.5 text-gray-500 dark:text-zinc-400 transition hover:bg-gray-200 dark:hover:bg-white/20 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-1 min-h-0 flex-col items-center text-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Update Profile Banner</h3>
          <p className="text-gray-500 dark:text-zinc-400 text-xs mb-5 max-w-sm leading-relaxed">
            Choose one of our curated banner presets to display across the top of your profile.
          </p>

          {currentBanner && isUnchanged && (
            <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400 text-xs">
              <Check className="h-3 w-3" />
              <span>Current banner selected</span>
            </div>
          )}

          <div
            className={`w-full shrink-0 aspect-[851/315] rounded-xl overflow-hidden border-2 border-dashed mb-6 bg-gray-100 dark:bg-[#13151f] flex items-center justify-center transition-colors ${
              selected ? "border-[#4a6fa5]" : "border-gray-300 dark:border-[#2a2d3e]"
            }`}
          >
            {previewUrl ? (
              <img src={previewUrl} alt={bannerPresetLabel(selected as string)} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-medium text-gray-400 dark:text-zinc-500">No banner selected</span>
            )}
          </div>

          {error && (
            <div className="w-full mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-xs text-left leading-relaxed">{error}</p>
            </div>
          )}

          <div className="w-full text-left flex flex-1 min-h-0 flex-col">
            <div className="flex shrink-0 items-center justify-between mb-3">
              <label className="block text-gray-500 dark:text-zinc-500 text-xs font-semibold tracking-wider uppercase">
                Banner Presets
              </label>
              {selected && (
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  disabled={isSaving || isSaved}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 dark:text-red-400 transition-colors hover:bg-red-500/20 hover:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove banner
                </button>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto scroll-thin -mr-3 pr-3 mb-4 divide-y divide-gray-200 dark:divide-white/10 border-y border-gray-200 dark:border-white/10">
            {PROFILE_BANNER_GROUPS.map((group) => (
            <section key={group.label} className="py-4">
              <div className="mb-2 flex items-center gap-2">
                <h4 className="text-[11px] font-semibold text-gray-700 dark:text-zinc-300">{group.label}</h4>
                {group.note && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">{group.note}</span>
                )}
              </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 p-1">
              {group.presets.map((preset) => {
                const isActive = selected === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSelected(preset)}
                    disabled={isSaving || isSaved}
                    title={bannerPresetLabel(preset)}
                    className="group flex flex-col gap-1.5 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span
                      className={`relative block w-full aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-[#13151f] border-2 transition-all duration-200 group-hover:scale-[1.03] ${
                        isActive
                          ? "border-[#4a6fa5] shadow-[0_0_12px_rgba(74,111,165,0.3)]"
                          : "border-transparent group-hover:border-gray-300 dark:group-hover:border-zinc-500"
                      }`}
                    >
                      <img src={bannerPresetUrl(preset) as string} alt={bannerPresetLabel(preset)} loading="lazy" className="w-full h-full object-cover" />
                      {isActive && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Check className="h-4 w-4 text-white" />
                        </span>
                      )}
                    </span>
                    <span
                      className={`truncate px-0.5 text-[11px] font-medium ${
                        isActive ? "text-[#4a6fa5] dark:text-blue-300" : "text-gray-600 dark:text-zinc-400"
                      }`}
                    >
                      {bannerPresetLabel(preset)}
                    </span>
                  </button>
                );
              })}
            </div>
            </section>
            ))}
            </div>
          </div>

          <div className="w-full shrink-0 flex gap-3">
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="flex-1 rounded-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 py-2.5 text-xs font-semibold text-gray-600 dark:text-zinc-400 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isSaved || isUnchanged}
              className={`flex-1 rounded-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                isSaved
                  ? "bg-emerald-500 text-white cursor-default"
                  : isSaving
                  ? "bg-blue-500 text-white cursor-wait"
                  : "bg-gray-900 text-white dark:bg-white dark:text-[#080a12] hover:bg-gray-800 dark:hover:bg-zinc-200 active:scale-95"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSaved ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Saved!
                </>
              ) : isSaving ? (
                <>
                  <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
