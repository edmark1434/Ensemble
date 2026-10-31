import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import ts from "typescript";

function load<T>(file: string, dependencies: Record<string, unknown>): T {
  const module = { exports: {} };
  const compiled = ts.transpileModule(readFileSync(path.resolve(file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(compiled, { module, exports: module.exports, performance,
    require: (name: string) => {
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return module.exports as T;
}

test("batch image URLs are short-lived, reusable within a window, and limited to image paths", async () => {
  const client = new S3Client({ region: "us-east-1", credentials: { accessKeyId: "test", secretAccessKey: "test" } });
  const { signMarketImage } = load<{ signMarketImage: (path: string, mime: string, now: number) => Promise<string> }>(
    "src/lib/market-image-url.ts", {
      "@aws-sdk/client-s3": { GetObjectCommand },
      "@aws-sdk/s3-request-presigner": { getSignedUrl },
      "@/lib/s3": { s3Client: client, S3_BUCKET_NAME: "test-bucket" },
    });
  try {
    const now = Date.parse("2026-10-30T00:00:01Z");
    const first = await signMarketImage("asset-originals/image.jpg", "image/jpeg", now);
    assert.equal(await signMarketImage("asset-originals/image.jpg", "image/jpeg", now + 10_000), first);
    assert.notEqual(await signMarketImage("asset-originals/image.jpg", "image/jpeg", now + 30_000), first);
    const url = new URL(first);
    assert.equal(url.searchParams.get("X-Amz-Expires"), "60");
    assert.equal(url.searchParams.get("X-Amz-Date"), "20261030T000000Z");
    assert.equal(url.searchParams.get("response-cache-control"), "private, max-age=30");
    for (const key of ["private/secret", "assets/../secret", "assets/\\secret"]) {
      await assert.rejects(signMarketImage(key, "image/jpeg", now), /Invalid market image/);
    }
    await assert.rejects(signMarketImage("assets/video.mp4", "video/mp4", now), /Invalid market image/);
  } finally { client.destroy(); }
});

test("license service returns only playback fields and never signs without project membership", async () => {
  let permitted = false;
  let signed = 0;
  const { getProjectMarketLicenses } = load<{ getProjectMarketLicenses: (project: string, user: string, ids: string[]) => Promise<any> }>(
    "src/lib/market-license-service.ts", {
      "./market-license-repository": { readProjectMarketLicenses: async () => permitted ? {
        assets: [{ assetId: "licensed", licensed: true }, { assetId: "unlicensed", licensed: false }],
        images: [
          { assetId: "licensed", mediaAssetId: "media", path: "asset-originals/image", mimeType: "image/png" },
          { assetId: "licensed", mediaAssetId: "broken", path: "invalid", mimeType: "image/png" },
        ],
      } : null },
      "./market-cloudfront-url": { signMarketCloudFrontSource: () => null },
      "./market-stream-url": { signMarketStream: () => { throw new Error("Unexpected stream"); } },
      "./market-image-url": { signMarketImage: async (key: string) => {
        signed++;
        if (key === "invalid") throw new Error("Invalid market image.");
        return "https://storage.example/image?signed";
      } },
    });
  assert.equal(await getProjectMarketLicenses("project", "user", []), null);
  assert.equal(signed, 0);
  permitted = true;
  const result = await getProjectMarketLicenses("project", "user", []);
  assert.equal(result.assets[0].imageSources.media, "https://storage.example/image?signed");
  assert.equal(result.assets[0].imageSources.broken, undefined);
  assert.equal(Object.keys(result.assets[1].imageSources).length, 0);
  assert.equal(JSON.stringify(result).includes("asset-originals/"), false);
  assert.match(result.serverTiming, /license_db;dur=/);
});

test("batch route rejects anonymous/nonmembers and keeps signed responses private", async () => {
  let permitted = false;
  let reads = 0;
  const { GET } = load<{ GET: (request: NextRequest) => Promise<Response> }>(
    "src/app/api/market-assets/licenses/route.ts", {
      "next/server": { NextResponse },
      "@/lib/auth/editor-session": { EDITOR_SESSION_COOKIE: "session", verifyEditorSession: async () => ({ userId: "verified-user" }) },
      "@/lib/market-asset-backend": { MARKET_UUID: /^[0-9a-f-]{36}$/ },
      "@/lib/market-license-service": { getProjectMarketLicenses: async (_project: string, user: string) => {
        reads++;
        assert.equal(user, "verified-user");
        return permitted ? { assets: [{ imageSources: { media: "https://storage.example/image" } }], serverTiming: "license_db;dur=1" } : null;
      } },
    });
  const url = "https://editor.example/api/market-assets/licenses?projectId=11111111-1111-4111-8111-111111111111";
  assert.equal((await GET(new NextRequest(url))).status, 401);
  assert.equal(reads, 0);
  const request = () => new NextRequest(url, { headers: { Cookie: "session=valid" } });
  assert.equal((await GET(request())).status, 403);
  permitted = true;
  const response = await GET(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("server-timing"), "license_db;dur=1");
  assert.equal((await response.json()).assets[0].imageSources.media, "https://storage.example/image");
});

test("licensed streams use direct S3 without CDN configuration; CDN replaces it when enabled", async () => {
  let permitted = false;
  let cdn = false;
  const signed: string[] = [];
  const media = [
    { assetId: "licensed", mediaAssetId: "video", type: "video", path: "asset-originals/video.mp4", mimeType: "video/mp4" },
    { assetId: "licensed", mediaAssetId: "audio", type: "audio", path: "asset-originals/audio.mp3", mimeType: "audio/mpeg" },
    { assetId: "licensed", mediaAssetId: "image", type: "image", path: "asset-originals/image.png", mimeType: "image/png" },
    { assetId: "unlicensed", mediaAssetId: "other", type: "video", path: "asset-originals/other.mp4", mimeType: "video/mp4" },
  ];
  const { getProjectMarketLicenses } = load<{ getProjectMarketLicenses: (project: string, user: string, ids: string[]) => Promise<any> }>(
    "src/lib/market-license-service.ts", {
      "./market-license-repository": { readProjectMarketLicenses: async () => permitted ? {
        assets: [{ assetId: "licensed", licensed: true }, { assetId: "unlicensed", licensed: false }],
        media, images: media.filter(file => file.type === "image"),
      } : null },
      "./market-cloudfront-url": { signMarketCloudFrontSource: (path: string) => {
        if (!cdn) return null;
        signed.push(path);
        return { url: `https://cdn.example/${path}`, expiresAt: 9999999999999 };
      } },
      "./market-stream-url": { signMarketStream: async (path: string) => {
        signed.push(path);
        return { url: `https://storage.example/${path}`, expiresAt: 9999999999999 };
      } },
      "./market-image-url": { signMarketImage: async () => "https://storage.example/image.png" },
    });
  assert.equal(await getProjectMarketLicenses("p", "u", []), null);
  assert.equal(signed.length, 0);
  permitted = true;
  const storage = await getProjectMarketLicenses("p", "u", []);
  assert.equal(storage.assets[0].playbackSources.video.url, "https://storage.example/asset-originals/video.mp4");
  assert.equal(storage.assets[0].playbackSources.audio.url, "https://storage.example/asset-originals/audio.mp3");
  assert.equal(Object.keys(storage.assets[1].playbackSources).length, 0);
  assert.equal(signed.includes("asset-originals/other.mp4"), false);
  signed.length = 0;
  cdn = true;
  const delivery = await getProjectMarketLicenses("p", "u", []);
  assert.equal(delivery.assets[0].playbackSources.video.url, "https://cdn.example/asset-originals/video.mp4");
  assert.equal(delivery.assets[0].imageSources.image, "https://cdn.example/asset-originals/image.png");
  assert.equal(signed.length, 3, "CDN sources never additionally sign S3 URLs");
});

test("direct S3 streams permit ranges, private caching and stable hour-long grants", async () => {
  const client = new S3Client({ region: "us-east-1", credentials: { accessKeyId: "test", secretAccessKey: "test" } });
  const { signMarketStream } = load<{ signMarketStream: (path: string, mime: string, now: number) => Promise<{ url: string; expiresAt: number }> }>(
    "src/lib/market-stream-url.ts", {
      "@aws-sdk/client-s3": { GetObjectCommand }, "@aws-sdk/s3-request-presigner": { getSignedUrl },
      "@/lib/s3": { s3Client: client, S3_BUCKET_NAME: "test-bucket" },
    });
  try {
    const now = Date.parse("2026-10-31T00:01:00Z");
    const source = await signMarketStream("asset-originals/video.mp4", "video/mp4", now);
    assert.equal((await signMarketStream("asset-originals/video.mp4", "video/mp4", now + 15000)).url, source.url);
    assert.equal(source.expiresAt, Date.parse("2026-10-31T01:00:00Z"));
    const url = new URL(source.url);
    assert.equal(url.searchParams.get("X-Amz-Expires"), "3600");
    assert.equal(url.searchParams.get("response-cache-control"), "private, max-age=300");
    assert.equal(url.searchParams.get("X-Amz-SignedHeaders"), "host", "Range is not tied to a specific byte interval");
    for (const key of ["uploads/secret", "asset-originals/../secret", "asset-originals/\\secret"]) {
      await assert.rejects(signMarketStream(key, "video/mp4", now), /Invalid market stream/);
    }
    await assert.rejects(signMarketStream("asset-originals/image.png", "image/png", now), /Invalid market stream/);
  } finally { client.destroy(); }
});
