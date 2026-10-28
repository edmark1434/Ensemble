import type { ITrackItem } from "@designcombo/types";
import type { ISceneDetails } from "../types/ensemble-scene";

export interface MarketExportContent {
  trackItemIds: string[];
  trackItemsMap: Record<string, ITrackItem>;
}

// Follow the same visible item IDs and one scene-content layer as the renderer.
export function collectMarketExportItems(content: MarketExportContent, nested = false): ITrackItem[] {
  const result: ITrackItem[] = [];
  for (const id of content.trackItemIds) {
    const item = content.trackItemsMap[id];
    if (!item || item.details?.hidden) continue;
    if (String(item.type) === "scene") {
      const inner = (item.details as unknown as ISceneDetails).content;
      if (!nested && inner) result.push(...collectMarketExportItems(inner, true));
      continue;
    }
    const metadata = item.metadata as { market?: boolean; market_asset_id?: string } | undefined;
    if (metadata?.market && metadata.market_asset_id) result.push(item);
  }
  return result;
}

export function collectMarketExportAssetIds(content: MarketExportContent): string[] {
  return [...new Set(collectMarketExportItems(content).map(item =>
    (item.metadata as { market_asset_id: string }).market_asset_id))].sort();
}
