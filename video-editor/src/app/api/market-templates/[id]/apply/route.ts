import { NextRequest, NextResponse } from "next/server";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { MARKET_UUID } from "@/lib/market-asset-backend";
import { readPublishedMarketTemplate } from "@/lib/db/template-copy";
import { authorizeTemplateInsertion, saveTemplateInsertion } from "@/lib/db/template-insertion";
import { prepareTemplateCopy } from "@/lib/template-use-service";
import { decodeTemplate } from "@/lib/collab/template-copy";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
  const session = token ? await verifyEditorSession(token) : null;
  if (!session) return NextResponse.json({ error: "Sign in to use templates." }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!MARKET_UUID.test(id) || typeof body?.projectId !== "string" || !MARKET_UUID.test(body.projectId)) return NextResponse.json({ error: "Invalid project or template." }, { status: 400 });
  try {
    if (!await authorizeTemplateInsertion(body.projectId, session.userId, id)) return NextResponse.json({ error: "Edit access and a project template license are required." }, { status: 403 });
    const source = await readPublishedMarketTemplate(id);
    if (!source) return NextResponse.json({ error: "Template unavailable." }, { status: 404 });
    const prepared = await prepareTemplateCopy(Number(source.snapshot_id), source.name);
    const snapshot = decodeTemplate(Buffer.from(prepared.document, "base64"));
    await saveTemplateInsertion(body.projectId, session.userId, id, prepared);
    return NextResponse.json({ snapshot }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to prepare the template for this project. Your existing contents have not been changed. Try again." }, { status: 409 });
  }
}
