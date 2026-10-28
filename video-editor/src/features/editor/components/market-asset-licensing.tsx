"use client";

import { useEffect, useMemo } from "react";
import useStore from "../store/use-store";
import { getMarketAssetId, useMarketLicenses } from "../store/use-market-licenses";
import { loadMarketLicenses } from "../utils/load-market-licenses";
import { MarketAssetPurchaseModal } from "../modals/market-asset-purchase-modal";

export function MarketAssetLicensing() {
  const projectId = useStore(state => state.projectId);
  const items = useStore(state => state.trackItemsMap);
  const idsKey = useMemo(() => [...new Set(Object.values(items).map(getMarketAssetId).filter((id): id is string => !!id))].sort().join(","), [items]);
  useEffect(() => {
    useMarketLicenses.setState({ projectId, assets: {}, purchaseAssetId: null });
  }, [projectId]);
  useEffect(() => {
    if (!projectId || !idsKey) return;
    const controller = new AbortController();
    let refreshing = false;
    let requestId = 0;
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      const currentRequest = ++requestId;
      try {
        const ids = idsKey.split(",");
        for (let offset = 0; offset < ids.length; offset += 100) {
          const assets = await loadMarketLicenses(projectId, ids.slice(offset, offset + 100), controller.signal);
          if (!controller.signal.aborted && currentRequest === requestId) useMarketLicenses.getState().update(projectId, assets);
        }
      } catch { /* Keep the last confirmed state during a temporary network failure. */ }
      finally { if (currentRequest === requestId) refreshing = false; }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15_000);
    const onRefresh = () => { refreshing = false; void refresh(); };
    window.addEventListener("focus", onRefresh);
    window.addEventListener("market-license-updated", onRefresh);
    return () => {
      controller.abort(); window.clearInterval(interval);
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("market-license-updated", onRefresh);
    };
  }, [idsKey, projectId]);
  return <MarketAssetPurchaseModal />;
}
