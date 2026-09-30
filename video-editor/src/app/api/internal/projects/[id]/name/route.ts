// app/api/internal/projects/[id]/name/route.ts

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { setProjectNameInLiveRoom } from "@/lib/collab/live-rooms";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const secret = process.env.INTERNAL_API_SECRET;
  const given = req.headers.get("x-internal-secret") ?? "";
  const ok =
    !!secret &&
    given.length === secret.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name } = await req.json().catch(() => ({}));
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  await setProjectNameInLiveRoom(id, name.trim());
  return NextResponse.json({ ok: true });
}