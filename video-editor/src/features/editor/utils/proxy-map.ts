// features/editor/utils/proxy-map.ts

import axios from "axios";

type Derived = {
  proxyUrl?: string;
  filmstripUrl?: string;
  posterUrl?: string;
  waveformUrl?: string;
};
const byOriginal = new Map<string, Derived>();

export function registerProxies(
  assets: {
    url: string;
    proxyUrl?: string;
    filmstripUrl?: string;
    posterUrl?: string;
    waveformUrl?: string;
  }[] = []
) {
  for (const a of assets) {
    if (a.proxyUrl || a.filmstripUrl || a.posterUrl || a.waveformUrl) {
      byOriginal.set(a.url, {
        proxyUrl: a.proxyUrl,
        filmstripUrl: a.filmstripUrl,
        posterUrl: a.posterUrl,
        waveformUrl: a.waveformUrl
      });
    }
  }
}

// Player, video or image: the proxy, or the original if there isn't one yet.
export const resolvePlaybackSrc = (src: string) =>
  byOriginal.get(src)?.proxyUrl ?? src;

// Timeline video thumbnails: tiny clip, else proxy, else original.
export const resolveFilmstripSrc = (src: string) => {
  const d = byOriginal.get(src);
  return d?.filmstripUrl ?? d?.proxyUrl ?? src;
};

// Timeline image strip: the small thumbnail, else proxy, else original.
export const resolveTimelineImageSrc = (src: string) => {
  const d = byOriginal.get(src);
  return d?.posterUrl ?? d?.proxyUrl ?? src;
};

export const resolveWaveformSrc = (src: string) =>
  byOriginal.get(src)?.waveformUrl;

export async function loadProxyMap(projectId: string, userId?: string) {
  const requests = [
    axios.get("/api/media-assets", { params: { projectId, scope: "project" } })
  ];
  if (userId) {
    requests.push(
      axios.get("/api/media-assets", {
        params: { projectId, scope: "mine", userId }
      })
    );
  }
  const results = await Promise.allSettled(requests);
  for (const r of results) {
    if (r.status === "fulfilled") registerProxies(r.value.data.uploads);
  }
}