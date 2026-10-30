"use client";

import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPreparedImageCache } from "../utils/prepared-image-cache";

// Session-local blobs never enter the project document or its saved history.
export const PreparedMarketImages = createContext<Record<string, string>>({});
export const PrepareMarketImage = createContext<((source: string) => void) | null>(null);

export function PrepareMarketImages({ sourcesKey, downloadUrlsKey = "{}", children }: {
  sourcesKey: string; downloadUrlsKey?: string; children: ReactNode;
}) {
  const [ready, setReady] = useState<Record<string, string>>({});
  const [cache] = useState(createPreparedImageCache);
  const mounted = useRef(true);
  const activeSources = useMemo(() => new Set(JSON.parse(sourcesKey) as string[]), [sourcesKey]);
  const activeSourcesRef = useRef(activeSources);
  activeSourcesRef.current = activeSources;
  const downloadUrls = useMemo(() => JSON.parse(downloadUrlsKey) as Record<string, string>, [downloadUrlsKey]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; cache.dispose(); };
  }, [cache]);
  useEffect(() => {
    const sources = [...activeSources];
    cache.retain(sources);
    setReady(current => Object.fromEntries(sources.filter(source => current[source]).map(source => [source, current[source]])));
  }, [activeSources, cache]);
  const prepare = useCallback((source: string) => {
    if (!activeSources.has(source)) return;
    void cache.load(source, downloadUrls[source] || source).then(url => {
      if (mounted.current && activeSourcesRef.current.has(source)) {
        setReady(current => current[source] === url ? current : { ...current, [source]: url });
      }
    }).catch(() => { /* Failed images retry on the next source refresh without blocking the canvas. */ });
  }, [activeSources, cache, downloadUrls]);
  const prepared = Object.fromEntries([...activeSources].filter(source => ready[source]).map(source => [source, ready[source]]));
  // Always mount the canvas. Each image becomes available independently.
  return <PreparedMarketImages.Provider value={prepared}><PrepareMarketImage.Provider value={prepare}>{children}</PrepareMarketImage.Provider></PreparedMarketImages.Provider>;
}
