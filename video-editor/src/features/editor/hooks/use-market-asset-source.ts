import { useEffect } from "react";
import type { ITrackItem } from "@designcombo/types";
import { getMarketAssetId, useMarketLicenses } from "../store/use-market-licenses";
import { loadMarketLicenses } from "../utils/load-market-licenses";
import useStore from "../store/use-store";

const pendingSources = new Map<string, Promise<void>>();

// Resolve at playback time so expiring signed URLs never enter project history.
export function useMarketAssetSource(item: ITrackItem): string {
  const projectId = useStore(state => state.projectId);
  const assetId = getMarketAssetId(item);
  const status = useMarketLicenses(state => assetId && state.projectId === projectId ? state.assets[assetId] : undefined);
  // Nested scenes can render media that is not in the currently open timeline.
  useEffect(() => {
    if (!projectId || !assetId || status) return;
    const key = `${projectId}:${assetId}`;
    if (pendingSources.has(key)) return;
    const request = loadMarketLicenses(projectId, [assetId])
      .then(assets => { useMarketLicenses.getState().update(projectId, assets); })
      .catch(() => {}).finally(() => pendingSources.delete(key));
    pendingSources.set(key, request);
  }, [projectId, assetId, status]);
  const mediaAssetId = (item.metadata as { media_asset_id?: string } | undefined)?.media_asset_id;
  return status?.licensed && assetId && mediaAssetId
    ? `/api/market-assets/${assetId}/source?${new URLSearchParams({ projectId, mediaAssetId })}`
    : item.details.src;
}
