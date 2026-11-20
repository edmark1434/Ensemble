import { create } from "zustand";

interface LocalMediaEntry {
  url: string;
  mimeType: string;
}

interface LocalMediaStore {
  entries: Record<string, LocalMediaEntry>;
}

const blobMimeTypes = new Map<string, string>();
const blobRefCounts = new Map<string, number>();

export const useLocalMediaCache = create<LocalMediaStore>(() => ({
  entries: {},
}));

export function getLocalMediaUrl(source?: string | null): string | null {
  if (!source) return null;
  return useLocalMediaCache.getState().entries[source]?.url ?? null;
}

export function getLocalMediaType(blobUrl?: string | null): string | undefined {
  if (!blobUrl) return undefined;
  return blobMimeTypes.get(blobUrl);
}

function retainBlob(url: string, mimeType: string) {
  blobRefCounts.set(url, (blobRefCounts.get(url) ?? 0) + 1);
  if (mimeType) blobMimeTypes.set(url, mimeType);
}

function releaseBlob(url: string) {
  const next = (blobRefCounts.get(url) ?? 1) - 1;
  if (next > 0) {
    blobRefCounts.set(url, next);
    return;
  }
  blobRefCounts.delete(url);
  blobMimeTypes.delete(url);
  if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(url);
  }
}

// Register a browser-local File as an instant blob URL for zero-latency preview
// while uploading. Never written to Yjs or saved project history.
export function registerLocalMedia(key: string, file: File): string {
  const existing = useLocalMediaCache.getState().entries[key];
  if (existing) return existing.url;
  const url = URL.createObjectURL(file);
  const mimeType = (file.type || "").split(";")[0].trim().toLowerCase();
  retainBlob(url, mimeType);
  useLocalMediaCache.setState((state) => ({
    entries: { ...state.entries, [key]: { url, mimeType } },
  }));
  return url;
}

// Point the durable cloud URL at the same local blob URL when upload completes
// so the canvas never re-downloads, flickers, or remounts the media element.
export function aliasLocalMedia(fromKey: string, toKey: string) {
  if (!fromKey || !toKey || fromKey === toKey) return;
  const entry = useLocalMediaCache.getState().entries[fromKey];
  if (!entry) return;
  const previousTarget = useLocalMediaCache.getState().entries[toKey];
  if (previousTarget?.url === entry.url) return;
  retainBlob(entry.url, entry.mimeType);
  if (previousTarget) releaseBlob(previousTarget.url);
  useLocalMediaCache.setState((state) => ({
    entries: { ...state.entries, [toKey]: entry },
  }));
}

export function releaseLocalMedia(key: string) {
  const existing = useLocalMediaCache.getState().entries[key];
  if (!existing) return;
  useLocalMediaCache.setState((state) => {
    const next = { ...state.entries };
    delete next[key];
    return { entries: next };
  });
  releaseBlob(existing.url);
}
