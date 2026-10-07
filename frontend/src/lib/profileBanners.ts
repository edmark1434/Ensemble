// Must match the files in public/profile_banner_presets and backend/lib/ProfileBannerPresets.js.
export const PROFILE_BANNER_PRESETS = [
  "Alpha Banner.png",
  "Beta Banner.png",
  "Business Sleek.png",
  "Ensemble Blue.png",
  "Ensemble Purple.png",
  "Ensemble Yellow.png",
  "Freemium Sleek.png",
  "Go Beyond Edit 2026.png",
  "Premium Sleek.png",
  "Raster.png",
  "Spreadshot.png",
] as const;

export type ProfileBannerPreset = (typeof PROFILE_BANNER_PRESETS)[number];

export const PROFILE_BANNER_GROUPS: { label: string; note?: string; presets: ProfileBannerPreset[] }[] = [
  {
    label: "Subscription Banners",
    note: "Free for now",
    presets: ["Freemium Sleek.png", "Premium Sleek.png", "Business Sleek.png"],
  },
  {
    label: "Ensemble Banners",
    presets: ["Ensemble Blue.png", "Ensemble Purple.png", "Ensemble Yellow.png"],
  },
  {
    label: "Collection",
    presets: ["Go Beyond Edit 2026.png", "Spreadshot.png", "Raster.png"],
  },
  {
    label: "Legacy",
    presets: ["Alpha Banner.png", "Beta Banner.png"],
  },
];

// Must match BANNER_REQUIRED_BADGES in backend/lib/ProfileBannerPresets.js.
export const BANNER_REQUIRED_BADGES: Partial<Record<ProfileBannerPreset, { id: string; name: string }>> = {
  "Alpha Banner.png": { id: "acc-alpha", name: "Alpha Tester" },
  "Beta Banner.png": { id: "acc-beta", name: "Beta Tester" },
};

export const bannerPresetUrl = (preset?: string | null) =>
  preset && (PROFILE_BANNER_PRESETS as readonly string[]).includes(preset)
    ? `/profile_banner_presets/${encodeURIComponent(preset)}`
    : null;

export const bannerPresetLabel = (preset: string) => preset.replace(/\.[^.]+$/, "");
