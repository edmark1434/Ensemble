import { useMarketEngagement } from "@/components/market-asset-actions";
import { useState, useCallback, useRef } from "react";

export type MarketAssetType = "image" | "video" | "audio";

export function useMarketAssets<T = any>(type?: MarketAssetType, view: "discover" | "liked" | "saved" = "discover") {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalMediaCount, setTotalMediaCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(1);
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (query: string, page = 1, append = false) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          view,
          page: String(page),
          limit: "20"
        });
        if (type) params.set("type", type);
        if (query.trim()) params.set("query", query.trim());

        const res = await fetch(`/api/market-assets?${params}`);
        if (!res.ok) { const error = await res.json().catch(() => ({})); throw new Error(error.error || "Unable to load market assets."); }
        const data = await res.json();

        if (requestId !== requestIdRef.current) return; // stale response
        for (const item of data.items) {
          useMarketEngagement.getState().update(item.marketAssetId, {
            is_liked: !!item.is_liked, is_saved: !!item.is_saved, like_count: Number(item.like_count || 0),
          });
        }
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setHasMore(!!data.hasMore);
        setTotalMediaCount(Number(data.totalMediaCount || 0));
        pageRef.current = page;
      } catch (err) {
        // A market failure must never block the stock results
        console.error("Failed to load market assets:", err);
        if (requestId === requestIdRef.current) {
          setError(err instanceof Error ? err.message : "Unable to load market assets.");
          if (!append) setItems([]);
          setHasMore(false);
        }
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [type, view]
  );

  const loadMore = useCallback(
    (query: string) => load(query, pageRef.current + 1, true),
    [load]
  );

  return { items, error, loading, hasMore, totalMediaCount, load, loadMore };
}