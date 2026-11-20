import type { ITrackItem } from "@designcombo/types";
import type { ISceneDetails } from "../types/ensemble-scene";
import type { MarketLicenseStatus } from "../store/use-market-licenses";

export function getExportLicenseChoices(ids: string[], statuses: Record<string, MarketLicenseStatus>) {
  const unpaidIds = ids.filter(id => {
    const asset = statuses[id];
    return asset && !asset.unavailable && !asset.licensed && (asset.priceCredits > 0 || asset.trashed);
  });
  const draftOnlyNames = unpaidIds.filter(id => statuses[id].draftOnly).map(id => statuses[id].name);
  return { unpaidIds, draftOnlyNames };
}

export interface MarketExportContent {
  trackItemIds: string[];
  trackItemsMap: Record<string, ITrackItem>;
}

export interface MarketExportTimeRange {
  startMs: number;
  endMs: number;
}

export interface MarketExportAssetSpan {
  assetId: string;
  source?: string;
  from: number;
  to: number;
}

// Follow the same visible item IDs and one scene-content layer as the renderer.
export function collectMarketExportItems(
  content: MarketExportContent,
  nested = false,
  range?: MarketExportTimeRange,
  offsetMs = 0,
  limitMs = Infinity,
): ITrackItem[] {
  const result: ITrackItem[] = [];
  for (const id of content.trackItemIds) {
    const item = content.trackItemsMap[id];
    if (!item || item.details?.hidden) continue;
    const itemFrom = offsetMs + (item.display?.from ?? 0);
    const itemTo = Math.min(limitMs, offsetMs + (item.display?.to ?? Infinity));
    if (range && !(itemFrom < range.endMs && itemTo > range.startMs && itemTo > itemFrom)) continue;
    if (String(item.type) === "scene") {
      const inner = (item.details as unknown as ISceneDetails).content;
      if (!nested && inner) result.push(...collectMarketExportItems(inner, true, range, itemFrom, itemTo));
      continue;
    }
    const metadata = item.metadata as { market?: boolean; market_asset_id?: string } | undefined;
    if (metadata?.market && metadata.market_asset_id) result.push(item);
  }
  return result;
}

export function collectMarketExportAssetSpans(
  content: MarketExportContent,
  nested = false,
  offsetMs = 0,
  limitMs = Infinity,
): MarketExportAssetSpan[] {
  const result: MarketExportAssetSpan[] = [];
  for (const id of content.trackItemIds) {
    const item = content.trackItemsMap[id];
    if (!item || item.details?.hidden) continue;
    const itemFrom = offsetMs + (item.display?.from ?? 0);
    const itemTo = Math.min(limitMs, offsetMs + (item.display?.to ?? Infinity));
    if (itemTo <= itemFrom) continue;
    if (String(item.type) === "scene") {
      const inner = (item.details as unknown as ISceneDetails).content;
      if (!nested && inner) result.push(...collectMarketExportAssetSpans(inner, true, itemFrom, itemTo));
      continue;
    }
    const metadata = item.metadata as { market?: boolean; market_asset_id?: string } | undefined;
    if (metadata?.market && metadata.market_asset_id) {
      result.push({ assetId: metadata.market_asset_id, from: itemFrom, to: itemTo, source: item.details.src });
    }
  }
  return result;
}

export function collectMarketExportAssetIds(content: MarketExportContent, range?: MarketExportTimeRange, missing?: Set<string>): string[] {
  return [...new Set(collectMarketExportItems(content, false, range).filter(item => !missing?.has(item.details.src)
    && !item.details.src?.startsWith("missing-template-media:")).map(item =>
    (item.metadata as { market_asset_id: string }).market_asset_id))].sort();
}
