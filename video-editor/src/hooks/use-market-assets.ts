import { useState, useCallback, useRef } from "react";

export type MarketAssetType = "image" | "video" | "audio";

export function useMarketAssets<T = any>(type: MarketAssetType) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(1);
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (query: string, page = 1, append = false) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          type,
          page: String(page),
          limit: "20"
        });
        if (query.trim()) params.set("query", query.trim());

        const res = await fetch(`/api/market-assets?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (requestId !== requestIdRef.current) return; // stale response
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setHasMore(!!data.hasMore);
        pageRef.current = page;
      } catch (err) {
        // A market failure must never block the stock results
        console.error("Failed to load market assets:", err);
        if (requestId === requestIdRef.current) {
          if (!append) setItems([]);
          setHasMore(false);
        }
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [type]
  );

  const loadMore = useCallback(
    (query: string) => load(query, pageRef.current + 1, true),
    [load]
  );

  return { items, loading, hasMore, load, loadMore };
}