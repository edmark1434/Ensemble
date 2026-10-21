import { useEffect, useState } from "react";
import { X, Check, AlertTriangle, Trash2, Lock, Sparkles, Layers } from "lucide-react";
import { PROFILE_BANNER_GROUPS, BANNER_REQUIRED_BADGES, bannerPresetLabel, bannerPresetUrl } from "@/lib/profileBanners";

interface BannerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bannerPreset: string | null) => Promise<void>;
  currentBanner?: string | null;
  ownedBadgeIds?: string[];
}

export default function BannerEditModal({
  isOpen,
  onClose,
  onSave,
  currentBanner = null,
  ownedBadgeIds = [],
}: BannerEditModalProps) {
  const [selected, setSelected] = useState<string | null>(currentBanner);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
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

  const categories = ["All", ...PROFILE_BANNER_GROUPS.map((g) => g.label)];

  const visibleGroups =
    selectedCategory === "All"
      ? PROFILE_BANNER_GROUPS
      : PROFILE_BANNER_GROUPS.filter((g) => g.label === selectedCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-6 animate-fade-in font-['Plus Jakarta Sans',sans-serif]">
      {/* Stable base container: fixed height (590px) and max-w-4xl so switching categories never shrinks or jumps */}
      <div className="relative w-full max-w-4xl h-[590px] rounded-2xl border border-gray-200 dark:border-white/10 bg-white/98 dark:bg-dark-base/98 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>Update Profile Banner</span>
              <span className="text-[11px] font-normal text-gray-500 dark:text-zinc-400">
                (Standard & Curated Presets)
              </span>
            </h3>
            <p className="text-gray-500 dark:text-zinc-400 text-xs mt-0.5">
              Select a banner to customize the header across your public profile.
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="rounded-full bg-gray-100 dark:bg-white/10 p-2 text-gray-500 dark:text-zinc-400 transition hover:bg-gray-200 dark:hover:bg-white/20 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 cursor-pointer"
            title="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Left Column (5 cols): Live Preview & Current Status */}
          <div className="md:col-span-5 p-5 sm:p-6 border-b md:border-b-0 md:border-r border-gray-100 dark:border-white/10 flex flex-col justify-between bg-gray-50/50 dark:bg-white/[0.01]">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Live Preview
                </span>
                {currentBanner && isUnchanged ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3 w-3" />
                    Current banner
                  </span>
                ) : selected ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                    <Sparkles className="h-3 w-3" />
                    New selection
                  </span>
                ) : null}
              </div>

              {/* Preview Box (True Banner Aspect Ratio) */}
              <div
                className={`w-full aspect-[851/270] rounded-xl overflow-hidden border-2 transition-all relative shadow-sm ${
                  selected
                    ? "border-blue-500 dark:border-blue-400 bg-gray-900"
                    : "border-dashed border-gray-300 dark:border-zinc-700 bg-gray-100 dark:bg-white/5 flex items-center justify-center"
                }`}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={bannerPresetLabel(selected as string)}
                    className="w-full h-full object-cover transition-opacity duration-300"
                  />
                ) : (
                  <span className="text-xs font-medium text-gray-400 dark:text-zinc-500">
                    Default banner assigned
                  </span>
                )}
              </div>

              {/* Selected Banner Label & Details */}
              <div className="bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-xl p-3">
                <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  {selected ? bannerPresetLabel(selected) : "Default Random Ensemble Banner"}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                  {selected
                    ? "Displays across desktop and mobile profile headers."
                    : "Randomly assigned Ensemble banner (Blue, Purple, or Yellow)."}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-600 dark:text-red-400 text-xs leading-relaxed">{error}</p>
                </div>
              )}
            </div>

            {/* Reset / Remove Button */}
            {selected && (
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  disabled={isSaving || isSaved}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-100 dark:hover:bg-red-500/20 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Use Default Ensemble Banner</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Column (7 cols): Filter Tabs & Grid Selector */}
          <div className="md:col-span-7 flex flex-col min-h-0 p-5 sm:p-6 overflow-hidden">
            {/* Filter Tabs: full width, wrapped in a segmented control pill group with no hidden horizontal clipping */}
            <div className="shrink-0 mb-4 p-1 rounded-xl bg-gray-100 dark:bg-white/[0.04] border border-gray-200/70 dark:border-white/10 flex flex-wrap gap-1">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex-1 min-w-[70px] px-2.5 py-1.5 rounded-lg text-xs transition-all text-center cursor-pointer ${
                      isActive
                        ? "bg-white dark:bg-dark-surface text-gray-900 dark:text-white font-bold shadow-xs border border-gray-200/60 dark:border-white/10"
                        : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white font-medium"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Preset Cards Grid (Scrollable, always stable in height) */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5 scrollbar-thin">
              {visibleGroups.map((group) => (
                <section key={group.label} className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-gray-400" />
                      <span>{group.label}</span>
                    </h4>
                    {group.note && (
                      <span className="rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                        {group.note}
                      </span>
                    )}
                  </div>

                  {/* Horizontal Banner Cards: 3 columns so exactly 6 fit in the viewport and the rest scroll cleanly */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {group.presets.map((preset) => {
                      const isActive = selected === preset;
                      const requiredBadge = BANNER_REQUIRED_BADGES[preset];
                      const isLocked = !!requiredBadge && !ownedBadgeIds.includes(requiredBadge.id);

                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setSelected(preset)}
                          disabled={isSaving || isSaved || isLocked}
                          title={
                            isLocked
                              ? `Requires the ${requiredBadge.name} badge`
                              : bannerPresetLabel(preset)
                          }
                          className={`group relative flex flex-col rounded-xl overflow-hidden border transition-all text-left cursor-pointer disabled:cursor-not-allowed ${
                            isActive
                              ? "border-blue-600 dark:border-blue-400 ring-2 ring-blue-500/30 shadow-md"
                              : isLocked
                              ? "border-gray-200 dark:border-white/5 opacity-60 hover:opacity-80"
                              : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-zinc-500 hover:shadow-xs"
                          }`}
                        >
                          {/* Banner Thumbnail */}
                          <div className="relative w-full aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-white/5">
                            <img
                              src={bannerPresetUrl(preset) as string}
                              alt={bannerPresetLabel(preset)}
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            {isActive && (
                              <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center">
                                <span className="p-1 rounded-full bg-blue-600 text-white shadow-sm">
                                  <Check className="h-3.5 w-3.5" />
                                </span>
                              </div>
                            )}
                            {isLocked && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-1 text-white text-[10px] font-bold">
                                <Lock className="h-3.5 w-3.5 text-amber-400" />
                                <span className="truncate max-w-[90px]">{requiredBadge.name}</span>
                              </div>
                            )}
                          </div>

                          {/* Banner Title Bar */}
                          <div className="px-2.5 py-1.5 bg-white dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                            <span
                              className={`truncate text-[11px] font-semibold ${
                                isActive
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-gray-700 dark:text-zinc-300"
                              }`}
                            >
                              {bannerPresetLabel(preset)}
                            </span>
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 flex items-center justify-between px-6 py-3.5 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.01]">
          <span className="text-xs text-gray-500 dark:text-zinc-400">
            {selected ? (
              <span>Selected: <strong>{bannerPresetLabel(selected)}</strong></span>
            ) : (
              <span>Default random Ensemble banner</span>
            )}
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isSaved || isUnchanged}
              className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isSaved
                  ? "bg-emerald-600 text-white cursor-default"
                  : isSaving
                  ? "bg-blue-600 text-white cursor-wait"
                  : "bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 shadow-xs active:scale-98"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSaved ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Saved!</span>
                </>
              ) : isSaving ? (
                <>
                  <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
