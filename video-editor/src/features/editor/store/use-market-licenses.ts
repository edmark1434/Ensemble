import { create } from "zustand";
import type { ITrackItem } from "@designcombo/types";
import { mergeMarketLicense } from "../utils/merge-market-license";

export interface MarketLicenseStatus {
  assetId: string;
  name: string;
  priceCredits: number;
  licensed: boolean;
  isOwner?: boolean;
  // Temporary delivery URLs live only in this store, never in saved project items.
  imageSources?: Record<string, string>;
  playbackSources?: Record<string, { url: string; expiresAt: number }>;
}
interface MarketLicenseStore {
  projectId: string;
  assets: Record<string, MarketLicenseStatus>;
  purchaseAssetId: string | null;
  openPurchase: (assetId: string) => void;
  closePurchase: () => void;
  update: (projectId: string, assets: MarketLicenseStatus[]) => void;
}
export const useMarketLicenses = create<MarketLicenseStore>((set) => ({
  projectId: "", assets: {}, purchaseAssetId: null,
  openPurchase: (purchaseAssetId) => set({ purchaseAssetId }),
  closePurchase: () => set({ purchaseAssetId: null }),
  update: (projectId, assets) => set(state => state.projectId !== projectId ? state : ({
    assets: { ...state.assets, ...Object.fromEntries(assets.map(asset => [asset.assetId, mergeMarketLicense(state.assets[asset.assetId], asset)])) },
  })),
}));

export function getMarketAssetId(item: Pick<ITrackItem, "metadata"> | undefined): string | null {
  const metadata = item?.metadata as { market?: boolean; market_asset_id?: string } | undefined;
  return metadata?.market && typeof metadata.market_asset_id === "string" ? metadata.market_asset_id : null;
}
