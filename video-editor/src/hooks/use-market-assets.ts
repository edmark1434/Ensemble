import { useMarketEngagement } from "@/components/market-asset-actions";
import { useState, useCallback, useRef, useEffect } from "react";

export type MarketAssetType = "image" | "video" | "audio";

export function useMarketAssets<T = any>(type?: MarketAssetType, view: "discover" | "liked" | "saved" | "licensed" = "discover", projectId?: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalMediaCount, setTotalMediaCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(1);
  const requestIdRef = useRef(0);
  const loadedScopeRef = useRef("");

  useEffect(() => () => { requestIdRef.current++; }, [type, view, projectId]);

  const load = useCallback(
    async (query: string, page = 1, append = false) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError("");
      const scope = `${type}:${view}:${projectId || ""}`;
      if (loadedScopeRef.current !== scope) {
        loadedScopeRef.current = scope;
        setItems([]); setTotalMediaCount(0); setHasMore(false);
        pageRef.current = 1;
      }
      if (view === "licensed" && !projectId) { setLoading(false); setHasMore(false); return; }
      try {
        const params = new URLSearchParams({
          view,
          page: String(page),
          limit: "20"
        });
        if (type) params.set("type", type);
        if (view === "licensed" && projectId) params.set("projectId", projectId);
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
    [type, view, projectId]
  );

  const loadMore = useCallback(
    (query: string) => load(query, pageRef.current + 1, true),
    [load]
  );

  return { items, error, loading, hasMore, totalMediaCount, load, loadMore };
}