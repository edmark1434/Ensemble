import { markImageDecoded } from "./decoded-image-cache";

// Prepared marketplace images use blob URLs, which have no file extension.
const preparedImageTypes = new Map<string, string>();

export function getPreparedImageType(url: string) {
  return preparedImageTypes.get(url);
}

// Browser-only media cache, scoped to the currently open project preview.
export function createPreparedImageCache() {
  const entries = new Map<string, { controller: AbortController; url?: string; promise: Promise<string> }>();
  function remove(source: string) {
    const entry = entries.get(source);
    if (!entry) return;
    entry.controller.abort();
    if (entry.url) {
      preparedImageTypes.delete(entry.url);
      URL.revokeObjectURL(entry.url);
    }
    entries.delete(source);
  }
  return {
    retain(sources: string[]) {
      const needed = new Set(sources);
      for (const source of entries.keys()) if (!needed.has(source)) remove(source);
    },
    load(source: string, downloadUrl = source): Promise<string> {
      const existing = entries.get(source);
      if (existing) return existing.promise;
      const controller = new AbortController();
      const entry = { controller, url: undefined as string | undefined, promise: Promise.resolve("") };
      const fetchImage = async (target: string, noStore = false) => {
        const response = await fetch(
          target,
          noStore ? { signal: controller.signal, cache: "no-store" } : { signal: controller.signal }
        );
        if (!response.ok) throw new Error("Unable to load asset image.");
        return response.blob();
      };
      entry.promise = (async () => {
        let blob: Blob;
        try {
          blob = await fetchImage(downloadUrl);
        } catch (error) {
          if (controller.signal.aborted || downloadUrl === source) throw error;
          blob = await fetchImage(source, true);
        }
        if (controller.signal.aborted) throw new Error("Aborted");
        entry.url = URL.createObjectURL(blob);
        preparedImageTypes.set(entry.url, blob.type.split(";")[0].trim().toLowerCase());
        const image = new Image();
        image.src = entry.url;
        await image.decode();
        if (controller.signal.aborted) throw new Error("Aborted");
        markImageDecoded(entry.url);
        return entry.url;
      })().catch(error => {
        if (entries.get(source) === entry) remove(source);
        throw error;
      });
      entries.set(source, entry);
      return entry.promise;
    },
    dispose() { for (const source of entries.keys()) remove(source); },
  };
}
