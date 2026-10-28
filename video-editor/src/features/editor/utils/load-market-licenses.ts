import type { MarketLicenseStatus } from "../store/use-market-licenses";

const freeClaims = new Map<string, Promise<boolean>>();

// Called only for assets in the project, never for marketplace browsing.
export async function loadMarketLicenses(projectId: string, ids: string[], signal?: AbortSignal): Promise<MarketLicenseStatus[]> {
  const params = new URLSearchParams({ projectId, ids: ids.join(",") });
  const response = await fetch(`/api/market-assets/licenses?${params}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load asset licenses.");
  const data = await response.json() as { assets: MarketLicenseStatus[] };
  return Promise.all(data.assets.map(async asset => {
    if (asset.licensed || asset.priceCredits !== 0 || signal?.aborted) return asset;
    const key = `${projectId}:${asset.assetId}`;
    let claim = freeClaims.get(key);
    if (!claim) {
      claim = fetch(`/api/market-assets/${asset.assetId}/use-free`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      }).then(response => response.ok).catch(() => false).finally(() => freeClaims.delete(key));
      freeClaims.set(key, claim);
    }
    return await claim ? { ...asset, licensed: true } : asset;
  }));
}
