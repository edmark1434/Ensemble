export interface DefaultJobBanner {
  id: string;
  label: string;
  url: string;
}

export const DEFAULT_JOB_BANNERS: DefaultJobBanner[] = [
  { id: "jb1", label: "01", url: "/job_banners/jb1.png" },
  { id: "jb2", label: "02", url: "/job_banners/jb2.png" },
  { id: "jb3", label: "03", url: "/job_banners/jb3.png" },
];

export function getRandomJobBanner(): DefaultJobBanner {
  const index = Math.floor(Math.random() * DEFAULT_JOB_BANNERS.length);
  return DEFAULT_JOB_BANNERS[index];
}

export function getDefaultJobBannerForJob(jobId?: string | number | null): string {
  if (!jobId) return DEFAULT_JOB_BANNERS[0].url;
  const str = String(jobId);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % DEFAULT_JOB_BANNERS.length;
  return DEFAULT_JOB_BANNERS[index].url;
}

export async function convertPresetUrlToFile(url: string, filename?: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  const name = filename || url.split("/").pop() || "banner.png";
  return new File([blob], name, { type: blob.type || "image/png" });
}
