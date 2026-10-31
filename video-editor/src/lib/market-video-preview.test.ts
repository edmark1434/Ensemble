import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { NextRequest, NextResponse } from "next/server";
import ts from "typescript";

function load(file: string, dependencies: Record<string, unknown>) {
  const module = { exports: {} as any };
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: (name: string) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return module.exports;
}

test("preview lookup returns only linked generated MP4 previews, never originals or proxies", async () => {
  const filters: unknown[][] = [];
  let filePath = "assets/thumbnails/video-5s-320/example.mp4";
  const query: any = {
    innerJoin: () => query,
    where: (...args: unknown[]) => { filters.push(args); return query; },
    select: () => query,
    executeTakeFirst: async () => ({ path: filePath }),
  };
  const { getMarketVideoPreview } = load("src/lib/market-video-preview-repository.ts", {
    "@/lib/db": { db: { selectFrom: () => query } },
  });
  assert.equal(await getMarketVideoPreview("asset", "media"), filePath);
  assert.ok(filters.some(f => f[0] === "link.market_asset_id" && f[2] === "asset"));
  assert.ok(filters.some(f => f[0] === "media.media_asset_id" && f[2] === "media"));
  assert.ok(filters.some(f => f[0] === "preview.mime_type" && f[2] === "video/mp4"));
  for (filePath of ["asset-originals/original.mp4", "assets/proxies/full.mp4", "assets/thumbnails/video-5s-320/../original.mp4"]) {
    assert.equal(await getMarketVideoPreview("asset", "media"), null);
  }
});

test("saved timeline preview resolver requires a session and valid IDs", async () => {
  let reads = 0;
  const { GET } = load("src/app/api/market-assets/[id]/thumbnail/route.ts", {
    "next/server": { NextResponse },
    "@/lib/auth/editor-session": { EDITOR_SESSION_COOKIE: "session", verifyEditorSession: async () => ({ userId: "user" }) },
    "@/lib/market-asset-backend": { MARKET_UUID: /^[0-9a-f-]{36}$/ },
    "@/lib/market-video-preview-repository": { getMarketVideoPreview: async () => { reads++; return "assets/thumbnails/video-5s-320/video.mp4"; } },
    "@/lib/s3": { buildPublicUrl: (path: string) => `https://cdn.example/${path}` },
  });
  const id = "11111111-1111-4111-8111-111111111111";
  const context = { params: Promise.resolve({ id }) };
  const url = `https://editor.example/api/market-assets/${id}/thumbnail?mediaAssetId=${id}`;
  assert.equal((await GET(new NextRequest(url), context)).status, 401);
  assert.equal(reads, 0);
  assert.equal((await GET(new NextRequest(url.replace("mediaAssetId=" + id, "mediaAssetId=bad"), { headers: { Cookie: "session=valid" } }), context)).status, 400);
  assert.equal(reads, 0);
  const response = await GET(new NextRequest(url, { headers: { Cookie: "session=valid" } }), context);
  assert.equal((await response.json()).url, "https://cdn.example/assets/thumbnails/video-5s-320/video.mp4");
});
