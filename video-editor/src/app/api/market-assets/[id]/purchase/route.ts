import { NextRequest, NextResponse } from "next/server";
import { marketAssetBackend } from "@/lib/market-asset-backend";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const result = await marketAssetBackend(request, id, { action: "purchase-details", projectId: request.nextUrl.searchParams.get("projectId") });
    return NextResponse.json(result.data, { status: result.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to load purchase details. Please try again." }, { status: 502 });
  }
}
export async function POST(request: NextRequest, { params }: Context) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid purchase request." }, { status: 400 }); }
  try {
    const { id } = await params;
    const result = await marketAssetBackend(request, id, { action: "purchase", projectId: body?.projectId, expectedPrice: body?.expectedPrice, expectedCharge: body?.expectedCharge });
    return NextResponse.json(result.data, { status: result.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to confirm this purchase. Please retry to check its status." }, { status: 502 });
  }
}
