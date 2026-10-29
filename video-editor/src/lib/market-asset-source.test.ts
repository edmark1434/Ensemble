import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import { NextRequest, NextResponse } from "next/server";
import ts from "typescript";

const assetId = "11111111-1111-4111-8111-111111111111";
const mediaAssetId = "22222222-2222-4222-8222-222222222222";
const projectId = "33333333-3333-4333-8333-333333333333";
const sourceUrl = `https://editor.example/api/market-assets/${assetId}/source?projectId=${projectId}&mediaAssetId=${mediaAssetId}`;
const signedUrl = "https://storage.example/asset-originals/image.jpg?signature=temporary";
type BackendResult = { status: number; data: Record<string, unknown> };

// Exercise the real route with only its authenticated backend bridge replaced.
// No media fetch is allowed: the browser must receive a redirect instead.
function fixture(result: BackendResult = { status: 200, data: { previewUrl: signedUrl } }) {
  const calls: { id: string; payload: Record<string, unknown> }[] = [];
  const module = { exports: {} as { GET: (request: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response> } };
  const source = readFileSync(path.resolve("src/app/api/market-assets/[id]/source/route.ts"), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  let mediaFetches = 0;
  vm.runInNewContext(compiled, {
    module, exports: module.exports,
    fetch: () => { mediaFetches++; throw new Error("The editor must not fetch media bytes"); },
    require: (name: string) => {
      if (name === "next/server") return { NextResponse };
      if (name === "@/lib/market-asset-backend") return {
        MARKET_UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        marketAssetBackend: async (_request: NextRequest, id: string, payload: Record<string, unknown>) => {
          calls.push({ id, payload });
          return result;
        },
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return {
    result, calls, mediaFetches: () => mediaFetches,
    get: (request = new NextRequest(sourceUrl)) => module.exports.GET(request, { params: Promise.resolve({ id: assetId }) }),
  };
}

test("authorized originals redirect to storage without fetching media on the editor server", async () => {
  const f = fixture();
  const response = await f.get();
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), signedUrl);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(await response.text(), "");
  assert.equal(f.mediaFetches(), 0);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].id, assetId);
  assert.equal(f.calls[0].payload.projectId, projectId);
  assert.equal(f.calls[0].payload.mediaAssetId, mediaAssetId);
  assert.equal(f.calls[0].payload.action, "source");
});

test("later range requests reauthorize and receive a fresh redirect, not an expired link", async () => {
  const f = fixture();
  await f.get();
  const refreshedUrl = `${signedUrl}-renewed`;
  f.result.data.previewUrl = refreshedUrl;
  const request = new NextRequest(sourceUrl, { headers: { Range: "bytes=100-199" } });
  const response = await f.get(request);
  assert.equal(f.calls.length, 2);
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), refreshedUrl);
  assert.equal(request.headers.get("range"), "bytes=100-199");
  assert.equal(f.mediaFetches(), 0);

  f.result.status = 403;
  f.result.data = { error: "Project access required." };
  const revoked = await f.get(request);
  assert.equal(revoked.status, 403);
  assert.equal(revoked.headers.get("location"), null);
});

for (const status of [401, 403, 404]) {
  test(`backend ${status} never exposes a storage redirect`, async () => {
    const f = fixture({ status, data: { error: "Access denied." } });
    const response = await f.get();
    assert.equal(response.status, status);
    assert.equal(response.headers.get("location"), null);
    assert.equal(f.mediaFetches(), 0);
  });
}

test("invalid media IDs never reach authorization or storage", async () => {
  const f = fixture();
  const response = await f.get(new NextRequest(sourceUrl.replace(mediaAssetId, "invalid")));
  assert.equal(response.status, 400);
  assert.equal(f.calls.length, 0);
  assert.equal(f.mediaFetches(), 0);
});

test("a missing signed URL fails without redirecting or downloading", async () => {
  const f = fixture({ status: 200, data: {} });
  const response = await f.get();
  assert.equal(response.status, 502);
  assert.equal(response.headers.get("location"), null);
  assert.equal(f.mediaFetches(), 0);
});
