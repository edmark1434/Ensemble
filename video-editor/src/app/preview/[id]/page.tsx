import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { loadMarketTemplatePreview, loadSnapshotPreview } from "@/lib/collab/snapshot-preview";
import SnapshotPreview from "@/features/editor/snapshot-preview";
import { readSnapshotPreviewToken } from "@/lib/auth/snapshot-preview-token";

// Recheck publication on every visit, including public UUID links without cookies.
export const dynamic = "force-dynamic";

const MARKET_ASSET_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function PreviewUnavailable({ message }: { message: string }) {
  return <main className="flex min-h-screen items-center justify-center p-6">
    <div className="max-w-md rounded-xl border border-border bg-background p-6">
      <h1 className="text-lg font-semibold">Preview unavailable</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <a href={`${(process.env.MAIN_APP_URL || "http://localhost:5173").replace(/\/$/, "")}/assets`} className="mt-4 inline-block text-sm underline">Return to the asset library</a>
    </div>
  </main>;
}

export default async function SnapshotPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (MARKET_ASSET_UUID.test(id)) {
    const preview = await loadMarketTemplatePreview(id);
    if (!preview) return <PreviewUnavailable message="This template is no longer available for preview." />;
    return <SnapshotPreview {...preview} />;
  }
  // Keep previously issued market links and private owner previews working.
  const reference = readSnapshotPreviewToken(id);
  if (!reference) return <PreviewUnavailable message="This preview link is invalid or expired. Open a fresh preview from the asset library." />;
  let preview;
  if (reference.kind === "market") {
    preview = await loadMarketTemplatePreview(reference.assetId, reference.snapshotId);
  } else {
    const token = (await cookies()).get(EDITOR_SESSION_COOKIE)?.value;
    const session = token ? await verifyEditorSession(token) : null;
    if (!session) {
      const destination = new URL("/assets/owned", process.env.MAIN_APP_URL || "http://localhost:5173");
      destination.searchParams.set("templateSnapshot", String(reference.snapshotId));
      destination.searchParams.set("templatePreview", id);
      redirect(destination.toString());
    }
    if (reference.userId !== session.userId) return <PreviewUnavailable message="Open this preview with the account that shared the template." />;
    preview = await loadSnapshotPreview(reference.snapshotId, session.userId);
  }
  if (!preview) return <PreviewUnavailable message="This saved snapshot is no longer available for preview. Open the listing again to get its current preview." />;
  return <SnapshotPreview {...preview} />;
}
