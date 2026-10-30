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
