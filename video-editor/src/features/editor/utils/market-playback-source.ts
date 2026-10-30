import type { ITrackItem } from "@designcombo/types";
import { getMarketAssetId, type MarketLicenseStatus } from "../store/use-market-licenses";

export function marketPlaybackSource(item: ITrackItem, projectId: string, status?: MarketLicenseStatus): string {
  const assetId = getMarketAssetId(item);
  const mediaAssetId = (item.metadata as { media_asset_id?: string } | undefined)?.media_asset_id;
  return status?.licensed && assetId && mediaAssetId
    ? `/api/market-assets/${assetId}/source?${new URLSearchParams({ projectId, mediaAssetId })}`
    : item.details.src;
}

export function readyMarketPlaybackSource(item: ITrackItem, projectId: string,
  status: MarketLicenseStatus | undefined, preparedImages: Record<string, string>): string | null {
  if (!getMarketAssetId(item)) return item.details.src;
  if (!status) return null;
  const source = marketPlaybackSource(item, projectId, status);
  return String(item.type) === "image" ? preparedImages[source] ?? null : source;
}
