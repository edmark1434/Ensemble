import { useEffect, useState } from "react";
import { X, Check, AlertTriangle, Trash2, Lock, Sparkles, Layers, LayoutGrid, Crown, Palette, History, User, Laptop, Briefcase } from "lucide-react";
import useGlobalState from "@/lib/global_state";
import { resolveAvatarPath } from "@/lib/accountAvatars";
import { motion } from "framer-motion";
import { PROFILE_BANNER_GROUPS, PROFILE_BANNER_PRESETS, BANNER_REQUIRED_BADGES, bannerPresetLabel, bannerPresetUrl } from "@/lib/profileBanners";

interface BannerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bannerPreset: string | null) => Promise<void>;
  currentBanner?: string | null;
  ownedBadgeIds?: string[];
  userName?: string;
  userHandle?: string;
  userAvatar?: string | null;
  userRole?: string;
  userTagline?: string;
}

export default function BannerEditModal({
  isOpen,
  onClose,
  onSave,
  currentBanner = null,
  ownedBadgeIds = [],
  userName,
  userHandle,
  userAvatar,
  userRole,
  userTagline,
}: BannerEditModalProps) {
  const [selected, setSelected] = useState<string | null>(currentBanner);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [previewTab, setPreviewTab] = useState<"profile" | "card">("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState("");

  const globalUser = useGlobalState((s) => s.user);

  const getSafeString = (val: any, fallback: string): string => {
    if (!val) return fallback;
    if (typeof val === "string") return val;
    if (typeof val === "object") {
      if (val.role_name) return String(val.role_name);
      if (val.name) return String(val.name);
      if (val.handle) return String(val.handle);
      if (val.tagline) return String(val.tagline);
      if (Array.isArray(val) && val.length > 0) return getSafeString(val[0], fallback);
      return fallback;
    }
    return String(val);
  };

  const displayName = getSafeString(userName || globalUser?.name, "Alex Morgan");
  const displayHandle = getSafeString(userHandle || globalUser?.handle || globalUser?.username, "alex_editor");
  const displayRole = getSafeString(userRole || globalUser?.role, "Freelancer");
  const displayTagline = getSafeString(userTagline || globalUser?.tagline, "Creative Visual Storyteller");
  const displayAvatar = resolveAvatarPath(userAvatar || globalUser?.avatar_preset_url || globalUser?.avatar);

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

  const GROUP_ICONS: Record<string, React.ElementType> = {
    "Ensemble Banners": Sparkles,
    "Subscription Banners": Crown,
    "Collection": Palette,
    "Legacy": History,
  };

  const categories = [
    {
      id: "All",
      label: "All",
      icon: LayoutGrid,
      count: PROFILE_BANNER_PRESETS.length,
    },
    ...PROFILE_BANNER_GROUPS.map((g) => ({
      id: g.label,
      label: g.label.replace(/ Banners$/, ""),
      icon: GROUP_ICONS[g.label] || Layers,
      count: g.presets.length,
    })),
  ];

  const visibleGroups =
    selectedCategory === "All"
      ? PROFILE_BANNER_GROUPS
      : PROFILE_BANNER_GROUPS.filter((g) => g.label === selectedCategory);

  return (
    <div className="fixed inset-0 z-[200000] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-6 animate-fade-in font-['Plus Jakarta Sans',sans-serif]">
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
              {/* Preview Mode Switcher Header */}
              <div className="flex items-center justify-start gap-2">
                <div className="flex items-center p-0.5 rounded-lg bg-gray-200/60 dark:bg-white/10 border border-gray-200/80 dark:border-white/10 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setPreviewTab("profile")}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      previewTab === "profile"
                        ? "bg-white dark:bg-dark-surface text-gray-900 dark:text-white shadow-2xs font-bold"
                        : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <User className="h-3 w-3" />
                    <span>Profile View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab("card")}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      previewTab === "card"
                        ? "bg-white dark:bg-dark-surface text-gray-900 dark:text-white shadow-2xs font-bold"
                        : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <Layers className="h-3 w-3" />
                    <span>Card View</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Live Previews */}
              {previewTab === "profile" ? (
                /* 1. Profile Header Mockup */
                <div className="w-full rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-xs flex flex-col">
                  {/* Banner */}
                  <div className="relative aspect-[851/270] w-full bg-zinc-950 overflow-hidden">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt=""
                        className="w-full h-full object-cover transition-opacity duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-white/5 border-dashed border-gray-300 dark:border-zinc-700 text-xs font-medium text-gray-400 dark:text-zinc-500">
                        Default banner assigned
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                  </div>

                  {/* Profile Info Bar */}
                  <div className="px-3 pb-3 pt-0 flex items-start gap-3">
                    {/* Overlapping Avatar */}
                    <div className="relative -mt-6 h-12 w-12 rounded-full ring-2 ring-white dark:ring-dark-surface bg-zinc-200 dark:bg-zinc-800 shadow-md shrink-0 overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-gray-700 dark:text-zinc-200">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      {displayAvatar && (
                        <img
                          src={displayAvatar}
                          alt=""
                          className="relative z-10 w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                    </div>

                    {/* Name & Handle */}
                    <div className="pt-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-900 dark:text-white truncate">
                          {displayName}
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border bg-gray-100 text-gray-600 border-gray-200 dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/20 shrink-0">
                          {displayRole.toLowerCase().includes("client") ? (
                            <Briefcase className="w-2.5 h-2.5" />
                          ) : displayRole.toLowerCase().includes("enthusiast") ? (
                            <User className="w-2.5 h-2.5" />
                          ) : (
                            <Laptop className="w-2.5 h-2.5" />
                          )}
                          {displayRole}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-zinc-400 truncate mt-0.5">
                        @{displayHandle}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* 2. Creator Card Mockup */
                <div className="w-full max-w-[240px] mx-auto rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-xs flex flex-col">
                  {/* Card Banner Strip */}
                  <div className="relative h-16 w-full bg-zinc-950 overflow-hidden shrink-0">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt=""
                        className="w-full h-full object-cover transition-opacity duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-white/5 text-[10px] text-gray-400 dark:text-zinc-500">
                        Default
                      </div>
                    )}
                    <span className="absolute top-1.5 right-2 px-1.5 py-0.5 rounded-full bg-black/50 text-white backdrop-blur-xs text-[9px] font-medium border border-white/10">
                      Discovery
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-2.5 pt-0 flex flex-col items-center text-center">
                    {/* Overlapping Avatar */}
                    <div className="relative -mt-5 h-10 w-10 rounded-full ring-2 ring-white dark:ring-dark-surface bg-zinc-200 dark:bg-zinc-800 shadow-md shrink-0 overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center font-bold text-[11px] text-gray-700 dark:text-zinc-200">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      {displayAvatar && (
                        <img
                          src={displayAvatar}
                          alt=""
                          className="relative z-10 w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                    </div>

                    <div className="font-bold text-xs text-gray-900 dark:text-white truncate max-w-full mt-1">
                      {displayName}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-zinc-400 truncate max-w-full">
                      @{displayHandle}
                    </div>
                    <div className="mt-1.5 flex items-center justify-center">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border bg-gray-100 text-gray-600 border-gray-200 dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/20">
                        {displayRole.toLowerCase().includes("client") ? (
                          <Briefcase className="w-2.5 h-2.5" />
                        ) : displayRole.toLowerCase().includes("enthusiast") ? (
                          <User className="w-2.5 h-2.5" />
                        ) : (
                          <Laptop className="w-2.5 h-2.5" />
                        )}
                        {displayRole}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected Banner Label & Details */}
              <div className="bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-xl p-3">
                <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  {selected ? bannerPresetLabel(selected) : "Default Random Ensemble Banner"}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                  {selected
                    ? "Displays across desktop and mobile profile headers & cards."
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
            {/* Adaptive Icon / Active-Expanded Capsule Tabs */}
            <div className="shrink-0 mb-4 p-1 rounded-xl bg-gray-100/90 dark:bg-zinc-800/60 border border-gray-200/80 dark:border-white/10 flex items-center gap-1 w-fit shadow-2xs">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat.id;
                const IconComponent = cat.icon;
                return (
                  <motion.button
                    layout
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    title={`${cat.label} (${cat.count})`}
                    className={`relative flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition-colors duration-200 cursor-pointer select-none whitespace-nowrap ${
                      isActive
                        ? "px-3 text-gray-900 dark:text-white font-bold"
                        : "px-2.5 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/5"
                    }`}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeBannerCategoryTab"
                        className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-lg shadow-xs border border-gray-200/80 dark:border-white/10"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center justify-center">
                      <IconComponent className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400"}`} />
                    </span>
                    {isActive && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="relative z-10 text-xs font-bold text-gray-900 dark:text-white"
                      >
                        {cat.label}
                      </motion.span>
                    )}
                    {isActive && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                        className="relative z-10 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold leading-none bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-zinc-300 border border-gray-200/60 dark:border-white/10"
                      >
                        {cat.count}
                      </motion.span>
                    )}
                  </motion.button>
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
