import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import ts from "typescript";
import { mergeMarketLicense } from "../features/editor/utils/merge-market-license";
import { marketPlaybackSource } from "../features/editor/utils/market-playback-source";
import type { ITrackItem } from "@designcombo/types";

test("CloudFront grants are exact-file, cryptographically signed, stable and expiring", () => {
  const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const privateKey = keys.privateKey.export({ type: "pkcs8", format: "pem" });
  const env = { MARKET_CLOUDFRONT_ENABLED: "true", MARKET_CLOUDFRONT_URL: "https://cdn.example",
    MARKET_CLOUDFRONT_KEY_PAIR_ID: "test-key", MARKET_CLOUDFRONT_PRIVATE_KEY_PATH: "private.pem" };
  const module = { exports: {} as { signMarketCloudFrontSource: (path: string, now?: number) => { url: string; expiresAt: number } | null } };
  vm.runInNewContext(ts.transpileModule(readFileSync("src/lib/market-cloudfront-url.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { module, exports: module.exports, URL, process: { env }, require: (name: string) => {
    if (name === "node:fs") return { readFileSync: () => privateKey };
    if (name === "@aws-sdk/cloudfront-signer") return { getSignedUrl };
    throw new Error(name);
  } });
  const sign = module.exports.signMarketCloudFrontSource;
  const now = Date.parse("2026-10-31T00:01:00Z");
  const first = sign("asset-originals/video.mp4", now)!;
  assert.equal(sign("asset-originals/video.mp4", now + 1000)!.url, first.url);
  assert.equal(first.expiresAt, Date.parse("2026-10-31T01:00:00Z"));
  const url = new URL(first.url);
  const signature = Buffer.from(url.searchParams.get("Signature")!.replace(/-/g, "+").replace(/_/g, "=").replace(/~/g, "/"), "base64");
  const policy = (resource: string) => JSON.stringify({ Statement: [{ Resource: resource,
    Condition: { DateLessThan: { "AWS:EpochTime": first.expiresAt / 1000 } } }] });
  assert.ok(verify("RSA-SHA1", Buffer.from(policy("https://cdn.example/asset-originals/video.mp4")), keys.publicKey, signature));
  assert.equal(verify("RSA-SHA1", Buffer.from(policy("https://cdn.example/asset-originals/other.mp4")), keys.publicKey, signature), false);
  for (const path of ["assets/proxies/video.mp4", "asset-originals/../secret", "asset-originals/\\secret"]) assert.equal(sign(path, now), null);
  env.MARKET_CLOUDFRONT_ENABLED = "false";
  assert.equal(sign("asset-originals/video.mp4", now), null);
});

test("background refresh keeps playback URL stable, renewal changes it and revocation clears it", () => {
  const now = Date.now();
  const oldSource = { url: "https://cdn.example/asset-originals/a.mp4?Signature=old", expiresAt: now + 120_000 };
  const newSource = { url: "https://cdn.example/asset-originals/a.mp4?Signature=new", expiresAt: now + 3_600_000 };
  const previous = { assetId: "a", name: "Video", priceCredits: 100, licensed: true, playbackSources: { media: oldSource } };
  const next = { ...previous, playbackSources: { media: newSource } };
  assert.equal(mergeMarketLicense(previous, next, now).playbackSources!.media, oldSource);
  assert.equal(mergeMarketLicense(previous, next, now + 70_000).playbackSources!.media, newSource);
  assert.deepEqual(mergeMarketLicense(previous, { ...next, licensed: false }, now).playbackSources, {});
  const item = { type: "video", details: { src: "https://cdn.example/proxy.mp4" },
    metadata: { market: true, market_asset_id: "a", media_asset_id: "media" } } as unknown as ITrackItem;
  assert.equal(marketPlaybackSource(item, "project", next), newSource.url);
  assert.equal(marketPlaybackSource(item, "project", { ...next, licensed: false }), item.details.src);
  assert.match(marketPlaybackSource(item, "project", { ...next, playbackSources: { media: { ...newSource, expiresAt: now - 1 } } }), /^\/api\/market-assets\//);
});
