import { readProjectMarketLicenses } from "./market-license-repository";
import { signMarketImage } from "./market-image-url";
import { signMarketCloudFrontSource } from "./market-cloudfront-url";
import { signMarketStream } from "./market-stream-url";

export async function getProjectMarketLicenses(projectId: string, userId: string, ids: string[]) {
  const start = performance.now();
  const result = await readProjectMarketLicenses(projectId, userId, ids);
  const queried = performance.now();
  if (!result) return null;
  const delivery = new Map<string, Record<string, { url: string; expiresAt: number }>>();
  const licensedIds = new Set(result.assets.filter(asset => asset.licensed).map(asset => asset.assetId));
  // Invalid enabled CDN configuration fails the batch instead of silently
  // bypassing the configured delivery policy. S3 is the unconfigured default.
  for (const file of result.media ?? []) {
    if (!licensedIds.has(file.assetId)) continue;
    const source = signMarketCloudFrontSource(file.path);
    if (!source) continue;
    const sources = delivery.get(file.assetId) ?? {};
    sources[file.mediaAssetId] = source;
    delivery.set(file.assetId, sources);
  }
  await Promise.allSettled((result.media ?? []).filter(file => licensedIds.has(file.assetId)
    && (file.type === "video" || file.type === "audio") && !delivery.get(file.assetId)?.[file.mediaAssetId])
    .map(async file => {
      const source = await signMarketStream(file.path, file.mimeType);
      const sources = delivery.get(file.assetId) ?? {};
      sources[file.mediaAssetId] = source;
      delivery.set(file.assetId, sources);
    }));
  const signed = await Promise.allSettled(result.images.filter(image => licensedIds.has(image.assetId)).map(async image => ({
    assetId: image.assetId, mediaAssetId: image.mediaAssetId,
    url: delivery.get(image.assetId)?.[image.mediaAssetId]?.url ?? await signMarketImage(image.path, image.mimeType),
  })));
  // A broken file must not prevent other assets from resolving their licenses.
  // Missing URLs keep the existing, individually authorized source fallback.
  const images = signed.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
  return {
    assets: result.assets.map(asset => ({
      ...asset,
      playbackSources: delivery.get(asset.assetId) ?? {},
      imageSources: Object.fromEntries(images.filter(image => image.assetId === asset.assetId)
        .map(image => [image.mediaAssetId, image.url])),
    })),
    serverTiming: `license_db;dur=${(queried - start).toFixed(1)}, media_signing;dur=${(performance.now() - queried).toFixed(1)}`,
  };
}
