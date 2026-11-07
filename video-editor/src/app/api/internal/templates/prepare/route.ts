import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prepareTemplateCopy } from "@/lib/template-use-service";

export async function POST(req: Request) {
  const secret = Buffer.from(process.env.INTERNAL_API_SECRET || "");
  const given = Buffer.from(req.headers.get("x-internal-secret") || "");
  if (!secret.length || given.length !== secret.length || !timingSafeEqual(given, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const snapshotId = Number(body.snapshotId);
  if (!Number.isSafeInteger(snapshotId) || snapshotId < 1 || typeof body.name !== "string" || !body.name.trim() || body.name.length > 255) {
    return NextResponse.json({ error: "Invalid template" }, { status: 400 });
  }
  try {
    return NextResponse.json(await prepareTemplateCopy(snapshotId, body.name), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const knownReasons = [
      "Template snapshot is unavailable", "Protected media must retain its marketplace reference",
      "Invalid template market media", "Template media preview is unavailable",
      "Template scenes are nested too deeply", "Invalid template scene reference",
      "Template scene snapshot is missing", "Unexpected content type",
    ];
    const reason = error instanceof Error && knownReasons.includes(error.message)
      ? error.message : "Unable to copy this template";
    console.error("Template preparation failed", {
      reason,
      code: (error as { code?: string })?.code,
      frames: error instanceof Error ? error.stack?.split("\n").filter(line => line.trim().startsWith("at ")).slice(0, 5) : undefined,
    });
    return NextResponse.json({ error: reason }, { status: 409 });
  }
}
