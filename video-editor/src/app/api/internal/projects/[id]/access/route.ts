import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { recheckProject } from "@/lib/collab/access-recheck";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const expected = Buffer.from(process.env.INTERNAL_API_SECRET || "");
  const provided = Buffer.from(req.headers.get("x-internal-secret") || "");
  if (!expected.length || expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid project" }, { status: 400 });
  await recheckProject(id);
  return NextResponse.json({ ok: true });
}
