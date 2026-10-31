import { readFileSync } from "node:fs";
import { getSignedUrl } from "@aws-sdk/cloudfront-signer";

let cachedKey: { path: string; value: string } | undefined;

// Exact-file bearer grants, never a wildcard over other projects' assets.
// The project license is permanent; each playback grant expires after an hour.
export function signMarketCloudFrontSource(path: string, now = Date.now()) {
  if (process.env.MARKET_CLOUDFRONT_ENABLED !== "true") return null;
  const base = process.env.MARKET_CLOUDFRONT_URL;
  const keyPairId = process.env.MARKET_CLOUDFRONT_KEY_PAIR_ID;
  const keyPath = process.env.MARKET_CLOUDFRONT_PRIVATE_KEY_PATH;
  if (!base || !keyPairId || !keyPath) throw new Error("Protected CloudFront delivery is not configured.");
  if (!path.startsWith("asset-originals/") || path.includes("..") || path.includes("\\")) return null;
  const origin = new URL(base);
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/") {
    throw new Error("Invalid protected delivery origin.");
  }
  if (cachedKey?.path !== keyPath) cachedKey = { path: keyPath, value: readFileSync(keyPath, "utf8") };
  // Repeated batch requests share a URL within a five-minute signing window.
  const expiresAt = Math.floor(now / 300_000) * 300_000 + 3_600_000;
  const url = new URL(path.split("/").map(encodeURIComponent).join("/"), origin).href;
  return { url: getSignedUrl({ url, keyPairId, privateKey: cachedKey.value, dateLessThan: new Date(expiresAt).toISOString() }), expiresAt };
}
