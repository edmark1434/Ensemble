import { NextRequest, NextResponse } from "next/server";
import { marketAssetBackend } from "@/lib/market-asset-backend";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid project request." }, { status: 400 }); }
  try {
    const { id } = await params;
    const result = await marketAssetBackend(request, id, { action: "use-free", projectId: body?.projectId });
    return NextResponse.json(result.data, { status: result.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to enable this free asset. Please try again." }, { status: 502 });
  }
}
