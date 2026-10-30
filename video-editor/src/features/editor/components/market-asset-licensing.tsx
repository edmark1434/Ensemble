"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import useStore from "../store/use-store";
import { getMarketAssetId, useMarketLicenses } from "../store/use-market-licenses";
import { loadMarketLicenses } from "../utils/load-market-licenses";
import { MarketAssetPurchaseModal } from "../modals/market-asset-purchase-modal";
import { collectMarketExportItems } from "../utils/market-export-assets";
import { marketPlaybackSource } from "../utils/market-playback-source";
import { PrepareMarketImages } from "./prepared-market-images";

export function MarketAssetLicensing({ children }: { children: ReactNode }) {
  const projectId = useStore(state => state.projectId);
  const items = useStore(state => state.trackItemsMap);
  const trackItemIds = useStore(state => state.trackItemIds);
  const marketItems = useMemo(() => collectMarketExportItems({ trackItemIds, trackItemsMap: items }), [items, trackItemIds]);
  const idsKey = useMemo(() => [...new Set(marketItems.map(getMarketAssetId).filter((id): id is string => !!id))].sort().join(","), [marketItems]);
  const licenses = useMarketLicenses();
  useEffect(() => {
    useMarketLicenses.setState({ projectId, assets: {}, purchaseAssetId: null });
  }, [projectId]);
  useEffect(() => {
    if (!projectId || !idsKey) return;
    const controller = new AbortController();
    let refreshing = false;
    let refreshAfterPurchase = false;
    let requestId = 0;
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      const currentRequest = ++requestId;
      try {
        const ids = idsKey.split(",");
        const batches: Promise<unknown>[] = [];
        for (let offset = 0; offset < ids.length; offset += 100) {
          batches.push(loadMarketLicenses(projectId, ids.slice(offset, offset + 100), controller.signal, assets => {
            if (!controller.signal.aborted && currentRequest === requestId) useMarketLicenses.getState().update(projectId, assets);
          }));
        }
        await Promise.all(batches);
      } catch { /* Keep the last confirmed state during a temporary network failure. */ }
      finally {
        if (currentRequest === requestId) refreshing = false;
        if (refreshAfterPurchase && !controller.signal.aborted) {
          refreshAfterPurchase = false;
          void refresh();
        }
      }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15_000);
    const onRefresh = () => { void refresh(); };
    const onPurchase = () => {
      if (refreshing) refreshAfterPurchase = true;
      else void refresh();
    };
    window.addEventListener("focus", onRefresh);
    window.addEventListener("market-license-updated", onPurchase);
    return () => {
      controller.abort(); window.clearInterval(interval);
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("market-license-updated", onPurchase);
    };
  }, [idsKey, projectId]);
  const imageItems = marketItems.filter(item => String(item.type) === "image"
    && licenses.projectId === projectId && !!licenses.assets[getMarketAssetId(item)!]);
  const sourcesKey = JSON.stringify([...new Set(imageItems
    .map(item => marketPlaybackSource(item, projectId, licenses.assets[getMarketAssetId(item)!])))].sort());
  const downloadUrlsKey = JSON.stringify(Object.fromEntries(imageItems.map(item => {
    const status = licenses.assets[getMarketAssetId(item)!];
    const source = marketPlaybackSource(item, projectId, status);
    const mediaId = (item.metadata as { media_asset_id?: string } | undefined)?.media_asset_id;
    return [source, status.licensed && mediaId ? status.imageSources?.[mediaId] || source : source];
  }).sort(([a], [b]) => a.localeCompare(b))));
  return <>
    <MarketAssetPurchaseModal />
    <PrepareMarketImages key={projectId} sourcesKey={sourcesKey} downloadUrlsKey={downloadUrlsKey}>{children}</PrepareMarketImages>
  </>;
}
