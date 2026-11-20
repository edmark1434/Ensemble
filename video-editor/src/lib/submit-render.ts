import { renderServerHeaders } from "@/lib/render-server";
import { NextRequest, NextResponse } from "next/server";
import { MARKET_UUID, marketAssetBackend } from "@/lib/market-asset-backend";
import { collectMarketExportItems, type MarketExportContent } from "@/features/editor/utils/market-export-assets";
import { getVideoExportBitrateError } from "@/lib/export-bitrate";
import { missingUploadSources } from "@/lib/db/upload-usage";
import { mediaSources } from "@/features/editor/utils/media-sources";
import { filterRenderMedia, sanitizeRenderTransitions } from "./filter-render-media";
import { getVideoUploadPolicy } from "@/lib/upload-policy";
import { getExportPlanError } from "@/lib/export-plan-policy";
import { PlanConfigurationError } from "@/lib/plan-feature-values";

const RENDER_SERVER_URL = process.env.RENDER_SERVER_URL || "http://localhost:3001";

export async function submitRender(request: NextRequest, userId: string, body: MarketExportContent & Record<string, any>) {
  try {
    if (!Array.isArray(body?.trackItemIds) || !body?.trackItemsMap) return NextResponse.json({ message: "Invalid export." }, { status: 400 });
    const policy = await getVideoUploadPolicy(userId);
    const planError = getExportPlanError(body, policy);
    if (planError) return NextResponse.json({ message: planError.message }, { status: planError.status });
    // The exporting user's current subscription is authoritative, never a
    // collaborator's tier or a saved/client-provided watermark flag.
    body.ensembleWatermark = body.type !== "audio" &&
      (!policy.canRemoveEnsembleWatermark || body.ensembleWatermark !== false);
    const renderHeaders = await renderServerHeaders(userId, true);
    if (body.type !== "audio") {
      // Older renderers either strip the overlay or enforce hardcoded tiers.
      const capabilityResponse = await fetch(`${RENDER_SERVER_URL}/renders/capabilities`, {
        headers: renderHeaders, cache: "no-store",
      });
      const capabilities = capabilityResponse.ok ? await capabilityResponse.json() : null;
      if (body.portfolioFrameRange && capabilities?.portfolioFrameRange !== true) {
        return NextResponse.json({ message: "The render server needs the portfolio clip update before it can export excerpts." }, { status: 503 });
      }
      if (capabilities?.ensembleWatermark !== true || capabilities?.ensembleWatermarkPlanFeatures !== true) return NextResponse.json({
        message: "Watermark settings are temporarily unavailable. Please try again later.",
      }, { status: 503 });
    }
    const bitrateError = getVideoExportBitrateError(body);
    const projectId = MARKET_UUID.test(body.projectId || "") ? body.projectId : null;
    if (bitrateError) return NextResponse.json({ message: bitrateError }, { status: 400 });
    const missing = new Set(await missingUploadSources(mediaSources(body), projectId, userId));
    filterRenderMedia(body, item => !item.details.src || missing.has(item.details.src));
    const rangeMs = Array.isArray(body.portfolioFrameRange) && typeof body.fps === "number" && body.fps > 0
      ? {
          startMs: (body.portfolioFrameRange[0] / body.fps) * 1000,
          endMs: ((body.portfolioFrameRange[1] + 1) / body.fps) * 1000,
        }
      : undefined;
    const items = collectMarketExportItems(body, false, rangeMs);
    if (items.length && (!MARKET_UUID.test(body.projectId || "") || typeof body.marketDraft !== "boolean")) return NextResponse.json({ message: "Project and export mode are required." }, { status: 400 });
    const sources = new Map<string, string>();
    const unavailable = new Set<string>();
    for (const item of items) {
      const metadata = item.metadata as { market_asset_id: string; media_asset_id: string };
      if (!MARKET_UUID.test(metadata.market_asset_id) || !MARKET_UUID.test(metadata.media_asset_id || "")) return NextResponse.json({ message: "Invalid marketplace asset." }, { status: 400 });
      const key = `${metadata.market_asset_id}:${metadata.media_asset_id}`;
      if (unavailable.has(key)) continue;
      if (!sources.has(key)) {
        const result = await marketAssetBackend(request, metadata.market_asset_id, {
          action: "render-source", projectId: body.projectId, mediaAssetId: metadata.media_asset_id, draft: body.marketDraft,
        });
        if (result.status === 404 && result.data.code === "ASSET_FILE_NOT_FOUND") {
          unavailable.add(key);
          continue;
        }
        if (result.status !== 200 || !result.data.sourceUrl) return NextResponse.json({ message: result.data.error || "Unable to prepare marketplace media." }, { status: result.status === 200 ? 502 : result.status });
        sources.set(key, result.data.sourceUrl);
      }
      // Only this job copy changes; protected URLs never enter project history.
      item.details.src = sources.get(key)!;
    }
    if (unavailable.size) filterRenderMedia(body, item => {
      const metadata = item.metadata as { market?: boolean; market_asset_id?: string; media_asset_id?: string } | undefined;
      return !!metadata?.market && unavailable.has(`${metadata.market_asset_id}:${metadata.media_asset_id}`);
    });
    sanitizeRenderTransitions(body);
    const response = await fetch(`${RENDER_SERVER_URL}/renders`, {
      method: "POST", headers: { "Content-Type": "application/json", ...renderHeaders },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PlanConfigurationError) return NextResponse.json({ message: error.message }, { status: 503 });
    return NextResponse.json({ message: "Unable to prepare the export. Please try again." }, { status: 500 });
  }
}
