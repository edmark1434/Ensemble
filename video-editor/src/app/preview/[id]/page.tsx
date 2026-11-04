import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { loadSnapshotPreview } from "@/lib/collab/snapshot-preview";
import SnapshotPreview from "@/features/editor/snapshot-preview";
import { readSnapshotPreviewToken } from "@/lib/auth/snapshot-preview-token";

export default async function SnapshotPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reference = readSnapshotPreviewToken(id);
  if (!reference) notFound();
  const token = (await cookies()).get(EDITOR_SESSION_COOKIE)?.value;
  const session = token ? await verifyEditorSession(token) : null;
  if (!session) {
    const destination = new URL("/assets/owned", process.env.MAIN_APP_URL || "http://localhost:5173");
    destination.searchParams.set("templateSnapshot", String(reference.snapshotId));
    destination.searchParams.set("templatePreview", id);
    redirect(destination.toString());
  }
  if (reference.userId !== session.userId) notFound();
  const preview = await loadSnapshotPreview(reference.snapshotId, session.userId);
  if (!preview) notFound();
  return <SnapshotPreview {...preview} />;
}
