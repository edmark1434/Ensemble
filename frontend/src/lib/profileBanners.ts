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

export const DEFAULT_ENSEMBLE_BANNERS: ProfileBannerPreset[] = [
  "Ensemble Blue.png",
  "Ensemble Purple.png",
  "Ensemble Yellow.png",
];

export const PROFILE_BANNER_GROUPS: { label: string; note?: string; presets: ProfileBannerPreset[] }[] = [
  {
    label: "Ensemble Banners",
    note: "Default presets",
    presets: ["Ensemble Blue.png", "Ensemble Purple.png", "Ensemble Yellow.png"],
  },
  {
    label: "Subscription Banners",
    note: "Free for now",
    presets: ["Freemium Sleek.png", "Premium Sleek.png", "Business Sleek.png"],
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

/**
 * Deterministically pick one of the 3 default Ensemble banners based on a user's seed (username, id, or name),
 * ensuring the same user consistently gets the same default banner across sessions.
 */
export function getDefaultBannerPreset(seed?: string | number | null): ProfileBannerPreset {
  if (!seed) {
    return DEFAULT_ENSEMBLE_BANNERS[0];
  }
  const str = String(seed);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % DEFAULT_ENSEMBLE_BANNERS.length;
  return DEFAULT_ENSEMBLE_BANNERS[index];
}

/**
 * Returns the effective banner preset:
 * - If user explicitly chose a valid preset, returns that preset.
 * - Otherwise falls back to a deterministic default Ensemble banner (Blue, Purple, or Yellow) based on user identifier.
 */
export function resolveBannerPreset(
  preset?: string | null,
  seed?: string | number | null
): ProfileBannerPreset {
  if (preset && (PROFILE_BANNER_PRESETS as readonly string[]).includes(preset)) {
    return preset as ProfileBannerPreset;
  }
  return getDefaultBannerPreset(seed);
}

export const bannerPresetUrl = (preset?: string | null) =>
  preset && (PROFILE_BANNER_PRESETS as readonly string[]).includes(preset)
    ? `/profile_banner_presets/${encodeURIComponent(preset)}`
    : null;

export const bannerPresetLabel = (preset: string) => preset.replace(/\.[^.]+$/, "");
