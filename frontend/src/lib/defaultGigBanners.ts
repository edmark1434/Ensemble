export interface DefaultGigBanner {
  id: string;
  label: string;
  url: string;
}

export const DEFAULT_GIG_BANNERS: DefaultGigBanner[] = [
  { id: "gg1", label: "01", url: "/gig_banners/gg1.png" },
  { id: "gg2", label: "02", url: "/gig_banners/gg2.png" },
  { id: "gg3", label: "03", url: "/gig_banners/gg3.png" },
];

export function getRandomGigBanner(): DefaultGigBanner {
  const index = Math.floor(Math.random() * DEFAULT_GIG_BANNERS.length);
  return DEFAULT_GIG_BANNERS[index];
}

export function getDefaultGigBannerForGig(gigId?: string | number | null): string {
  if (!gigId) return DEFAULT_GIG_BANNERS[0].url;
  const str = String(gigId);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % DEFAULT_GIG_BANNERS.length;
  return DEFAULT_GIG_BANNERS[index].url;
}

export async function convertGigPresetUrlToFile(url: string, filename?: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  const name = filename || url.split("/").pop() || "banner.png";
  return new File([blob], name, { type: blob.type || "image/png" });
}
