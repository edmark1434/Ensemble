import { NextRequest, NextResponse } from "next/server";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { isSameOriginRequest } from "@/lib/auth/request-origin";
import { loadPortfolioComposition } from "@/lib/collab/snapshot-preview";
import { PortfolioError, portfolioBackend, portfolioTerms } from "@/lib/portfolio-clips";
import { submitRender } from "@/lib/submit-render";
import { getDefaultVideoBitrateKbps } from "@/features/editor/constants/download-options";
import { getVideoUploadPolicy } from "@/lib/upload-policy";
import { renderServerHeaders } from "@/lib/render-server";

type Context = { params: Promise<{ id: string }> };
async function sessionFor(request: NextRequest) {
  const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
  const session = token ? await verifyEditorSession(token) : null;
  if (!session) throw new PortfolioError("Sign in to export a portfolio clip.", 401);
  return session;
}
function failure(error: unknown) {
  return NextResponse.json({ message: error instanceof PortfolioError ? error.message : "The portfolio service is unavailable." },
    { status: error instanceof PortfolioError ? error.status : 503 });
}

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const session = await sessionFor(request);
    const { id } = await params;
    const jobId = request.nextUrl.searchParams.get("job");
    const clip = await portfolioBackend<{ status: string; error?: string | null }>(
      id,
      session.account_id,
      { action: "status", renderId: jobId },
    );
    if (clip.status === "published" || clip.status === "failed" || !jobId) {
      return NextResponse.json(clip, { headers: { "Cache-Control": "no-store" } });
    }
    const renderServerUrl = process.env.RENDER_SERVER_URL || "http://localhost:3001";
    const renderResponse = await fetch(new URL(`/renders/${encodeURIComponent(jobId)}`, renderServerUrl), {
      cache: "no-store",
      headers: await renderServerHeaders(session.userId),
    }).catch(() => null);
    if (!renderResponse?.ok) {
      return NextResponse.json(clip, { headers: { "Cache-Control": "no-store" } });
    }
    const render = await renderResponse.json().catch(() => null);
    if (render?.status === "failed") {
      const message = render.errorCode === "RENDER_TIMEOUT"
        ? "The render timed out before the export finished."
        : "Render failed.";
      return NextResponse.json({ status: "failed", error: message }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({
      status: render?.status === "completed" ? "publishing" : (render?.status ?? "in-progress"),
      progress: render?.status === "completed" ? 1 : (typeof render?.progress === "number" ? render.progress : 0),
      queuePosition: render?.status === "queued" ? (render?.queuePosition ?? null) : null,
      createdAt: typeof render?.createdAt === "number" ? render.createdAt : undefined,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}

export async function POST(request: NextRequest, { params }: Context) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  try {
    const session = await sessionFor(request);
    const { id } = await params;
    const { startMs, endMs, name, description, version, marketDraft } = await request.json();
    const terms = await portfolioTerms(id, session.account_id);
    if (!Number.isSafeInteger(startMs) || !Number.isSafeInteger(endMs) || startMs < 0 || endMs <= startMs ||
        (terms.maxSeconds != null && endMs - startMs > terms.maxSeconds * 1000) ||
        typeof name !== "string" || !name.trim() || name.length > 255 || typeof description !== "string" || description.length > 2000) {
      throw new PortfolioError("Check the clip title and permitted time range.", 400);
    }
    const content = await loadPortfolioComposition(id);
    if (!content || content.version !== version) throw new PortfolioError("The project has changed. Reload the picker to select from the latest timeline.", 409);
    if (endMs > content.duration) throw new PortfolioError("The clip ends beyond the project timeline.", 400);
    const policy = await getVideoUploadPolicy(session.userId);
    const size = content.snapshot.size ?? { width: terms.width, height: terms.height };
    const targetResolution = policy.plan === "Free" ? 720 : 1080;
    const resolution = Math.min(targetResolution, policy.maxHeight);
    const fps = Math.min(30, policy.maxFps);
    const firstFrame = Math.round(startMs * fps / 1000);
    const endFrame = Math.min(Math.round(endMs * fps / 1000),
      terms.maxSeconds == null ? Infinity : firstFrame + Math.floor(terms.maxSeconds * fps));
    if (endFrame <= firstFrame) throw new PortfolioError("Select at least one video frame.", 400);
    const response = await submitRender(request, session.userId, { ...content.snapshot,
      id: crypto.randomUUID(), projectId: id, projectName: name.trim(), marketDraft: Boolean(marketDraft), ensembleWatermark: false,
      size, background: content.snapshot.background ?? { type: "color", value: "#000000" }, duration: content.duration,
      portfolioFrameRange: [firstFrame, endFrame - 1],
      type: "video", format: "mp4", fps, resolution, bitrate: getDefaultVideoBitrateKbps(size.width, size.height, resolution, fps) });
    if (!response.ok) return response;
    const { jobId } = await response.json();
    if (typeof jobId !== "string" || !jobId) throw new PortfolioError("The renderer did not return a job.", 502);
    try {
      await portfolioBackend(id, session.account_id, { action: "enqueue", renderId: jobId,
        startMs: Math.round(firstFrame * 1000 / fps), endMs: Math.round(endFrame * 1000 / fps),
        name: name.trim(), description: description.trim() });
    } catch (error) {
      // A lost reply may mean enqueue committed. Check before cancelling a real job.
      const saved = await portfolioBackend<{ status: string }>(id, session.account_id, { action: "status", renderId: jobId })
        .catch((lookup: unknown) => {
          if (lookup instanceof PortfolioError && lookup.status === 404) return null;
          throw error;
        });
      if (!saved) {
        await fetch(new URL(`/renders/${encodeURIComponent(jobId)}`, process.env.RENDER_SERVER_URL || "http://localhost:3001"), {
          method: "DELETE", headers: await renderServerHeaders(session.userId),
        }).catch(() => undefined);
        throw error;
      }
    }
    return NextResponse.json({ jobId }, { status: 202 });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  try {
    const session = await sessionFor(request);
    const { id } = await params;
    const jobId = request.nextUrl.searchParams.get("job");
    if (!jobId) throw new PortfolioError("Clip export not found.", 400);
    await portfolioBackend(id, session.account_id, { action: "cancel", renderId: jobId });
    await fetch(new URL(`/renders/${encodeURIComponent(jobId)}`, process.env.RENDER_SERVER_URL || "http://localhost:3001"), {
      method: "DELETE", headers: await renderServerHeaders(session.userId),
    }).catch(() => undefined);
    return NextResponse.json({ status: "cancelled" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
