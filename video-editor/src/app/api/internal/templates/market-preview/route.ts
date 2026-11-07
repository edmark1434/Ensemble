import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createMarketTemplatePreviewToken } from "@/lib/auth/snapshot-preview-token";
import { decodeTemplate } from "@/lib/collab/template-copy";
import { readPublishedMarketTemplate } from "@/lib/db/template-copy";

export async function POST(req: Request) {
  const secret = Buffer.from(process.env.INTERNAL_API_SECRET || "");
  const given = Buffer.from(req.headers.get("x-internal-secret") || "");
  if (!secret.length || given.length !== secret.length || !timingSafeEqual(secret, given)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const assetId = typeof body.assetId === "string" ? body.assetId : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assetId)) {
    return NextResponse.json({ error: "Invalid template" }, { status: 400 });
  }
  const template = await readPublishedMarketTemplate(assetId);
  if (!template) return NextResponse.json({ error: "Template unavailable" }, { status: 404 });
  const snapshot = decodeTemplate(template.document);
  return NextResponse.json({
    previewToken: createMarketTemplatePreviewToken(template.snapshot_id, template.market_asset_id),
    width: snapshot.size?.width || 1920,
    height: snapshot.size?.height || 1080,
    durationSeconds: Math.max(0, Math.floor((snapshot.duration || 0) / 1000)),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
