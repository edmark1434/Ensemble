"use client";

import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPreparedImageCache } from "../utils/prepared-image-cache";

const RETRY_DELAYS_MS = [350, 1000, 2500];

// Session-local blobs never enter the project document or its saved history.
export const PreparedMarketImages = createContext<Record<string, string>>({});
export const FailedMarketImages = createContext<Record<string, boolean>>({});
export const PrepareMarketImage = createContext<((source: string) => void) | null>(null);

export function PrepareMarketImages({ sourcesKey, downloadUrlsKey = "{}", children }: {
  sourcesKey: string; downloadUrlsKey?: string; children: ReactNode;
}) {
  const [ready, setReady] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [cache] = useState(createPreparedImageCache);
  const mounted = useRef(true);
  const activeSources = useMemo(() => new Set(JSON.parse(sourcesKey) as string[]), [sourcesKey]);
  const activeSourcesRef = useRef(activeSources);
  activeSourcesRef.current = activeSources;
  const downloadUrls = useMemo(() => JSON.parse(downloadUrlsKey) as Record<string, string>, [downloadUrlsKey]);
  const downloadUrlsRef = useRef(downloadUrls);
  downloadUrlsRef.current = downloadUrls;
  const retryTimers = useRef(new Map<string, number>());
  const inFlight = useRef(new Set<string>());

  const clearRetry = useCallback((source: string) => {
    const timer = retryTimers.current.get(source);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      retryTimers.current.delete(source);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      for (const timer of retryTimers.current.values()) window.clearTimeout(timer);
      retryTimers.current.clear();
      inFlight.current.clear();
      cache.dispose();
    };
  }, [cache]);

  useEffect(() => {
    const sources = [...activeSources];
    cache.retain(sources);
    for (const source of [...retryTimers.current.keys()]) {
      if (!activeSources.has(source)) clearRetry(source);
    }
    for (const source of [...inFlight.current]) {
      if (!activeSources.has(source)) inFlight.current.delete(source);
    }
    setReady(current => Object.fromEntries(sources.filter(source => current[source]).map(source => [source, current[source]])));
    setFailed(current => {
      const next = Object.fromEntries(sources.filter(source => current[source]).map(source => [source, true]));
      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
  }, [activeSources, cache, clearRetry]);

  const loadWithRetry = useCallback((source: string, attempt: number) => {
    if (!mounted.current || !activeSourcesRef.current.has(source)) return;
    if (inFlight.current.has(source)) return;
    clearRetry(source);
    inFlight.current.add(source);
    if (attempt === 0) {
      setFailed(current => current[source] ? { ...current, [source]: false } : current);
    }
    const targetUrl = attempt === 0 ? (downloadUrlsRef.current[source] || source) : source;
    void cache.load(source, targetUrl).then(url => {
      inFlight.current.delete(source);
      if (mounted.current && activeSourcesRef.current.has(source)) {
        setFailed(current => current[source] ? { ...current, [source]: false } : current);
        setReady(current => current[source] === url ? current : { ...current, [source]: url });
      }
    }).catch(() => {
      inFlight.current.delete(source);
      if (!mounted.current || !activeSourcesRef.current.has(source)) return;
      const retryDelay = RETRY_DELAYS_MS[attempt];
      if (retryDelay !== undefined) {
        const timer = window.setTimeout(() => {
          retryTimers.current.delete(source);
          loadWithRetry(source, attempt + 1);
        }, retryDelay);
        retryTimers.current.set(source, timer);
        return;
      }
      setFailed(current => current[source] ? current : { ...current, [source]: true });
    });
  }, [cache, clearRetry]);

  const prepare = useCallback((source: string) => {
    if (!activeSources.has(source)) return;
    if (inFlight.current.has(source) || retryTimers.current.has(source)) return;
    loadWithRetry(source, 0);
  }, [activeSources, downloadUrls, loadWithRetry]);

  const prepared = Object.fromEntries([...activeSources].filter(source => ready[source]).map(source => [source, ready[source]]));
  // Always mount the canvas. Each image becomes available independently.
  return <FailedMarketImages.Provider value={failed}><PreparedMarketImages.Provider value={prepared}><PrepareMarketImage.Provider value={prepare}>{children}</PrepareMarketImage.Provider></PreparedMarketImages.Provider></FailedMarketImages.Provider>;
}
