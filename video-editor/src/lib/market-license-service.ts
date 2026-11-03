import { readProjectMarketLicenses } from "./market-license-repository";
import { signMarketImage } from "./market-image-url";
import { signMarketCloudFrontSource } from "./market-cloudfront-url";
import { signMarketStream } from "./market-stream-url";

type LicensedMedia = { path: string; mimeType: string; type: string };

// Both batch playback and individual source requests use this delivery policy.
// Only call after membership, license and asset-to-file linkage checks.
async function signLicensedMedia(file: LicensedMedia) {
  const cloudFront = signMarketCloudFrontSource(file.path);
  if (cloudFront) return cloudFront;
  // Legacy keys are outside the CDN's signature-protected behavior. Do not
  // turn them into apparently signed URLs served by a public cache behavior.
  if (file.type === "image") {
    const now = Date.now();
    return {
      url: await signMarketImage(file.path, file.mimeType, now),
      expiresAt: Math.floor(now / 30_000) * 30_000 + 60_000,
    };
  }
  return signMarketStream(file.path, file.mimeType);
}

export async function getProjectMarketSource(projectId: string, userId: string, assetId: string, mediaAssetId: string) {
  const result = await readProjectMarketLicenses(projectId, userId, [assetId]);
  if (!result) return { status: 403 as const, error: "Project access required." };
  const asset = result.assets.find(asset => asset.assetId === assetId);
  if (!asset) return { status: 404 as const, error: "Asset not found." };
  if (!asset.licensed) return { status: 403 as const, error: "A project license is required." };
  const file = result.media?.find(file => file.assetId === assetId && file.mediaAssetId === mediaAssetId);
  if (!file) return { status: 404 as const, error: "Media not found." };
  return { status: 200 as const, ...await signLicensedMedia(file) };
}

export async function getProjectMarketLicenses(projectId: string, userId: string, ids: string[]) {
  const start = performance.now();
  const result = await readProjectMarketLicenses(projectId, userId, ids);
  const queried = performance.now();
  if (!result) return null;
  const licensedIds = new Set(result.assets.filter(asset => asset.licensed).map(asset => asset.assetId));
  const signed = await Promise.allSettled((result.media ?? []).filter(file => licensedIds.has(file.assetId))
    .map(async file => ({ ...file, source: await signLicensedMedia(file) })));
  // A failed file can retry through the individual endpoint, which applies the
  // same signing policy; it cannot silently switch a protected original to S3.
  const delivery = signed.flatMap(entry => entry.status === "fulfilled" ? [entry.value] : []);
  return {
    assets: result.assets.map(asset => ({
      ...asset,
      playbackSources: Object.fromEntries(delivery.filter(file => file.assetId === asset.assetId)
        .map(file => [file.mediaAssetId, file.source])),
      imageSources: Object.fromEntries(delivery.filter(file => file.assetId === asset.assetId && file.type === "image")
        .map(file => [file.mediaAssetId, file.source.url])),
    })),
    serverTiming: `license_db;dur=${(queried - start).toFixed(1)}, media_signing;dur=${(performance.now() - queried).toFixed(1)}`,
  };
}
