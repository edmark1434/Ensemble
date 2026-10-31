// Read-only live check. Run from video-editor: npx tsx scripts/check-market-playback.ts
// Uses an existing licensed project/member; never prints IDs, keys or signed URLs.
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main() {
  const { db } = await import("../src/lib/db");
  try {
    const sample = await db.selectFrom("market_asset_licenses as license")
      .innerJoin("project_members as member", "member.project_id", "license.project_id")
      .innerJoin("projects as project", "project.project_id", "license.project_id")
      .innerJoin("market_assets as asset", "asset.market_asset_id", "license.market_asset_id")
      .innerJoin("market_media_assets as link", "link.market_asset_id", "license.market_asset_id")
      .innerJoin("media_assets as media", "media.media_asset_id", "link.media_asset_id")
      .where("license.status", "=", "active").where("license.deleted_at", "is", null)
      .where("member.deleted_at", "is", null).where("project.deleted_at", "is", null)
      .where("asset.deleted_at", "is", null).where("media.deleted_at", "is", null)
      .where("media.type", "=", "video")
      .select(["license.project_id", "license.market_asset_id", "member.user_id", "media.media_asset_id"])
      .limit(1).executeTakeFirst();
    if (!sample?.project_id) throw new Error("No licensed project video available.");
    const { getProjectMarketLicenses } = await import("../src/lib/market-license-service");
    const start = performance.now();
    const result = await getProjectMarketLicenses(sample.project_id, sample.user_id, [sample.market_asset_id]);
    const source = result?.assets[0]?.playbackSources[sample.media_asset_id];
    if (!source) throw new Error("License batch did not return a direct video source.");
    console.log(JSON.stringify({ check: "license batch", ms: Math.round(performance.now() - start),
      delivery: new URL(source.url).hostname.endsWith("cloudfront.net") ? "CloudFront" : "S3",
      validForSeconds: Math.round((source.expiresAt - Date.now()) / 1000) }));
    for (const range of ["bytes=0-262143", "bytes=262144-524287", "bytes=0-262143"]) {
      const started = performance.now();
      const response = await fetch(source.url, { redirect: "manual",
        headers: { Range: range, Origin: "http://localhost:3000" }, signal: AbortSignal.timeout(20_000) });
      const headerMs = Math.round(performance.now() - started);
      const bytes = await response.arrayBuffer();
      const allowOrigin = response.headers.get("access-control-allow-origin");
      console.log(JSON.stringify({ check: range, status: response.status, headerMs,
        totalMs: Math.round(performance.now() - started), bytes: bytes.byteLength,
        range: response.headers.get("content-range"), cacheControl: response.headers.get("cache-control"),
        corsAllowed: allowOrigin === "*" || allowOrigin === "http://localhost:3000",
        exposedHeaders: response.headers.get("access-control-expose-headers") }));
      if (response.status !== 206 || !response.headers.get("content-range")) throw new Error("Direct range delivery failed.");
      if (allowOrigin !== "*" && allowOrigin !== "http://localhost:3000") throw new Error("Storage CORS does not allow the editor origin.");
    }
  } finally { await db.destroy(); }
}
main().catch(error => {
  // Avoid raw provider errors containing URLs or configuration.
  console.error("Playback check failed:", error.code || error.name);
  process.exitCode = 1;
});
