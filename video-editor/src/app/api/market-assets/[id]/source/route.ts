import { NextRequest, NextResponse } from "next/server";
import { MARKET_UUID, marketAssetBackend } from "@/lib/market-asset-backend";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const mediaAssetId = request.nextUrl.searchParams.get("mediaAssetId");
  if (!mediaAssetId || !MARKET_UUID.test(mediaAssetId)) return NextResponse.json({ error: "Invalid media ID." }, { status: 400 });
  try {
    const { id } = await params;
    const result = await marketAssetBackend(request, id, { action: "source", projectId: request.nextUrl.searchParams.get("projectId"), mediaAssetId });
    if (result.status !== 200 || typeof result.data.previewUrl !== "string") return NextResponse.json(result.data, { status: result.status === 200 ? 502 : result.status });
    // Authorization stays on the backend; media bytes go straight from storage
    // to the browser. Never cache this redirect: subsequent source/range requests
    // must recheck access and get a fresh link, not reuse an expired signed URL.
    return NextResponse.redirect(result.data.previewUrl, {
      status: 307,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Unable to load licensed media." }, { status: 502 });
  }
}
