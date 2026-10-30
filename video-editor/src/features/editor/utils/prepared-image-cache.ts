// Browser-only media cache, scoped to the currently open project preview.
export function createPreparedImageCache() {
  const entries = new Map<string, { controller: AbortController; url?: string; promise: Promise<string> }>();
  function remove(source: string) {
    const entry = entries.get(source);
    if (!entry) return;
    entry.controller.abort();
    if (entry.url) URL.revokeObjectURL(entry.url);
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
      entry.promise = (async () => {
        const response = await fetch(downloadUrl, { signal: controller.signal });
        if (!response.ok) throw new Error("Unable to load asset image.");
        const blob = await response.blob();
        if (controller.signal.aborted) throw new Error("Aborted");
        entry.url = URL.createObjectURL(blob);
        const image = new Image();
        image.src = entry.url;
        await image.decode();
        if (controller.signal.aborted) throw new Error("Aborted");
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
