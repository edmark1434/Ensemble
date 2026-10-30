import { readProjectMarketLicenses } from "./market-license-repository";
import { signMarketImage } from "./market-image-url";

export async function getProjectMarketLicenses(projectId: string, userId: string, ids: string[]) {
  const start = performance.now();
  const result = await readProjectMarketLicenses(projectId, userId, ids);
  const queried = performance.now();
  if (!result) return null;
  const signed = await Promise.allSettled(result.images.map(async image => ({
    assetId: image.assetId, mediaAssetId: image.mediaAssetId,
    url: await signMarketImage(image.path, image.mimeType),
  })));
  // A broken file must not prevent other assets from resolving their licenses.
  // Missing URLs keep the existing, individually authorized source fallback.
  const images = signed.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
  return {
    assets: result.assets.map(asset => ({
      ...asset,
      imageSources: Object.fromEntries(images.filter(image => image.assetId === asset.assetId)
        .map(image => [image.mediaAssetId, image.url])),
    })),
    serverTiming: `license_db;dur=${(queried - start).toFixed(1)}, image_signing;dur=${(performance.now() - queried).toFixed(1)}`,
  };
}
